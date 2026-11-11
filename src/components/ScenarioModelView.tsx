import { ArrowDownRight, ArrowUpRight, Eye, RotateCcw, Sliders } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { runScenarioModel } from '../services/foodGapEngine';
import type { TractData } from '../types';

interface ScenarioModelViewProps {
  tracts: TractData[];
  onSelectTract: (tract: TractData) => void;
}

export const ScenarioModelView: React.FC<ScenarioModelViewProps> = ({ tracts, onSelectTract }) => {
  const [povertyDeltaPct, setPovertyDeltaPct] = useState<number>(0);
  const [vehicleDeltaPct, setVehicleDeltaPct] = useState<number>(0);

  const scenarioResult = useMemo(() => {
    return runScenarioModel(tracts, { povertyDeltaPct, vehicleDeltaPct });
  }, [tracts, povertyDeltaPct, vehicleDeltaPct]);

  const handleReset = () => {
    setPovertyDeltaPct(0);
    setVehicleDeltaPct(0);
  };

  const handleSetPreset10 = () => {
    setPovertyDeltaPct(10);
    setVehicleDeltaPct(0);
  };

  const isChanged = povertyDeltaPct !== 0 || vehicleDeltaPct !== 0;

  return (
    <div className="space-y-6">
      {/* Overview Intro */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-600" />
              <span>FR-13: Interactive What-If Scenario Studio</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              This scenario model is a decision-support what-if tool, not a time-series forecast. Adjust regional
              poverty and vehicle barrier levels to evaluate sensitivity, anticipate future demographic stress, and
              prioritize interventions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetPreset10}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                povertyDeltaPct === 10 && vehicleDeltaPct === 0
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              +10% Poverty Benchmark
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isChanged}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sliders Panel */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 transition-colors">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Scenario Parameters
          </h3>

          {/* Poverty Rate Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-800 dark:text-slate-200">Regional Poverty Rate Shift</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  povertyDeltaPct > 0
                    ? 'text-red-600 dark:text-red-400'
                    : povertyDeltaPct < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {povertyDeltaPct > 0 ? `+${povertyDeltaPct}%` : `${povertyDeltaPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="40"
              step="5"
              value={povertyDeltaPct}
              onChange={(e) => setPovertyDeltaPct(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-20%</span>
              <span>Baseline (0%)</span>
              <span>+40%</span>
            </div>
          </div>

          {/* Vehicle Access Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-800 dark:text-slate-200">No-Vehicle Low-Access Share Shift</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  vehicleDeltaPct > 0
                    ? 'text-red-600 dark:text-red-400'
                    : vehicleDeltaPct < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {vehicleDeltaPct > 0 ? `+${vehicleDeltaPct}%` : `${vehicleDeltaPct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="50"
              step="5"
              value={vehicleDeltaPct}
              onChange={(e) => setVehicleDeltaPct(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-20%</span>
              <span>Baseline (0%)</span>
              <span>+50%</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Fixed model cutoffs: 75th percentile of poverty (17.1%), 75th percentile of vehicle access share (0.49),
            median SNAP rate (11.3%).
          </div>
        </div>

        {/* Dynamic Recalculated Scorecards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gap Tracts Scorecard */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-medium text-slate-500">Projected Food Gap Tracts</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                {scenarioResult.gapTractsCount}
                <span className="text-xs font-normal text-slate-400 ml-1.5">of 490 tracts</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Change from baseline ({scenarioResult.baselineGapTractsCount}):</span>
              <span
                className={`font-semibold flex items-center gap-0.5 tabular-nums ${
                  scenarioResult.deltaTracts > 0
                    ? 'text-red-600 dark:text-red-400'
                    : scenarioResult.deltaTracts < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {scenarioResult.deltaTracts > 0 ? (
                  <>
                    <ArrowUpRight className="w-4 h-4" />+{scenarioResult.deltaTracts} tracts
                  </>
                ) : scenarioResult.deltaTracts < 0 ? (
                  <>
                    <ArrowDownRight className="w-4 h-4" />
                    {scenarioResult.deltaTracts} tracts
                  </>
                ) : (
                  'No change'
                )}
              </span>
            </div>
          </div>

          {/* Population Affected Scorecard */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between transition-colors">
            <div>
              <div className="text-xs font-medium text-slate-500">Projected Population Affected</div>
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
                {scenarioResult.gapPopulation.toLocaleString()}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Net Population Impact:</span>
              <span
                className={`font-semibold flex items-center gap-0.5 tabular-nums ${
                  scenarioResult.deltaPopulation > 0
                    ? 'text-red-600 dark:text-red-400'
                    : scenarioResult.deltaPopulation < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {scenarioResult.deltaPopulation > 0 ? (
                  <>
                    <ArrowUpRight className="w-4 h-4" />+{scenarioResult.deltaPopulation.toLocaleString()} residents
                  </>
                ) : scenarioResult.deltaPopulation < 0 ? (
                  <>
                    <ArrowDownRight className="w-4 h-4" />
                    {scenarioResult.deltaPopulation.toLocaleString()} residents
                  </>
                ) : (
                  '0 residents'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Newly Flagged Tracts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Newly Flagged Gap Tracts Under Scenario ({scenarioResult.newlyFlaggedTracts.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracts that cross regional food gap thresholds under current simulation parameters.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[350px]">
          {scenarioResult.newlyFlaggedTracts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {povertyDeltaPct <= 0 && vehicleDeltaPct <= 0
                ? 'Baseline or decreased stress parameters: no new tracts flagged.'
                : 'No additional census tracts crossed the threshold under these parameters.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Tract & County</th>
                  <th className="py-2.5 px-3 text-right">Population</th>
                  <th className="py-2.5 px-3 text-right">Baseline Poverty</th>
                  <th className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">Simulated Poverty</th>
                  <th className="py-2.5 px-3 text-right">Vehicle Low-Access</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
                {scenarioResult.newlyFlaggedTracts.map((t) => {
                  const simPov =
                    t.poverty_rate !== null ? (t.poverty_rate * (1 + povertyDeltaPct / 100)).toFixed(1) : 'N/A';
                  return (
                    <tr
                      key={t.GEOID}
                      onClick={() => onSelectTract(t)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-4 font-sans">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{t.tract_name}</span>
                        <span className="text-[11px] text-slate-500 block">
                          {t.county} County · {t.GEOID}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">{t.population.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{t.poverty_rate?.toFixed(1) || 'N/A'}%</td>
                      <td className="py-2 px-3 text-right font-bold text-red-600 dark:text-red-400">{simPov}%</td>
                      <td className="py-2 px-3 text-right">{t.no_vehicle_low_access_pct.toFixed(2)} share</td>
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTract(t);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
