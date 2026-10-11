/* After a new deploy the old hashed page files are gone. A visitor who still
   has the old version open would fail to load the next page and see the crash
   screen. Instead, reload once so the browser picks up the new version.
   A short guard stops reload loops if something else is really broken. */

const KEY = 'cyberhx-chunk-reload-at';

export const isChunkLoadError = (e: unknown) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk|is not a valid JavaScript MIME type|Failed to load module script|disallowed MIME type/i.test(
    String((e as { message?: string })?.message ?? e),
  );

/** Reload once (at most every 30 seconds). Returns false if we already tried. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: still reload, the browser cache is fresh after a reload */
  }
  window.location.reload();
  return true;
}

/** True if we reloaded for a new version in the last 30 seconds. */
export function reloadTried(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 30_000;
  } catch {
    return true;
  }
}

/** Drop-in for `() => import(...)` used with React.lazy. */
export function retryImport<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((err) => {
      if (isChunkLoadError(err) && reloadForNewVersion()) {
        // Keep the current screen while the page reloads.
        return new Promise<T>(() => undefined);
      }
      throw err;
    });
}

/** Vite fires this when a preloaded file for the next page fails. */
export function listenForStaleFiles() {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadForNewVersion()) event.preventDefault();
  });
}
