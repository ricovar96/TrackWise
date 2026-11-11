import { ArrowUpDown, Download, Eye, Search } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { TractData } from '../types';

interface RankedTractsTableProps {
  tracts: TractData[];
  onSelectTract: (tract: TractData) => void;
  selectedTract: TractData | null;
}

export const RankedTractsTable: React.FC<RankedTractsTableProps> = ({ tracts, onSelectTract, selectedTract }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gapFilter, setGapFilter] = useState<string>('all_gaps');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'population' | 'poverty_rate' | 'snap_rate'>('population');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter tracts
  const filteredTracts = useMemo(() => {
    return tracts.filter((t) => {
      // Search
      const matchesSearch =
        t.tract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.GEOID.includes(searchTerm) ||
        t.county.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Gap filter
      if (gapFilter === 'all_gaps') {
        if (!t.has_gap && t.primary_gap !== 'Possible blind spot') return false;
      } else if (gapFilter !== 'all') {
        if (t.primary_gap !== gapFilter) return false;
      }

      // Tier filter
      if (tierFilter !== 'all' && t.review_tier !== tierFilter) {
        return false;
      }

      return true;
    });
  }, [tracts, searchTerm, gapFilter, tierFilter]);

  // Sort tracts
  const sortedTracts = useMemo(() => {
    return [...filteredTracts].sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredTracts, sortField, sortAsc]);

  const handleSort = (field: 'population' | 'poverty_rate' | 'snap_rate') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const downloadFilteredCsv = () => {
    if (sortedTracts.length === 0) return;
    const headers = [
      'GEOID',
      'Tract_Name',
      'County',
      'Population',
      'Poverty_Rate',
      'Poverty_MOE',
      'SNAP_Rate',
      'Primary_Gap',
      'Confidence',
      'Review_Tier',
      'Recommended_Response',
    ];
    const rows = sortedTracts.map((t) => [
      t.GEOID,
      `"${t.tract_name}"`,
      t.county,
      t.population,
      t.poverty_rate ?? '',
      t.poverty_rate_moe ?? '',
      t.snap_rate ?? '',
      `"${t.primary_gap}"`,
      t.confidence,
      `"${t.review_tier}"`,
      `"${t.recommended_resource}"`,
    ]);
    const csvContent = `data:text/csv;charset=utf-8,${[headers.join(','), ...rows.map((e) => e.join(','))].join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ranked_gap_tracts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
      {/* Control Strip */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tract, county, or GEOID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={gapFilter}
            onChange={(e) => setGapFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all_gaps">All Gap & Blind Spot Tracts</option>
            <option value="all">All 490 Tracts</option>
            <option value="Classic food desert">Classic Food Deserts</option>
            <option value="Vehicle-compounded gap">Vehicle-Compounded Gaps</option>
            <option value="SNAP enrollment gap">SNAP Enrollment Gaps</option>
            <option value="Possible blind spot">Possible Blind Spots</option>
            <option value="Insufficient data">Insufficient Data</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Tiers</option>
            <option value="Tier 1">Tier 1 (Ready to Act)</option>
            <option value="Tier 2">Tier 2 (Team Review)</option>
            <option value="Review required">Review Required</option>
          </select>

          <button
            type="button"
            onClick={downloadFilteredCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-xs text-slate-600 dark:text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-2.5 px-4">Tract & County</th>
              <th
                className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                onClick={() => handleSort('population')}
              >
                <div className="flex items-center gap-1">
                  <span>People</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                onClick={() => handleSort('poverty_rate')}
              >
                <div className="flex items-center gap-1">
                  <span>Poverty Rate</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                className="py-2.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-slate-100"
                onClick={() => handleSort('snap_rate')}
              >
                <div className="flex items-center gap-1">
                  <span>SNAP Rate</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2.5 px-4">Primary Gap</th>
              <th className="py-2.5 px-4">Review Tier</th>
              <th className="py-2.5 px-4">Recommended Response</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedTracts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No census tracts match the current filters.
                </td>
              </tr>
            ) : (
              sortedTracts.map((t, _idx) => {
                const isSelected = selectedTract?.GEOID === t.GEOID;
                return (
                  <tr
                    key={t.GEOID}
                    onClick={() => onSelectTract(t)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      isSelected ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{t.tract_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {t.county} County · GEOID {t.GEOID}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                      {t.population.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">
                      {t.poverty_rate !== null ? (
                        <span>
                          {t.poverty_rate.toFixed(1)}%{' '}
                          <span className="text-[10px] text-slate-400">±{t.poverty_rate_moe?.toFixed(1) || '0'}%</span>
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums">
                      {t.snap_rate !== null ? `${t.snap_rate.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      <span
                        className={
                          t.primary_gap === 'Classic food desert'
                            ? 'text-red-700 dark:text-red-400 font-semibold'
                            : t.primary_gap === 'Vehicle-compounded gap'
                              ? 'text-red-600 dark:text-red-400'
                              : t.primary_gap === 'SNAP enrollment gap'
                                ? 'text-rose-600 dark:text-rose-400'
                                : t.primary_gap === 'Possible blind spot'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500'
                        }
                      >
                        {t.primary_gap}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{t.review_tier}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {t.confidence} conf. ({t.confidence_score} pts)
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 dark:text-slate-200">{t.recommended_resource}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTract(t);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Inspect Tract"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {sortedTracts.length} of {tracts.length} tracts
        </div>
        <div className="text-[11px]">Click any row to inspect details or zoom on map</div>
      </div>
    </div>
  );
};
