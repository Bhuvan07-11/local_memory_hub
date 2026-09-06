import { useState } from 'react';
import { useData } from '../hooks/useData';
import { fmtDate, md } from '../lib/utils';
import { ExpandableCard, SectionTitle, SkeletonGrid } from './bits';

type Mcp = { name: string; type: string; command: string; url: string; agents: string; config_json: string; source_file: string };
type Skill = { name: string; source: string; path: string; description: string };
type Agent = { platform: string; model: string; config_json: string; source_file: string };
type Note = { path: string; title: string; preview: string; tags: string; word_count: number; modified_at: string; folder: string };

const TYPE_COLOR: Record<string, string> = { stdio: '#22c55e', remote: '#3b82f6', http: '#06b6d4', 'cursor-project': '#a855f7', unknown: '#64748b' };

export function McpSection() {
  const { data, loading } = useData<Mcp[]>('/api/mcp');
  if (loading) return <SkeletonGrid />;
  return (
    <div>
      <SectionTitle color="#3b82f6">MCP servers ({data?.length ?? 0})</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((m) => (
          <ExpandableCard
            key={m.name + m.source_file}
            title={m.name}
            badge={<span className="badge" style={{ background: `${TYPE_COLOR[m.type] ?? '#64748b'}22`, color: TYPE_COLOR[m.type] ?? '#94a3b8' }}>{m.type}</span>}
            preview={<span className="text-xs">{m.url || m.command || m.source_file} · <b>{m.agents}</b></span>}
          >
            <div className="text-xs text-slate-300 space-y-1">
              {m.url && <div><b>URL:</b> <span className="break-all">{m.url}</span></div>}
              {m.command && <div><b>Command:</b> <span className="break-all">{m.command}</span></div>}
              <div><b>Agents:</b> {m.agents}</div>
              <div><b>Source:</b> <span className="break-all">{m.source_file}</span></div>
              <details className="mt-2"><summary className="cursor-pointer">Config JSON (secrets redacted)</summary>
                <pre className="mt-1 max-h-64 overflow-auto rounded bg-slate-900 p-2 text-xs">{m.config_json}</pre>
              </details>
            </div>
          </ExpandableCard>
        ))}
      </div>
    </div>
  );
}

const SRC_BADGE: Record<string, string> = { agents: '#a855f7', 'codex-system': '#3b82f6', 'cursor-mirror': '#64748b' };

export function SkillsSection() {
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const qs = new URLSearchParams({ ...(source ? { source } : {}), ...(q ? { q } : {}) }).toString();
  const { data, loading } = useData<{ skills: Skill[]; sync: { primary: number; mirror: number; inSync: boolean } }>(`/api/skills?${qs}`);
  const [full, setFull] = useState<Record<string, string>>({});

  const open = async (name: string) => {
    if (full[name]) { const c = { ...full }; delete c[name]; setFull(c); return; }
    const r = await fetch(`/api/skills/${encodeURIComponent(name)}`);
    const j = await r.json();
    setFull({ ...full, [name]: j.content ?? '' });
  };

  return (
    <div>
      <SectionTitle color="#a855f7">Skills ({data?.skills.length ?? 0})</SectionTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills…"
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm w-64" />
        {['', 'agents', 'codex-system', 'cursor-mirror'].map((s) => (
          <button key={s || 'all'} onClick={() => setSource(s)}
            className={`btn ${source === s ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
            {s || 'all'}
          </button>
        ))}
        {data?.sync && (
          <span className="text-xs text-slate-400 self-center">
            mirror: {data.sync.mirror}/{data.sync.primary} {data.sync.inSync ? '· in sync ✓' : '· out of sync'}
          </span>
        )}
      </div>
      {loading ? <SkeletonGrid /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.skills ?? []).map((s) => (
            <div key={s.name} className="card cursor-pointer" onClick={() => open(s.name)}>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold truncate">{s.name}</div>
                <span className="badge shrink-0" style={{ background: `${SRC_BADGE[s.source] ?? '#a855f7'}22`, color: SRC_BADGE[s.source] ?? '#c084fc' }}>{s.source}</span>
              </div>
              <div className="mt-1 text-sm text-slate-300">{s.description}</div>
              {full[s.name] && (
                <div className="prose-notes mt-2 max-h-96 overflow-auto border-t border-slate-700 pt-2"
                  dangerouslySetInnerHTML={{ __html: md(full[s.name]) }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentsSection() {
  const { data, loading } = useData<Agent[]>('/api/agents');
  if (loading) return <SkeletonGrid n={4} />;
  return (
    <div>
      <SectionTitle color="#22c55e">Agents</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((a) => (
          <ExpandableCard
            key={a.platform}
            title={a.platform}
            badge={<span className="badge bg-green-500/20 text-green-300">{a.model}</span>}
            preview={<span className="text-xs break-all">{a.source_file}</span>}
          >
            <pre className="max-h-80 overflow-auto rounded bg-slate-900 p-2 text-xs">{a.config_json}</pre>
          </ExpandableCard>
        ))}
      </div>
    </div>
  );
}

export function MemorySection() {
  const { data: tree } = useData<{ total: number; folders: { folder: string; c: number }[] }>('/api/memory/tree');
  const [folder, setFolder] = useState('');
  const [q, setQ] = useState('');
  const [openNote, setOpenNote] = useState<(Note & { content: string }) | null>(null);
  const qs = new URLSearchParams({ ...(folder ? { path: folder } : {}), ...(q ? { q } : {}) }).toString();
  const { data: notes, loading } = useData<Note[]>(`/api/memory/notes?${qs}`);

  const view = async (p: string) => {
    const r = await fetch(`/api/memory/note?path=${encodeURIComponent(p)}`);
    setOpenNote(await r.json());
  };

  return (
    <div>
      <SectionTitle color="#f59e0b">Memory — Obsidian vault ({tree?.total ?? 0} notes)</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="card !p-2 h-fit max-h-[70vh] overflow-auto text-sm">
          <button onClick={() => setFolder('')} className={`block w-full rounded px-2 py-1 text-left ${!folder ? 'bg-amber-500/20' : ''}`}>
            All notes
          </button>
          {(tree?.folders ?? []).map((f) => (
            <button key={f.folder} onClick={() => setFolder(f.folder)}
              className={`block w-full truncate rounded px-2 py-1 text-left ${folder === f.folder ? 'bg-amber-500/20' : ''}`}>
              {f.folder} <span className="text-slate-400">({f.c})</span>
            </button>
          ))}
        </div>
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…"
            className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm" />
          {loading ? <SkeletonGrid /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(notes ?? []).map((n) => (
                <div key={n.path} className="card cursor-pointer" onClick={() => view(n.path)}>
                  <div className="font-semibold truncate">{n.title}</div>
                  <div className="mt-1 text-sm text-slate-300">{n.preview.slice(0, 100)}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {n.tags && <span className="mr-2">#{n.tags}</span>}
                    {n.word_count} words · {fmtDate(n.modified_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {openNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpenNote(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl bg-slate-800 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{openNote.title}</h3>
              <button className="btn bg-slate-700" onClick={() => setOpenNote(null)}>Close</button>
            </div>
            <div className="text-xs text-slate-400">{openNote.path}</div>
            <div className="prose-notes mt-3" dangerouslySetInnerHTML={{ __html: md(openNote.content ?? '') }} />
          </div>
        </div>
      )}
    </div>
  );
}
