// Small pure helpers shared by the blog pages and the editor.

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';

export const wordCount = (md: string) => (md.replace(/```[\s\S]*?```/g, ' ').match(/\S+/g) || []).length;

export const readTime = (md: string) => Math.max(1, Math.round(wordCount(md) / 200));

/** First real paragraph of the markdown, as plain text, for an excerpt. */
export const excerptFrom = (md: string, max = 180) => {
  const para =
    md
      .replace(/```[\s\S]*?```/g, '')
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .find((p) => p && !/^(#|!\[|>|-|\*|\d+\.)/.test(p)) || '';
  const text = para
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

export const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const compactNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}K` : String(n);

/** Headings (## and ###) for a table of contents; ids match rehype-slug output. */
export const tocFrom = (md: string) => {
  const seen = new Map<string, number>();
  return md
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .map((l) => /^(#{2,3})\s+(.+?)\s*#*$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => {
      const text = m[2].replace(/[*_`]/g, '').trim();
      let id = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/\s/g, '-');
      const n = seen.get(id) ?? 0;
      seen.set(id, n + 1);
      if (n) id = `${id}-${n}`;
      return { level: m[1].length, text, id };
    });
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Drops a first line that only repeats the post title ("# Title" or plain "Title"): the page already shows it as the heading. */
export const stripLeadingTitle = (md: string, title: string) => {
  const m = /^\s*(?:#{1,2}\s+)?([^\n]+)\n+/.exec(md);
  return m && norm(m[1]) === norm(title) ? md.slice(m[0].length) : md;
};

/** True when two texts say the same thing (e.g. an excerpt that only repeats the title). */
export const sameText = (a?: string | null, b?: string | null) => !!a && !!b && norm(a) === norm(b);

export const isAnonymous = (name?: string | null) => !name || /^(anon|anonymous|unknown)$/i.test(name.trim());
/** "anonymous" -> "Anonymous contributor"; any other name as written. */
export const authorLabel = (name?: string | null) => (isAnonymous(name) ? 'Anonymous contributor' : name!.trim());

export const DIFFICULTY: Record<'easy' | 'medium' | 'hard' | 'insane', { label: string; cls: string }> = {
  easy: { label: 'Easy', cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
  medium: { label: 'Medium', cls: 'border-amber-300/30 bg-amber-300/10 text-amber-200' },
  hard: { label: 'Hard', cls: 'border-orange-400/35 bg-orange-400/10 text-orange-300' },
  insane: { label: 'Insane', cls: 'border-red-400/35 bg-red-500/10 text-red-300' },
};

/** "linkedin.com/in/someone" for a link label. */
export const prettyUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
