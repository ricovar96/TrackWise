import type { CountyName, PrimaryGap } from '../src/types';
import { type AreaStats, COUNTIES, type DatasetStats, GAP_TYPES_WITH_GAP } from './stats';

export const MAX_MESSAGE_LENGTH = 500;

const WRITE_INTENT = /\b(create|insert|add tract|update|edit|delete|remove|modify|drop|alter|overwrite)\b/i;

export function hasWriteIntent(message: string): boolean {
  return WRITE_INTENT.test(message);
}

const fmt = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;

export function readOnlyNotice(stats: DatasetStats): string {
  const r = stats.region;
  return (
    `I am Tracky, your Central Florida Food Access Assistant. I can answer questions and calculate statistics for the ` +
    `${fmt(r.tracts)} census tracts, ${fmt(r.retailers)} SNAP stores, ${fmt(r.churches)} churches, and ` +
    `${fmt(r.schools)} school meal sites, but I cannot modify database records.`
  );
}

const DEFINITIONS: Partial<Record<PrimaryGap, string>> = {
  'Classic food desert':
    'High poverty combined with low access to a grocery store (more than 1 mile away in cities, 10 miles in rural areas).',
  'Vehicle-compounded gap': 'Low grocery access in a neighborhood where many households have no vehicle.',
  'SNAP enrollment gap':
    'High poverty neighborhoods where families likely qualify for SNAP, but participation rates remain low.',
  'Possible blind spot':
    'Moderate indicators of food hardship across multiple metrics, requiring community field verification.',
};

function gapLines(area: AreaStats): string[] {
  return (Object.keys(area.byGap) as PrimaryGap[]).map(
    (g) => `- ${g}: ${plural(area.byGap[g].tracts, 'tract')} (${fmt(area.byGap[g].population)} residents)`,
  );
}

export function buildSystemInstruction(stats: DatasetStats): string {
  const r = stats.region;
  const countyLine = COUNTIES.map((c) => `${c}: ${fmt(stats.counties[c].tracts)}`).join(', ');

  return `You are Tracky, the Central Florida Food Access Assistant.
Your primary role is to answer questions strictly related to the official Central Florida Food Access Gaps dataset covering ${fmt(r.tracts)} census tracts across ${COUNTIES.join(', ')} counties.

CRITICAL FORMATTING RULES (STRICT COMPLIANCE REQUIRED):
1. ABSOLUTELY NO EMOJIS anywhere in your response.
2. ABSOLUTELY NO DOUBLE ASTERISKS (**). Output plain text only.
3. Answer only what the user specifically asks for. Do not add unrequested overviews or extra topics.
4. Use clean plain text with simple hyphens (-) for bullet points and clean line breaks.

KEY REGIONAL DATA (computed from the dataset):
- Total census tracts: ${fmt(r.tracts)} (${countyLine})
- Total population: ${fmt(r.population)} residents
- Tracts with a food access gap: ${fmt(r.gapTracts)} (${fmt(r.gapPopulation)} residents)
Primary gap classification:
${gapLines(r).join('\n')}
- Community infrastructure: ${fmt(r.retailers)} SNAP stores, ${fmt(r.churches)} church pantries, ${fmt(r.schools)} school meal sites

RULES:
1. READ-ONLY SCOPE: You can query and analyze data. If asked to edit or delete data, say plainly that you only answer questions and calculate statistics.
2. ACCURACY: Use only the numbers above. If a figure is not provided, say you do not have it rather than estimating.
3. Stay on topic: decline questions unrelated to Central Florida food access.`;
}

function overview(stats: DatasetStats): string {
  const r = stats.region;
  return [
    'Central Florida Food Access Overview:',
    '',
    `- Total census tracts evaluated: ${fmt(r.tracts)} across ${COUNTIES.length} counties`,
    `- Total regional population: ${fmt(r.population)} residents`,
    `- Total food gap tracts: ${fmt(r.gapTracts)} (${fmt(r.gapPopulation)} residents)`,
    ...gapLines(r),
    `- Community sites: ${fmt(r.retailers)} SNAP stores, ${fmt(r.churches)} church pantries, ${fmt(r.schools)} school meal sites`,
  ].join('\n');
}

function countyProfile(county: CountyName, a: AreaStats): string {
  const line = (g: PrimaryGap) =>
    `- ${g}: ${plural(a.byGap[g].tracts, 'tract')} (${fmt(a.byGap[g].population)} residents)`;
  return [
    `${county} County Food Access Profile:`,
    '',
    `- Total census tracts analyzed: ${fmt(a.tracts)}`,
    `- Food gap tracts: ${fmt(a.gapTracts)} (${fmt(a.gapPopulation)} residents)`,
    line('Classic food desert'),
    line('Vehicle-compounded gap'),
    line('SNAP enrollment gap'),
    line('Possible blind spot'),
    `- Authorized SNAP retailers: ${fmt(a.retailers)}`,
  ].join('\n');
}

function gapSummary(gap: PrimaryGap, stats: DatasetStats): string {
  const r = stats.region.byGap[gap];
  const rows = COUNTIES.map((c) => ({ c, b: stats.counties[c].byGap[gap] })).sort((x, y) => y.b.tracts - x.b.tracts);
  const def = DEFINITIONS[gap];
  return [
    `${gap} summary:`,
    '',
    ...(def ? [`- Definition: ${def}`] : []),
    `- Regional total: ${plural(r.tracts, 'tract')} (${fmt(r.population)} residents)`,
    ...rows.map(({ c, b }) => `- ${c} County: ${plural(b.tracts, 'tract')} (${fmt(b.population)} residents)`),
  ].join('\n');
}

function gapRanking(stats: DatasetStats): string {
  const rows = COUNTIES.map((c) => ({ c, a: stats.counties[c] })).sort((x, y) => y.a.gapTracts - x.a.gapTracts);
  const top = rows[0];
  if (!top) return overview(stats);
  return [
    `${top.c} County has the most food access gap tracts overall:`,
    '',
    ...rows.map(({ c, a }) => `- ${c} County: ${plural(a.gapTracts, 'gap tract')} (${fmt(a.gapPopulation)} residents)`),
    '',
    `Total across Central Florida: ${plural(stats.region.gapTracts, 'food gap tract')} (${fmt(stats.region.gapPopulation)} residents).`,
  ].join('\n');
}

function detectGapType(q: string): PrimaryGap | null {
  if (/snap gap|enrollment/.test(q)) return 'SNAP enrollment gap';
  if (/blind|unknown|uncertain/.test(q)) return 'Possible blind spot';
  if (/vehicle|\bcars?\b|transit|\block/.test(q)) return 'Vehicle-compounded gap';
  if (/classic|desert/.test(q)) return 'Classic food desert';
  return null;
}

/**
 * Rule-based answers used when no Gemini key is configured or the API call fails.
 * Every number is derived from `stats`, so it cannot drift from the dataset.
 */
export function generateAnalyticalFallback(query: string, stats: DatasetStats): string {
  const q = query.toLowerCase();
  const wantsRanking = /\b(most|highest|which county)\b/.test(q);
  const gap = detectGapType(q);

  if (wantsRanking && gap && (GAP_TYPES_WITH_GAP as readonly string[]).includes(gap)) {
    const [top] = [...COUNTIES].sort(
      (a, b) => stats.counties[b].byGap[gap].tracts - stats.counties[a].byGap[gap].tracts,
    );
    if (!top) return overview(stats);
    return `${top} County has the most tracts classified as "${gap}".\n\n${gapSummary(gap, stats)}`;
  }
  if (/\b(most|highest) gap/.test(q) || (wantsRanking && /\bgaps?\b/.test(q))) return gapRanking(stats);
  if (gap) return gapSummary(gap, stats);

  if (/church|pantry|faith/.test(q)) {
    return `Church Community Delivery Sites:\n\n- Total geocoded churches in database: ${fmt(stats.region.churches)}\n- These sites serve as delivery locations for mobile food market stops in verified food gap areas.`;
  }
  if (/school|student|meal site/.test(q)) {
    return `School Meal Pickup Sites:\n\n- Total public school meal sites in database: ${fmt(stats.region.schools)}\n- These sites serve as distribution hubs for meal box deliveries and mobile market visits.`;
  }
  if (/store|retailer|snap|food stamp/.test(q)) {
    const lines = COUNTIES.map((c) => `- ${c} County: ${fmt(stats.counties[c].retailers)} stores`);
    return `Authorized SNAP Food Retailers:\n\n- Total SNAP stores in database: ${fmt(stats.region.retailers)}\n${lines.join('\n')}`;
  }

  const county = COUNTIES.find((c) => q.includes(c.toLowerCase()));
  if (county) return countyProfile(county, stats.counties[county]);

  return overview(stats);
}
