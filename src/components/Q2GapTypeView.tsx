import { AlertCircle, Car, HelpCircle, ShoppingBag, Users } from 'lucide-react';
import type React from 'react';
import type { CountyName, PrimaryGap, TractData } from '../types';

interface Tally {
  tracts: number;
  pop: number;
}

const GAP_TYPES: PrimaryGap[] = [
  'Classic food desert',
  'Vehicle-compounded gap',
  'SNAP enrollment gap',
  'Possible blind spot',
  'Insufficient data',
  'No gap identified',
];

const COUNTIES: CountyName[] = ['Orange', 'Osceola', 'Lake', 'Seminole'];

const emptyTallies = () =>
  Object.fromEntries(GAP_TYPES.map((g) => [g, { tracts: 0, pop: 0 }])) as Record<PrimaryGap, Tally>;

interface Q2GapTypeViewProps {
  tracts: TractData[];
}

export const Q2GapTypeView: React.FC<Q2GapTypeViewProps> = ({ tracts }) => {
  // Counts by primary gap, and counts including secondary gaps
  const primaryCounts = emptyTallies();
  const totalCounts = emptyTallies();
  const matrix = Object.fromEntries(
    COUNTIES.map((c) => [c, Object.fromEntries(GAP_TYPES.map((g) => [g, 0]))]),
  ) as Record<CountyName, Record<PrimaryGap, number>>;
  const matrixPop = Object.fromEntries(COUNTIES.map((c) => [c, 0])) as Record<CountyName, number>;

  for (const t of tracts) {
    primaryCounts[t.primary_gap].tracts += 1;
    primaryCounts[t.primary_gap].pop += t.population;

    totalCounts[t.primary_gap].tracts += 1;
    totalCounts[t.primary_gap].pop += t.population;

    // Add secondary if present and distinct
    if (t.secondary_gap && t.secondary_gap !== t.primary_gap) {
      totalCounts[t.secondary_gap].tracts += 1;
      totalCounts[t.secondary_gap].pop += t.population;
    }

    matrix[t.county][t.primary_gap] += 1;
    if (t.has_gap) {
      matrixPop[t.county] += t.population;
    }
  }

  const gapDescriptions = [
    {
      title: 'Classic Food Desert',
      badge: 'High Poverty + Low Access',
      count: primaryCounts['Classic food desert'].tracts,
      pop: primaryCounts['Classic food desert'].pop,
      what: 'High poverty (Q4) and USDA Low-Income Low-Access (LILA) designation (>1 mile urban or >10 miles rural from nearest supermarket).',
      response: 'Partner store, mobile grocery market, or community pantry.',
      color: 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20',
      icon: ShoppingBag,
    },
    {
      title: 'Vehicle-Compounded Gap',
      badge: 'Low Access + No Vehicle',
      count: primaryCounts['Vehicle-compounded gap'].tracts,
      secondaryCount: totalCounts['Vehicle-compounded gap'].tracts,
      pop: primaryCounts['Vehicle-compounded gap'].pop,
      secondaryPop: totalCounts['Vehicle-compounded gap'].pop,
      what: 'Far from a supermarket with a high share of zero-vehicle households. Straight-line distance understates travel barriers when highways or rail split neighborhoods.',
      response: 'Transportation assistance, home delivery, pantry placement along LYNX bus routes.',
      color: 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20',
      icon: Car,
    },
    {
      title: 'SNAP Enrollment Gap',
      badge: 'High Poverty + Low SNAP',
      count: primaryCounts['SNAP enrollment gap'].tracts,
      secondaryCount: totalCounts['SNAP enrollment gap'].tracts,
      pop: primaryCounts['SNAP enrollment gap'].pop,
      secondaryPop: totalCounts['SNAP enrollment gap'].pop,
      what: 'High poverty rate (Q4) but disproportionately low SNAP enrollment (Q1 or Q2). Eligible families are not accessing federal benefits.',
      response: 'SNAP enrollment drives, community navigator events, multi-lingual outreach.',
      color: 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20',
      icon: Users,
    },
    {
      title: 'Possible Blind Spot',
      badge: 'Elevated Compound Signals',
      count: primaryCounts['Possible blind spot'].tracts,
      pop: primaryCounts['Possible blind spot'].pop,
      what: 'No single indicator in Q4, but multiple indicators in Q3. Substantial pockets of need that national thresholds overlook.',
      response: 'Field checks, local agency survey, and focus groups before capital investment.',
      color: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20',
      icon: AlertCircle,
    },
    {
      title: 'Insufficient Data',
      badge: 'Missing or Sparse Census Data',
      count: primaryCounts['Insufficient data'].tracts,
      pop: primaryCounts['Insufficient data'].pop,
      what: 'Missing values or population under 500 residents. Survey estimates carry too wide a margin of error to evaluate confidently.',
      response: 'Local ground-truth data collection; hold action until verified.',
      color: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40',
      icon: HelpCircle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Lead */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          What Type of Food Access Gap Is It?
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Food access is not one single problem. Two Central Florida neighborhoods can appear underserved for entirely
          different structural reasons. Distinguishing between physical grocery absence, transportation poverty, and
          benefit under-enrollment ensures limited funding and pantries are deployed effectively.
        </p>
      </div>

      {/* FR-08: County x Gap Type Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              County × Gap Type Regional Matrix (FR-08)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Census tract counts by primary gap classification across the 4 Central Florida counties.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4">County</th>
                <th className="py-2.5 px-3 text-right">Total Tracts</th>
                <th className="py-2.5 px-3 text-right text-red-700 dark:text-red-400">Classic Desert</th>
                <th className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">Vehicle Gap</th>
                <th className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">SNAP Gap</th>
                <th className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">Blind Spot</th>
                <th className="py-2.5 px-3 text-right text-slate-500">Insufficient Data</th>
                <th className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                  People in Gap Tracts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono tabular-nums">
              {COUNTIES.map((c) => {
                const totalCty = tracts.filter((t) => t.county === c).length;
                return (
                  <tr key={c} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-900 dark:text-slate-100">
                      {c} County
                    </td>
                    <td className="py-2.5 px-3 text-right">{totalCty}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-red-700 dark:text-red-400">
                      {matrix[c]['Classic food desert']}
                    </td>
                    <td className="py-2.5 px-3 text-right text-red-600 dark:text-red-400">
                      {matrix[c]['Vehicle-compounded gap']}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                      {matrix[c]['SNAP enrollment gap']}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                      {matrix[c]['Possible blind spot']}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{matrix[c]['Insufficient data']}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900 dark:text-slate-100 font-mono">
                      {matrixPop[c].toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                <td className="py-3 px-4 font-sans text-slate-900 dark:text-slate-100">Regional Total</td>
                <td className="py-3 px-3 text-right">{tracts.length}</td>
                <td className="py-3 px-3 text-right text-red-700 dark:text-red-400">
                  {primaryCounts['Classic food desert'].tracts}
                </td>
                <td className="py-3 px-3 text-right text-red-600 dark:text-red-400">
                  {primaryCounts['Vehicle-compounded gap'].tracts}
                </td>
                <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                  {primaryCounts['SNAP enrollment gap'].tracts}
                </td>
                <td className="py-3 px-3 text-right text-amber-600 dark:text-amber-400">
                  {primaryCounts['Possible blind spot'].tracts}
                </td>
                <td className="py-3 px-3 text-right text-slate-400">{primaryCounts['Insufficient data'].tracts}</td>
                <td className="py-3 px-4 text-right text-slate-900 dark:text-slate-100 font-mono">
                  {(
                    primaryCounts['Classic food desert'].pop +
                    primaryCounts['Vehicle-compounded gap'].pop +
                    primaryCounts['SNAP enrollment gap'].pop
                  ).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FR-07 Note on Secondary Gaps */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
          <p>
            <b>FR-07 Counting Secondary Gaps:</b> When secondary gaps are included, vehicle barriers affect{' '}
            <b className="text-slate-900 dark:text-slate-100 tabular-nums">
              {totalCounts['Vehicle-compounded gap'].tracts} tracts
            </b>{' '}
            (~{totalCounts['Vehicle-compounded gap'].pop.toLocaleString()} people), and SNAP enrollment gaps affect{' '}
            <b className="text-slate-900 dark:text-slate-100 tabular-nums">
              {totalCounts['SNAP enrollment gap'].tracts} tracts
            </b>{' '}
            (~{totalCounts['SNAP enrollment gap'].pop.toLocaleString()} people). Transportation is the region’s single
            most widespread barrier.
          </p>
        </div>
      </div>

      {/* FR-09: Actionable Interventions Guide by Gap Type */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          FR-09: Recommended Interventions by Gap Type
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {gapDescriptions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`p-4 rounded-xl border ${item.color} flex flex-col justify-between space-y-3 transition-colors`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h4>
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {item.count} tracts ({item.pop.toLocaleString()} people)
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.what}</p>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                    Recommended Operational Response:
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{item.response}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
