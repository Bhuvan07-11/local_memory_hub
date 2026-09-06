import fs from 'node:fs';
import path from 'node:path';
import db, { walkDir, safeStat } from '../db.js';

const ROOTS = [
  { root: 'C:\\Users\\Bhuvanesh\\Documents\\Codex', source_type: 'project' },
  { root: 'C:\\Users\\Bhuvanesh\\OneDrive\\Desktop', source_type: 'project', maxDepth: 3 },
  { root: 'C:\\Users\\Bhuvanesh\\Downloads\\memory', source_type: 'memory', maxDepth: 6 }
];

function techStack(dir) {
  const has = (f) => fs.existsSync(path.join(dir, f));
  const stack = [];
  if (has('package.json')) stack.push('node');
  if (has('requirements.txt') || has('pyproject.toml')) stack.push('python');
  if (has('Cargo.toml')) stack.push('rust');
  if (has('go.mod')) stack.push('go');
  if (has('pom.xml') || has('build.gradle')) stack.push('java');
  if (has('*.sln') || has('Program.cs')) stack.push('dotnet');
  return stack.join(', ');
}

export function topLevelProjects() {
  const projects = [];
  const seen = new Set();
  for (const { root } of ROOTS) {
    if (!fs.existsSync(root)) continue;
    // for Codex docs (dated dirs) and Desktop: list top-level dirs
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const full = path.join(root, e.name);
      if (seen.has(full)) continue;
      seen.add(full);
      const st = safeStat(full);
      // Codex root has date dirs — descend one level
      if (root.endsWith('Codex')) {
        for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
          if (!sub.isDirectory()) continue;
          const sp = path.join(full, sub.name);
          const sst = safeStat(sp);
          const files = walkDir(sp, { maxDepth: 4 });
          projects.push({
            name: `${e.name}/${sub.name}`, path: sp,
            modified: sst ? sst.mtime.toISOString() : '',
            fileCount: files.length, stack: techStack(sp)
          });
        }
        continue;
      }
      const files = walkDir(full, { maxDepth: 3 });
      projects.push({
        name: e.name, path: full,
        modified: st ? st.mtime.toISOString() : '',
        fileCount: files.length, stack: techStack(full)
      });
    }
  }
  return projects.sort((a, b) => (b.modified > a.modified ? 1 : -1)).slice(0, 30);
}

export function scanRecent() {
  db.exec(`DELETE FROM recent_activity;`);
  const ins = db.prepare(`INSERT INTO recent_activity (file_path, action, timestamp, source_type) VALUES (?, 'modified', ?, ?)`);
  const all = [];
  for (const { root, source_type, maxDepth } of ROOTS) {
    for (const fp of walkDir(root, { maxDepth: maxDepth ?? 8 })) {
      const st = safeStat(fp);
      if (!st) continue;
      all.push({ fp, mtime: st.mtime, source_type });
    }
  }
  all.sort((a, b) => b.mtime - a.mtime);
  const tx = db.transaction(() => {
    for (const r of all.slice(0, 200)) {
      ins.run(r.fp, r.mtime.toISOString(), r.source_type);
    }
  });
  tx();
  return Math.min(all.length, 200);
}
