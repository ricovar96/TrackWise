import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp, type GenerateText } from '../server/app';
import { generateAnalyticalFallback } from '../server/chat';
import { loadConfig } from '../server/config';
import { loadDatasets } from '../server/data';
import { computeStats } from '../server/stats';

const config = loadConfig({ NODE_ENV: 'test', CORS_ALLOWED_ORIGINS: 'https://allowed.example' });
const data = loadDatasets(config.dataDir);
const stats = computeStats(data);
const fmt = (n: number) => n.toLocaleString('en-US');

const defaultGemini: GenerateText = async () => 'gemini says hi';
let geminiBehaviour: GenerateText = defaultGemini;

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp({ config, data, generateText: (args) => geminiBehaviour(args) });
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
beforeEach(() => {
  geminiBehaviour = defaultGemini;
});

const chat = (body: unknown) =>
  fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('dataset consistency', () => {
  it('summary_metrics.json agrees with the tract-level data', () => {
    expect(data.summary.total_tracts).toBe(stats.region.tracts);
    expect(data.summary.total_population).toBe(stats.region.population);
    expect(data.summary.gap_tracts_count).toBe(stats.region.gapTracts);
    for (const [gap, count] of Object.entries(data.summary.primary_gap_counts)) {
      expect(stats.region.byGap[gap as keyof typeof stats.region.byGap].tracts).toBe(count);
    }
  });
});

describe('GET /api', () => {
  it('reports health', async () => {
    const body = await (await fetch(`${base}/api/health`)).json();
    expect(body).toMatchObject({ status: 'ok', tracts: data.tracts.length, geminiConfigured: true });
  });

  it('serves tracts and filters by county case-insensitively', async () => {
    const all = await (await fetch(`${base}/api/db/tracts`)).json();
    const lake = await (await fetch(`${base}/api/db/tracts?county=lake`)).json();
    expect(all.totalCount).toBe(data.tracts.length);
    expect(lake.totalCount).toBe(stats.counties.Lake.tracts);
    expect(lake.data.every((t: { county: string }) => t.county === 'Lake')).toBe(true);
  });

  it('rejects unknown counties with 400', async () => {
    expect((await fetch(`${base}/api/db/tracts?county=Narnia`)).status).toBe(400);
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const res = await fetch(`${base}/api/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found.' });
  });

  it('only allows configured CORS origins', async () => {
    const allowed = await fetch(`${base}/api/health`, { headers: { Origin: 'https://allowed.example' } });
    const denied = await fetch(`${base}/api/health`, { headers: { Origin: 'https://evil.example' } });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://allowed.example');
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('sends security headers and hides the framework', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('POST /api/chat', () => {
  it('validates input', async () => {
    expect((await chat({})).status).toBe(400);
    expect((await chat({ message: '   ' })).status).toBe(400);
    expect((await chat({ message: 'x'.repeat(501) })).status).toBe(400);
  });

  it('refuses write requests without calling Gemini', async () => {
    let called = false;
    geminiBehaviour = async () => {
      called = true;
      return 'nope';
    };
    const body = await (await chat({ message: 'delete all tracts' })).json();
    expect(body.source).toBe('notice');
    expect(called).toBe(false);
  });

  it('answers from Gemini with a system prompt built from live data', async () => {
    let seen = '';
    geminiBehaviour = async ({ systemInstruction }) => {
      seen = systemInstruction;
      return 'ok';
    };
    const body = await (await chat({ message: 'hello' })).json();
    expect(body).toEqual({ reply: 'ok', source: 'gemini' });
    expect(seen).toContain(fmt(stats.region.population));
    expect(seen).toContain(`${fmt(stats.region.gapTracts)} (`);
  });

  it('falls back to computed analytics when Gemini fails', async () => {
    geminiBehaviour = async () => {
      throw new Error('upstream down');
    };
    const res = await chat({ message: 'Summarize food access in Orange County' });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.source).toBe('analytics');
    expect(body.reply).toContain(fmt(stats.counties.Orange.tracts));
  });
});

describe('generateAnalyticalFallback', () => {
  it('quotes numbers computed from the data, not hard-coded ones', () => {
    const reply = generateAnalyticalFallback('how many classic food deserts?', stats);
    expect(reply).toContain(`${stats.region.byGap['Classic food desert'].tracts} tracts`);
  });

  it('answers store, church and school questions', () => {
    expect(generateAnalyticalFallback('how many snap stores', stats)).toContain(fmt(stats.region.retailers));
    expect(generateAnalyticalFallback('church pantries?', stats)).toContain(String(stats.region.churches));
    expect(generateAnalyticalFallback('school meal sites', stats)).toContain(String(stats.region.schools));
  });

  it('falls back to a regional overview', () => {
    expect(generateAnalyticalFallback('tell me something', stats)).toContain('Food Access Overview');
  });
});
