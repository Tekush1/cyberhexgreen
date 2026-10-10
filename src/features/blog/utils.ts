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
