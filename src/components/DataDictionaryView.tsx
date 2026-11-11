import { BookOpen, Database, Download, ExternalLink, FileText, Search } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

export const DataDictionaryView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [_showSpecPreview, _setShowSpecPreview] = useState(false);

  const dictionaryItems = [
    {
      field: 'GEOID',
      type: 'Text (11-digit)',
      source: 'Census 2020',
      desc: '11-digit standard Census 2020 tract ID (State 12 + County 3-digit + Tract 6-digit).',
    },
    {
      field: 'tract_name',
      type: 'Text',
      source: 'Census ACS',
      desc: 'Census tract display name (e.g., Census Tract 145.03).',
    },
    { field: 'county', type: 'Text', source: 'Census 2020', desc: 'County name (Orange, Osceola, Seminole, Lake).' },
    {
      field: 'population',
      type: 'Number',
      source: 'Census ACS S0101',
      desc: 'Total resident population (5-year estimate 2024).',
    },
    {
      field: 'households',
      type: 'Number',
      source: 'Census ACS S2201',
      desc: 'Total occupied housing units / households.',
    },
    {
      field: 'poverty_rate',
      type: 'Number (%)',
      source: 'Census ACS S1701',
      desc: '% of individuals with income below federal poverty line.',
    },
    {
      field: 'poverty_rate_moe',
      type: 'Number (%)',
      source: 'Census ACS S1701',
      desc: '90% margin of error on poverty rate estimate.',
    },
    {
      field: 'snap_rate',
      type: 'Number (%)',
      source: 'Census ACS S2201',
      desc: '% of households receiving SNAP benefits in past 12 months.',
    },
    {
      field: 'snap_rate_moe',
      type: 'Number (%)',
      source: 'Census ACS S2201',
      desc: 'Margin of error on SNAP participation rate.',
    },
    {
      field: 'snap_households',
      type: 'Number',
      source: 'Census ACS S2201',
      desc: 'Count of households receiving SNAP benefits.',
    },
    {
      field: 'median_household_income',
      type: 'Number ($)',
      source: 'Census ACS S1901',
      desc: 'Median household income in inflation-adjusted dollars.',
    },
    {
      field: 'lila_flag',
      type: '0 / 1 Flag',
      source: 'USDA SRAM 2026',
      desc: 'USDA Low-Income Low-Access tract flag (1/2 or 10 miles supermarket access).',
    },
    {
      field: 'low_access_flag',
      type: '0 / 1 Flag',
      source: 'USDA SRAM 2026',
      desc: 'USDA Low-Access flag (straight-line distance to SNAP retailer).',
    },
    {
      field: 'no_vehicle_low_access_flag',
      type: '0 / 1 Flag',
      source: 'USDA SRAM 2026',
      desc: 'USDA Flag for zero-vehicle households far from a SNAP store.',
    },
    {
      field: 'no_vehicle_low_access_pct',
      type: 'Number (Share)',
      source: 'USDA SRAM 2026',
      desc: 'Share of zero-vehicle households with low grocery access.',
    },
    {
      field: 'households_no_vehicle',
      type: 'Number',
      source: 'USDA ERS Atlas',
      desc: 'Total households without a vehicle in census tract.',
    },
    {
      field: 'no_vehicle_pct',
      type: 'Number (%)',
      source: 'USDA ERS Atlas',
      desc: '% of occupied housing units without an available vehicle.',
    },
    { field: 'urban_flag', type: '0 / 1 Flag', source: 'USDA 2020', desc: '1 if urban census tract, 0 if rural.' },
    {
      field: 'low_income_tract_flag',
      type: '0 / 1 Flag',
      source: 'USDA ERS Atlas',
      desc: 'Poverty rate >= 20% or median income <= 80% area median.',
    },
    {
      field: 'poverty_q',
      type: '1 to 4',
      source: 'Gap Engine',
      desc: 'Regional quartile ranking for poverty rate (Q1 lowest, Q4 highest).',
    },
    {
      field: 'snap_q',
      type: '1 to 4',
      source: 'Gap Engine',
      desc: 'Regional quartile ranking for SNAP participation rate.',
    },
    {
      field: 'vehicle_q',
      type: '1 to 4',
      source: 'Gap Engine',
      desc: 'Regional quartile ranking for no-vehicle low-access share.',
    },
    {
      field: 'primary_gap',
      type: 'Text',
      source: 'Gap Engine (Section 6.2)',
      desc: 'Primary gap classification according to the 5-step rule.',
    },
    {
      field: 'secondary_gap',
      type: 'Text',
      source: 'Gap Engine (Section 6.2)',
      desc: 'Secondary gap classification if tract triggered multiple rules.',
    },
    { field: 'gap_label', type: 'Text', source: 'Gap Engine', desc: 'User-facing label for dashboard display.' },
    {
      field: 'gap_severity',
      type: '0 to 4',
      source: 'Gap Engine',
      desc: 'Severity shading score for red-scale choropleth map.',
    },
    {
      field: 'has_gap',
      type: '0 / 1 Flag',
      source: 'Gap Engine',
      desc: '1 if Classic, Vehicle-compounded, or SNAP enrollment gap.',
    },
    {
      field: 'confidence',
      type: 'High / Med / Low',
      source: 'Gap Engine (Section 6.3)',
      desc: 'Evidence quality score (High >= 4 pts, Medium 2-3, Low < 2).',
    },
    {
      field: 'confidence_score',
      type: '0 to 5 Points',
      source: 'Gap Engine (Section 6.3)',
      desc: 'Confidence rubric point score.',
    },
    {
      field: 'supporting_evidence',
      type: 'Text',
      source: 'Gap Engine',
      desc: 'Plain-language justification for the assigned gap type.',
    },
    {
      field: 'limiting_evidence',
      type: 'Text',
      source: 'Gap Engine',
      desc: 'Plain-language limitations and margins of error.',
    },
    {
      field: 'recommended_resource',
      type: 'Text',
      source: 'Gap Engine (Section 2)',
      desc: 'Actionable operational response recommended for the tract.',
    },
    {
      field: 'review_tier',
      type: 'Tier 1 / 2 / Review',
      source: 'Gap Engine (Section 6.3)',
      desc: 'Action review tier (Tier 1 ready to act, Tier 2 team review).',
    },
    {
      field: 'wide_moe',
      type: '0 / 1 Flag',
      source: 'Gap Engine',
      desc: '1 if poverty margin of error exceeds 30% of the estimate.',
    },
    {
      field: 'is_unknown',
      type: '0 / 1 Flag',
      source: 'Gap Engine (FR-10)',
      desc: 'Flag for Q5 page (blind spot, wide MOE, or insufficient data).',
    },
    {
      field: 'unknown_reason',
      type: 'Text',
      source: 'Gap Engine',
      desc: 'Reason for inclusion in Q5 uncertainty tracking.',
    },
    { field: 'model_gap_now', type: '0 / 1 Flag', source: 'Scenario Engine', desc: 'Baseline scenario model status.' },
    {
      field: 'scenario_gap_pov10',
      type: '0 / 1 Flag',
      source: 'Scenario Engine',
      desc: 'Flag under simulated +10% regional poverty stress.',
    },
    {
      field: 'scenario_new_gap_pov10',
      type: '0 / 1 Flag',
      source: 'Scenario Engine',
      desc: '1 if tract is newly flagged under +10% poverty scenario.',
    },
    {
      field: 'poverty_rate_pov10',
      type: 'Number (%)',
      source: 'Scenario Engine',
      desc: 'Simulated poverty rate under +10% poverty stress.',
    },
  ];

  const filteredItems = dictionaryItems.filter(
    (item) =>
      item.field.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Overview Intro */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600" />
              <span>FR-14: Method, Data Dictionary & Deliverables</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Every metric, flag, and calculation in this solution is traceable directly to Census ACS 2024 (5-year),
              USDA SRAM (July 2026), and the transparent 5-step classification engine.
            </p>
          </div>

          {/* Deliverables Downloads */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/data/Central_Florida_Food_Access_Gaps_Specification_v1.1.md"
              download="Central_Florida_Food_Access_Gaps_Specification_v1.1.md"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 rounded-lg transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Project Specification v1.1 (MD)</span>
            </a>
            <a
              href="/data/central_florida_food_gaps.csv"
              download="central_florida_food_gaps.csv"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tract Dataset (CSV, 490 rows)</span>
            </a>
            <a
              href="/data/central_florida_snap_retailers.csv"
              download="central_florida_snap_retailers.csv"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SNAP Retailers (CSV, 1,697 rows)</span>
            </a>
            <a
              href="/data/central_fl_tracts.geojson"
              download="central_fl_tracts.geojson"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tract Polygons (GeoJSON)</span>
            </a>
          </div>
        </div>

        {/* Specification Reference Banner */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2 text-slate-600 dark:text-slate-400">
            <BookOpen className="w-4 h-4 text-red-600 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <b>Specification v1.1 Committed:</b> Full architecture, 5-step classification rules, and 4-point
              confidence rubric are committed to repository root as{' '}
              <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200">
                SPECIFICATION.md
              </code>{' '}
              and{' '}
              <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200">
                docs/Central_Florida_Food_Access_Gaps_Specification_v1.1.md
              </code>
              .
            </span>
          </div>
          <a
            href="/data/Central_Florida_Food_Access_Gaps_Specification_v1.1.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Read Spec in Browser</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Dictionary Search & Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search data fields or descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredItems.length} of {dictionaryItems.length} fields
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4 font-mono">Field Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-4">Description & Technical Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.field} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {item.field}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{item.type}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">{item.source}</span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 leading-relaxed">{item.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
