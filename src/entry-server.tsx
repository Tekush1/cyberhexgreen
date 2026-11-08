// Build-time prerender: renders a public page to HTML so crawlers that don't run
// JavaScript (AI crawlers, link previews, many search bots) see the real content.
// Used only by scripts/prerender.mjs after `vite build`; never shipped to browsers.
import { Writable } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppShell } from './App';
import { ssrSeo, type SeoProps } from './features/seo/Seo';

export function render(url: string): Promise<{ html: string; seo: SeoProps | null }> {
  ssrSeo.current = null;
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _enc, cb) { html += chunk.toString(); cb(); },
      final(cb) { resolve({ html, seo: ssrSeo.current }); cb(); },
    });
    const stream = renderToPipeableStream(
      <StaticRouter location={url}>
        <AppShell />
      </StaticRouter>,
      {
        onAllReady() { stream.pipe(sink); },
        onShellError: reject,
        onError(err) { reject(err); },
      },
    );
    setTimeout(() => { stream.abort(); reject(new Error(`timeout rendering ${url}`)); }, 20000);
  });
}

export { events } from './data/events';
