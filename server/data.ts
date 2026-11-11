import fs from 'node:fs';
import path from 'node:path';
import type { ChurchData, RetailerData, SchoolData, SummaryMetrics, TractData } from '../src/types';

export interface Datasets {
  tracts: TractData[];
  retailers: RetailerData[];
  churches: ChurchData[];
  schools: SchoolData[];
  summary: SummaryMetrics;
}

function readJson<T>(dataDir: string, filename: string): T {
  const filePath = path.join(dataDir, filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (err) {
    throw new Error(`Failed to load dataset ${filePath}: ${(err as Error).message}`);
  }
}

/**
 * Loads every dataset once. Throws on a missing or malformed file so a bad
 * deploy fails at startup instead of on the first request.
 */
export function loadDatasets(dataDir: string): Datasets {
  return {
    tracts: readJson<TractData[]>(dataDir, 'central_florida_food_gaps.json'),
    retailers: readJson<RetailerData[]>(dataDir, 'central_florida_snap_retailers.json'),
    churches: readJson<ChurchData[]>(dataDir, 'central_florida_churches.json'),
    schools: readJson<SchoolData[]>(dataDir, 'central_florida_schools.json'),
    summary: readJson<SummaryMetrics>(dataDir, 'summary_metrics.json'),
  };
}
