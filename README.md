# MemoryHub — Your AI Agent Ecosystem

> Localhost dashboard that unifies your **MCP servers**, **agent skills**, **agent configs**, and **Obsidian memory vault** into a single searchable UI.

![MemoryHub](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Express%20%2B%20SQLite-blue) ![Node](https://img.shields.io/badge/node-%3E%3D22%20required-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Features

| Section | What it shows | Source |
|---------|---------------|--------|
| **Dashboard** | Notes / Skills / MCP / Agents counts, DB size, recent activity (10 newest), recent work projects | SQLite aggregates |
| **MCP** | All MCP servers with type (`stdio` / `remote` / `http` / `cursor-project`), command/URL, agents, redacted config JSON | `~/.codex/config.toml`, `~/.config/opencode/opencode.jsonc`, `~/.claude.json`, `~/.cursor/projects/*/mcps` |
| **Skills** | Skill cards with description, source badge, full markdown viewer | `~/.agents/skills`, `~/.codex/skills/.system`, `~/.cursor/skills-cursor` (mirror) |
| **Agents** | Codex / Claude Code / OpenCode / Cursor configs & models | `~/.codex/config.toml`, `~/.claude*.json`, `~/.config/opencode/opencode.jsonc` |
| **Memory** | Obsidian vault browser: folder tree, search, note preview, full markdown modal | `~/Downloads/memory` (configurable) |

Additional:

- **Global FTS5 search** (`/api/search?q=`) across skills, notes, MCP & agents with highlighted snippets.
- **Full scan + incremental file-watcher** (`chokidar`, debounced 3 s) and manual **Refresh** button.
- **Secret redaction** — `sk-ant-*`, `sk-or-v1-*`, `apiKey`/`accessToken` fields and `Bearer` tokens are masked in API responses.
- Dark theme (Tailwind, `class` mode) with toggle.

---

## Architecture

```
your-data/
├── server/
│   ├── index.js        # Express app, /api/* routes, fullScan() + chokidar watcher
│   ├── db.js           # node:sqlite (DatabaseSync) — tables + FTS5 + WAL + helpers
│   ├── routes/
│   │   ├── dashboard.js # GET /api/dashboard
│   │   ├── mcp.js       # GET /api/mcp
│   │   ├── skills.js    # GET /api/skills, GET /api/skills/:name
│   │   ├── agents.js    # GET /api/agents
│   │   └── memory.js    # GET /api/memory/tree, /notes, /note?path=
│   └── scanners/
│       ├── obsidian.js  # markdown vault → notes + files
│       ├── skills.js    # SKILL.md → skills + files
│       ├── mcp.js       # TOML/JSONC → mcp_servers
│       ├── agents.js    # configs → agents
│       └── recent.js    # recent_activity + topLevelProjects()
├── src/
│   ├── App.tsx          # Nav (Dashboard/MCP/Skills/Agents/Memory), global search
│   ├── components/{Dashboard,Sections,bits}.tsx
│   ├── hooks/useData.ts # generic fetch hook
│   ├── lib/utils.ts     # cx, fmtDate, fmtBytes, md()
│   ├── index.css        # Tailwind + .card/.badge/.btn/.prose-notes
│   └── main.tsx
├── data/
│   └── memoryhub.db     # SQLite DB (WAL) — auto-created
├── index.html
├── vite.config.ts       # React plugin, proxy /api → :3001
└── tailwind.config.js
```

**SQLite schema** — `server/db.js:29` creates:

- `files`, `skills`, `mcp_servers`, `mcp_tools`, `agents`, `notes`, `recent_activity` tables
- `search_index` — `FTS5(content_type, content_id, field, text)` rebuilt on every `fullScan()`.

---

## Requirements

- **Node.js >= 22** (uses `node:sqlite` / `DatabaseSync` — not available on Node 20)
- Windows paths are hard-coded in scanners (see [Configuration](#configuration)) — on macOS/Linux adjust them

Verify:

```bash
node --version  # should be v22+ (tested on v24.18.1)
```

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Run (API + Vite concurrently)
npm run dev
# — or —
npm start

# 3. Open
# Frontend → http://localhost:5173
# API      → http://localhost:3001
```

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | `concurrently "node server/index.js" "vite --port 5173"` | Dev: API :3001 + Vite :5173 |
| `npm start` | alias of `dev` | Same as `dev` |
| `npm run server` | `node server/index.js` | API only |
| `npm run client` | `vite --port 5173` | Vite only (needs API running) |
| `npm run build` | `vite build` | Production frontend to `dist/` |

On first start `fullScan()` runs automatically — console logs ` [scan] done in <ms> { notes, skills, mcp, agents, recent }`.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | `{ ok: true }` |
| `GET` | `/api/dashboard` | `{ stats, recent, projects, scannedAt }` |
| `GET` | `/api/mcp` | `McpServer[]` |
| `GET` | `/api/skills?source=&q=` | `{ skills: Skill[], sync: { primary, mirror, inSync } }` |
| `GET` | `/api/skills/:name` | `{ content }` (raw `SKILL.md`) |
| `GET` | `/api/agents` | `Agent[]` |
| `GET` | `/api/memory/tree` | `{ total, folders: { folder, c }[] }` |
| `GET` | `/api/memory/notes?path=&q=` | `Note[]` (filter by folder or search) |
| `GET` | `/api/memory/note?path=` | Single note `{ path, title, content, ... }` |
| `GET` | `/api/search?q=` | FTS5 results `{ content_type, content_id, snippet }[]` (max 30, HTML `<b>` highlights) |
| `POST` | `/api/refresh` | Re-runs `fullScan()`, returns counts |

All list endpoints serve from SQLite; scanners + `rebuildSearchIndex()` are invoked by `POST /api/refresh`, startup `fullScan()`, and the debounced `chokidar` watcher.

---

## Configuration

Scanned roots are hard-coded — edit to match your machine:

| Scanner | File | Current path(s) |
|---------|------|-----------------|
| Obsidian vault | `server/scanners/obsidian.js:6` | `C:\Users\Bhuvanesh\Downloads\memory` |
| Skills | `server/scanners/skills.js:8` | `~/.cursor/skills-cursor`, `~/.agents/skills`, `~/.codex/skills/.system` |
| MCP | `server/scanners/mcp.js:40` | `~/.codex/config.toml`, `~/.config/opencode/opencode.jsonc`, `~/.claude.json`, `~/.cursor/projects` |
| Agents | `server/scanners/agents.js:30` | same as MCP + `~/.claude/settings.json` |
| Recent / Projects | `server/scanners/recent.js:5` | `~/Documents/Codex`, `~/OneDrive/Desktop`, `~/Downloads/memory` |
| File watcher | `server/index.js:65` | `~/Downloads/memory`, `~/.agents/skills`, `~/.codex/skills/.system` |

Ports:

- API: `3001` — `server/index.js:60` (`const PORT = 3001`)
- Vite: `5173` + proxy `/api → http://localhost:3001` — `vite.config.ts:7`

---

## Tech Stack

- **Frontend:** React 18, Vite 6, TypeScript 5, Tailwind CSS 3, `useData` fetch hook
- **Backend:** Express 4, CORS, Chokidar 4, `node:sqlite` (`DatabaseSync`), `gray-matter`, `marked`
- **Dev:** `concurrently`, `@vitejs/plugin-react`

---

## Troubleshooting

- `Cannot find module 'node:sqlite'` → upgrade to **Node >= 22.5** (ideally Node 24 LTS).
- Empty dashboard → scanned roots don't exist on this machine — check paths above and `POST /api/refresh` response for `*Error` fields.
- Port in use → change `PORT` in `server/index.js:60` and `vite.config.ts:9` proxy target.
- DB locked / `memoryhub.db-wal` growing → stop both processes; the DB uses WAL mode (`db.js:12`).

---

## License

MIT — see project root.
