import express from 'express';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { getMeta, listUniversities, resolveKeys, searchMappings } from './queries.js';
import type { BasketKey } from '../src/lib/types.js';

const PORT = Number(process.env.PORT) || 3001;
const MAX_RESOLVE_KEYS = 500;

const db = openDb();
const app = express();
app.use(express.json());

app.get('/api/meta', (_req, res) => {
  res.json(getMeta(db));
});

app.get('/api/search', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const university = typeof req.query.university === 'string' ? req.query.university : undefined;
  const faculty = typeof req.query.faculty === 'string' ? req.query.faculty : undefined;
  res.json(searchMappings(db, q, university, faculty));
});

app.get('/api/universities', (req, res) => {
  const faculty = typeof req.query.faculty === 'string' ? req.query.faculty : undefined;
  res.json(listUniversities(db, faculty));
});

app.post('/api/resolve', (req, res) => {
  const keys = req.body?.keys;
  const isValidKey = (k: unknown): k is BasketKey =>
    typeof k === 'object' &&
    k !== null &&
    typeof (k as BasketKey).u === 'string' &&
    typeof (k as BasketKey).p === 'string' &&
    typeof (k as BasketKey).n === 'string';
  if (!Array.isArray(keys) || keys.length > MAX_RESOLVE_KEYS || !keys.every(isValidKey)) {
    res.status(400).json({ error: `keys must be an array of at most ${MAX_RESOLVE_KEYS} {u,p,n} objects` });
    return;
  }
  res.json(resolveKeys(db, keys));
});

// In production, serve the built frontend from the same server.
const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('{*splat}', (_req, res) => {
    res.sendFile(join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`coursemapped API listening on http://localhost:${PORT}`);
});
