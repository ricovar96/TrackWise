import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import { createApp, createGeminiGenerator } from './app';
import { loadConfig } from './config';
import { loadDatasets } from './data';

dotenv.config();

const config = loadConfig();
const data = loadDatasets(config.dataDir);
const app = createApp({ config, data, generateText: createGeminiGenerator(config) });

if (config.nodeEnv === 'production') {
  app.use(express.static(config.distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(config.distDir, 'index.html'));
  });
} else {
  // Vite dev server runs as middleware so the API and the UI share one port.
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

if (!config.geminiApiKey) {
  console.warn('GEMINI_API_KEY is not set: the chat assistant will use the built-in analytical fallback.');
}

const server = app.listen(config.port, () => {
  console.log(`[${config.nodeEnv}] listening on http://localhost:${config.port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
