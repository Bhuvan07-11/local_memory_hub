# AGENT.md — MemoryHub Session Log

> Project: `your-data` (MemoryHub — Your AI Agent Ecosystem)
> Repo: https://github.com/Bhuvan07-11/local_memory_hub
> Session: 2026-09-06 (created via opencode / Muse Spark 1.2)

## Summary
End-to-end setup of MemoryHub localhost dashboard: read codebase, created `README.md`, fixed and ran dev + prod servers, made production-ready for live deploy, pushed to GitHub, and mirrored into Obsidian memory vault.

## What Was Done

### 1. Read & Documented Project
- Inspected `package.json:1`, `vite.config.ts:1`, `server/index.js:1`, `server/db.js:1`, `src/App.tsx:1`, scanners, routes, components.
- Created `README.md:1` — features table, architecture tree, SQLite schema (`server/db.js:29`), requirements (Node ≥22 for `node:sqlite`), quick start, scripts, full API table (`/api/health`, `/dashboard`, `/mcp`, `/skills`, `/agents`, `/memory/*`, `/search`, `/refresh`), config paths, tech stack, troubleshooting.

### 2. Ran Project
- Verified Node `v24.18.1`, `npm install` already done, `npm run build` → `dist/` (`158.70 kB` js, `13.72 kB` css).
- Started API `node server/index.js` on `:3001` — `GET /api/health → 200`, dashboard stats `notes:24, skills:33, mcp:11, agents:4, words:1885`.
- Fixed Vite binding: `vite.config.ts:6` added `host: '0.0.0.0'` (was only `127.0.0.1`, so `http://localhost:5173` → `::1` failed). Restarted Vite on `:5173` — `GET / → 200`, `GET /src/main.tsx → 200`, proxy `GET /api/health → 200` verified.

### 3. Made Production-Ready (for Live)
- `server/index.js:1` — added `path`/`fs`/`fileURLToPath`, static serve of `dist/` with SPA fallback, `PORT` env (`Number(process.env.PORT) || 3001`, `0.0.0.0`).
- `package.json:7` — `start: "node server/index.js"`, `start:prod: "npm run build && node server/index.js"`, added `preview`.
- `Dockerfile:1` — `node:24-alpine`, `npm ci`, `npm run build`, `EXPOSE 3001`.
- `.dockerignore:1` — ignore `node_modules`, `dist`, `*.db-wal` etc.
- Tested prod: `npm run build` + `node server/index.js` → `GET http://localhost:3001/ → 200` (built html), `GET /api/health → 200`.

### 4. Live Deploy (Kept Local per User)
- Started `npx --yes localtunnel --port 3001` → `https://thin-onions-add.loca.lt` (verified `GET /api/health → 200` via tunnel).
- User requested keep local, so stopped tunnel processes (`18072, 25020, 9200`). Kept `http://localhost:5173` (Vite dev) + `http://localhost:3001` (prod single-port) both alive.

### 5. Pushed to GitHub
- `git init`, `.gitignore:1` (`node_modules/`, `dist/`, `data/*.db*`, `vite.log`, `lt.log`), `git add .`, commit `d255b5e feat: MemoryHub initial commit`.
- Remote `https://github.com/Bhuvan07-11/local_memory_hub.git`, fetch showed remote `e9ece3a Initial commit`, `git pull --rebase origin main` → `a27327b`, `git push origin main → e9ece3a..a27327b main -> main`.

### 6. Mirrored to Obsidian Vault
- Created `C:\Users\Bhuvanesh\Downloads\memory\02-Projects\Active\MemoryHub/` with `MemoryHub.md:1` (project note, frontmatter `type: project`, milestones, run, API, links) + copied `README.md`.
- `POST /api/refresh → {notes:26, skills:57, mcp:11, agents:4}` (notes+2 from new vault files), `GET /api/dashboard → notes:26, words:3180`, top recent `.../MemoryHub/MemoryHub.md`.

## How to Run
```bash
npm install          # first time
npm run dev          # one command: API :3001 + Vite :5173 → http://localhost:5173
# alt prod single-port: npm run start:prod → http://localhost:3001
# alt: npm start     # prod serve (no Vite) → http://localhost:3001
```
Requires Node ≥22, ports 3001 + 5173 free. Hard refresh `Ctrl+Shift+R` if blank.

## Key Files Changed/Created
- `README.md:1` (new)
- `vite.config.ts:6` (`host: '0.0.0.0'`)
- `server/index.js:1` (static + PORT env)
- `package.json:7` (scripts)
- `Dockerfile:1`, `.dockerignore:1`, `.gitignore:1`
- `AGENT.md:1` (this file) — session log
- Vault: `Downloads/memory/02-Projects/Active/MemoryHub/MemoryHub.md:1`, `README.md`

## API Reference (server/index.js:40)
`GET /api/health`, `GET /api/dashboard`, `GET /api/mcp`, `GET /api/skills?source=&q=`, `GET /api/skills/:name`, `GET /api/agents`, `GET /api/memory/tree`, `GET /api/memory/notes?path=&q=`, `GET /api/memory/note?path=`, `GET /api/search?q=`, `POST /api/refresh`

## Current State
- Local: `http://localhost:5173` 200, `http://localhost:3001` 200, DB `memoryhub.db` WAL, `dist/` built.
- GitHub: `Bhuvan07-11/local_memory_hub` `main` @ `a27327b`.
- Vault: MemoryHub project active, indexed.

---
*Saved: 2026-09-06 — run `npm run dev` to resume. For live, `npx --yes localtunnel --port 3001`.*
