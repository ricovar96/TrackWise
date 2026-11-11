import { DollarSign, MapPin, Users, X } from 'lucide-react';
import type React from 'react';
import type { TractData } from '../types';

interface TractDetailModalProps {
  tract: TractData | null;
  onClose: () => void;
}

export const TractDetailModal: React.FC<TractDetailModalProps> = ({ tract, onClose }) => {
  if (!tract) return null;

  const relPovMoe =
    tract.poverty_rate && tract.poverty_rate > 0 && tract.poverty_rate_moe
      ? ((tract.poverty_rate_moe / tract.poverty_rate) * 100).toFixed(0)
      : null;

  return (
    <div className="fixed inset-y-0 right-0 z-[2000] w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-colors overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-900/50">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>
              {tract.county} County · GEOID {tract.GEOID}
            </span>
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{tract.tract_name}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-700 dark:text-slate-300">
        {/* Gap Classification & Recommended Response Box */}
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-500 dark:text-slate-400">Primary Gap</span>
            <span
              className={`font-semibold ${
                tract.has_gap
                  ? 'text-red-600 dark:text-red-400'
                  : tract.primary_gap === 'Possible blind spot'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {tract.primary_gap}
            </span>
          </div>

          {tract.secondary_gap && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-slate-500">Secondary Gap</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{tract.secondary_gap}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Recommended Intervention
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {tract.recommended_resource}
            </p>
          </div>
        </div>

        {/* Confidence & Review Tier (Section 6.3) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Confidence & Review Tier</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {tract.review_tier} ({tract.confidence} confidence)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
            <div className="p-2.5 rounded-md bg-slate-100 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-400">Confidence Score</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {tract.confidence_score} / 5 points
              </div>
            </div>
            <div className="p-2.5 rounded-md bg-slate-100 dark:bg-slate-800/60">
              <div className="text-[10px] text-slate-400">Poverty MOE Ratio</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {relPovMoe ? `±${relPovMoe}% of estimate` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Evidence Narrative */}
          <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-1">
            <div>
              <span className="font-medium text-slate-800 dark:text-slate-200">Supporting Evidence: </span>
              <span className="text-slate-600 dark:text-slate-400">{tract.supporting_evidence}</span>
            </div>
            {tract.limiting_evidence && (
              <div>
                <span className="font-medium text-amber-700 dark:text-amber-400">Data Limitations: </span>
                <span className="text-slate-600 dark:text-slate-400">{tract.limiting_evidence}</span>
              </div>
            )}
          </div>
        </div>

        {/* Demographics & Economic Stats */}
        <div className="space-y-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100">Demographics (Census ACS 2024)</span>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                <Users className="w-3.5 h-3.5" />
                <span>Total Population</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {tract.population.toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1 text-slate-400 mb-0.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Median Income</span>
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {tract.median_household_income ? `$${tract.median_household_income.toLocaleString()}` : 'N/A'}
              </div>
            </div>

            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="text-slate-400 mb-0.5">Poverty Rate</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {tract.poverty_rate !== null ? `${tract.poverty_rate.toFixed(1)}%` : 'N/A'}
                <span className="text-[10px] text-slate-400 ml-1">
                  ±{tract.poverty_rate_moe?.toFixed(1) || '0'}% (Q{tract.poverty_q || '-'})
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="text-slate-400 mb-0.5">SNAP Participation</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {tract.snap_rate !== null ? `${tract.snap_rate.toFixed(1)}%` : 'N/A'}
                <span className="text-[10px] text-slate-400 ml-1">({tract.snap_households} HH)</span>
              </div>
            </div>
          </div>
        </div>

        {/* USDA Food Access & Vehicle Measures */}
        <div className="space-y-2">
          <span className="font-semibold text-slate-900 dark:text-slate-100">USDA Food & Transportation Access</span>
          <div className="space-y-1.5 p-3 rounded-md border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span>USDA Low-Income Low-Access (LILA)</span>
              <span className={`font-semibold ${tract.lila_flag ? 'text-red-600' : 'text-slate-500'}`}>
                {tract.lila_flag ? 'Flagged (1)' : 'Not Flagged (0)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>USDA Low-Access Tract Flag</span>
              <span className={`font-semibold ${tract.low_access_flag ? 'text-red-600' : 'text-slate-500'}`}>
                {tract.low_access_flag ? 'Flagged (1)' : 'Not Flagged (0)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>No-Vehicle Low-Access Share</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {tract.no_vehicle_low_access_pct.toFixed(2)} share (Q{tract.vehicle_q || '-'})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Households Without a Vehicle</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {tract.households_no_vehicle} ({tract.no_vehicle_pct}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tract Environment</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {tract.urban_flag ? 'Urban' : 'Rural'}
              </span>
            </div>
          </div>
        </div>

        {/* Scenario Analysis Benchmark */}
        <div className="p-3 rounded-md bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-[11px] space-y-1">
          <span className="font-semibold text-amber-900 dark:text-amber-200">
            +10% Regional Poverty Stress Scenario
          </span>
          <p className="text-amber-800 dark:text-amber-300">
            Under a 10% regional poverty increase, projected poverty rate would reach{' '}
            <b className="tabular-nums">{tract.poverty_rate_pov10?.toFixed(1) || 'N/A'}%</b>.
            {tract.scenario_new_gap_pov10 === 1 ? (
              <span className="text-red-700 font-bold block mt-0.5">
                ⚠ This tract would be NEWLY FLAGGED as a food access gap!
              </span>
            ) : tract.has_gap === 1 ? (
              <span className="block mt-0.5">Already identified as an active gap at baseline.</span>
            ) : (
              <span className="block mt-0.5">Would remain below the regional intervention threshold.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
