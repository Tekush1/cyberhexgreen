import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError, reloadForNewVersion, reloadTried } from '../../lib/chunkReload';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // A new version was deployed while this tab was open: reload instead of showing an error.
    if (isChunkLoadError(error) && reloadForNewVersion()) return;
    console.error('Uncaught error:', error, errorInfo);
    // Reload already tried: swap the blank screen for the message.
    if (isChunkLoadError(error)) this.forceUpdate();
  }

  public render() {
    if (this.state.hasError && isChunkLoadError(this.state.error)) {
      // Reload is on its way; if it was already tried, fall through to the message below.
      if (!reloadTried()) return null;
    }
    if (this.state.hasError) {
      // Inline styles: this screen must look right even if the stylesheet failed to load.
      return (
        this.props.fallback || (
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#05080f', padding: 20, fontFamily: 'Archivo, ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
            <div style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '36px 28px', borderRadius: 20, background: 'linear-gradient(180deg,#0b1020,#070a14)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), inset 0 0 0 1px rgba(255,255,255,.08)' }}>
              <p style={{ margin: 0, font: '600 11px/1 ui-monospace, Menlo, monospace', letterSpacing: '.24em', color: '#c6f135', textTransform: 'uppercase' }}>CyberHx</p>
              <h2 style={{ margin: '14px 0 0', fontSize: 24, fontWeight: 800, color: '#fff' }}>This page didn't load properly</h2>
              <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.6, color: '#8a9bbe' }}>
                Usually a weak connection or a site update. Reloading fixes it.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ marginTop: 24, minHeight: 48, padding: '0 26px', border: 0, borderRadius: 12, background: '#c6f135', color: '#071003', fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 12px 30px -10px rgba(198,241,53,.65)' }}
              >
                Reload page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
