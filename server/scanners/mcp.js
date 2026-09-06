import fs from 'node:fs';
import path from 'node:path';
import db from '../db.js';

function readJsonc(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    // strip // and /* */ comments (naive but fine for config files)
    const noComments = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    return JSON.parse(noComments);
  } catch { return null; }
}

function readTomlSection(p) {
  // Minimal TOML parse for [mcp_servers.X] blocks in Codex config.toml
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const servers = {};
    let current = null;
    for (const line of raw.split('\n')) {
      const sec = line.match(/^\s*\[mcp_servers\.([^\]]+)\]/);
      if (sec) { current = sec[1].trim(); servers[current] = {}; continue; }
      if (!current) continue;
      const kv = line.match(/^\s*([A-Za-z_]+)\s*=\s*(.+?)\s*$/);
      if (kv) servers[current][kv[1]] = kv[2].replace(/^"|"$/g, '');
    }
    return servers;
  } catch { return {}; }
}

export function scanMcp() {
  db.exec(`DELETE FROM mcp_tools; DELETE FROM mcp_servers;`);
  const ins = db.prepare(`
    INSERT INTO mcp_servers (name, type, command, url, agents, config_json, source_file)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const rows = [];

  // Codex config.toml
  const codexToml = 'C:\\Users\\Bhuvanesh\\.codex\\config.toml';
  if (fs.existsSync(codexToml)) {
    const servers = readTomlSection(codexToml);
    // also try to capture command/url/transport hints from raw text
    let raw = '';
    try { raw = fs.readFileSync(codexToml, 'utf8'); } catch { /* ignore */ }
    for (const [name, kv] of Object.entries(servers)) {
      const block = raw.split(`[mcp_servers.${name}]`)[1]?.split('[')[0] ?? '';
      const urlM = block.match(/url\s*=\s*"([^"]+)"/);
      const cmdM = block.match(/command\s*=\s*"([^"]+)"/);
      const type = urlM ? 'remote' : (block.includes('command') ? 'stdio' : 'unknown');
      rows.push({
        name, type,
        command: cmdM?.[1] ?? (type === 'stdio' ? (kv.command ?? '') : ''),
        url: urlM?.[1] ?? (kv.url ?? ''),
        agents: 'codex', config_json: JSON.stringify(kv), source_file: codexToml
      });
    }
  }

  // OpenCode opencode.jsonc
  const openJsonc = 'C:\\Users\\Bhuvanesh\\.config\\opencode\\opencode.jsonc';
  const openCfg = readJsonc(openJsonc);
  if (openCfg?.mcp && typeof openCfg.mcp === 'object') {
    for (const [name, cfg] of Object.entries(openCfg.mcp)) {
      rows.push({
        name, type: cfg.type ?? 'remote',
        command: cfg.command ?? '', url: cfg.url ?? '',
        agents: 'opencode', config_json: JSON.stringify(cfg), source_file: openJsonc
      });
    }
  }

  // Claude Code .claude.json
  const claudeJson = 'C:\\Users\\Bhuvanesh\\.claude.json';
  const claudeCfg = readJsonc(claudeJson);
  const mcpServers = claudeCfg?.mcpServers ?? claudeCfg?.mcp ?? null;
  if (mcpServers && typeof mcpServers === 'object') {
    for (const [name, cfg] of Object.entries(mcpServers)) {
      rows.push({
        name, type: cfg.type ?? (cfg.url ? 'http' : 'stdio'),
        command: cfg.command ?? '', url: cfg.url ?? '',
        agents: 'claude-code', config_json: JSON.stringify(cfg), source_file: claudeJson
      });
    }
  }

  // Cursor per-project MCPs (tool schemas)
  const cursorProjects = 'C:\\Users\\Bhuvanesh\\.cursor\\projects';
  if (fs.existsSync(cursorProjects)) {
    for (const ws of fs.readdirSync(cursorProjects, { withFileTypes: true })) {
      if (!ws.isDirectory()) continue;
      const mcpsDir = path.join(cursorProjects, ws.name, 'mcps');
      if (!fs.existsSync(mcpsDir)) continue;
      for (const srv of fs.readdirSync(mcpsDir, { withFileTypes: true })) {
        if (!srv.isDirectory()) continue;
        const metaPath = path.join(mcpsDir, srv.name, 'SERVER_METADATA.json');
        let meta = {};
        try { if (fs.existsSync(metaPath)) meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { /* ignore */ }
        // count tools from schema files
        let toolCount = 0;
        try {
          toolCount = fs.readdirSync(path.join(mcpsDir, srv.name)).filter(f => f.endsWith('.json') && f !== 'SERVER_METADATA.json').length;
        } catch { /* ignore */ }
        rows.push({
          name: `${srv.name} (cursor:${ws.name.slice(0, 12)}…)`,
          type: 'cursor-project',
          command: '', url: '',
          agents: 'cursor',
          config_json: JSON.stringify({ workspace: ws.name, tools_schemas: toolCount, ...meta }).slice(0, 4000),
          source_file: mcpsDir
        });
      }
    }
  }

  const tx = db.transaction(() => {
    for (const r of rows) {
      try { ins.run(r.name, r.type, r.command, r.url, r.agents, r.config_json, r.source_file); } catch { /* dup — ignore */ }
    }
  });
  tx();
  return rows.length;
}
