import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BusStop,
  BusArrivalService,
  LiveBusVehicle,
  BusRoute,
  NextBusInfo,
  FavoriteItem,
  LTASettings,
} from './types/bus';
import { SINGAPORE_BUS_STOPS, POPULAR_BUS_ROUTES } from './data/singaporeBuses';
import {
  simulationEngine,
  fetchBusArrivals,
  getStoredSettings,
  saveStoredSettings,
  getNearbyBusStops,
} from './services/ltaService';
import { BusMap } from './components/BusMap';
import { BusStopArrivals } from './components/BusStopArrivals';
import { BusStopSearch } from './components/BusStopSearch';
import { RouteViewerModal } from './components/RouteViewerModal';
import { SettingsModal } from './components/SettingsModal';
import { FavoritesTab } from './components/FavoritesTab';
import {
  Bus,
  MapPin,
  Star,
  Settings,
  Layers,
  Map,
  List,
  Compass,
  Radio,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export default function App() {
  // Primary state
  const [selectedStop, setSelectedStop] = useState<BusStop>(() => {
    // Default to Orchard Stn / Lucky Plaza (09048)
    return SINGAPORE_BUS_STOPS.find((s) => s.BusStopCode === '09048') || SINGAPORE_BUS_STOPS[0];
  });

  const [arrivals, setArrivals] = useState<BusArrivalService[]>([]);
  const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);
  const [isLiveAPI, setIsLiveAPI] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | undefined>();

  // Settings
  const [settings, setSettings] = useState<LTASettings>(getStoredSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Live vehicles on map
  const [liveBuses, setLiveBuses] = useState<LiveBusVehicle[]>([]);
  const [selectedBus, setSelectedBus] = useState<LiveBusVehicle | null>(null);

  // Active route being inspected
  const [activeRoute, setActiveRoute] = useState<BusRoute | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const stored = localStorage.getItem('sg_bus_favorites');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    // Default favorites
    return [
      { type: 'stop', stopCode: '09048', addedAt: Date.now() },
      { type: 'stop', stopCode: '08057', addedAt: Date.now() },
      { type: 'stop', stopCode: '03211', addedAt: Date.now() },
    ];
  });

  // Geolocation & Nearby
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyStops, setNearbyStops] = useState<{ stop: BusStop; distanceMeters: number }[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Left sidebar tabs on desktop/mobile
  const [sidebarTab, setSidebarTab] = useState<'arrivals' | 'search' | 'favorites'>('arrivals');

  // Mobile layout view toggle ('list' | 'map')
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // Auto-refresh countdown ticker
  const [refreshSecondsLeft, setRefreshSecondsLeft] = useState<number>(settings.refreshIntervalSeconds);
  const timerRef = useRef<any>(null);

  // Save favorites helper
  const handleToggleFavorite = () => {
    const isFav = favorites.some((f) => f.stopCode === selectedStop.BusStopCode);
    let updated: FavoriteItem[];
    if (isFav) {
      updated = favorites.filter((f) => f.stopCode !== selectedStop.BusStopCode);
    } else {
      updated = [{ type: 'stop', stopCode: selectedStop.BusStopCode, addedAt: Date.now() }, ...favorites];
    }
    setFavorites(updated);
    try {
      localStorage.setItem('sg_bus_favorites', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveFavorite = (stopCode: string) => {
    const updated = favorites.filter((f) => f.stopCode !== stopCode);
    setFavorites(updated);
    try {
      localStorage.setItem('sg_bus_favorites', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Load arrivals for current selected stop
  const loadArrivals = useCallback(async () => {
    if (!selectedStop) return;
    setIsLoadingArrivals(true);
    try {
      const result = await fetchBusArrivals(selectedStop.BusStopCode, settings);
      setArrivals(result.services);
      setIsLiveAPI(result.isLiveAPI);
      setApiNotice(result.error);
    } catch (err: any) {
      console.error('Failed fetching arrivals', err);
    } finally {
      setIsLoadingArrivals(false);
      setRefreshSecondsLeft(settings.refreshIntervalSeconds);
    }
  }, [selectedStop, settings]);

  // Initial and on selectedStop change
  useEffect(() => {
    loadArrivals();
  }, [loadArrivals]);

  // Live vehicles animation ticker: steps every 1.5s
  useEffect(() => {
    const vehicleTicker = setInterval(() => {
      const buses = simulationEngine.getActiveBuses();
      setLiveBuses([...buses]);
    }, 1500);

    return () => clearInterval(vehicleTicker);
  }, []);

  // Countdown auto-refresh ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRefreshSecondsLeft((prev) => {
        if (prev <= 1) {
          loadArrivals();
          return settings.refreshIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadArrivals, settings.refreshIntervalSeconds]);

  // Track specific bus clicked on card
  const handleTrackBus = (serviceNo: string, nextBus: NextBusInfo) => {
    // Find active bus or synthesize vehicle from NextBus
    const existing = liveBuses.find((b) => b.serviceNo === serviceNo);
    if (existing) {
      setSelectedBus(existing);
    } else {
      const tempBus: LiveBusVehicle = {
        id: `tracking-${serviceNo}`,
        serviceNo,
        operator: 'SBST',
        lat: nextBus.Latitude,
        lng: nextBus.Longitude,
        heading: nextBus.heading || 45,
        speed: nextBus.speed || 30,
        plateNumber: nextBus.plateNumber || 'SG1234A',
        type: nextBus.Type,
        load: nextBus.Load,
        isWAB: nextBus.Feature === 'WAB',
        nextStopCode: selectedStop.BusStopCode,
        nextStopName: selectedStop.Description,
        destinationName: 'In Service',
        routeProgressPercent: 50,
      };
      setSelectedBus(tempBus);
    }

    // Also activate route line if available
    const route = POPULAR_BUS_ROUTES.find((r) => r.serviceNo === serviceNo);
    if (route) {
      setActiveRoute(route);
    }

    // Switch to map view on mobile
    setMobileView('map');
  };

  // View full route modal
  const handleViewRoute = (serviceNo: string) => {
    const route = POPULAR_BUS_ROUTES.find((r) => r.serviceNo === serviceNo);
    if (route) {
      setActiveRoute(route);
      setIsRouteModalOpen(true);
    }
  };

  // Geolocation trigger
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });

        const nearby = getNearbyBusStops(lat, lng, 6);
        setNearbyStops(nearby);

        // If user is within Singapore, select closest
        if (nearby.length > 0) {
          setSelectedStop(nearby[0].stop);
          setSidebarTab('arrivals');
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation failed or denied, using central Singapore coordinates', err);
        // Fallback to Orchard area
        const lat = 1.3040;
        const lng = 103.8340;
        setUserLocation({ lat, lng });
        const nearby = getNearbyBusStops(lat, lng, 6);
        setNearbyStops(nearby);
      },
      { timeout: 8000 }
    );
  };

  const handleSaveSettings = (newSettings: LTASettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    setRefreshSecondsLeft(newSettings.refreshIntervalSeconds);
    loadArrivals();
  };

  const isCurrentStopFavorite = favorites.some((f) => f.stopCode === selectedStop.BusStopCode);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Bar Contract (Single-line wordmark, nav links, primary action) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md z-30 shrink-0">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <Bus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-white">SG BusLive</span>
            <span className="text-[10px] text-emerald-400 font-mono ml-1.5 hidden sm:inline">LTA REAL-TIME</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => {
              setSidebarTab('arrivals');
              setMobileView('list');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              sidebarTab === 'arrivals' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            Arrival Timings
          </button>
          <button
            onClick={() => {
              setSidebarTab('search');
              setMobileView('list');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              sidebarTab === 'search' ? 'text-emerald-400 font-semibold' : ''
            }`}
          >
            Find Bus Stop
          </button>
          <button
            onClick={() => {
              setSidebarTab('favorites');
              setMobileView('list');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              sidebarTab === 'favorites' ? 'text-amber-400 font-semibold' : ''
            }`}
          >
            Saved Stops ({favorites.length})
          </button>
        </nav>

        {/* Zone 3: Primary Action & Mode Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                settings.useMockSimulation ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'
              }`}
            ></span>
            <span className="text-slate-300 font-medium">
              {settings.useMockSimulation ? 'Live Simulation' : 'Live API'}
            </span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Backend & Data Provider Settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Backend / API</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Left Panel: Search / Arrivals / Favorites */}
        <aside
          className={`w-full md:w-[440px] lg:w-[480px] h-full flex flex-col bg-slate-900 border-r border-slate-800 z-10 shrink-0 ${
            mobileView === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Sub-navigation tabs for Left Panel */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 shrink-0">
            <button
              onClick={() => setSidebarTab('arrivals')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'arrivals'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arrivals</span>
            </button>

            <button
              onClick={() => setSidebarTab('search')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'search'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>All Stops</span>
            </button>

            <button
              onClick={() => setSidebarTab('favorites')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                sidebarTab === 'favorites'
                  ? 'bg-slate-800 text-amber-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Saved ({favorites.length})</span>
            </button>
          </div>

          {/* Quick Search Strip at the top of left panel */}
          <BusStopSearch
            onSelectStop={(stop) => {
              setSelectedStop(stop);
              setSidebarTab('arrivals');
            }}
            selectedStopCode={selectedStop.BusStopCode}
            nearbyStops={nearbyStops}
            onTriggerLocate={handleLocateMe}
            isLocating={isLocating}
          />

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {sidebarTab === 'arrivals' && (
              <BusStopArrivals
                stop={selectedStop}
                arrivals={arrivals}
                isLoading={isLoadingArrivals}
                refreshSecondsLeft={refreshSecondsLeft}
                onRefresh={loadArrivals}
                isFavorite={isCurrentStopFavorite}
                onToggleFavorite={handleToggleFavorite}
                onTrackBus={handleTrackBus}
                onViewRoute={handleViewRoute}
                isLiveAPI={isLiveAPI}
                apiNotice={apiNotice}
              />
            )}

            {sidebarTab === 'search' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  All Singapore Bus Stops ({SINGAPORE_BUS_STOPS.length})
                </div>
                {SINGAPORE_BUS_STOPS.map((stop) => {
                  const isSelected = stop.BusStopCode === selectedStop.BusStopCode;
                  return (
                    <button
                      key={stop.BusStopCode}
                      onClick={() => {
                        setSelectedStop(stop);
                        setSidebarTab('arrivals');
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-700">
                            {stop.BusStopCode}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {stop.Description}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {stop.RoadName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          {stop.services.length} services
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {sidebarTab === 'favorites' && (
              <FavoritesTab
                favorites={favorites}
                onSelectStop={(stop) => {
                  setSelectedStop(stop);
                  setSidebarTab('arrivals');
                }}
                onRemoveFavorite={handleRemoveFavorite}
                selectedStopCode={selectedStop.BusStopCode}
              />
            )}
          </div>
        </aside>

        {/* Right Panel: Interactive Leaflet Singapore Map */}
        <main
          className={`flex-1 h-full relative ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <BusMap
            stops={SINGAPORE_BUS_STOPS}
            selectedStop={selectedStop}
            onSelectStop={(stop) => {
              setSelectedStop(stop);
              setSidebarTab('arrivals');
            }}
            liveBuses={liveBuses}
            selectedBus={selectedBus}
            onSelectBus={(bus) => {
              setSelectedBus(bus);
              if (bus) {
                const route = POPULAR_BUS_ROUTES.find((r) => r.serviceNo === bus.serviceNo);
                if (route) setActiveRoute(route);
              }
            }}
            activeRoute={activeRoute}
            userLocation={userLocation}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
          />
        </main>
      </div>

      {/* Mobile Floating Bottom Bar for Switching List / Map */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900/95 backdrop-blur-md p-2 z-40 shrink-0">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-colors ${
            mobileView === 'list' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <List className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Arrivals</span>
        </button>

        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 flex flex-col items-center py-1 rounded-xl transition-colors ${
            mobileView === 'map' ? 'text-emerald-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Map className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Live Map</span>
        </button>

        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex-1 flex flex-col items-center py-1 rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>

      {/* Route Stops Sequence Viewer Modal */}
      {isRouteModalOpen && activeRoute && (
        <RouteViewerModal
          route={activeRoute}
          activeBuses={liveBuses}
          currentStopCode={selectedStop.BusStopCode}
          onSelectStop={(stop) => {
            setSelectedStop(stop);
            setSidebarTab('arrivals');
          }}
          onClose={() => setIsRouteModalOpen(false)}
        />
      )}

      {/* Settings & Backend Connector Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
