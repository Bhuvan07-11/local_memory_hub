import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import db, { upsertFile, walkDir, safeStat } from '../db.js';

export const VAULT = 'C:\\Users\\Bhuvanesh\\Downloads\\memory';

function titleFrom(filePath, content, data) {
  if (data?.title) return String(data.title);
  const m = content.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim();
  return path.basename(filePath, '.md');
}

export function scanObsidian() {
  const files = walkDir(VAULT, {
    extensions: ['.md'],
    ignoreDirs: new Set(['.obsidian', '.trash', 'node_modules', '.git'])
  });
  const stmt = db.prepare(`
    INSERT INTO notes (path, title, content, preview, tags, word_count, modified_at, folder)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      title=excluded.title, content=excluded.content, preview=excluded.preview,
      tags=excluded.tags, word_count=excluded.word_count,
      modified_at=excluded.modified_at, folder=excluded.folder
  `);
  const tx = db.transaction(() => {
    for (const fp of files) {
      let raw = '';
      try { raw = fs.readFileSync(fp, 'utf8'); } catch { continue; }
      let data = {}, content = raw;
      try { const p = matter(raw); data = p.data; content = p.content; } catch { /* keep raw */ }
      const st = safeStat(fp);
      const rel = path.relative(VAULT, fp);
      const folder = path.dirname(rel);
      const words = content.split(/\s+/).filter(Boolean).length;
      const tags = Array.isArray(data?.tags) ? data.tags.join(',') : (typeof data?.tags === 'string' ? data.tags : '');
      stmt.run(
        fp, titleFrom(fp, content, data),
        content.slice(0, 60000),
        content.replace(/\s+/g, ' ').trim().slice(0, 200),
        tags, words,
        st ? st.mtime.toISOString() : new Date().toISOString(),
        folder
      );
      upsertFile({
        filePath: fp, name: path.basename(fp), extension: '.md',
        size: st?.size ?? 0,
        modified_at: st ? st.mtime.toISOString() : new Date().toISOString(),
        source_type: 'memory'
      });
    }
  });
  tx();
  return files.length;
}
