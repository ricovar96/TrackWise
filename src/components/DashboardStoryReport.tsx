import {
  Activity,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Map as MapIcon,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import type React from 'react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { runScenarioModel, runSensitivityTest } from '../services/foodGapEngine';
import type { ChurchData, CountyFilter, RetailerData, SchoolData, ShadingMode, TractData } from '../types';

const MapGoogle = lazy(() => import('./MapGoogle').then((m) => ({ default: m.MapGoogle })));
const MapLeaflet = lazy(() => import('./MapLeaflet').then((m) => ({ default: m.MapLeaflet })));

interface DashboardStoryReportProps {
  tracts: TractData[];
  retailers: RetailerData[];
  churches: ChurchData[];
  schools: SchoolData[];
  selectedCounty: CountyFilter;
  onSelectCounty: (county: CountyFilter) => void;
  selectedTract: TractData | null;
  onSelectTract: (tract: TractData) => void;
  mapEngine: 'google' | 'leaflet';
  setMapEngine: (engine: 'google' | 'leaflet') => void;
  isDark: boolean;
}

// Canonical numbers from the official v1.1 specification table
export const CANONICAL_COUNTY_DATA = {
  All: {
    label: 'All Central Florida (490)',
    headlineLocation: 'across Central Florida',
    totalTracts: 490,
    gapTracts: 149,
    gapPopulation: 948632,
    classic: 68,
    vehiclePrimary: 76,
    vehicleTotal: 108,
    vehicleTotalPop: 697700,
    snapPrimary: 5,
    snapTotal: 12,
    snapTotalPop: 63000,
    classicPop: 443622,
    blindSpots: 58,
    blindSpotPop: 332800,
    uncertainEstimates: 18,
    notEvaluated: 2,
    retailers: 1697,
  },
  Orange: {
    label: 'Orange County (267)',
    headlineLocation: 'in Orange County',
    totalTracts: 267,
    gapTracts: 90,
    gapPopulation: 577381,
    classic: 49,
    vehiclePrimary: 36,
    vehicleTotal: 52,
    vehicleTotalPop: 374500,
    snapPrimary: 5,
    snapTotal: 10,
    snapTotalPop: 51200,
    classicPop: 328400,
    blindSpots: 26,
    blindSpotPop: 144300,
    uncertainEstimates: 9,
    notEvaluated: 2,
    retailers: 1042,
  },
  Osceola: {
    label: 'Osceola County (59)',
    headlineLocation: 'in Osceola County',
    totalTracts: 59,
    gapTracts: 28,
    gapPopulation: 196282,
    classic: 13,
    vehiclePrimary: 15,
    vehicleTotal: 22,
    vehicleTotalPop: 152100,
    snapPrimary: 0,
    snapTotal: 1,
    snapTotalPop: 6800,
    classicPop: 92300,
    blindSpots: 8,
    blindSpotPop: 48900,
    uncertainEstimates: 4,
    notEvaluated: 0,
    retailers: 247,
  },
  Lake: {
    label: 'Lake County (75)',
    headlineLocation: 'in Lake County',
    totalTracts: 75,
    gapTracts: 17,
    gapPopulation: 94565,
    classic: 2,
    vehiclePrimary: 15,
    vehicleTotal: 18,
    vehicleTotalPop: 88700,
    snapPrimary: 0,
    snapTotal: 1,
    snapTotalPop: 5000,
    classicPop: 4722,
    blindSpots: 8,
    blindSpotPop: 42700,
    uncertainEstimates: 2,
    notEvaluated: 0,
    retailers: 189,
  },
  Seminole: {
    label: 'Seminole County (89)',
    headlineLocation: 'in Seminole County',
    totalTracts: 89,
    gapTracts: 14,
    gapPopulation: 80404,
    classic: 4,
    vehiclePrimary: 10,
    vehicleTotal: 16,
    vehicleTotalPop: 82400,
    snapPrimary: 0,
    snapTotal: 0,
    snapTotalPop: 0,
    classicPop: 18200,
    blindSpots: 16,
    blindSpotPop: 96900,
    uncertainEstimates: 3,
    notEvaluated: 0,
    retailers: 219,
  },
};

export const DashboardStoryReport: React.FC<DashboardStoryReportProps> = ({
  tracts,
  retailers,
  churches,
  schools,
  selectedCounty,
  onSelectCounty,
  selectedTract,
  onSelectTract,
  mapEngine,
  setMapEngine,
  isDark,
}) => {
  // Map color mode: 'severity' (Gap type) or 'poverty' (Poverty rate)
  const [colorBy, setColorBy] = useState<ShadingMode>('severity');

  // Gap Tracts search
  const [gapSearchTerm, setGapSearchTerm] = useState('');

  // Section 4 Scenario Sliders (default +10% poverty, 0% vehicle)
  const [povertyDeltaPct, setPovertyDeltaPct] = useState<number>(10);
  const [vehicleDeltaPct, setVehicleDeltaPct] = useState<number>(0);

  // Collapsible rules at bottom
  const [isRulesExpanded, setIsRulesExpanded] = useState<boolean>(false);

  // Active county statistics
  const currentCountyStats = CANONICAL_COUNTY_DATA[selectedCounty];

  // Tracts filtered by county
  const filteredTracts = useMemo(() => {
    if (selectedCounty === 'All') return tracts;
    return tracts.filter((t) => t.county === selectedCounty);
  }, [tracts, selectedCounty]);

  const filteredRetailers = useMemo(() => {
    if (selectedCounty === 'All') return retailers;
    return retailers.filter((r) => r.county === selectedCounty);
  }, [retailers, selectedCounty]);

  const filteredChurches = useMemo(() => {
    if (selectedCounty === 'All') return churches;
    return (churches || []).filter((c) => c.county === selectedCounty);
  }, [churches, selectedCounty]);

  const filteredSchools = useMemo(() => {
    if (selectedCounty === 'All') return schools;
    return (schools || []).filter((s) => s.county === selectedCounty);
  }, [schools, selectedCounty]);

  // Threshold Sensitivity Test State (-10%, -5%, 0%, +5%, +10%)
  const [sensitivityShiftPct, setSensitivityShiftPct] = useState<number>(5);

  // Complete 490 census tract classification coverage breakdown
  const complete490Breakdown = useMemo(() => {
    const counts = {
      classic: 0,
      vehicle: 0,
      snap: 0,
      blindSpot: 0,
      insufficientData: 0,
      noGap: 0,
      total: filteredTracts.length,
    };
    filteredTracts.forEach((t) => {
      if (t.primary_gap === 'Classic food desert') counts.classic++;
      else if (t.primary_gap === 'Vehicle-compounded gap') counts.vehicle++;
      else if (t.primary_gap === 'SNAP enrollment gap') counts.snap++;
      else if (t.primary_gap === 'Possible blind spot') counts.blindSpot++;
      else if (t.primary_gap === 'Insufficient data') counts.insufficientData++;
      else counts.noGap++;
    });
    return counts;
  }, [filteredTracts]);

  // Sensitivity Test calculation
  const sensitivityResult = useMemo(() => {
    return runSensitivityTest(filteredTracts, sensitivityShiftPct);
  }, [filteredTracts, sensitivityShiftPct]);

  // Section 1: Gap tracts sorted by population (largest first)
  const gapTractsList = useMemo(() => {
    return filteredTracts
      .filter(
        (t) =>
          t.has_gap === 1 ||
          ['Classic food desert', 'Vehicle-compounded gap', 'SNAP enrollment gap'].includes(t.primary_gap),
      )
      .filter((t) => {
        if (!gapSearchTerm.trim()) return true;
        const q = gapSearchTerm.toLowerCase();
        return (
          t.tract_name.toLowerCase().includes(q) ||
          t.GEOID.includes(q) ||
          t.county.toLowerCase().includes(q) ||
          t.primary_gap.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.population - a.population);
  }, [filteredTracts, gapSearchTerm]);

  // Section 2: Top 3 largest tracts per gap type
  const top3Classic = useMemo(() => {
    return filteredTracts
      .filter((t) => t.primary_gap === 'Classic food desert' || t.secondary_gap === 'Classic food desert')
      .sort((a, b) => b.population - a.population)
      .slice(0, 3);
  }, [filteredTracts]);

  const top3Vehicle = useMemo(() => {
    return filteredTracts
      .filter((t) => t.primary_gap === 'Vehicle-compounded gap' || t.secondary_gap === 'Vehicle-compounded gap')
      .sort((a, b) => b.population - a.population)
      .slice(0, 3);
  }, [filteredTracts]);

  const top3Snap = useMemo(() => {
    return filteredTracts
      .filter((t) => t.primary_gap === 'SNAP enrollment gap' || t.secondary_gap === 'SNAP enrollment gap')
      .sort((a, b) => b.population - a.population)
      .slice(0, 3);
  }, [filteredTracts]);

  // Section 3: Blind spots to review
  const blindSpotsList = useMemo(() => {
    return filteredTracts
      .filter((t) => t.primary_gap === 'Possible blind spot')
      .sort((a, b) => b.population - a.population);
  }, [filteredTracts]);

  // Section 4: Scenario Model simulation
  const scenarioResult = useMemo(() => {
    return runScenarioModel(tracts, { povertyDeltaPct, vehicleDeltaPct });
  }, [tracts, povertyDeltaPct, vehicleDeltaPct]);

  // Filtered newly at-risk tracts for Section 4 table
  const newlyAtRiskTracts = useMemo(() => {
    const list = scenarioResult.newlyFlaggedTracts;
    if (selectedCounty === 'All') return [...list].sort((a, b) => b.population - a.population);
    return list.filter((t) => t.county === selectedCounty).sort((a, b) => b.population - a.population);
  }, [scenarioResult.newlyFlaggedTracts, selectedCounty]);

  // Reset scenario sliders
  const handleResetScenario = () => {
    setPovertyDeltaPct(10);
    setVehicleDeltaPct(0);
  };

  // Helper to map plain language recommended action
  const getActionText = (t: TractData) => {
    if (t.primary_gap === 'Classic food desert') return 'Pantry, mobile pantry or partner store';
    if (t.primary_gap === 'Vehicle-compounded gap') return 'Delivery, or mobile stop near transit';
    if (t.primary_gap === 'SNAP enrollment gap') return 'Enrollment outreach and events';
    if (t.primary_gap === 'Possible blind spot') return 'Field check before investing';
    if (t.primary_gap === 'Insufficient data') return 'Collect more data; do not act yet';
    return 'Regular monitoring';
  };

  const countyOrder: CountyFilter[] = ['All', 'Orange', 'Osceola', 'Seminole', 'Lake'];

  return (
    <div className="space-y-10 pb-16 font-sans">
      {/* =========================================================================
          TOP OF PAGE: Title & Headline sentence that updates with county filter
          ========================================================================= */}
      <section className="space-y-3 pt-2">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-slate-900 dark:text-slate-50 tracking-tight">
          Central Florida food access gaps
        </h1>
        <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">
          <strong className="font-semibold text-slate-900 dark:text-white tabular-nums">
            {currentCountyStats.gapPopulation.toLocaleString()}
          </strong>{' '}
          people live in{' '}
          <strong className="font-semibold text-slate-900 dark:text-white tabular-nums">
            {currentCountyStats.gapTracts}
          </strong>{' '}
          census tracts with a food access gap {currentCountyStats.headlineLocation}. Each gap type points to a
          different kind of help.
        </p>
      </section>

      {/* =========================================================================
          STICKY COUNTY FILTER: Controls every section on the page
          ========================================================================= */}
      <div className="sticky top-[57px] z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-2.5 bg-[#f8f9fa]/95 dark:bg-slate-950/95 backdrop-blur-md border-y border-slate-200/90 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-2 shrink-0">County filter:</span>
          {countyOrder.map((c) => {
            const isActive = selectedCounty === c;
            const data = CANONICAL_COUNTY_DATA[c];
            return (
              <button
                type="button"
                key={c}
                onClick={() => onSelectCounty(c)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#a50f15] text-white shadow-xs font-semibold'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {c === 'All' ? 'All (490 tracts)' : `${c} (${data.totalTracts})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: Where is the gap biggest today?
          ========================================================================= */}
      <section className="space-y-6 scroll-mt-28" id="section-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            1. Where is the gap biggest today?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tracts with high need and low access, ranked by people affected rather than by rate.
          </p>
        </div>

        {/* Card: Map of food access gaps */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
          {/* Map Card Header with Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MapIcon className="w-4 h-4 text-[#a50f15]" />
                <span>Map of food access gaps</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                490 Central Florida census tracts shaded by gap severity or demographic poverty rate.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Color by Select */}
              <div className="flex items-center gap-2">
                <label htmlFor="color-by-select" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Color by:
                </label>
                <select
                  id="color-by-select"
                  value={colorBy}
                  onChange={(e) => setColorBy(e.target.value as 'severity' | 'poverty')}
                  className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#a50f15]"
                >
                  <option value="severity">Gap type</option>
                  <option value="poverty">Poverty rate</option>
                </select>
              </div>

              {/* Map Engine Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setMapEngine('google')}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                    mapEngine === 'google'
                      ? 'bg-white dark:bg-slate-700 text-[#a50f15] dark:text-red-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Google Maps
                </button>
                <button
                  type="button"
                  onClick={() => setMapEngine('leaflet')}
                  className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                    mapEngine === 'leaflet'
                      ? 'bg-white dark:bg-slate-700 text-[#a50f15] dark:text-red-400 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Canvas GIS (Esri)
                </button>
              </div>
            </div>
          </div>

          {/* Legend directly above the map */}
          <div className="px-4 sm:px-5 py-3 bg-slate-50/70 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs">
            {colorBy === 'severity' ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#991b1b] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Classic food desert</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#dc2626] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Vehicle-compounded gap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#f87171] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">SNAP enrollment gap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#fca5a5] shrink-0 border border-slate-300 dark:border-slate-600" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Possible blind spot</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#e2e8f0] dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600" />
                  <span className="text-slate-600 dark:text-slate-400">No gap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#94a3b8] shrink-0" />
                  <span className="text-slate-600 dark:text-slate-400">Not enough data</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Poverty rate:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#7f1d1d] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">≥ 25%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#b91c1c] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">18 – 24.9%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#ef4444] shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300">12 – 17.9%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#fca5a5] shrink-0 border border-slate-300 dark:border-slate-600" />
                  <span className="text-slate-700 dark:text-slate-300">7 – 11.9%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#fee2e2] dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-slate-600" />
                  <span className="text-slate-700 dark:text-slate-300">&lt; 7%</span>
                </div>
              </div>
            )}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">
              Note: Each shape is a census tract. Darker red means a more serious gap. Hover a tract for details.
            </div>
          </div>

          {/* Interactive Map Viewport */}
          <div className="h-[520px] w-full relative">
            <Suspense
              fallback={
                <div role="status" className="p-6 text-sm text-slate-500">
                  Loading map…
                </div>
              }
            >
              {mapEngine === 'google' ? (
                <MapGoogle
                  tracts={filteredTracts}
                  retailers={filteredRetailers}
                  churches={filteredChurches}
                  schools={filteredSchools}
                  selectedCounty={selectedCounty}
                  selectedTract={selectedTract}
                  onSelectTract={onSelectTract}
                  shadingMode={colorBy}
                  setShadingMode={setColorBy}
                  isDark={isDark}
                  onSwitchToLeaflet={() => setMapEngine('leaflet')}
                />
              ) : (
                <MapLeaflet
                  tracts={filteredTracts}
                  retailers={filteredRetailers}
                  churches={filteredChurches}
                  schools={filteredSchools}
                  selectedCounty={selectedCounty}
                  selectedTract={selectedTract}
                  onSelectTract={onSelectTract}
                  shadingMode={colorBy}
                  setShadingMode={setColorBy}
                  isDark={isDark}
                />
              )}
            </Suspense>
          </div>
        </div>

        {/* Client Feedback Response: 100% Census Tract Classification Coverage Card */}
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-2">
                  <span>100% Census Tract Classification Coverage</span>
                  <span className="bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-mono lowercase">
                    {complete490Breakdown.total} of {complete490Breakdown.total} tracts categorized
                  </span>
                </h3>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Every census tract is assigned to a mutually exclusive category, including high-access areas where no
                  gap was identified.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-3 pt-3 border-t border-emerald-200/70 dark:border-emerald-800/50 text-xs">
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                Classic Food Desert
              </span>
              <span className="text-base font-bold text-[#991b1b] dark:text-red-400 font-mono tabular-nums">
                {complete490Breakdown.classic}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                ({Math.round((complete490Breakdown.classic / complete490Breakdown.total) * 1000) / 10}%)
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Vehicle Gap</span>
              <span className="text-base font-bold text-[#dc2626] dark:text-red-400 font-mono tabular-nums">
                {complete490Breakdown.vehicle}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                ({Math.round((complete490Breakdown.vehicle / complete490Breakdown.total) * 1000) / 10}%)
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                SNAP Enrollment Gap
              </span>
              <span className="text-base font-bold text-[#f87171] dark:text-red-400 font-mono tabular-nums">
                {complete490Breakdown.snap}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                ({Math.round((complete490Breakdown.snap / complete490Breakdown.total) * 1000) / 10}%)
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                Possible Blind Spot
              </span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {complete490Breakdown.blindSpot}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                ({Math.round((complete490Breakdown.blindSpot / complete490Breakdown.total) * 1000) / 10}%)
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                Insufficient Data
              </span>
              <span className="text-base font-bold text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                {complete490Breakdown.insufficientData}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                ({Math.round((complete490Breakdown.insufficientData / complete490Breakdown.total) * 1000) / 10}%)
              </span>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-emerald-200 dark:border-emerald-700">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block font-semibold">
                No Gap Identified
              </span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                {complete490Breakdown.noGap}
              </span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 block font-mono">
                ({Math.round((complete490Breakdown.noGap / complete490Breakdown.total) * 1000) / 10}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card: Tracts with a food access gap */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Tracts with a food access gap
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sorted by population (largest first) · Click any tract to view complete demographic profile.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tract name, ID, or gap..."
                value={gapSearchTerm}
                onChange={(e) => setGapSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#a50f15]"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Tract</th>
                  <th className="py-2.5 px-3 font-semibold">County</th>
                  <th className="py-2.5 px-3 font-semibold text-right">People</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Poverty %</th>
                  <th className="py-2.5 px-3 font-semibold text-right">SNAP %</th>
                  <th className="py-2.5 px-3 font-semibold">Gap type</th>
                  <th className="py-2.5 px-3 font-semibold">Second gap</th>
                  <th className="py-2.5 px-3 font-semibold">Confidence</th>
                  <th className="py-2.5 px-4 font-semibold">Recommended action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {gapTractsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No gap tracts found matching your search.
                    </td>
                  </tr>
                ) : (
                  gapTractsList.map((t) => {
                    const isSelected = selectedTract?.GEOID === t.GEOID;
                    return (
                      <tr
                        key={t.GEOID}
                        onClick={() => onSelectTract(t)}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          isSelected ? 'bg-red-50/70 dark:bg-red-950/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {t.tract_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{t.county}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {t.population.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {t.poverty_rate !== null ? `${t.poverty_rate.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {t.snap_rate !== null ? `${t.snap_rate.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                t.primary_gap === 'Classic food desert'
                                  ? 'bg-[#991b1b]'
                                  : t.primary_gap === 'Vehicle-compounded gap'
                                    ? 'bg-[#dc2626]'
                                    : t.primary_gap === 'SNAP enrollment gap'
                                      ? 'bg-[#f87171]'
                                      : 'bg-slate-400'
                              }`}
                            />
                            <span>{t.primary_gap}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{t.secondary_gap || '—'}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              t.confidence === 'High'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : t.confidence === 'Medium'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {t.confidence}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {getActionText(t)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: What kind of help does each place need?
          ========================================================================= */}
      <section className="space-y-6 scroll-mt-28" id="section-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            2. What kind of help does each place need?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            The gap type decides the action. Counts include tracts where the type is the main or the second gap.
          </p>
        </div>

        {/* Three cards side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Classic food desert */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#991b1b] shrink-0" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Classic food desert</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                High poverty and far from a SNAP-authorized store.
              </p>
              <div className="pt-1">
                <span className="text-xs text-slate-500 block mb-0.5">Recommended action:</span>
                <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  Pantry, mobile pantry or a partner store
                </strong>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                <div>
                  <div className="text-2xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {currentCountyStats.classic}
                  </div>
                  <div className="text-[11px] text-slate-500">tracts</div>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {currentCountyStats.classicPop.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">people</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Three largest tracts:
                </span>
                <div className="space-y-1.5 text-xs">
                  {top3Classic.length === 0 ? (
                    <span className="text-slate-400 italic text-[11px]">None in this county</span>
                  ) : (
                    top3Classic.map((t) => (
                      <div
                        key={t.GEOID}
                        onClick={() => onSelectTract(t)}
                        className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {t.tract_name}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                          {t.population.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Vehicle-compounded gap */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#dc2626] shrink-0" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">Vehicle-compounded gap</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Many households without a car live far from a SNAP store.
              </p>
              <div className="pt-1">
                <span className="text-xs text-slate-500 block mb-0.5">Recommended action:</span>
                <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  Delivery, or a mobile stop near transit
                </strong>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                <div>
                  <div className="text-2xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {currentCountyStats.vehicleTotal}
                  </div>
                  <div className="text-[11px] text-slate-500">tracts (main/sec)</div>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {currentCountyStats.vehicleTotalPop.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">people</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Three largest tracts:
                </span>
                <div className="space-y-1.5 text-xs">
                  {top3Vehicle.length === 0 ? (
                    <span className="text-slate-400 italic text-[11px]">None in this county</span>
                  ) : (
                    top3Vehicle.map((t) => (
                      <div
                        key={t.GEOID}
                        onClick={() => onSelectTract(t)}
                        className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {t.tract_name}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                          {t.population.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: SNAP enrollment gap */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f87171] shrink-0" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">SNAP enrollment gap</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                High poverty but low SNAP use, so eligible households may not be enrolled.
              </p>
              <div className="pt-1">
                <span className="text-xs text-slate-500 block mb-0.5">Recommended action:</span>
                <strong className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                  Enrollment outreach and events
                </strong>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg">
                <div>
                  <div className="text-2xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {currentCountyStats.snapTotal}
                  </div>
                  <div className="text-[11px] text-slate-500">tracts (main/sec)</div>
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {currentCountyStats.snapTotalPop.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">people</div>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-medium text-slate-500 block mb-1.5 uppercase tracking-wider">
                  Three largest tracts:
                </span>
                <div className="space-y-1.5 text-xs">
                  {top3Snap.length === 0 ? (
                    <span className="text-slate-400 italic text-[11px]">None in this county</span>
                  ) : (
                    top3Snap.map((t) => (
                      <div
                        key={t.GEOID}
                        onClick={() => onSelectTract(t)}
                        className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {t.tract_name}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-slate-500 shrink-0">
                          {t.population.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table: Gap type by county */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gap type by county</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Primary gap classifications across Central Florida counties (spec v1.1).
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">County</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Classic food desert</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Vehicle-compounded gap</th>
                  <th className="py-2.5 px-4 text-right font-semibold">SNAP enrollment gap</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Total gap tracts</th>
                  <th className="py-2.5 px-4 text-right font-semibold">People in gap tracts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {(['Orange', 'Osceola', 'Lake', 'Seminole'] as const).map((c) => {
                  const data = CANONICAL_COUNTY_DATA[c];
                  const isHighlighted = selectedCounty === c;
                  return (
                    <tr
                      key={c}
                      onClick={() => onSelectCounty(c)}
                      className={`cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-red-50/70 dark:bg-red-950/30 font-semibold text-slate-900 dark:text-white border-l-4 border-l-[#a50f15]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium">{c} County</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{data.classic}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{data.vehiclePrimary}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{data.snapPrimary}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {data.gapTracts}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {data.gapPopulation.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-850 font-semibold text-slate-900 dark:text-slate-100">
                <tr
                  onClick={() => onSelectCounty('All')}
                  className={`cursor-pointer ${selectedCounty === 'All' ? 'bg-red-50/70 dark:bg-red-950/30 border-l-4 border-l-[#a50f15]' : ''}`}
                >
                  <td className="py-2.5 px-4 font-serif">Total (All Central Florida)</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{CANONICAL_COUNTY_DATA.All.classic}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {CANONICAL_COUNTY_DATA.All.vehiclePrimary}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {CANONICAL_COUNTY_DATA.All.snapPrimary}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#a50f15] dark:text-red-400 font-bold">
                    {CANONICAL_COUNTY_DATA.All.gapTracts}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                    {CANONICAL_COUNTY_DATA.All.gapPopulation.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: What do we not know?
          ========================================================================= */}
      <section className="space-y-6 scroll-mt-28" id="section-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            3. What do we not know?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Where the data cannot give a clear answer, so a person should look before acting.
          </p>
        </div>

        {/* Four stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">Possible blind spots</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {currentCountyStats.blindSpots}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Moderate need on several signals; no automatic recommendation
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">People in blind spots</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
              ~{currentCountyStats.blindSpotPop.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Worth checking with local partners
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">Gap tracts with uncertain estimates</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {currentCountyStats.uncertainEstimates}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Poverty or SNAP margin of error is over half the estimate
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">Tracts not evaluated</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {currentCountyStats.notEvaluated}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Under 500 people or missing poverty or grocery data
            </p>
          </div>
        </div>

        {/* Table: What we do not know, by county */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">What we do not know, by county</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown of uncertainty indicators across the four Central Florida counties.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">County</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Blind spots</th>
                  <th className="py-2.5 px-4 text-right font-semibold">People in blind spots</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Gap tracts with uncertain estimates</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Not evaluated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {(['Orange', 'Osceola', 'Lake', 'Seminole'] as const).map((c) => {
                  const data = CANONICAL_COUNTY_DATA[c];
                  const isHighlighted = selectedCounty === c;
                  return (
                    <tr
                      key={c}
                      onClick={() => onSelectCounty(c)}
                      className={`cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-red-50/70 dark:bg-red-950/30 font-semibold text-slate-900 dark:text-white border-l-4 border-l-[#a50f15]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium">{c} County</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{data.blindSpots}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        ~{data.blindSpotPop.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{data.uncertainEstimates}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{data.notEvaluated}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-850 font-semibold text-slate-900 dark:text-slate-100">
                <tr
                  onClick={() => onSelectCounty('All')}
                  className={`cursor-pointer ${selectedCounty === 'All' ? 'bg-red-50/70 dark:bg-red-950/30 border-l-4 border-l-[#a50f15]' : ''}`}
                >
                  <td className="py-2.5 px-4 font-serif">Total (All Central Florida)</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                    {CANONICAL_COUNTY_DATA.All.blindSpots}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                    ~{CANONICAL_COUNTY_DATA.All.blindSpotPop.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                    {CANONICAL_COUNTY_DATA.All.uncertainEstimates}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold">
                    {CANONICAL_COUNTY_DATA.All.notEvaluated}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Client Feedback Response: Confidence Scoring Methodology & Rationale Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#a50f15]" />
                <span>Confidence Scoring Rationale &amp; Margin of Error (MOE) Parameters</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Technical explanation of Census ACS margin-of-error benchmarks, population stability cutoffs, and SNAP
                MOE integration.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 font-medium">Confidence Tiers:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">High (4 pts)</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400">Medium (2-3 pts)</span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-amber-700 dark:text-amber-400">Low (0-1 pt)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50/80 dark:bg-slate-850 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Poverty MOE (&le; 30%)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                <strong>Why 30%?</strong> The U.S. Census Bureau considers a relative margin of error (MOE / estimate)
                &le; 30% as statistically reliable for small area estimates. MOE &gt; 50% triggers an uncertainty
                warning.
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 dark:bg-slate-850 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>SNAP MOE Integration</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                <strong>Why SNAP MOE?</strong> SNAP participation from ACS S2201 carries its own sampling error.
                Evaluated alongside poverty MOE to confirm whether low SNAP rates reflect true under-enrollment.
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 dark:bg-slate-850 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Population (&ge; 2,500)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                <strong>Why 2,500 pop?</strong> Central Florida tracts average ~4,500 residents. Tracts under 2,500 have
                small sample bases in Census ACS, leading to volatile year-over-year rate swings.
              </p>
            </div>

            <div className="p-3 bg-slate-50/80 dark:bg-slate-850 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Secondary Corroboration</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                <strong>Why multi-gap?</strong> Awarded +1 point when a secondary gap classification (e.g. Vehicle gap
                alongside Classic desert) reinforces multi-dimensional need across indicators.
              </p>
            </div>
          </div>
        </div>

        {/* Two cards side by side: Known data limits & Blind spots to review */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card: Known data limits */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#a50f15]" />
              <span>Known data limits</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Documented constraints to keep in mind when evaluating recommendations.
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a50f15] mt-1.5 shrink-0" />
                <span>
                  <strong>No CDC transportation data for Central Florida:</strong> The CDC PLACES transport measures are
                  blank for these four counties, so USDA households without a vehicle are used instead.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a50f15] mt-1.5 shrink-0" />
                <span>
                  <strong>Distances are straight-line:</strong> Euclidean distance does not capture driving routes,
                  transit availability, or physical barriers like highways (I-4, SR-408) and lakes.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a50f15] mt-1.5 shrink-0" />
                <span>
                  <strong>Census survey margins of error:</strong> ACS figures are 5-year sample estimates that carry
                  wide margins of error in small residential tracts (e.g. MOE &gt; 30% of estimate).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a50f15] mt-1.5 shrink-0" />
                <span>
                  <strong>Pantry and food bank locations are not in the data:</strong> Only SNAP-authorized retail
                  stores are recorded; informal food distribution networks are not reflected.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a50f15] mt-1.5 shrink-0" />
                <span>
                  <strong>Low SNAP use has multiple meanings:</strong> A low SNAP participation rate can reflect lower
                  need rather than under-enrollment; local outreach verification is needed before acting.
                </span>
              </li>
            </ul>
          </div>

          {/* Card: Blind spots to review */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Blind spots to review</span>
                <span className="text-xs font-mono font-normal text-slate-500">{blindSpotsList.length} tracts</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Elevated need across multiple signals; sorted by population (largest first).
              </p>
            </div>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Tract</th>
                    <th className="py-2 px-3 font-semibold">County</th>
                    <th className="py-2 px-3 text-right font-semibold">People</th>
                    <th className="py-2 px-3 text-right font-semibold">Poverty %</th>
                    <th className="py-2 px-3 text-right font-semibold">No car %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {blindSpotsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No blind spots found for this county.
                      </td>
                    </tr>
                  ) : (
                    blindSpotsList.map((t) => (
                      <tr
                        key={t.GEOID}
                        onClick={() => onSelectTract(t)}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {t.tract_name}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{t.county}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {t.population.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {t.poverty_rate !== null ? `${t.poverty_rate.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {t.no_vehicle_pct ? `${(t.no_vehicle_pct * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: Looking ahead (What-If Scenario)
          ========================================================================= */}
      <section className="space-y-6 scroll-mt-28" id="section-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-slate-50 tracking-tight">
            4. Looking ahead
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">A what-if scenario, not a forecast.</p>
        </div>

        {/* Card with two sliders + Reset button */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#a50f15]" />
              <span>Simulation Sliders</span>
            </h3>

            <button
              type="button"
              onClick={handleResetScenario}
              className="flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset sliders (+10% pov, 0% vehicle)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* Slider 1: Poverty rate change */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Poverty rate change</span>
                <span className="font-mono font-bold text-sm text-[#a50f15] dark:text-red-400 tabular-nums">
                  {povertyDeltaPct > 0 ? `+${povertyDeltaPct}%` : `${povertyDeltaPct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={40}
                step={5}
                value={povertyDeltaPct}
                onChange={(e) => setPovertyDeltaPct(Number(e.target.value))}
                className="w-full accent-[#a50f15] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-20%</span>
                <span>0%</span>
                <span>+10% (default)</span>
                <span>+40%</span>
              </div>
            </div>

            {/* Slider 2: Households without a car change */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">Households without a car change</span>
                <span className="font-mono font-bold text-sm text-[#a50f15] dark:text-red-400 tabular-nums">
                  {vehicleDeltaPct > 0 ? `+${vehicleDeltaPct}%` : `${vehicleDeltaPct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-20}
                max={50}
                step={5}
                value={vehicleDeltaPct}
                onChange={(e) => setVehicleDeltaPct(Number(e.target.value))}
                className="w-full accent-[#a50f15] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-20%</span>
                <span>0% (default)</span>
                <span>+25%</span>
                <span>+50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Four stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">Tracts with a food gap</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {currentCountyStats.gapTracts} <span className="text-sm font-sans font-normal text-slate-400">→</span>{' '}
              <span className="text-[#a50f15] dark:text-red-400">
                {selectedCounty === 'All'
                  ? scenarioResult.gapTractsCount
                  : scenarioResult.tractsWithScenario.filter((t) => t.county === selectedCounty && t.isScenarioGap)
                      .length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Today vs scenario projected gap tracts
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">People living in gap tracts</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {selectedCounty === 'All'
                ? scenarioResult.gapPopulation.toLocaleString()
                : scenarioResult.tractsWithScenario
                    .filter((t) => t.county === selectedCounty && t.isScenarioGap)
                    .reduce((acc, t) => acc + t.population, 0)
                    .toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Total residents in projected gap tracts
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">Newly at-risk tracts</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-[#a50f15] dark:text-red-400">
              +{newlyAtRiskTracts.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Not flagged today, flagged under the scenario
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 shadow-xs transition-colors">
            <span className="text-xs font-medium text-slate-500 block mb-1">People in newly at-risk tracts</span>
            <div className="text-2xl sm:text-3xl font-serif font-bold tabular-nums text-[#a50f15] dark:text-red-400">
              +{newlyAtRiskTracts.reduce((s, t) => s + t.population, 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Where outreach would need to expand
            </p>
          </div>
        </div>

        {/* Two cards: Tracts with a gap by county & Newly at-risk tracts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card: Tracts with a gap by county (horizontal paired bars) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tracts with a gap by county</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Horizontal paired comparison: today in grey vs scenario in dark red.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {(['Orange', 'Osceola', 'Lake', 'Seminole'] as const).map((c) => {
                const baseCount = CANONICAL_COUNTY_DATA[c].gapTracts;
                const scenarioCount = scenarioResult.tractsWithScenario.filter(
                  (t) => t.county === c && t.isScenarioGap,
                ).length;
                const maxVal = Math.max(120, scenarioCount, baseCount);
                const basePct = (baseCount / maxVal) * 100;
                const scenPct = (scenarioCount / maxVal) * 100;
                const isSelected = selectedCounty === c;

                return (
                  <div
                    key={c}
                    onClick={() => onSelectCounty(c)}
                    className={`space-y-1.5 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-red-50/70 dark:bg-red-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{c} County</span>
                      <span className="font-mono font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                        {baseCount} today →{' '}
                        <strong className="text-[#a50f15] dark:text-red-400">{scenarioCount}</strong> scenario
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Today bar */}
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, basePct))}%` }}
                        />
                      </div>
                      {/* Scenario bar */}
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#a50f15] rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, scenPct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-xs bg-slate-400" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-xs bg-[#a50f15]" />
                <span>Scenario projection</span>
              </div>
            </div>
          </div>

          {/* Card: Newly at-risk tracts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Newly at-risk tracts</span>
                <span className="text-xs font-mono font-normal text-slate-500">{newlyAtRiskTracts.length} tracts</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tracts crossing gap threshold under scenario; sorted by population.
              </p>
            </div>

            <div className="overflow-x-auto max-h-[320px] overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800/90 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Tract</th>
                    <th className="py-2 px-3 font-semibold">County</th>
                    <th className="py-2 px-3 text-right font-semibold">People</th>
                    <th className="py-2 px-3 text-right font-semibold">Projected Poverty %</th>
                    <th className="py-2 px-3 font-semibold">Projected Gap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {newlyAtRiskTracts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No newly at-risk tracts under current slider settings.
                      </td>
                    </tr>
                  ) : (
                    newlyAtRiskTracts.map((t) => {
                      const projPov = t.poverty_rate !== null ? t.poverty_rate * (1 + povertyDeltaPct / 100) : null;
                      return (
                        <tr
                          key={t.GEOID}
                          onClick={() => onSelectTract(t)}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {t.tract_name}
                          </td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{t.county}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                            {t.population.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-[#a50f15] dark:text-red-400 font-semibold whitespace-nowrap">
                            {projPov !== null ? `${projPov.toFixed(1)}%` : '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t.lila_flag === 1
                              ? 'Classic food desert'
                              : t.low_access_flag === 1
                                ? 'Vehicle-compounded gap'
                                : 'SNAP enrollment gap'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Client Feedback Response: Threshold Sensitivity & Classification Stability Tool */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#a50f15]" />
                <span>Threshold Sensitivity &amp; Classification Stability Analysis</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tests how robust classifications are when regional quartile cutoffs (75th percentile) are shifted by
                small increments.
              </p>
            </div>

            {/* Threshold Shift Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1.5">Shift Cutoffs:</span>
              {[-10, -5, 0, 5, 10].map((shift) => (
                <button
                  type="button"
                  key={shift}
                  onClick={() => setSensitivityShiftPct(shift)}
                  className={`px-2.5 py-1 rounded-md font-mono font-medium transition-colors ${
                    sensitivityShiftPct === shift
                      ? 'bg-[#a50f15] text-white shadow-xs font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {shift > 0 ? `+${shift}%` : `${shift}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Stability Score Meter & Summary Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <span className="text-[11px] font-medium text-emerald-900 dark:text-emerald-300 block">
                Classification Stability
              </span>
              <div className="text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                {sensitivityResult.stabilityPercentage}%
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                {sensitivityResult.stableTractsCount} of {filteredTracts.length} tracts remain unchanged under a{' '}
                {sensitivityShiftPct > 0 ? `+${sensitivityShiftPct}%` : `${sensitivityShiftPct}%`} shift
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Baseline Gap Tracts</span>
              <div className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {sensitivityResult.baselineGapCount}
              </div>
              <p className="text-[11px] text-slate-500">Current specification 149 gaps</p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Shifted Threshold Gaps</span>
              <div className="text-2xl font-serif font-bold text-[#a50f15] dark:text-red-400 font-mono tabular-nums">
                {sensitivityResult.shiftedGapCount}
              </div>
              <p className="text-[11px] text-slate-500">
                Gaps under {sensitivityShiftPct > 0 ? `+${sensitivityShiftPct}%` : `${sensitivityShiftPct}%`} cutoff
                tweak
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Boundary Transition Tracts</span>
              <div className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {sensitivityResult.boundaryTractsCount}
              </div>
              <p className="text-[11px] text-slate-500">Tracts near percentile cutoff boundary</p>
            </div>
          </div>

          {/* Table of Boundary Tracts */}
          {sensitivityResult.changedTracts.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>
                  Boundary Tracts Shifting Under{' '}
                  {sensitivityShiftPct > 0 ? `+${sensitivityShiftPct}%` : `${sensitivityShiftPct}%`} Cutoff Tweak (
                  {sensitivityResult.changedTracts.length})
                </span>
              </h4>
              <div className="overflow-x-auto max-h-[220px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Tract</th>
                      <th className="py-2 px-3 font-semibold">County</th>
                      <th className="py-2 px-3 text-right font-semibold">People</th>
                      <th className="py-2 px-3 font-semibold">Baseline Classification</th>
                      <th className="py-2 px-3 font-semibold">Shifted Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {sensitivityResult.changedTracts.map(({ tract, baselineGap, shiftedGap }) => (
                      <tr key={tract.GEOID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{tract.tract_name}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{tract.county}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {tract.population.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 font-medium">{baselineGap}</td>
                        <td className="py-2 px-3 font-semibold text-[#a50f15] dark:text-red-400">{shiftedGap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          COLLAPSIBLE AT BOTTOM: How the gaps are calculated
          ========================================================================= */}
      <section className="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
          <button
            type="button"
            onClick={() => setIsRulesExpanded(!isRulesExpanded)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
          >
            <div>
              <h3 className="text-base font-serif font-semibold text-slate-900 dark:text-slate-100">
                How the gaps are calculated
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quartile ranking methodology, 5-tier classification rules, and authoritative data sources.
              </p>
            </div>
            <div className="p-1 rounded-md text-slate-500">
              {isRulesExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {isRulesExpanded && (
            <div className="px-5 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-6 text-xs text-slate-700 dark:text-slate-300">
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Classification Rules (Specification Section 6.2)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                    <strong className="text-slate-900 dark:text-slate-100 block">
                      Quartiles within the 490 tracts:
                    </strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      All 490 Central Florida census tracts are ranked against each other (Q1 lowest to Q4 highest) for
                      poverty rate, SNAP participation, and no-vehicle low-access share.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                    <strong className="text-slate-900 dark:text-slate-100 block">Classic food desert:</strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Poverty rate in Q4 (top 25% highest poverty in the region) AND USDA low-income/low-access flag = 1
                      (&gt;1 mile urban or &gt;10 miles rural from nearest supermarket).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                    <strong className="text-slate-900 dark:text-slate-100 block">Vehicle-compounded gap:</strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      USDA low-access flag = 1 AND (USDA no-vehicle low-access flag = 1 or no-vehicle low-access share
                      in Q4).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                    <strong className="text-slate-900 dark:text-slate-100 block">SNAP enrollment gap:</strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Poverty rate in Q4 AND SNAP participation rate in Q1 or Q2 (bottom 50% participation despite high
                      poverty).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                    <strong className="text-slate-900 dark:text-slate-100 block">Possible blind spot:</strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      No measure in Q4, but two or more of poverty, SNAP, and no-vehicle share in Q3 (moderate elevated
                      need across multiple signals).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1">
                    <strong className="text-slate-900 dark:text-slate-100 block">
                      Not enough data (Insufficient data):
                    </strong>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      Poverty or USDA low-access values missing, or census tract population under 500 residents.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  Authoritative Data Sources (Joined by 11-Digit GEOID)
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <li>
                    <strong>U.S. Census Bureau ACS 5-Year (2024 vintage):</strong> Table S1701 (Poverty rate &amp; MOE),
                    Table S2201 (SNAP participation rate, households &amp; MOE), Table S0101 (Total population), Table
                    S1901 (Median household income).
                  </li>
                  <li>
                    <strong>USDA Economic Research Service Food Access Research Atlas:</strong> Urban classification,
                    low-income tract flag, occupied housing units, and vehicle access indicators.
                  </li>
                  <li>
                    <strong>USDA SNAP Retailer Access Map (SRAM, July 2026 release):</strong> Low-income low-access
                    flags, straight-line distance to grocery stores, and no-vehicle low-access population share.
                  </li>
                  <li>
                    <strong>USDA Food and Nutrition Service SNAP Retailer Locator:</strong> 1,697 geocoded authorized
                    SNAP food retailers across Orange, Osceola, Seminole, and Lake counties.
                  </li>
                  <li>
                    <strong>U.S. Census Bureau TIGER/Line 2020 Shapefiles:</strong> Official census tract boundary
                    polygons.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
