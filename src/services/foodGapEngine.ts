import type { ConfidenceLevel, PrimaryGap, ReviewTier, SecondaryGap, TractData } from '../types';

export interface ScenarioParams {
  povertyDeltaPct: number; // e.g. -20 to +40%
  vehicleDeltaPct: number; // e.g. -20 to +50%
}

export interface ScenarioResult {
  gapTractsCount: number;
  gapPopulation: number;
  baselineGapTractsCount: number;
  baselineGapPopulation: number;
  deltaTracts: number;
  deltaPopulation: number;
  newlyFlaggedTracts: TractData[];
  resolvedTracts: TractData[];
  tractsWithScenario: Array<TractData & { isScenarioGap: boolean; isNewlyFlagged: boolean }>;
}

export interface FileValidationResult {
  fileKey: string;
  expectedName: string;
  foundName: string;
  isValid: boolean;
  rowCount: number;
  missingColumns: string[];
  detectedColumns: string[];
}

export const REQUIRED_SCHEMAS: Record<string, { label: string; requiredCols: string[] }> = {
  s1701: {
    label: 'Census ACS S1701 (Poverty)',
    requiredCols: ['GEO_ID', 'S1701_C03_001E', 'S1701_C03_001M'],
  },
  s2201: {
    label: 'Census ACS S2201 (SNAP)',
    requiredCols: ['GEO_ID', 'S2201_C01_001E', 'S2201_C04_001E', 'S2201_C04_001M'],
  },
  s0101: {
    label: 'Census ACS S0101 (Population)',
    requiredCols: ['GEO_ID', 'S0101_C01_001E'],
  },
  s1901: {
    label: 'Census ACS S1901 (Median Income)',
    requiredCols: ['GEO_ID', 'S1901_C01_012E'],
  },
  sram_straight: {
    label: 'USDA SRAM (Straight Line Distance)',
    requiredCols: [
      'CensusTract20',
      'SD_SRAM_LILATracts_halfAnd10',
      'SD_SRAM_LA1and10',
      'SD_SRAM_LILATracts_Vehicle',
      'SD_SRAM_lahunv1share',
    ],
  },
  sram_general: {
    label: 'USDA SRAM (General Tract Characteristics)',
    requiredCols: ['CensusTract20', 'Urban', 'LowIncomeTracts', 'TractHUNV', 'OHU2020'],
  },
  snap_retailers: {
    label: 'USDA SNAP Retailer Locations',
    requiredCols: ['Store_Name', 'Store_Street_Address', 'City', 'State', 'Zip_Code'],
  },
};

/**
 * Assigns a quartile ranking (1 to 4) based on sorted regional distribution.
 */
export function calculateRankQuartile(sortedValues: number[], value: number | null): number | null {
  if (value === null || sortedValues.length === 0) return null;
  const countLess = sortedValues.filter((v) => v < value).length;
  const countEqual = sortedValues.filter((v) => v === value).length;
  const percentile = (countLess + 0.5 * countEqual) / sortedValues.length;

  if (percentile <= 0.25) return 1;
  if (percentile <= 0.5) return 2;
  if (percentile <= 0.75) return 3;
  return 4;
}

/**
 * Core Gap Classification Rule Engine (Specification Section 6.2)
 */
export function classifyTractGaps(
  povertyRate: number | null,
  povertyQ: number | null,
  _snapRate: number | null,
  snapQ: number | null,
  _noVehicleShare: number,
  vehicleQ: number | null,
  lilaFlag: number,
  lowAccessFlag: number,
  noVehicleLowAccessFlag: number,
  population: number,
): { primaryGap: PrimaryGap; secondaryGap: SecondaryGap; allMatchingGaps: string[] } {
  const matches: string[] = [];

  // Order 1: Insufficient data
  if (povertyRate === null || lilaFlag === null || population < 500) {
    return {
      primaryGap: 'Insufficient data',
      secondaryGap: null,
      allMatchingGaps: ['Insufficient data'],
    };
  }

  // Order 2: Classic food desert
  if (povertyQ === 4 && lilaFlag === 1) {
    matches.push('Classic food desert');
  }

  // Order 3: Vehicle-compounded gap
  if (lowAccessFlag === 1 && (noVehicleLowAccessFlag === 1 || vehicleQ === 4)) {
    matches.push('Vehicle-compounded gap');
  }

  // Order 4: SNAP enrollment gap
  if (povertyQ === 4 && (snapQ === 1 || snapQ === 2)) {
    matches.push('SNAP enrollment gap');
  }

  // Order 5: Possible blind spot
  const hasAnyQ4 = povertyQ === 4 || snapQ === 4 || vehicleQ === 4;
  const q3Count = (povertyQ === 3 ? 1 : 0) + (snapQ === 3 ? 1 : 0) + (vehicleQ === 3 ? 1 : 0);
  if (!hasAnyQ4 && q3Count >= 2) {
    matches.push('Possible blind spot');
  }

  const primaryGap: PrimaryGap = matches.length > 0 ? (matches[0] as PrimaryGap) : 'No gap identified';
  const secondaryGap: SecondaryGap = matches.length > 1 ? (matches[1] as SecondaryGap) : null;

  return { primaryGap, secondaryGap, allMatchingGaps: matches };
}

/**
 * Confidence Scoring & Review Tier (Specification Section 6.3)
 * Incorporates Poverty MOE, SNAP MOE, Population size, and Secondary Gap corroboration.
 */
export function scoreConfidence(
  povertyRate: number | null,
  povertyMoe: number | null,
  population: number,
  primaryGap: PrimaryGap,
  secondaryGap: SecondaryGap,
  snapRate?: number | null,
  snapMoe?: number | null,
): { score: number; confidence: ConfidenceLevel; reviewTier: ReviewTier; moeRationale: string } {
  let score = 0;
  const rationales: string[] = [];

  // Poverty MOE <= 30% of estimate: 2 pts (Census ACS statistical reliability standard)
  if (povertyRate !== null && povertyRate > 0 && povertyMoe !== null) {
    const relMoe = povertyMoe / povertyRate;
    if (relMoe <= 0.3) {
      score += 2;
      rationales.push('Poverty estimate has high statistical precision (relative MOE <= 30%)');
    } else if (relMoe <= 0.5) {
      score += 1;
      rationales.push('Poverty estimate has moderate precision (relative MOE <= 50%)');
    } else {
      rationales.push('Poverty estimate has high sampling error (relative MOE > 50%)');
    }
  } else if (povertyRate === 0) {
    score += 1;
    rationales.push('Poverty rate estimate is 0%');
  }

  // SNAP MOE factor (client suggestion: factor in SNAP MOE alongside poverty)
  if (snapRate !== undefined && snapRate !== null && snapRate > 0 && snapMoe !== undefined && snapMoe !== null) {
    const snapRelMoe = snapMoe / snapRate;
    if (snapRelMoe <= 0.3) {
      score += 1;
      rationales.push('SNAP participation estimate is statistically precise (relative MOE <= 30%)');
    }
  }

  // Population >= 2,500: 1 pt (census tract statistical stability threshold)
  if (population >= 2500) {
    score += 1;
    rationales.push('Tract population >= 2,500 supports sample stability');
  } else {
    rationales.push('Small tract population (< 2,500) increases estimate variance');
  }

  // Secondary gap that supports the primary: 1 pt
  if (secondaryGap !== null) {
    score += 1;
    rationales.push('Multi-dimensional need corroborated by secondary gap classification');
  }

  // Not a blind spot or insufficient data: 1 pt
  if (primaryGap !== 'Possible blind spot' && primaryGap !== 'Insufficient data') {
    score += 1;
  }

  let confidence: ConfidenceLevel = 'Low';
  if (score >= 4) {
    confidence = 'High';
  } else if (score >= 2) {
    confidence = 'Medium';
  }

  let reviewTier: ReviewTier = 'Review required';
  if (primaryGap === 'Possible blind spot' || primaryGap === 'Insufficient data' || confidence === 'Low') {
    reviewTier = 'Review required';
  } else if (confidence === 'High') {
    reviewTier = 'Tier 1';
  } else {
    reviewTier = 'Tier 2';
  }

  return {
    score,
    confidence,
    reviewTier,
    moeRationale: rationales.join('. '),
  };
}

export interface SensitivityResult {
  thresholdShiftPct: number;
  stableTractsCount: number;
  boundaryTractsCount: number;
  stabilityPercentage: number;
  baselineGapCount: number;
  shiftedGapCount: number;
  shiftedGapPopulation: number;
  changedTracts: Array<{
    tract: TractData;
    baselineGap: PrimaryGap;
    shiftedGap: PrimaryGap;
  }>;
}

/**
 * Tests classification stability under small threshold shifts (+/- 5%, +/- 10%, etc.)
 */
export function runSensitivityTest(tracts: TractData[], thresholdShiftPct: number): SensitivityResult {
  const shiftMultiplier = 1 + thresholdShiftPct / 100;

  // Extract distributions
  const validPov = tracts
    .map((t) => t.poverty_rate)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const povQ4Cutoff = (validPov[Math.floor(validPov.length * 0.75)] || 17.1) * shiftMultiplier;

  const validSnap = tracts
    .map((t) => t.snap_rate)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const snapMedianCutoff = (validSnap[Math.floor(validSnap.length * 0.5)] || 11.3) * shiftMultiplier;

  const validVeh = tracts.map((t) => t.no_vehicle_low_access_pct).sort((a, b) => a - b);
  const vehQ4Cutoff = (validVeh[Math.floor(validVeh.length * 0.75)] || 0.49) * shiftMultiplier;

  let stableCount = 0;
  let boundaryCount = 0;
  let shiftedGapCount = 0;
  let shiftedGapPopulation = 0;
  let baselineGapCount = 0;
  const changedTracts: SensitivityResult['changedTracts'] = [];

  for (const t of tracts) {
    const isBaselineGap = t.has_gap === 1;
    if (isBaselineGap) baselineGapCount++;

    if (t.primary_gap === 'Insufficient data') {
      stableCount++;
      continue;
    }

    // Determine shifted primary gap
    let shiftedGap: PrimaryGap = 'No gap identified';

    const povMatch = t.poverty_rate !== null && t.poverty_rate >= povQ4Cutoff;
    const vehMatch =
      t.low_access_flag === 1 && (t.no_vehicle_low_access_flag === 1 || t.no_vehicle_low_access_pct >= vehQ4Cutoff);
    const snapMatch = povMatch && t.snap_rate !== null && t.snap_rate <= snapMedianCutoff;

    if (povMatch && t.lila_flag === 1) {
      shiftedGap = 'Classic food desert';
    } else if (vehMatch) {
      shiftedGap = 'Vehicle-compounded gap';
    } else if (snapMatch) {
      shiftedGap = 'SNAP enrollment gap';
    } else {
      // Check blind spot
      const nearPov = t.poverty_rate !== null && t.poverty_rate >= povQ4Cutoff * 0.7;
      const nearVeh = t.no_vehicle_low_access_pct >= vehQ4Cutoff * 0.7;
      const nearSnap = t.snap_rate !== null && t.snap_rate >= snapMedianCutoff * 0.7;
      const q3Count = (nearPov ? 1 : 0) + (nearVeh ? 1 : 0) + (nearSnap ? 1 : 0);
      if (q3Count >= 2 && !povMatch) {
        shiftedGap = 'Possible blind spot';
      }
    }

    const isShiftedGap = ['Classic food desert', 'Vehicle-compounded gap', 'SNAP enrollment gap'].includes(shiftedGap);
    if (isShiftedGap) {
      shiftedGapCount++;
      shiftedGapPopulation += t.population;
    }

    if (shiftedGap === t.primary_gap) {
      stableCount++;
    } else {
      boundaryCount++;
      changedTracts.push({
        tract: t,
        baselineGap: t.primary_gap,
        shiftedGap,
      });
    }
  }

  const total = tracts.length || 490;
  const stabilityPercentage = Math.round((stableCount / total) * 1000) / 10;

  return {
    thresholdShiftPct,
    stableTractsCount: stableCount,
    boundaryTractsCount: boundaryCount,
    stabilityPercentage,
    baselineGapCount,
    shiftedGapCount,
    shiftedGapPopulation,
    changedTracts,
  };
}

/**
 * What-If Scenario Model (Specification Section 6.4 & FR-13)
 * Uses fixed regional thresholds:
 * - 75th percentile of poverty rate (~17.1%)
 * - 75th percentile of no-vehicle low-access share (~0.49)
 * - Median SNAP rate (~11.3%)
 */
export function runScenarioModel(tracts: TractData[], params: ScenarioParams): ScenarioResult {
  const povMultiplier = 1 + params.povertyDeltaPct / 100;
  const vehMultiplier = 1 + params.vehicleDeltaPct / 100;

  // Compute fixed 75th percentiles from baseline tracts
  const validPov = tracts
    .map((t) => t.poverty_rate)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const povThreshold75 = validPov[Math.floor(validPov.length * 0.75)] || 17.1;

  const validVeh = tracts.map((t) => t.no_vehicle_low_access_pct).sort((a, b) => a - b);
  const vehThreshold75 = validVeh[Math.floor(validVeh.length * 0.75)] || 0.49;

  const validSnap = tracts
    .map((t) => t.snap_rate)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const snapMedian = validSnap[Math.floor(validSnap.length * 0.5)] || 11.3;

  const baselineGapTracts = tracts.filter((t) => t.has_gap === 1);
  const baselineGapPopulation = baselineGapTracts.reduce((acc, t) => acc + t.population, 0);

  const newlyFlaggedTracts: TractData[] = [];
  const resolvedTracts: TractData[] = [];
  const tractsWithScenario: Array<TractData & { isScenarioGap: boolean; isNewlyFlagged: boolean }> = [];

  for (const t of tracts) {
    if (t.primary_gap === 'Insufficient data') {
      tractsWithScenario.push({ ...t, isScenarioGap: false, isNewlyFlagged: false });
      continue;
    }

    const simPoverty = t.poverty_rate !== null ? t.poverty_rate * povMultiplier : null;
    const simVehShare = t.no_vehicle_low_access_pct * vehMultiplier;

    let isGap = false;

    // Classic or SNAP enrollment gap trigger under adjusted poverty
    if (simPoverty !== null && simPoverty >= povThreshold75) {
      if (t.lila_flag === 1) {
        isGap = true;
      } else if (t.snap_rate !== null && t.snap_rate <= snapMedian) {
        isGap = true;
      }
    }

    // Vehicle-compounded gap under adjusted vehicle access
    if (t.low_access_flag === 1) {
      if (t.no_vehicle_low_access_flag === 1 || simVehShare >= vehThreshold75) {
        isGap = true;
      }
    }

    const isNewlyFlagged = isGap && t.has_gap === 0;
    if (isNewlyFlagged) {
      newlyFlaggedTracts.push(t);
    } else if (!isGap && t.has_gap === 1) {
      resolvedTracts.push(t);
    }

    tractsWithScenario.push({
      ...t,
      isScenarioGap: isGap,
      isNewlyFlagged,
    });
  }

  const scenarioGaps = tractsWithScenario.filter((t) => t.isScenarioGap);
  const gapPopulation = scenarioGaps.reduce((acc, t) => acc + t.population, 0);

  return {
    gapTractsCount: scenarioGaps.length,
    gapPopulation,
    baselineGapTractsCount: baselineGapTracts.length,
    baselineGapPopulation,
    deltaTracts: scenarioGaps.length - baselineGapTracts.length,
    deltaPopulation: gapPopulation - baselineGapPopulation,
    newlyFlaggedTracts,
    resolvedTracts,
    tractsWithScenario,
  };
}

/**
 * Validates uploaded CSV header against required schema
 */
export function validateCsvHeader(
  fileKey: string,
  fileName: string,
  headers: string[],
  rowCount: number,
): FileValidationResult {
  const schema = REQUIRED_SCHEMAS[fileKey];
  if (!schema) {
    return {
      fileKey,
      expectedName: 'Unknown',
      foundName: fileName,
      isValid: false,
      rowCount,
      missingColumns: [],
      detectedColumns: headers,
    };
  }

  const missing = schema.requiredCols.filter((col) => !headers.includes(col));

  return {
    fileKey,
    expectedName: schema.label,
    foundName: fileName,
    isValid: missing.length === 0,
    rowCount,
    missingColumns: missing,
    detectedColumns: headers,
  };
}
