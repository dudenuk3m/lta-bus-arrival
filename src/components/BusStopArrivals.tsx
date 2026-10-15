import React from 'react';
import { BusStop, BusArrivalService, NextBusInfo, BusLoad, BusType, LiveBusVehicle } from '../types/bus';
import { MRT_LINE_COLORS, POPULAR_BUS_ROUTES } from '../data/singaporeBuses';
import {
  Star,
  RefreshCw,
  Accessibility,
  Compass,
  Route,
  Share2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface BusStopArrivalsProps {
  stop: BusStop;
  arrivals: BusArrivalService[];
  isLoading: boolean;
  refreshSecondsLeft: number;
  onRefresh: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onTrackBus: (serviceNo: string, nextBus: NextBusInfo) => void;
  onViewRoute: (serviceNo: string) => void;
  isLiveAPI: boolean;
  apiNotice?: string;
}

export const BusStopArrivals: React.FC<BusStopArrivalsProps> = ({
  stop,
  arrivals,
  isLoading,
  refreshSecondsLeft,
  onRefresh,
  isFavorite,
  onToggleFavorite,
  onTrackBus,
  onViewRoute,
  isLiveAPI,
  apiNotice,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [filterQuery, setFilterQuery] = React.useState('');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(stop.BusStopCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredArrivals = arrivals.filter((item) =>
    filterQuery.trim() === ''
      ? true
      : item.ServiceNo.toLowerCase().includes(filterQuery.toLowerCase().trim())
  );

  const getLoadBadge = (load: BusLoad) => {
    switch (load) {
      case 'SEA':
        return {
          label: 'Seats Avail',
          color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
          dot: 'bg-emerald-400',
        };
      case 'SDA':
        return {
          label: 'Standing Avail',
          color: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
          dot: 'bg-amber-400',
        };
      case 'LSD':
      default:
        return {
          label: 'Limited Standing',
          color: 'text-rose-400 bg-rose-950/60 border-rose-800/80',
          dot: 'bg-rose-400',
        };
    }
  };

  const getTypeLabel = (type: BusType) => {
    switch (type) {
      case 'DD':
        return 'Double Deck';
      case 'BD':
        return 'Bendy';
      case 'SD':
      default:
        return 'Single Deck';
    }
  };

  const getOperatorBadge = (operator: string) => {
    switch (operator) {
      case 'SBST':
        return 'bg-purple-950/80 text-purple-300 border-purple-800';
      case 'SMRT':
        return 'bg-rose-950/80 text-rose-300 border-rose-800';
      case 'TTS':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
      case 'GAS':
        return 'bg-teal-950/80 text-teal-300 border-teal-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const formatWaitMinutes = (min?: number) => {
    if (min === undefined || isNaN(min)) return '--';
    if (min <= 0) return 'Arr';
    if (min === 1) return '1 min';
    return `${min} min`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Bus Stop Header Card */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {stop.BusStopCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy bus stop code"
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* MRT Connections */}
              {stop.mrtLines && stop.mrtLines.length > 0 && (
                <div className="flex items-center gap-1">
                  {stop.mrtLines.map((lineCode) => {
                    const prefix = lineCode.replace(/[0-9]/g, '');
                    const conf = MRT_LINE_COLORS[prefix] || { bg: '#475569', text: '#FFFFFF' };
                    return (
                      <span
                        key={lineCode}
                        style={{ backgroundColor: conf.bg, color: conf.text }}
                        className="text-[10px] font-black px-1.5 py-0.2 rounded shadow-sm"
                        title={conf.name}
                      >
                        {lineCode}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white truncate">{stop.Description}</h2>
            <p className="text-xs text-slate-400 truncate">{stop.RoadName}</p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggleFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
              className={`p-2 rounded-xl border transition-all ${
                isFavorite
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Refresh & Mode Status Bar */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh ({refreshSecondsLeft}s)</span>
            </button>
            <span className="text-[11px] text-slate-500 hidden sm:inline">Auto updates every 15s</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveAPI ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'
              }`}
            ></span>
            <span className="text-[11px] text-slate-400">
              {isLiveAPI ? 'LTA DataMall v3' : 'Live Physics Sim'}
            </span>
          </div>
        </div>

        {apiNotice && (
          <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span className="truncate">{apiNotice}</span>
          </div>
        )}

        {/* Filter Bus Service Input */}
        <div className="mt-3">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter bus number (e.g. 190, 65)..."
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Arrivals List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredArrivals.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-sm">No bus services matching "{filterQuery}"</p>
          </div>
        ) : (
          filteredArrivals.map((arrival) => {
            const next1 = arrival.NextBus;
            const next2 = arrival.NextBus2;
            const next3 = arrival.NextBus3;
            const load1 = getLoadBadge(next1.Load);
            const isArr = next1.estimatedMinutes !== undefined && next1.estimatedMinutes <= 0;
            const hasRoute = POPULAR_BUS_ROUTES.some((r) => r.serviceNo === arrival.ServiceNo);

            return (
              <div
                key={arrival.ServiceNo}
                className="group relative p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all shadow-sm"
              >
                {/* Header Row: Service Number, Operator & Destination */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg font-black tracking-tight text-white bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      {arrival.ServiceNo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getOperatorBadge(
                        arrival.Operator
                      )}`}
                    >
                      {arrival.Operator}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[150px] sm:max-w-[200px]">
                      {arrival.DestinationName}
                    </span>
                  </div>

                  {/* Actions: View Route & Track */}
                  <div className="flex items-center gap-1.5">
                    {hasRoute && (
                      <button
                        onClick={() => onViewRoute(arrival.ServiceNo)}
                        title="View route stops & active buses"
                        className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Route className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">Route</span>
                      </button>
                    )}

                    <button
                      onClick={() => onTrackBus(arrival.ServiceNo, next1)}
                      title="Track live vehicle on map"
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1"
                    >
                      <Compass className="w-3 h-3 text-emerald-400" />
                      <span>Track</span>
                    </button>
                  </div>
                </div>

                {/* Next Bus Spotlight (1st Bus) */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
                      Next Bus
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-mono text-2xl font-black ${
                          isArr
                            ? 'text-emerald-400 animate-pulse font-black'
                            : 'text-white'
                        }`}
                      >
                        {formatWaitMinutes(next1.estimatedMinutes)}
                      </span>

                      {/* Crowding / Load Pill */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${load1.color}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${load1.dot}`}></span>
                        {load1.label}
                      </span>
                    </div>

                    {/* Metadata: Deck & WAB */}
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {getTypeLabel(next1.Type)}
                      </span>
                      {next1.Feature === 'WAB' && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-blue-400" title="Wheelchair Accessible">
                            <Accessibility className="w-3 h-3" />
                            WAB
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Vehicle details */}
                  {next1.plateNumber && (
                    <div className="text-right text-[11px] space-y-0.5 hidden sm:block">
                      <div className="font-mono text-slate-300 font-semibold">{next1.plateNumber}</div>
                      {next1.speed !== undefined && (
                        <div className="text-slate-400 font-mono text-[10px]">{next1.speed} km/h</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subsequent Buses (Next 2 & Next 3) */}
                {(next2 || next3) && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-xs">
                    {next2 && (
                      <div className="p-2 rounded-lg bg-slate-900/30 border border-slate-800/40 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">2nd Bus</div>
                          <div className="font-mono font-bold text-slate-200">
                            {formatWaitMinutes(next2.estimatedMinutes)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                              getLoadBadge(next2.Load).color
                            }`}
                          >
                            {next2.Type}
                          </span>
                        </div>
                      </div>
                    )}

                    {next3 && (
                      <div className="p-2 rounded-lg bg-slate-900/30 border border-slate-800/40 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">3rd Bus</div>
                          <div className="font-mono font-bold text-slate-200">
                            {formatWaitMinutes(next3.estimatedMinutes)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                              getLoadBadge(next3.Load).color
                            }`}
                          >
                            {next3.Type}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
