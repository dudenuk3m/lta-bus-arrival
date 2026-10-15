import React from 'react';
import { BusRoute, LiveBusVehicle, BusStop } from '../types/bus';
import { SINGAPORE_BUS_STOPS } from '../data/singaporeBuses';
import { X, ArrowRight, Bus, MapPin, Compass, CheckCircle2 } from 'lucide-react';

interface RouteViewerModalProps {
  route: BusRoute;
  activeBuses: LiveBusVehicle[];
  currentStopCode: string;
  onSelectStop: (stop: BusStop) => void;
  onClose: () => void;
}

export const RouteViewerModal: React.FC<RouteViewerModalProps> = ({
  route,
  activeBuses,
  currentStopCode,
  onSelectStop,
  onClose,
}) => {
  const routeBuses = activeBuses.filter((b) => b.serviceNo === route.serviceNo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-lg">
              {route.serviceNo}
            </div>
            <div>
              <div className="text-xs uppercase font-semibold text-slate-400">
                Route Direction 1 · {route.operator}
              </div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="truncate max-w-[140px] sm:max-w-none">{route.origin}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-emerald-400 truncate max-w-[140px] sm:max-w-none">
                  {route.destination}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Buses Active On This Route Banner */}
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{routeBuses.length} active buses moving on route right now</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Total {route.stops.length} major stops</span>
        </div>

        {/* Route Stops Sequence */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-700">
            {route.stops.map((stopItem, index) => {
              const isCurrent = stopItem.stopCode === currentStopCode;
              const fullStop = SINGAPORE_BUS_STOPS.find(
                (s) => s.BusStopCode === stopItem.stopCode
              );

              // Check if any active bus is currently approaching this stop
              const busesNearThisStop = routeBuses.filter(
                (b) => b.nextStopCode === stopItem.stopCode
              );

              return (
                <div key={stopItem.stopCode} className="relative group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-emerald-500 border-emerald-300 ring-4 ring-emerald-500/20'
                        : busesNearThisStop.length > 0
                        ? 'bg-amber-400 border-amber-200 ring-2 ring-amber-400/30'
                        : 'bg-slate-900 border-slate-600 group-hover:border-slate-400'
                    }`}
                  >
                    {isCurrent ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                    ) : busesNearThisStop.length > 0 ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                    )}
                  </div>

                  {/* Stop Information Card */}
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md'
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            Stop #{stopItem.stopSequence}
                          </span>
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-emerald-400 border border-slate-700">
                            {stopItem.stopCode}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                              Current Stop
                            </span>
                          )}
                        </div>

                        <div className="text-sm font-bold text-white mt-0.5">
                          {stopItem.description}
                        </div>
                        <div className="text-xs text-slate-400">{stopItem.roadName}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono text-slate-400">
                          {stopItem.distanceKm.toFixed(1)} km
                        </span>
                        {fullStop && (
                          <button
                            onClick={() => {
                              onSelectStop(fullStop);
                              onClose();
                            }}
                            className="block mt-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
                          >
                            View Arrivals
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active approaching bus banner */}
                    {busesNearThisStop.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs text-amber-300 bg-amber-950/30 -mx-3 -mb-3 p-2.5 rounded-b-xl">
                        <div className="flex items-center gap-1.5">
                          <Bus className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                          <span className="font-semibold">
                            {busesNearThisStop[0].plateNumber} approaching
                          </span>
                        </div>
                        <span className="font-mono text-[11px]">
                          ~{Math.round(busesNearThisStop[0].speed)} km/h
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close Route View
          </button>
        </div>
      </div>
    </div>
  );
};
