import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { listenForStaleFiles } from './lib/chunkReload';
import './index.css';

listenForStaleFiles();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Hide the loading screen as soon as the page has painted, instead of waiting
// for every image and font on the page (the old "load" event did that).
const hideLoader = () => document.body.classList.add('loaded');
requestAnimationFrame(() => requestAnimationFrame(hideLoader));
