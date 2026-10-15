import React, { useState, useMemo } from 'react';
import { BusStop } from '../types/bus';
import { SINGAPORE_BUS_STOPS, MRT_LINE_COLORS } from '../data/singaporeBuses';
import { Search, X, MapPin, Train, Sparkles, Navigation } from 'lucide-react';

interface BusStopSearchProps {
  onSelectStop: (stop: BusStop) => void;
  selectedStopCode: string;
  nearbyStops?: { stop: BusStop; distanceMeters: number }[];
  onTriggerLocate: () => void;
  isLocating: boolean;
}

const MAJOR_HUBS = [
  { name: 'Orchard Rd', code: '09048' },
  { name: 'Dhoby Ghaut', code: '08057' },
  { name: 'Bugis Stn', code: '01112' },
  { name: 'City Hall', code: '04168' },
  { name: 'Suntec City', code: '03211' },
  { name: 'HarbourFront', code: '10169' },
  { name: 'Jurong East', code: '28009' },
  { name: 'Tampines Int', code: '84009' },
  { name: 'Bedok Int', code: '66009' },
  { name: 'Woodlands', code: '46009' },
];

export const BusStopSearch: React.FC<BusStopSearchProps> = ({
  onSelectStop,
  selectedStopCode,
  nearbyStops,
  onTriggerLocate,
  isLocating,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'nearby' | 'mrt'>('all');
  const [selectedMrtLine, setSelectedMrtLine] = useState<string | null>(null);

  // Search filter logic
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (activeTab === 'nearby' && nearbyStops && nearbyStops.length > 0) {
      if (!q) return nearbyStops.map((n) => n.stop);
      return nearbyStops
        .filter(
          (n) =>
            n.stop.BusStopCode.includes(q) ||
            n.stop.Description.toLowerCase().includes(q) ||
            n.stop.RoadName.toLowerCase().includes(q) ||
            n.stop.services.some((s) => s.toLowerCase() === q)
        )
        .map((n) => n.stop);
    }

    if (activeTab === 'mrt') {
      let filtered = SINGAPORE_BUS_STOPS.filter((s) => s.mrtLines && s.mrtLines.length > 0);
      if (selectedMrtLine) {
        filtered = filtered.filter((s) =>
          s.mrtLines?.some((l) => l.startsWith(selectedMrtLine))
        );
      }
      if (!q) return filtered;
      return filtered.filter(
        (s) =>
          s.BusStopCode.includes(q) ||
          s.Description.toLowerCase().includes(q) ||
          s.RoadName.toLowerCase().includes(q) ||
          s.services.some((svc) => svc.toLowerCase() === q)
      );
    }

    if (!q) return SINGAPORE_BUS_STOPS;

    return SINGAPORE_BUS_STOPS.filter(
      (s) =>
        s.BusStopCode.includes(q) ||
        s.Description.toLowerCase().includes(q) ||
        s.RoadName.toLowerCase().includes(q) ||
        s.services.some((svc) => svc.toLowerCase() === q)
    );
  }, [query, activeTab, selectedMrtLine, nearbyStops]);

  return (
    <div className="p-4 border-b border-slate-800 bg-slate-900/60 space-y-3">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 5-digit code, road name, or bus # (e.g. 09048, Orchard, 190)..."
          className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
        <button
          onClick={() => {
            setActiveTab('all');
            setSelectedMrtLine(null);
          }}
          className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Bus Stops ({SINGAPORE_BUS_STOPS.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('nearby');
            if (!nearbyStops || nearbyStops.length === 0) {
              onTriggerLocate();
            }
          }}
          className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'nearby'
              ? 'bg-slate-800 text-emerald-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
          <span>Nearby</span>
        </button>

        <button
          onClick={() => setActiveTab('mrt')}
          className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'mrt'
              ? 'bg-slate-800 text-amber-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Train className="w-3 h-3" />
          <span>MRT Hubs</span>
        </button>
      </div>

      {/* MRT Line selector strip if MRT tab active */}
      {activeTab === 'mrt' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {Object.entries(MRT_LINE_COLORS).map(([key, val]) => {
            const isSelected = selectedMrtLine === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMrtLine(isSelected ? null : key)}
                style={{
                  backgroundColor: isSelected ? val.bg : 'rgba(30, 41, 59, 0.7)',
                  color: isSelected ? val.text : '#cbd5e1',
                  borderColor: val.bg,
                }}
                className="px-2 py-0.5 rounded-md border text-[11px] font-bold shrink-0 transition-all"
              >
                {key}
              </button>
            );
          })}
        </div>
      )}

      {/* Popular Fast-Jumps */}
      {!query && activeTab === 'all' && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Popular Transport Nodes
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {MAJOR_HUBS.map((hub) => {
              const stop = SINGAPORE_BUS_STOPS.find((s) => s.BusStopCode === hub.code);
              const isSelected = selectedStopCode === hub.code;
              return (
                <button
                  key={hub.code}
                  onClick={() => stop && onSelectStop(stop)}
                  className={`px-2 py-1 rounded-lg text-xs transition-colors whitespace-nowrap border ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/60 hover:text-white'
                  }`}
                >
                  {hub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Result Matches if actively searching */}
      {query && (
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {searchResults.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              No bus stops found for "{query}". Try 5-digit code or road name.
            </div>
          ) : (
            searchResults.map((stop) => {
              const isSelected = stop.BusStopCode === selectedStopCode;
              return (
                <button
                  key={stop.BusStopCode}
                  onClick={() => {
                    onSelectStop(stop);
                    setQuery('');
                  }}
                  className={`w-full text-left p-2 rounded-xl transition-all border flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/40 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-emerald-400">
                        {stop.BusStopCode}
                      </span>
                      <span className="text-xs font-semibold truncate text-white">
                        {stop.Description}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{stop.RoadName}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                      {stop.services.length} buses
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
