import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import db, { upsertFile, safeStat } from '../db.js';

// NOTE: cursor-mirror is scanned FIRST so the canonical sources
// (agents, codex-system) win on ON CONFLICT(name) overwrites.
const SKILL_DIRS = [
  { root: 'C:\\Users\\Bhuvanesh\\.cursor\\skills-cursor', source: 'cursor-mirror' },
  { root: 'C:\\Users\\Bhuvanesh\\.agents\\skills', source: 'agents' },
  { root: 'C:\\Users\\Bhuvanesh\\.codex\\skills\\.system', source: 'codex-system' }
];

function describe(content, data) {
  if (data?.description) return String(data.description).slice(0, 1024);
  const para = content.split(/\n\s*\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'))[0];
  return (para ?? 'No description').replace(/\s+/g, ' ').slice(0, 300);
}

export function scanSkills() {
  const stmt = db.prepare(`
    INSERT INTO skills (name, source, path, description, content)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      source=excluded.source, path=excluded.path,
      description=excluded.description, content=excluded.content
  `);
  let count = 0;
  const tx = db.transaction(() => {
    for (const { root, source } of SKILL_DIRS) {
      if (!fs.existsSync(root)) continue;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillMd = path.join(root, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillMd)) continue;
        // Cursor mirror is a synced duplicate — still index but tagged, UI dedupes
        let raw = '';
        try { raw = fs.readFileSync(skillMd, 'utf8'); } catch { continue; }
        let data = {}, content = raw;
        try { const p = matter(raw); data = p.data; content = p.content; } catch { /* raw */ }
        const st = safeStat(skillMd);
        stmt.run(
          entry.name, source,
          skillMd, describe(content, data),
          raw.slice(0, 60000)
        );
        upsertFile({
          filePath: skillMd, name: 'SKILL.md', extension: '.md',
          size: st?.size ?? 0,
          modified_at: st ? st.mtime.toISOString() : new Date().toISOString(),
          source_type: 'skill'
        });
        count++;
      }
    }
  });
  tx();
  return count;
}
