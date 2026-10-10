import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// Raw HTML in posts is never rendered (react-markdown escapes it), so a writer
// cannot inject scripts. Only markdown is turned into elements.

const isExternal = (href = '') => /^https?:\/\//.test(href) && !href.includes('cyberhx.com');

const components: Components = {
  h2: ({ node: _n, ...p }) => <h2 className="font-display mt-14 scroll-mt-28 text-2xl text-white sm:text-3xl" {...p} />,
  h3: ({ node: _n, ...p }) => <h3 className="mt-10 scroll-mt-28 text-xl font-bold text-white" {...p} />,
  h4: ({ node: _n, ...p }) => <h4 className="mt-8 text-lg font-semibold text-white" {...p} />,
  p: ({ node: _n, ...p }) => <p className="mt-5 leading-8 text-white/80" {...p} />,
  a: ({ node: _n, href, ...p }) => (
    <a
      href={href}
      className="font-medium text-glow underline decoration-glow/30 underline-offset-4 transition hover:decoration-glow"
      {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } : {})}
      {...p}
    />
  ),
  ul: ({ node: _n, ...p }) => <ul className="mt-5 list-disc space-y-2 pl-6 text-white/80 marker:text-glow" {...p} />,
  ol: ({ node: _n, ...p }) => <ol className="mt-5 list-decimal space-y-2 pl-6 text-white/80 marker:text-muted" {...p} />,
  li: ({ node: _n, ...p }) => <li className="pl-1 leading-7" {...p} />,
  blockquote: ({ node: _n, ...p }) => (
    <blockquote className="mt-6 border-l-4 border-glow/60 bg-glow/[0.04] py-1 pl-5 pr-4 italic text-white/75 [&>p]:mt-3" {...p} />
  ),
  hr: () => <hr className="my-12 border-t-2 border-line" />,
  strong: ({ node: _n, ...p }) => <strong className="font-semibold text-white" {...p} />,
  img: ({ node: _n, src, alt }) => (
    <figure className="my-8">
      <img src={src} alt={alt ?? ''} loading="lazy" className="w-full rounded-2xl border-2 border-line bg-panel" />
      {alt && <figcaption className="mt-2 text-center text-sm text-muted">{alt}</figcaption>}
    </figure>
  ),
  pre: ({ node: _n, ...p }) => (
    <pre className="mt-6 overflow-x-auto rounded-xl border-2 border-line bg-[#0b1020] p-4 text-[13px] leading-6 [&>code]:bg-transparent [&>code]:p-0" {...p} />
  ),
  code: ({ node: _n, className, ...p }) =>
    className ? (
      <code className={`${className} font-mono`} {...p} />
    ) : (
      <code className="rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-lime" {...p} />
    ),
  table: ({ node: _n, ...p }) => (
    <div className="mt-6 overflow-x-auto rounded-xl border-2 border-line">
      <table className="w-full text-left text-sm" {...p} />
    </div>
  ),
  th: ({ node: _n, ...p }) => <th className="border-b-2 border-line bg-panel px-4 py-2.5 font-semibold text-white" {...p} />,
  td: ({ node: _n, ...p }) => <td className="border-t border-line px-4 py-2.5 text-white/80" {...p} />,
};

export const Markdown = ({ children }: { children: string }) => (
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

export default Markdown;
