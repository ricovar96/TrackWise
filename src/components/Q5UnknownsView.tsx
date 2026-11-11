import { AlertTriangle, FileText, HelpCircle, ShieldAlert } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import type { TractData } from '../types';

interface Q5UnknownsViewProps {
  tracts: TractData[];
  onSelectTract: (tract: TractData) => void;
}

export const Q5UnknownsView: React.FC<Q5UnknownsViewProps> = ({ tracts, onSelectTract }) => {
  const [filterType, setFilterType] = useState<'all' | 'blind_spot' | 'wide_moe' | 'insufficient'>('all');

  const blindSpots = tracts.filter((t) => t.primary_gap === 'Possible blind spot');
  const wideMoeTracts = tracts.filter((t) => t.wide_moe === 1 && t.has_gap === 1);
  const insufficientDataTracts = tracts.filter((t) => t.primary_gap === 'Insufficient data');

  const counties = ['Orange', 'Osceola', 'Lake', 'Seminole'];

  const displayedTracts = tracts.filter((t) => {
    if (filterType === 'blind_spot') return t.primary_gap === 'Possible blind spot';
    if (filterType === 'wide_moe') return t.wide_moe === 1;
    if (filterType === 'insufficient') return t.primary_gap === 'Insufficient data';
    return t.primary_gap === 'Possible blind spot' || t.wide_moe === 1 || t.primary_gap === 'Insufficient data';
  });

  const dataLimitations = [
    {
      title: 'CDC PLACES Transportation Measures Blank for Central Florida',
      category: 'Assumption & Data Void',
      impact:
        'The CDC PLACES 2025 dataset lacks transport measures for Orange, Osceola, Seminole, and Lake county census tracts.',
      mitigation:
        'Substituted USDA SRAM vehicle access indicators (households without vehicle and no-vehicle low-access share). Review when CDC releases updated Florida measures.',
      status: 'Active Substitution',
    },
    {
      title: 'Euclidean (Straight-Line) Distance to SNAP Stores',
      category: 'Physical Barrier Risk',
      impact:
        'Straight-line distance understates travel barriers where major highways (I-4, SR-408, SR-417, Florida Turnpike) or rail corridors divide neighborhoods from grocery stores.',
      mitigation:
        'Validate top-ranked vehicle-gap tracts through ground field checks and local bus transit route mapping before establishing physical sites.',
      status: 'Field Check Required',
    },
    {
      title: 'Survey Sampling Uncertainty (Wide Margins of Error)',
      category: 'Statistical Variance',
      impact:
        'Census ACS survey estimates carry wide margins of error (MOE > 30% of estimate) in small residential census tracts.',
      mitigation:
        'Confidence scoring (4-point rubric) and review tiers (Tier 1, Tier 2, Review Required) prevent premature capital investment in borderline tracts.',
      status: 'Enforced by Review Tiers',
    },
    {
      title: 'USDA Food Access Vintage & Boundary Standards',
      category: 'Temporal Vintage',
      impact:
        'USDA Food Access Research Atlas and SRAM datasets use 2020 tract definitions and July 2026 retailer snapshots.',
      mitigation:
        'The automated upload portal versioning architecture enables re-running the gap engine as Census and USDA publish fresh annual vintages.',
      status: 'Version Controlled',
    },
    {
      title: 'SNAP Retailer Inventory Quality & Operating Hours',
      category: 'Retail Quality Void',
      impact:
        'USDA retailer list includes convenience stores and gas stations that accept EBT but offer minimal fresh fruits, vegetables, or nutritious perishables.',
      mitigation:
        'Recommend partnering with full-service grocers, mobile farmers markets, and food bank distribution trucks.',
      status: 'Qualitative Check',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          What Don't We Know? (Data Gaps & Uncertainty)
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          High-confidence decisions require knowing where the data is uncertain. This view surfaces statistical blind
          spots, tracts where Census survey margins of error are wide, and explicit data substitutions made across
          Central Florida.
        </p>
      </div>

      {/* FR-10: County Scorecards of Unknowns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-xs font-semibold">Possible Blind Spots</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">{blindSpots.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tracts with multiple elevated Q3 signals without a single Q4 trigger (~315,000 residents).
          </p>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
            <span className="text-xs font-semibold">Wide MOE Gap Tracts</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {wideMoeTracts.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Gap tracts where poverty margin of error exceeds 30% of the estimate.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-xs font-semibold">Insufficient Data Tracts</span>
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {insufficientDataTracts.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tracts with population &lt; 500 or missing poverty/access flags. Do not act yet.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 mb-1">
            <span className="text-xs font-semibold">Review Required Tier</span>
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {tracts.filter((t) => t.review_tier === 'Review required').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Tracts flagged for team review or field validation prior to deploying capital.
          </p>
        </div>
      </div>

      {/* FR-10: County Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Uncertainty Distribution by County (FR-10)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4">County</th>
                <th className="py-2.5 px-3 text-right">Total Tracts</th>
                <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">Blind Spots</th>
                <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">Wide Poverty MOE</th>
                <th className="py-2.5 px-3 text-right text-slate-500">Insufficient Data</th>
                <th className="py-2.5 px-4 text-right">Review Required Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              {counties.map((c) => {
                const cTracts = tracts.filter((t) => t.county === c);
                const bCount = cTracts.filter((t) => t.primary_gap === 'Possible blind spot').length;
                const wCount = cTracts.filter((t) => t.wide_moe === 1 && t.has_gap === 1).length;
                const iCount = cTracts.filter((t) => t.primary_gap === 'Insufficient data').length;
                const rCount = cTracts.filter((t) => t.review_tier === 'Review required').length;
                return (
                  <tr key={c} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-900 dark:text-slate-100">
                      {c} County
                    </td>
                    <td className="py-2.5 px-3 text-right">{cTracts.length}</td>
                    <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400 font-semibold">
                      {bCount}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">{wCount}</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{iCount}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{rCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FR-11: Tract List of Unknowns & Blind Spots */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tracts Behind the Unknowns (FR-11)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any tract to inspect its full demographic margins of error and supporting evidence.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Uncertain ({displayedTracts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('blind_spot')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'blind_spot'
                  ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Blind Spots ({blindSpots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('wide_moe')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'wide_moe'
                  ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Wide MOE ({wideMoeTracts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('insufficient')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterType === 'insufficient'
                  ? 'bg-white dark:bg-slate-700 font-semibold shadow-xs text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Insufficient ({insufficientDataTracts.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4">Tract & County</th>
                <th className="py-2.5 px-3 text-right">Population</th>
                <th className="py-2.5 px-3 text-right">Poverty Rate ± MOE</th>
                <th className="py-2.5 px-3">Primary Classification</th>
                <th className="py-2.5 px-4">Specific Uncertainty Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayedTracts.map((t) => (
                <tr
                  key={t.GEOID}
                  onClick={() => onSelectTract(t)}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2 px-4">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{t.tract_name}</span>
                    <span className="text-[11px] text-slate-500 block">
                      {t.county} County · {t.GEOID}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{t.population.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {t.poverty_rate !== null
                      ? `${t.poverty_rate.toFixed(1)}% ±${t.poverty_rate_moe?.toFixed(1) || '0'}%`
                      : 'N/A'}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`font-medium ${
                        t.primary_gap === 'Possible blind spot'
                          ? 'text-amber-600 dark:text-amber-400'
                          : t.primary_gap === 'Insufficient data'
                            ? 'text-slate-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {t.primary_gap}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-slate-600 dark:text-slate-400 text-[11px]">{t.unknown_reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FR-12: Documented Data Limitations */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          FR-12: Documented Methodological Limitations & Mitigations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {dataLimitations.map((lim) => (
            <div
              key={lim.title}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {lim.category}
                </span>
                <span className="text-[11px] font-mono text-slate-500">{lim.status}</span>
              </div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{lim.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <b className="text-slate-700 dark:text-slate-300">Known Limit:</b> {lim.impact}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-100 dark:border-slate-800">
                <b className="text-slate-700 dark:text-slate-300">Mitigation:</b> {lim.mitigation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
