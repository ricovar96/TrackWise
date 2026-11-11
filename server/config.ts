import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Parsed, validated runtime configuration. Read once at startup. */
export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  dataDir: string;
  distDir: string;
  geminiApiKey: string;
  geminiModel: string;
  /** Origins allowed to call the API cross-origin. Empty = same-origin only. '*' = any. */
  allowedOrigins: string[];
  /** Value for Express `trust proxy` (e.g. "1" behind one reverse proxy). Empty = off. */
  trustProxy: string;
  /** Echoed in /api/db/* responses for backwards compatibility with existing consumers. */
  databaseId: string;
}

const DEFAULT_DATABASE_ID = 'ai-studio-tracktwise-7db24125-8a82-40c9-b324-b7ed52892215';

function parsePort(raw: string | undefined): number {
  if (!raw) return 3000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${raw}": expected an integer between 1 and 65535.`);
  }
  return port;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';

  // In development the API is open for convenience; in production it must be opted in.
  const originsRaw = env.CORS_ALLOWED_ORIGINS ?? (nodeEnv === 'production' ? '' : '*');
  const allowedOrigins = originsRaw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    nodeEnv,
    port: parsePort(env.PORT),
    dataDir: path.join(ROOT_DIR, 'public', 'data'),
    distDir: path.join(ROOT_DIR, 'dist'),
    // Server-side only. Never expose this through a VITE_-prefixed variable: Vite inlines those into the browser bundle.
    geminiApiKey: env.GEMINI_API_KEY ?? '',
    geminiModel: env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    allowedOrigins,
    trustProxy: env.TRUST_PROXY ?? '',
    databaseId: env.DATABASE_ID ?? DEFAULT_DATABASE_ID,
  };
}
