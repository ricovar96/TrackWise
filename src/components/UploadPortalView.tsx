import { CheckCircle, Database, Download, Play } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { REQUIRED_SCHEMAS } from '../services/foodGapEngine';

export const UploadPortalView: React.FC = () => {
  const [userRole, setUserRole] = useState<'uploader' | 'viewer'>('uploader');
  const [engineStatus, setEngineStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('ready');
  const [logs, setLogs] = useState<string[]>([
    '[2026-11-07 12:43:45] Upload #CF-2026-11-A initiated by client administrator',
    '[2026-11-07 12:43:46] Validated 7 source files: all required schema columns matched (100%)',
    '[2026-11-07 12:43:48] Joined 490 census tracts across Orange (267), Osceola (59), Seminole (89), Lake (75)',
    '[2026-11-07 12:43:49] Computed regional access quartiles: Poverty Q4 >= 17.1%, SNAP Q4 >= 18.4%, Veh Q4 >= 0.49',
    '[2026-11-07 12:43:50] Gap Engine classification complete: 149 gap tracts (68 Classic, 76 Vehicle, 5 SNAP)',
    '[2026-11-07 12:43:51] Status: READY. Version tagged and published to BigQuery table hackathon.food_gaps_map',
  ]);

  const [uploadedFiles, _setUploadedFiles] = useState<
    Record<string, { name: string; size: string; status: 'valid' | 'missing' }>
  >({
    s1701: { name: 'ACSST5Y2024.S1701-Data.csv', size: '1.7 MB', status: 'valid' },
    s2201: { name: 'ACSST5Y2024.S2201-Data.csv', size: '2.1 MB', status: 'valid' },
    s0101: { name: 'ACSST5Y2024.S0101-Data.csv', size: '2.0 MB', status: 'valid' },
    s1901: { name: 'ACSST5Y2024.S1901-Data.csv', size: '655 KB', status: 'valid' },
    sram_straight: { name: 'SRAM Straight Line Distance Data.csv', size: '18.9 MB', status: 'valid' },
    sram_general: { name: 'SRAM General Tract Characteristics Data.csv', size: '3.2 MB', status: 'valid' },
    snap_retailers: { name: 'SNAP_Retailer_Location_data.csv', size: '37.1 MB', status: 'valid' },
  });

  const handleSimulateRecompute = () => {
    setEngineStatus('processing');
    const newLogs = [
      ...logs,
      `[${new Date().toLocaleTimeString()}] Manual trigger: Re-computing gap engine for upload #CF-2026-11-B...`,
    ];
    setLogs(newLogs);

    setTimeout(() => {
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Column schema verification passed for 7 sources.`,
        `[${new Date().toLocaleTimeString()}] Normalizing GEOIDs to 11 characters. Matching against 2020 boundary shapes...`,
        `[${new Date().toLocaleTimeString()}] 490 tracts processed. 149 gap tracts, 948,632 affected population confirmed.`,
        `[${new Date().toLocaleTimeString()}] Status: READY. Version #CF-2026-11-B locked.`,
      ]);
      setEngineStatus('ready');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Intro & Target Architecture Banner */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Target Architecture: Annual Upload Portal & Gap Engine (Section 8.2)
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              When new Census and USDA annual data is published, administrators upload the 7 source files here. The
              portal validates column headers, executes the gap engine (<code>foodGapEngine.js</code>), versions the
              output, and writes to BigQuery.
            </p>
          </div>

          {/* Role Toggle */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Active Role:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setUserRole('uploader')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  userRole === 'uploader'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Uploader (Admin)
              </button>
              <button
                type="button"
                onClick={() => setUserRole('viewer')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  userRole === 'viewer'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Viewer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Required Source Files Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Source File Validation Checklist (Section 8.3)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The 7 Census, USDA, and SNAP retailer files loaded into the gap engine.
            </p>
          </div>

          {userRole === 'uploader' && (
            <button
              type="button"
              onClick={handleSimulateRecompute}
              disabled={engineStatus === 'processing'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{engineStatus === 'processing' ? 'Running Engine...' : 'Run Gap Engine'}</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(REQUIRED_SCHEMAS).map(([key, schema]) => {
            const fileInfo = uploadedFiles[key];
            return (
              <div
                key={key}
                className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{schema.label}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {fileInfo ? `${fileInfo.name} (${fileInfo.size})` : 'Missing file'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden md:block">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Required Columns</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      {schema.requiredCols.slice(0, 3).join(', ')}
                      {schema.requiredCols.length > 3 ? ` +${schema.requiredCols.length - 3} more` : ''}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Valid Schema</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Engine Status & Execution Logs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gap Engine Pipeline Status</h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ● READY (Upload #CF-2026-11-A)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/data/central_florida_food_gaps.csv"
              download="central_florida_food_gaps.csv"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download 490-Tract Master CSV</span>
            </a>
          </div>
        </div>

        {/* Terminal Log Console */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 space-y-1.5 max-h-56 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              <span className="text-slate-500">{log.split(']')[0]}]</span>
              <span className="text-slate-100">{log.split(']')[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
