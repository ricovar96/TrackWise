import type { CountyName, PrimaryGap } from '../src/types';
import type { Datasets } from './data';

export const COUNTIES: readonly CountyName[] = ['Orange', 'Osceola', 'Seminole', 'Lake'];

export const GAP_TYPES: readonly PrimaryGap[] = [
  'Classic food desert',
  'Vehicle-compounded gap',
  'SNAP enrollment gap',
  'Possible blind spot',
  'Insufficient data',
  'No gap identified',
];

/** Gap types that count as an actionable food access gap (matches TractData.has_gap). */
export const GAP_TYPES_WITH_GAP: readonly PrimaryGap[] = [
  'Classic food desert',
  'Vehicle-compounded gap',
  'SNAP enrollment gap',
];

export interface Bucket {
  tracts: number;
  population: number;
}

export interface AreaStats extends Bucket {
  retailers: number;
  churches: number;
  schools: number;
  gapTracts: number;
  gapPopulation: number;
  byGap: Record<PrimaryGap, Bucket>;
}

export interface DatasetStats {
  region: AreaStats;
  counties: Record<CountyName, AreaStats>;
}

function emptyArea(): AreaStats {
  const byGap = {} as Record<PrimaryGap, Bucket>;
  for (const g of GAP_TYPES) byGap[g] = { tracts: 0, population: 0 };
  return { tracts: 0, population: 0, retailers: 0, churches: 0, schools: 0, gapTracts: 0, gapPopulation: 0, byGap };
}

/** Single source of truth for every headline number the assistant quotes. */
export function computeStats(data: Datasets): DatasetStats {
  const region = emptyArea();
  const counties = Object.fromEntries(COUNTIES.map((c) => [c, emptyArea()])) as Record<CountyName, AreaStats>;

  for (const t of data.tracts) {
    for (const area of [region, counties[t.county]]) {
      if (!area) continue;
      area.tracts += 1;
      area.population += t.population;
      area.byGap[t.primary_gap].tracts += 1;
      area.byGap[t.primary_gap].population += t.population;
      if (t.has_gap === 1) {
        area.gapTracts += 1;
        area.gapPopulation += t.population;
      }
    }
  }

  const bump = (rows: Array<{ county: string }>, key: 'retailers' | 'churches' | 'schools') => {
    for (const row of rows) {
      region[key] += 1;
      const area = counties[row.county as CountyName];
      if (area) area[key] += 1;
    }
  };
  bump(data.retailers, 'retailers');
  bump(data.churches, 'churches');
  bump(data.schools, 'schools');

  return { region, counties };
}
