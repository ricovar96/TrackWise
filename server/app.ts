import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import type { AppConfig } from './config';
import type { Datasets } from './data';
import { computeStats, COUNTIES, type DatasetStats } from './stats';
import {
  MAX_MESSAGE_LENGTH,
  buildSystemInstruction,
  generateAnalyticalFallback,
  hasWriteIntent,
  readOnlyNotice,
} from './chat';

const GEMINI_TIMEOUT_MS = 15_000;

/** Minimal surface of the Gemini client we use; lets tests inject a fake. */
export type GenerateText = (args: { systemInstruction: string; message: string; signal: AbortSignal }) => Promise<string>;

export function createGeminiGenerator(config: AppConfig): GenerateText | null {
  if (!config.geminiApiKey) return null;
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return async ({ systemInstruction, message, signal }) => {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: message,
      config: { systemInstruction, abortSignal: signal },
    });
    return response.text ?? '';
  };
}

export interface AppDeps {
  config: AppConfig;
  data: Datasets;
  /** null = no API key configured; chat answers come from the analytical fallback. */
  generateText: GenerateText | null;
}

export function createApp({ config, data, generateText }: AppDeps) {
  const app = express();
  const stats: DatasetStats = computeStats(data);
  const systemInstruction = buildSystemInstruction(stats);

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

  // CSP is left to the deployment layer: the app loads Google Maps, Leaflet tiles and fonts from several origins.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '10kb' }));

  const allowAny = config.allowedOrigins.includes('*');
  app.use(
    '/api',
    cors({
      origin: allowAny ? true : config.allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', tracts: data.tracts.length, geminiConfigured: generateText !== null });
  });

  // --- Chat (POST only, rate limited: each call may cost a Gemini request) ---
  const chatLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a minute and try again.' },
  });

  app.post('/api/chat', chatLimiter, async (req, res) => {
    const message: unknown = req.body?.message;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
    }
    if (hasWriteIntent(message)) {
      return res.json({ reply: readOnlyNotice(stats), source: 'notice' });
    }

    if (generateText) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
      try {
        const reply = await generateText({ systemInstruction, message, signal: controller.signal });
        if (reply.trim()) return res.json({ reply, source: 'gemini' });
      } catch (err) {
        console.warn('Gemini request failed, using analytical fallback:', (err as Error).message);
      } finally {
        clearTimeout(timer);
      }
    }
    return res.json({ reply: generateAnalyticalFallback(message, stats), source: 'analytics' });
  });

  // --- Read-only dataset API (consumed by Looker Studio and other external clients) ---
  const countyFilter = (rows: Array<{ county: string }>, raw: unknown) => {
    if (typeof raw !== 'string' || raw === 'All') return { rows };
    const county = COUNTIES.find((c) => c.toLowerCase() === raw.toLowerCase());
    if (!county) return { error: `Unknown county "${raw}". Expected one of: All, ${COUNTIES.join(', ')}.` };
    return { rows: rows.filter((r) => r.county === county) };
  };

  const collection = (path: string, name: string, rows: Array<{ county: string }>, filterable: boolean) => {
    app.get(path, (req, res) => {
      const filtered = filterable ? countyFilter(rows, req.query.county) : { rows };
      if ('error' in filtered) return res.status(400).json({ error: filtered.error });
      res.json({ totalCount: filtered.rows.length, databaseId: config.databaseId, collection: name, data: filtered.rows });
    });
  };
  collection('/api/db/tracts', 'census_tracts', data.tracts, true);
  collection('/api/db/snap-retailers', 'snap_retailers', data.retailers, true);
  collection('/api/db/churches', 'churches', data.churches, false);
  collection('/api/db/schools', 'schools', data.schools, false);
  app.get('/api/db/summary', (_req, res) => {
    res.json({ databaseId: config.databaseId, collection: 'summary_metrics', data: data.summary });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Last-resort error handler: log details server-side, return a generic message.
  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error('Unhandled server error:', err);
    res.status(status).json({ error: status === 500 ? 'Internal server error.' : err.message });
  });

  return app;
}
