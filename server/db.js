import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = path.join(DATA_DIR, 'memoryhub.db');
const db = new DatabaseSync(DB_PATH);
db.exec(`PRAGMA journal_mode = WAL;`);

// --- minimal better-sqlite3-compatible shims ---
if (typeof db.transaction !== 'function') {
  db.transaction = (fn) => () => {
    db.exec('BEGIN');
    try {
      const out = fn();
      db.exec('COMMIT');
      return out;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* ignore */ }
      throw e;
    }
  };
}

db.exec(`
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE, name TEXT, extension TEXT, size INTEGER,
  modified_at TEXT, source_type TEXT, last_scanned TEXT
);
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE, source TEXT, path TEXT, description TEXT, content TEXT
);
CREATE TABLE IF NOT EXISTS mcp_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, type TEXT, command TEXT, url TEXT,
  agents TEXT, config_json TEXT, source_file TEXT,
  UNIQUE(name, source_file)
);
CREATE TABLE IF NOT EXISTS mcp_tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER, name TEXT, description TEXT
);
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT UNIQUE, model TEXT, config_json TEXT, source_file TEXT
);
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT UNIQUE, title TEXT, content TEXT, preview TEXT,
  tags TEXT, word_count INTEGER, modified_at TEXT, folder TEXT
);
CREATE TABLE IF NOT EXISTS recent_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT, action TEXT, timestamp TEXT, source_type TEXT
);
CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  content_type, content_id, field, text
);
`);

export function redactSecrets(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj ?? {});
  return s
    .replace(/(sk-(?:ant|or-v1)-[A-Za-z0-9\-_]{4})[A-Za-z0-9\-_]+/g, '$1***')
    .replace(/("?(?:apiKey|api_key|accessToken|access_token|primaryApiKey)"?\s*:\s*")[^"]+(")/gi, '$1***$2')
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/=]{8,}/g, '$1***');
}

export function safeStat(p) {
  try { return fs.statSync(p); } catch { return null; }
}

export function walkDir(root, { extensions = null, maxDepth = 12, ignoreDirs = new Set(['node_modules', '.git']) } = {}) {
  const out = [];
  const rec = (dir, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (ignoreDirs.has(e.name)) continue;
        rec(path.join(dir, e.name), depth + 1);
      } else if (e.isFile()) {
        const fp = path.join(dir, e.name);
        if (extensions && !extensions.includes(path.extname(e.name).toLowerCase())) continue;
        out.push(fp);
      }
    }
  };
  if (fs.existsSync(root)) rec(root, 0);
  return out;
}

const upsertFileStmt = db.prepare(`
  INSERT INTO files (path, name, extension, size, modified_at, source_type, last_scanned)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(path) DO UPDATE SET
    name=excluded.name, extension=excluded.extension, size=excluded.size,
    modified_at=excluded.modified_at, source_type=excluded.source_type,
    last_scanned=datetime('now')
`);

export function upsertFile({ filePath, name, extension, size, modified_at, source_type }) {
  upsertFileStmt.run(filePath, name, extension, size, modified_at, source_type);
}

export function rebuildSearchIndex() {
  const ins = db.prepare(`INSERT INTO search_index (content_type, content_id, field, text) VALUES (?, ?, ?, ?)`);
  db.exec(`DELETE FROM search_index;`);
  db.exec('BEGIN');
  try {
    for (const s of db.prepare(`SELECT name, description, content FROM skills`).all()) {
      ins.run('skill', s.name, 'all', `${s.name} ${s.description ?? ''} ${(s.content ?? '').slice(0, 4000)}`);
    }
    for (const n of db.prepare(`SELECT path, title, content FROM notes`).all()) {
      ins.run('note', n.path, 'all', `${n.title ?? ''} ${(n.content ?? '').slice(0, 4000)}`);
    }
    for (const m of db.prepare(`SELECT name, config_json FROM mcp_servers`).all()) {
      ins.run('mcp', m.name, 'all', `${m.name} ${m.config_json ?? ''}`.slice(0, 2000));
    }
    for (const a of db.prepare(`SELECT platform, model, config_json FROM agents`).all()) {
      ins.run('agent', a.platform, 'all', `${a.platform} ${a.model ?? ''} ${a.config_json ?? ''}`.slice(0, 2000));
    }
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    throw e;
  }
}

const recentStmt = db.prepare(`INSERT INTO recent_activity (file_path, action, timestamp, source_type) VALUES (?, 'modified', ?, ?)`);
export function recordRecent(file_path, source_type, timestamp) {
  recentStmt.run(file_path, timestamp, source_type);
}

export default db;
