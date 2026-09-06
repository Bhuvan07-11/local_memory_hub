import { useState, type ReactNode } from 'react';
import { cx } from '../lib/utils';

export function StatCard({ label, value, accent }: { label: string; value: ReactNode; accent: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

export function ExpandableCard({ title, badge, children, preview }: {
  title: string; badge?: ReactNode; preview?: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold truncate">{title}</div>
        <div className="flex items-center gap-2 shrink-0">{badge}<span className="text-slate-400 text-sm">{open ? '▾' : '▸'}</span></div>
      </div>
      {preview && <div className="mt-1 text-sm text-slate-300">{preview}</div>}
      {open && <div className="mt-3 border-t border-slate-700 pt-3" onClick={(e) => e.stopPropagation()}>{children}</div>}
    </div>
  );
}

export function SectionTitle({ color, children }: { color: string; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xl font-bold">
      <span className="inline-block h-4 w-1 rounded" style={{ background: color }} />
      {children}
    </h2>
  );
}

export function SkeletonGrid({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card"><div className="skeleton h-5 w-2/3" /><div className="skeleton mt-2 h-3 w-full" /><div className="skeleton mt-1 h-3 w-4/5" /></div>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const el = document.documentElement;
    el.classList.toggle('dark');
    const isDark = el.classList.contains('dark');
    setDark(isDark);
    document.body.style.background = isDark ? '#0f172a' : '#f8fafc';
    document.body.style.color = isDark ? '#e2e8f0' : '#0f172a';
  };
  return (
    <button className={cx('btn bg-slate-700 text-white dark:bg-slate-700')} onClick={toggle}>
      {dark ? '☀ Light' : '🌙 Dark'}
    </button>
  );
}
