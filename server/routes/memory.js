import { Router } from 'express';
import db from '../db.js';

const r = Router();

r.get('/tree', (req, res) => {
  const rows = db.prepare(`SELECT folder, COUNT(*) c FROM notes GROUP BY folder ORDER BY folder`).all();
  const byFolder = db.prepare(`SELECT COUNT(*) c FROM notes`).get().c;
  res.json({ total: byFolder, folders: rows });
});

r.get('/notes', (req, res) => {
  const { path: folder, q, limit = '100' } = req.query;
  let sql = `SELECT path, title, preview, tags, word_count, modified_at, folder FROM notes WHERE 1=1`;
  const params = [];
  if (folder) { sql += ` AND folder = ?`; params.push(folder); }
  if (q) { sql += ` AND (title LIKE ? OR preview LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
  sql += ` ORDER BY modified_at DESC LIMIT ${Math.min(parseInt(limit, 10) || 100, 500)}`;
  res.json(db.prepare(sql).all(...params));
});

r.get('/note', (req, res) => {
  const { path: fp } = req.query;
  if (!fp) return res.status(400).json({ error: 'path required' });
  const row = db.prepare(`SELECT * FROM notes WHERE path = ?`).get(fp);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

export default r;
