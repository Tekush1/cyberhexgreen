import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { listenForStaleFiles } from './lib/chunkReload';
import './index.css';
import { splitLang } from './i18n/locales';
import { setLanguage } from './i18n/runtime';

listenForStaleFiles();

// A translated page (/es/…) loads its dictionary before React replaces the prerendered (already translated)
// markup, so the English never flashes. English pages render at once and never load a dictionary.
const { lang } = splitLang(window.location.pathname);
const ready = lang ? setLanguage(lang).catch(() => undefined) : Promise.resolve();

ready.then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  ),
);

// Hide the loading screen as soon as the page has painted, instead of waiting
// for every image and font on the page (the old "load" event did that).
const hideLoader = () => document.body.classList.add('loaded');
requestAnimationFrame(() => requestAnimationFrame(hideLoader));
