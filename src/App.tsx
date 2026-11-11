import { lazy, Suspense, useEffect, useState } from 'react';
import { FloatingAssistant } from './components/FloatingAssistant';
import { Header } from './components/Header';
import { TractDetailModal } from './components/TractDetailModal';
import { fetchJson } from './lib/fetchJson';

const DashboardStoryReport = lazy(() =>
  import('./components/DashboardStoryReport').then((m) => ({ default: m.DashboardStoryReport })),
);
const DataDictionaryView = lazy(() =>
  import('./components/DataDictionaryView').then((m) => ({ default: m.DataDictionaryView })),
);
const FoodTruckRouteView = lazy(() =>
  import('./components/FoodTruckRouteView').then((m) => ({ default: m.FoodTruckRouteView })),
);
const UploadPortalView = lazy(() =>
  import('./components/UploadPortalView').then((m) => ({ default: m.UploadPortalView })),
);

function ViewFallback() {
  return (
    <div role="status" className="py-24 text-center text-sm text-slate-500">
      Loading…
    </div>
  );
}

import type { ChurchData, CountyFilter, MainTab, RetailerData, SchoolData, TractData } from './types';

export default function App() {
  const [tracts, setTracts] = useState<TractData[]>([]);
  const [retailers, setRetailers] = useState<RetailerData[]>([]);
  const [churches, setChurches] = useState<ChurchData[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [selectedCounty, setSelectedCounty] = useState<CountyFilter>('All');
  const [selectedTract, setSelectedTract] = useState<TractData | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Client-side quota exceeded event listener (Section 8 Case A)
  useEffect(() => {
    const quotaHandler = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', quotaHandler);
    return () => window.removeEventListener('gmp-quota-exceeded', quotaHandler);
  }, []);

  // Sync dark class on <html>
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Load tracts, retailers, churches, and schools from public/data
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      fetchJson<TractData[]>('/data/central_florida_food_gaps.json', { signal }),
      fetchJson<RetailerData[]>('/data/central_florida_snap_retailers.json', { signal }),
      // Community sites are optional overlays: the report still works without them.
      fetchJson<ChurchData[]>('/data/central_florida_churches.json', { signal }).catch(() => [] as ChurchData[]),
      fetchJson<SchoolData[]>('/data/central_florida_schools.json', { signal }).catch(() => [] as SchoolData[]),
    ])
      .then(([tractsData, retailersData, churchesData, schoolsData]) => {
        setTracts(tractsData);
        setRetailers(retailersData);
        setChurches(churchesData);
        setSchools(schoolsData);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (signal.aborted) return;
        console.error('Failed to load datasets:', err);
        setLoadError('The food access datasets could not be loaded. Check your connection and try again.');
        setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  // Global CSV export
  const handleExportCsv = () => {
    window.location.href = '/data/central_florida_food_gaps.csv';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-slate-950 text-slate-800 dark:text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#a50f15] border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-medium font-serif">Loading Central Florida Food Access Report...</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center p-6 text-center bg-[#f8f9fa] dark:bg-slate-950 text-slate-800 dark:text-slate-200"
      >
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-semibold font-serif">Unable to load data</h1>
          <p className="text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-[#a50f15] text-white text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Google Maps Platform Quota Warning Banner (Section 8 Case A) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* 1. Header (Navbar: Dashboard, Upload data, Data dictionary) */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        onExport={handleExportCsv}
      />

      {/* 2. Main Body Content Viewports */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 md:px-6 py-6">
        <Suspense fallback={<ViewFallback />}>
          {activeTab === 'dashboard' && (
            <DashboardStoryReport
              tracts={tracts}
              retailers={retailers}
              churches={churches}
              schools={schools}
              selectedCounty={selectedCounty}
              onSelectCounty={setSelectedCounty}
              selectedTract={selectedTract}
              onSelectTract={setSelectedTract}
              mapEngine={mapEngine}
              setMapEngine={setMapEngine}
              isDark={isDark}
            />
          )}

          {/* Tab: Food Truck Route Optimizer */}
          {activeTab === 'route' && (
            <FoodTruckRouteView
              tracts={tracts}
              churches={churches}
              schools={schools}
              selectedCounty={selectedCounty}
              onSelectCounty={setSelectedCounty}
              onSelectTract={setSelectedTract}
              isDark={isDark}
            />
          )}

          {/* Tab: Upload data */}
          {activeTab === 'portal' && <UploadPortalView />}

          {/* Tab: Data dictionary */}
          {activeTab === 'dictionary' && <DataDictionaryView />}
        </Suspense>
      </main>

      {/* 3. Slide-over Tract Inspector Drawer */}
      <TractDetailModal tract={selectedTract} onClose={() => setSelectedTract(null)} />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 text-xs text-slate-500 transition-colors">
        <div className="max-w-[1500px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>Central Florida Food Access Gaps Report · DataKind Beacon Challenge 2 · DevFest Florida 2026</div>
          <div className="flex items-center gap-3">
            <span>Orange, Osceola, Seminole &amp; Lake Counties (490 Tracts)</span>
            <span aria-hidden="true">·</span>
            <span>Census ACS 2024 &amp; USDA SRAM</span>
          </div>
        </div>
      </footer>

      {/* Floating Read-Only AI Data Assistant */}
      <FloatingAssistant />
    </div>
  );
}
