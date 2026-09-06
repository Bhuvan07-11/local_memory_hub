import { useState } from 'react';
import { useData } from './hooks/useData';
import { ThemeToggle } from './components/bits';
import Dashboard from './components/Dashboard';
import { McpSection, SkillsSection, AgentsSection, MemorySection } from './components/Sections';
import { cx } from './lib/utils';

type Section = 'dashboard' | 'mcp' | 'skills' | 'agents' | 'memory';

const NAV: { id: Section; label: string; color: string }[] = [
  { id: 'dashboard', label: 'Dashboard', color: '#e2e8f0' },
  { id: 'mcp', label: 'MCP', color: '#3b82f6' },
  { id: 'skills', label: 'Skills', color: '#a855f7' },
  { id: 'agents', label: 'Agents', color: '#22c55e' },
  { id: 'memory', label: 'Memory', color: '#f59e0b' }
];

export default function App() {
  const [section, setSection] = useState<Section>('dashboard');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ content_type: string; content_id: string; snippet: string }[] | null>(null);
  const { data: dash, reload } = useData<any>('/api/dashboard');

  const search = async () => {
    if (!q.trim()) { setResults(null); return; }
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setResults(await r.json());
  };

  const refresh = async () => {
    await fetch('/api/refresh', { method: 'POST' });
    reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 dark:bg-slate-950">
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2">
          <button onClick={() => setSection('dashboard')} className="text-lg font-extrabold">
            🧠 Memory<span className="text-amber-400">Hub</span>
          </button>
          <div className="flex gap-1">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setSection(n.id)}
                className={cx('btn', section === n.id ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800')}
                style={section === n.id ? { borderBottom: `2px solid ${n.color}` } : undefined}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Global search…"
              className="w-44 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm"
            />
            <button className="btn bg-slate-700" onClick={search}>🔍</button>
            <button className="btn bg-slate-700" onClick={refresh}>↻ Refresh</button>
            <ThemeToggle />
          </div>
        </div>
        {results && (
          <div className="mx-auto max-w-7xl px-4 pb-2">
            <div className="card !p-2 text-sm">
              <div className="mb-1 flex justify-between">
                <b>{results.length} results</b>
                <button onClick={() => setResults(null)}>✕</button>
              </div>
              {results.map((r, i) => (
                <div key={i} className="border-t border-slate-700 py-1">
                  <span className="badge bg-slate-700 mr-2">{r.content_type}</span>
                  <span className="break-all">{r.content_id}</span>
                  <div className="text-xs text-slate-400" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-4">
        {section === 'dashboard' && <Dashboard dash={dash} go={(s) => setSection(s as Section)} />}
        {section === 'mcp' && <McpSection />}
        {section === 'skills' && <SkillsSection />}
        {section === 'agents' && <AgentsSection />}
        {section === 'memory' && <MemorySection />}
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-500">
        your-data · localhost:5173 → API :3001 · scans are local-only, secrets redacted
      </footer>
    </div>
  );
}
