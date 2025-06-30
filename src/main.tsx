import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import './index.css';

// Performance monitoring
const reportWebVitals = (metric: any) => {
  // Send metrics to analytics
  console.log(metric);
};

// Hydrate the app
const root = createRoot(document.getElementById('root')!);

// Enable concurrent features and wrap with ErrorBoundary
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// Report web vitals
reportWebVitals(window.performance);