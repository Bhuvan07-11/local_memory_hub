import { fmtDate, fmtBytes } from '../lib/utils';
import { StatCard } from './bits';

type Dash = {
  stats: { notes: number; skills: number; mcp: number; agents: number; projects: number; words: number; dbSize: number };
  recent: { file_path: string; timestamp: string; source_type: string }[];
  projects: { name: string; path: string; modified: string; fileCount: number; stack: string }[];
  scannedAt: string;
};

const SRC_COLOR: Record<string, string> = {
  memory: '#f59e0b', skill: ' #a855f7', project: '#22c55e', mcp: '#3b82f6'
};

export default function Dashboard({ dash, go }: { dash: Dash | null; go: (s: string) => void }) {
  if (!dash) return <div className="text-slate-400">Loading dashboard…</div>;
  const cards = [
    { label: 'Notes', value: dash.stats.notes, accent: '#f59e0b' },
    { label: 'Skills', value: dash.stats.skills, accent: '#a855f7' },
    { label: 'MCP servers', value: dash.stats.mcp, accent: '#3b82f6' },
    { label: 'Agents', value: dash.stats.agents, accent: '#22c55e' },
    { label: 'Projects', value: dash.stats.projects, accent: '#22c55e' },
    { label: 'Words indexed', value: dash.stats.words.toLocaleString(), accent: '#e2e8f0' }
  ];
  return (
    <div>
      <div className="rounded-2xl border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 p-6">
        <h1 className="text-3xl font-extrabold">MemoryHub</h1>
        <p className="mt-1 text-slate-300">Your AI Agent Ecosystem at a Glance</p>
        <p className="mt-2 text-xs text-slate-400">
          Scanned {fmtDate(dash.scannedAt)} · DB {fmtBytes(dash.stats.dbSize)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { s: 'mcp', t: 'MCP', d: 'Servers, transports & tools', c: '#3b82f6' },
          { s: 'skills', t: 'Skills', d: 'All agent skills & usage', c: '#a855f7' },
          { s: 'agents', t: 'Agents', d: 'Codex, Claude, OpenCode, Cursor', c: '#22c55e' },
          { s: 'memory', t: 'Memory', d: 'Obsidian vault browser', c: '#f59e0b' }
        ].map((q) => (
          <button key={q.s} onClick={() => go(q.s)} className="card text-left" style={{ borderTop: `3px solid ${q.c}` }}>
            <div className="font-bold" style={{ color: q.c }}>{q.t}</div>
            <div className="text-sm text-slate-300">{q.d}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-bold">Recent activity</h2>
          <div className="space-y-2">
            {dash.recent.map((r, i) => (
              <div key={i} className="card !p-2 text-sm">
                <span className="badge mr-2" style={{ background: `${SRC_COLOR[r.source_type] ?? '#64748b'}22`, color: SRC_COLOR[r.source_type] ?? '#94a3b8' }}>
                  {r.source_type}
                </span>
                <span className="break-all">{r.file_path}</span>
                <div className="text-xs text-slate-400">{fmtDate(r.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold">Recent work</h2>
          <div className="space-y-2">
            {dash.projects.map((p) => (
              <div key={p.path} className="card !p-2 text-sm">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-slate-400">
                  {p.fileCount} files · {p.stack || 'unknown stack'} · {fmtDate(p.modified)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
