export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

export function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function fmtBytes(n?: number) {
  if (!n && n !== 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

// minimal markdown → html (headings, bold, code, links, lists)
export function md(src: string): string {
  const esc = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .split('\n')
    .map((line) => {
      if (/^###\s/.test(line)) return `<h4>${line.slice(4)}</h4>`;
      if (/^##\s/.test(line)) return `<h3>${line.slice(3)}</h3>`;
      if (/^#\s/.test(line)) return `<h2>${line.slice(2)}</h2>`;
      if (/^[-*]\s/.test(line)) return `<li>${line.slice(2)}</li>`;
      if (/^\d+\.\s/.test(line)) return `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
      if (/^```/.test(line)) return `<pre>`;
      if (line.trim() === '') return '<br/>';
      return `<p>${line}</p>`;
    })
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
