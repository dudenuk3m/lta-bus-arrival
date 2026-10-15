import React from 'react';
import { BusStop, FavoriteItem } from '../types/bus';
import { SINGAPORE_BUS_STOPS } from '../data/singaporeBuses';
import { Star, Trash2, MapPin, ArrowRight, Clock } from 'lucide-react';

interface FavoritesTabProps {
  favorites: FavoriteItem[];
  onSelectStop: (stop: BusStop) => void;
  onRemoveFavorite: (stopCode: string) => void;
  selectedStopCode: string;
}

export const FavoritesTab: React.FC<FavoritesTabProps> = ({
  favorites,
  onSelectStop,
  onRemoveFavorite,
  selectedStopCode,
}) => {
  if (favorites.length === 0) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
          <Star className="w-6 h-6 stroke-1" />
        </div>
        <h4 className="text-sm font-bold text-slate-200">No Saved Bus Stops</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Tap the star icon on any bus stop card to pin your daily commute stops (e.g. home, office, MRT interchange) here for 1-tap live arrival times.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
        Pinned Commute Stops ({favorites.length})
      </div>

      {favorites.map((fav) => {
        const stop = SINGAPORE_BUS_STOPS.find((s) => s.BusStopCode === fav.stopCode);
        if (!stop) return null;
        const isSelected = stop.BusStopCode === selectedStopCode;

        return (
          <div
            key={fav.stopCode}
            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              isSelected
                ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <button
              onClick={() => onSelectStop(stop)}
              className="text-left flex-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-700">
                  {stop.BusStopCode}
                </span>
                <span className="text-xs font-bold text-white truncate">
                  {stop.Description}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {stop.RoadName} · {stop.services.length} bus services
              </div>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFavorite(fav.stopCode);
              }}
              title="Remove from favorites"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
