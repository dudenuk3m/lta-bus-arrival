import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { BusStop, LiveBusVehicle, BusRoute } from '../types/bus';
import { MRT_LINE_COLORS } from '../data/singaporeBuses';
import { Navigation, Compass, Layers, Bus, MapPin, ZoomIn, ZoomOut, Locate } from 'lucide-react';

interface BusMapProps {
  stops: BusStop[];
  selectedStop: BusStop | null;
  onSelectStop: (stop: BusStop) => void;
  liveBuses: LiveBusVehicle[];
  selectedBus: LiveBusVehicle | null;
  onSelectBus: (bus: LiveBusVehicle | null) => void;
  activeRoute: BusRoute | null;
  userLocation: { lat: number; lng: number } | null;
  onLocateMe: () => void;
  isLocating: boolean;
}

export const BusMap: React.FC<BusMapProps> = ({
  stops,
  selectedStop,
  onSelectStop,
  liveBuses,
  selectedBus,
  onSelectBus,
  activeRoute,
  userLocation,
  onLocateMe,
  isLocating,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const stopMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const busMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineLayerRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [1.3000, 103.8450], // Dhoby Ghaut / Central SG
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark high-contrast CartoDB tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Attribution
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '<span class="text-[10px] text-slate-500">© OpenStreetMap · CartoDB</span>',
      })
      .addTo(map);

    stopMarkersLayerRef.current = L.layerGroup().addTo(map);
    busMarkersLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update stops markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = stopMarkersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    stops.forEach((stop) => {
      const isSelected = selectedStop?.BusStopCode === stop.BusStopCode;

      const html = `
        <div class="relative group cursor-pointer">
          <div class="flex items-center justify-center ${
            isSelected
              ? 'w-9 h-9 bg-emerald-500 ring-4 ring-emerald-500/30 scale-110 shadow-lg'
              : 'w-7 h-7 bg-slate-800 hover:bg-slate-700 ring-2 ring-slate-600/60 shadow'
          } rounded-xl transition-all duration-200">
            <span class="text-[11px] font-bold ${isSelected ? 'text-slate-950 font-black' : 'text-slate-200'}">🚏</span>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
            isSelected ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'bg-slate-900/90 text-slate-300 border border-slate-700/80'
          }">
            ${stop.BusStopCode}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-bus-stop-icon',
        html,
        iconSize: [36, 40],
        iconAnchor: [18, 20],
      });

      const marker = L.marker([stop.Latitude, stop.Longitude], { icon });

      marker.on('click', () => {
        onSelectStop(stop);
      });

      // Tooltip
      marker.bindTooltip(
        `<div class="p-1">
          <div class="font-bold text-xs text-slate-100">${stop.Description}</div>
          <div class="text-[10px] text-slate-400">${stop.RoadName} · Code ${stop.BusStopCode}</div>
          <div class="text-[10px] text-emerald-400 mt-1 font-mono">${stop.services.slice(0, 5).join(', ')}${stop.services.length > 5 ? ` +${stop.services.length - 5} more` : ''}</div>
        </div>`,
        { direction: 'top', offset: [0, -18], className: 'custom-leaflet-tooltip' }
      );

      marker.addTo(layer);
    });
  }, [stops, selectedStop, onSelectStop]);

  // Update live bus vehicle markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = busMarkersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    liveBuses.forEach((bus) => {
      const isSelected = selectedBus?.id === bus.id;

      const loadColor =
        bus.load === 'SEA' ? '#10B981' : bus.load === 'SDA' ? '#F59E0B' : '#EF4444';

      const operatorBg =
        bus.operator === 'SBST'
          ? 'bg-purple-900 border-purple-500 text-purple-200'
          : bus.operator === 'SMRT'
          ? 'bg-rose-950 border-rose-500 text-rose-200'
          : bus.operator === 'TTS'
          ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
          : 'bg-teal-950 border-teal-400 text-teal-200';

      const html = `
        <div class="relative cursor-pointer transition-transform duration-300">
          <div class="relative flex items-center justify-center px-2 py-1 rounded-lg border shadow-xl ${operatorBg} ${
        isSelected ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 scale-125 z-50' : 'hover:scale-110'
      }">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${loadColor}"></span>
              <span class="text-xs font-black tracking-tight text-white">${bus.serviceNo}</span>
              <span class="text-[9px] font-mono opacity-80">${bus.type}</span>
            </div>
            <!-- Heading indicator pointer -->
            <div class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-200" style="transform: rotate(${bus.heading}deg)"></div>
          </div>
          ${
            isSelected
              ? `<div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-yellow-400 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                  ${bus.plateNumber} · ${Math.round(bus.speed)} km/h
                </div>`
              : ''
          }
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-bus-marker',
        html,
        iconSize: [60, 32],
        iconAnchor: [30, 16],
      });

      const marker = L.marker([bus.lat, bus.lng], { icon });

      marker.on('click', () => {
        onSelectBus(bus);
      });

      marker.bindTooltip(
        `<div class="p-1.5">
          <div class="flex items-center justify-between gap-3">
            <span class="font-bold text-xs text-white">Service ${bus.serviceNo} (${bus.operator})</span>
            <span class="text-[10px] font-mono px-1 rounded bg-slate-800 text-slate-200">${bus.plateNumber}</span>
          </div>
          <div class="text-[11px] text-slate-300 mt-1">To: ${bus.destinationName}</div>
          <div class="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
            <span>Speed: ${Math.round(bus.speed)} km/h</span>
            <span>·</span>
            <span>Load: ${bus.load === 'SEA' ? 'Seats Available' : bus.load === 'SDA' ? 'Standing Only' : 'Crowded'}</span>
          </div>
        </div>`,
        { direction: 'top', offset: [0, -12], className: 'custom-leaflet-tooltip' }
      );

      marker.addTo(layer);
    });
  }, [liveBuses, selectedBus, onSelectBus]);

  // Update route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (routePolylineLayerRef.current) {
      map.removeLayer(routePolylineLayerRef.current);
      routePolylineLayerRef.current = null;
    }

    if (activeRoute && activeRoute.polyline.length > 0) {
      const polyline = L.polyline(activeRoute.polyline, {
        color: '#10B981',
        weight: 5,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: undefined,
      }).addTo(map);

      routePolylineLayerRef.current = polyline;

      // Fit route bounds gracefully
      map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 15 });
    }
  }, [activeRoute]);

  // Focus map when a stop is selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedStop) return;

    map.flyTo([selectedStop.Latitude, selectedStop.Longitude], 16, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [selectedStop]);

  // Focus map when a live bus is selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedBus) return;

    map.flyTo([selectedBus.lat, selectedBus.lng], 16, {
      duration: 1.0,
    });
  }, [selectedBus]);

  // Handle user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      const circle = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 8,
        fillColor: '#3B82F6',
        color: '#FFFFFF',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      circle.bindTooltip('Your Location', { direction: 'top', offset: [0, -10] });
      userMarkerRef.current = circle;
    }
  }, [userLocation]);

  return (
    <div className="relative w-full h-full min-h-[360px] bg-slate-950 overflow-hidden">
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={onLocateMe}
          title="Find nearby stops"
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-lg flex items-center justify-center transition-colors backdrop-blur-md"
        >
          <Locate className={`w-5 h-5 ${isLocating ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        <div className="flex flex-col rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-lg backdrop-blur-md">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            title="Zoom In"
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-700/60"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            title="Zoom Out"
            className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.flyTo([1.3521, 103.8198], 12);
            }
          }}
          title="Reset to Island View"
          className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 shadow-lg flex items-center justify-center transition-colors backdrop-blur-md"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Map Legend & Active Route Indicator */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]">
        {activeRoute && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-emerald-500/50 shadow-lg flex items-center gap-2 text-xs text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-emerald-400">Route {activeRoute.serviceNo}</span>
            <span className="text-slate-400 truncate max-w-[160px]">To {activeRoute.destination}</span>
          </div>
        )}

        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[11px] text-slate-400 shadow">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Seats Avail</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Standing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Crowded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
