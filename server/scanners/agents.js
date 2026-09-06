import fs from 'node:fs';
import db from '../db.js';

function readJsonc(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const noComments = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    return JSON.parse(noComments);
  } catch { return null; }
}

function summarizeToml(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const model = raw.match(/^\s*model\s*=\s*"([^"]+)"/m)?.[1] ?? '';
    const reasoning = raw.match(/^\s*model_reasoning_effort\s*=\s*"([^"]+)"/m)?.[1] ?? '';
    return { model: reasoning ? `${model} (${reasoning})` : model, raw: raw.slice(0, 8000) };
  } catch { return { model: '', raw: '' }; }
}

export function scanAgents() {
  const stmt = db.prepare(`
    INSERT INTO agents (platform, model, config_json, source_file)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(platform) DO UPDATE SET
      model=excluded.model, config_json=excluded.config_json, source_file=excluded.source_file
  `);
  const tx = db.transaction(() => {
    // Codex
    const codexPath = 'C:\\Users\\Bhuvanesh\\.codex\\config.toml';
    if (fs.existsSync(codexPath)) {
      const { model, raw } = summarizeToml(codexPath);
      stmt.run('codex', model, raw, codexPath);
    }
    // Claude Code
    const claudePath = 'C:\\Users\\Bhuvanesh\\.claude.json';
    const claude = readJsonc(claudePath);
    const claudeSettings = readJsonc('C:\\Users\\Bhuvanesh\\.claude\\settings.json');
    if (claude || claudeSettings) {
      stmt.run(
        'claude-code',
        claudeSettings?.model ?? claude?.model ?? 'haiku',
        JSON.stringify({ projects: claude ? Object.keys(claude.projects ?? {}) : [], mcpServers: Object.keys(claude?.mcpServers ?? {}) }).slice(0, 4000),
        claudePath
      );
    }
    // OpenCode
    const openPath = 'C:\\Users\\Bhuvanesh\\.config\\opencode\\opencode.jsonc';
    const openCfg = readJsonc(openPath);
    if (openCfg) {
      stmt.run(
        'opencode',
        openCfg.model ?? '',
        JSON.stringify({ model: openCfg.model, small_model: openCfg.small_model, providers: Object.keys(openCfg.provider ?? {}) }).slice(0, 4000),
        openPath
      );
    }
    // Cursor (workspace-level, no single global config — summarize)
    stmt.run(
      'cursor',
      'workspace-scoped',
      JSON.stringify({ note: 'Per-project MCP state under .cursor/projects; skills mirrored in .cursor/skills-cursor' }),
      'C:\\Users\\Bhuvanesh\\.cursor'
    );
  });
  tx();
  return 4;
}
