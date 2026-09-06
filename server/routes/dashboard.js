import { Router } from 'express';
import db from '../db.js';
import { topLevelProjects } from '../scanners/recent.js';
import fs from 'node:fs';
import { DB_PATH } from '../db.js';

const r = Router();

r.get('/', (req, res) => {
  const notes = db.prepare(`SELECT COUNT(*) c FROM notes`).get().c;
  const skills = db.prepare(`SELECT COUNT(*) c FROM skills WHERE source != 'cursor-mirror'`).get().c;
  const mcp = db.prepare(`SELECT COUNT(*) c FROM mcp_servers`).get().c;
  const agents = db.prepare(`SELECT COUNT(*) c FROM agents`).get().c;
  const words = db.prepare(`SELECT COALESCE(SUM(word_count),0) s FROM notes`).get().s;
  const recent = db.prepare(`SELECT file_path, timestamp, source_type FROM recent_activity ORDER BY timestamp DESC LIMIT 10`).all();
  const projects = topLevelProjects().slice(0, 8);
  let dbSize = 0;
  try { dbSize = fs.statSync(DB_PATH).size; } catch { /* ignore */ }
  res.json({
    stats: { notes, skills, mcp, agents, projects: projects.length, words, dbSize },
    recent, projects,
    scannedAt: new Date().toISOString()
  });
});

export default r;
