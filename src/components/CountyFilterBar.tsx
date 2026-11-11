import type React from 'react';
import type { CountyFilter } from '../types';

interface CountyFilterBarProps {
  selectedCounty: CountyFilter;
  onSelectCounty: (county: CountyFilter) => void;
  totalTracts: number;
  gapTracts: number;
  gapPopulation: number;
  blindSpots: number;
  retailerCount: number;
}

export const CountyFilterBar: React.FC<CountyFilterBarProps> = ({
  selectedCounty,
  onSelectCounty,
  totalTracts,
  gapTracts,
  gapPopulation,
  blindSpots,
  retailerCount,
}) => {
  const counties: { id: CountyFilter; label: string }[] = [
    { id: 'All', label: 'All Central Florida (490)' },
    { id: 'Orange', label: 'Orange County (267)' },
    { id: 'Osceola', label: 'Osceola County (59)' },
    { id: 'Seminole', label: 'Seminole County (89)' },
    { id: 'Lake', label: 'Lake County (75)' },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* County Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg overflow-x-auto">
        {counties.map((c) => {
          const isActive = selectedCounty === c.id;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelectCounty(c.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Clean Unboxed Metadata Metrics */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{totalTracts}</span> Tracts
        </div>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          ·
        </span>
        <div>
          <span className="font-semibold text-red-600 dark:text-red-400 tabular-nums">{gapTracts}</span> Gap Tracts (
          {((gapTracts / (totalTracts || 1)) * 100).toFixed(0)}%)
        </div>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          ·
        </span>
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {gapPopulation.toLocaleString()}
          </span>{' '}
          People Affected
        </div>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          ·
        </span>
        <div>
          <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{blindSpots}</span> Blind
          Spots
        </div>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
          ·
        </span>
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {retailerCount.toLocaleString()}
          </span>{' '}
          SNAP Retailers
        </div>
      </div>
    </div>
  );
};
