import express from 'express';
import cors from 'cors';
import chokidar from 'chokidar';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import db, { rebuildSearchIndex } from './db.js';
import { scanObsidian } from './scanners/obsidian.js';
import { scanSkills } from './scanners/skills.js';
import { scanMcp } from './scanners/mcp.js';
import { scanAgents } from './scanners/agents.js';
import { scanRecent } from './scanners/recent.js';
import dashboard from './routes/dashboard.js';
import mcp from './routes/mcp.js';
import skills from './routes/skills.js';
import agents from './routes/agents.js';
import memory from './routes/memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

export function fullScan() {
  const t0 = Date.now();
  const counts = {};
  try { counts.notes = scanObsidian(); } catch (e) { counts.notesError = String(e.message ?? e); }
  try { counts.skills = scanSkills(); } catch (e) { counts.skillsError = String(e.message ?? e); }
  try { counts.mcp = scanMcp(); } catch (e) { counts.mcpError = String(e.message ?? e); }
  try { counts.agents = scanAgents(); } catch (e) { counts.agentsError = String(e.message ?? e); }
  try { counts.recent = scanRecent(); } catch (e) { counts.recentError = String(e.message ?? e); }
  try { rebuildSearchIndex(); } catch (e) { counts.searchError = String(e.message ?? e); }
  counts.ms = Date.now() - t0;
  console.log(`[scan] done in ${counts.ms}ms`, counts);
  return counts;
}

app.use('/api/dashboard', dashboard);
app.use('/api/mcp', mcp);
app.use('/api/skills', skills);
app.use('/api/agents', agents);
app.use('/api/memory', memory);

app.get('/api/search', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json([]);
  try {
    const rows = db.prepare(`
      SELECT content_type, content_id, snippet(search_index, 3, '<b>', '</b>', '…', 12) AS snippet
      FROM search_index WHERE search_index MATCH ? LIMIT 30
    `).all(q.replace(/["*]/g, ' '));
    res.json(rows);
  } catch {
    res.json([]);
  }
});

app.post('/api/refresh', (req, res) => {
  res.json(fullScan());
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve built frontend in production (vite build -> dist/)
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA fallback — serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3001;
fullScan();
app.listen(PORT, '0.0.0.0', () => console.log(`[your-data] live on http://localhost:${PORT} (PORT env: ${process.env.PORT ?? 'default 3001'})`));

// incremental watch (debounced)
const watchRoots = [
  'C:\\Users\\Bhuvanesh\\Downloads\\memory',
  'C:\\Users\\Bhuvanesh\\.agents\\skills',
  'C:\\Users\\Bhuvanesh\\.codex\\skills\\.system'
];
let timer = null;
try {
  chokidar.watch(watchRoots, { ignoreInitial: true, depth: 4 }).on('all', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { try { fullScan(); } catch { /* ignore */ } }, 3000);
  });
} catch { /* watcher optional */ }
