import { Router } from 'express';
import fs from 'node:fs';
import db from '../db.js';

const r = Router();

function dirNames(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  } catch { return []; }
}

r.get('/', (req, res) => {
  const { source, q } = req.query;
  let sql = `SELECT name, source, path, description FROM skills WHERE 1=1`;
  const params = [];
  if (source) { sql += ` AND source = ?`; params.push(source); }
  if (q) { sql += ` AND (name LIKE ? OR description LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
  sql += ` ORDER BY name`;
  const skills = db.prepare(sql).all(...params);

  // cursor-mirror sync status (mirror is a synced copy of primary — compare dir names)
  const primary = new Set(dirNames('C:\\Users\\Bhuvanesh\\.agents\\skills'));
  const mirror = new Set(dirNames('C:\\Users\\Bhuvanesh\\.cursor\\skills-cursor'));
  const missing = [...primary].filter(n => !mirror.has(n));
  const extra = [...mirror].filter(n => !primary.has(n));
  res.json({
    skills,
    sync: {
      primary: primary.size, mirror: mirror.size,
      inSync: missing.length === 0 && extra.length === 0,
      missingInMirror: missing, extraInMirror: extra
    }
  });
});

r.get('/:name', (req, res) => {
  const row = db.prepare(`SELECT * FROM skills WHERE name = ?`).get(req.params.name);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

export default r;
