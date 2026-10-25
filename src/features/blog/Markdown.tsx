import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// Raw HTML in posts is never rendered (react-markdown escapes it), so a writer
// cannot inject scripts. Only markdown is turned into elements.

const isExternal = (href = '') => /^https?:\/\//.test(href) && !href.includes('cyberhx.com');

type Tone = 'light' | 'dark';

const makeComponents = (tone: Tone): Components => {
  const dark = tone === 'dark';
  const heading = dark ? 'text-white' : 'text-ink';
  const body = dark ? 'text-white/80' : 'text-ink/75';
  const marker = dark ? 'marker:text-glow' : 'marker:text-[#7a9a00]';
  const markerNum = dark ? 'marker:text-muted' : 'marker:text-ink/40';
  const line = dark ? 'border-line' : 'border-black/10';
  const panel = dark ? 'bg-panel' : 'bg-[#f4f6f1]';
  const quote = dark
    ? 'border-glow/60 bg-glow/[0.04] text-white/75'
    : 'border-lime bg-lime/[0.08] text-ink/75';
  const link = dark
    ? 'font-medium text-glow underline decoration-glow/30 underline-offset-4 transition hover:decoration-glow'
    : 'font-medium text-ink underline decoration-lime decoration-2 underline-offset-4 transition hover:decoration-[3px]';
  const inlineCode = dark
    ? 'rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-lime'
    : 'rounded-md bg-black/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-[#2b2f36]';
  const th = dark ? 'bg-panel text-white' : 'bg-[#f4f6f1] text-ink';

  return {
    // A "# heading" inside a post is shown as a section heading: the page has one h1, the post title.
    h1: ({ node: _n, ...p }) => <h2 className={`font-display mt-14 scroll-mt-28 text-2xl sm:text-3xl ${heading}`} {...p} />,
    h2: ({ node: _n, ...p }) => <h2 className={`font-display mt-14 scroll-mt-28 text-2xl sm:text-3xl ${heading}`} {...p} />,
    h3: ({ node: _n, ...p }) => <h3 className={`mt-10 scroll-mt-28 text-xl font-bold ${heading}`} {...p} />,
    h4: ({ node: _n, ...p }) => <h4 className={`mt-8 text-lg font-semibold ${heading}`} {...p} />,
    p: ({ node: _n, ...p }) => <p className={`mt-5 leading-8 ${body}`} {...p} />,
    a: ({ node: _n, href, ...p }) => (
      <a href={href} className={link} {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } : {})} {...p} />
    ),
    ul: ({ node: _n, ...p }) => <ul className={`mt-5 list-disc space-y-2 pl-6 ${body} ${marker}`} {...p} />,
    ol: ({ node: _n, ...p }) => <ol className={`mt-5 list-decimal space-y-2 pl-6 ${body} ${markerNum}`} {...p} />,
    li: ({ node: _n, ...p }) => <li className="pl-1 leading-7" {...p} />,
    blockquote: ({ node: _n, ...p }) => <blockquote className={`mt-6 border-l-4 py-1 pl-5 pr-4 italic [&>p]:mt-3 ${quote}`} {...p} />,
    hr: () => <hr className={`my-12 border-t-2 ${line}`} />,
    strong: ({ node: _n, ...p }) => <strong className={`font-semibold ${heading}`} {...p} />,
    img: ({ node: _n, src, alt }) => (
      <figure className="my-8">
        <img src={src} alt={alt ?? ''} loading="lazy" className={`w-full rounded-2xl border-2 ${line} ${panel}`} />
        {alt && <figcaption className={`mt-2 text-center text-sm ${dark ? 'text-muted' : 'text-ink/50'}`}>{alt}</figcaption>}
      </figure>
    ),
    pre: ({ node: _n, ...p }) => (
      <pre className={`mt-6 overflow-x-auto rounded-xl border-2 ${line} bg-[#0b1020] p-4 text-[13px] leading-6 [&>code]:bg-transparent [&>code]:p-0`} {...p} />
    ),
    code: ({ node: _n, className, ...p }) =>
      className ? <code className={`${className} font-mono`} {...p} /> : <code className={inlineCode} {...p} />,
    table: ({ node: _n, ...p }) => (
      <div className={`mt-6 overflow-x-auto rounded-xl border-2 ${line}`}>
        <table className="w-full text-left text-sm" {...p} />
      </div>
    ),
    th: ({ node: _n, ...p }) => <th className={`border-b-2 ${line} px-4 py-2.5 font-semibold ${th}`} {...p} />,
    td: ({ node: _n, ...p }) => <td className={`border-t ${line} px-4 py-2.5 ${body}`} {...p} />,
  };
};

export const Markdown = ({ children, tone = 'dark' }: { children: string; tone?: Tone }) => {
  const components = useMemo(() => makeComponents(tone), [tone]);
  return (
    <div className="text-[1.05rem]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: true }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
