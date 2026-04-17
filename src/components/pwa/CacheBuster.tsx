import { useEffect } from 'react';

/**
 * CacheBuster — force-clear stale caches & service workers for users stuck
 * on an old build (common on iOS PWAs that aggressively keep old assets).
 *
 * Bump CURRENT_VERSION on every release to trigger a one-time wipe + reload
 * for clients still running an older version.
 */
const CURRENT_VERSION = '2026.04.17.2';
const STORAGE_KEY = 'app_version';

export function CacheBuster() {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === CURRENT_VERSION) return;

    let cancelled = false;

    (async () => {
      try {
        console.log('[CacheBuster] Version mismatch:', { stored, current: CURRENT_VERSION });

        // 1) Clear all Cache Storage entries (Workbox runtime + precache)
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
          console.log('[CacheBuster] Cleared caches:', names);
        }

        // 2) Unregister every service worker so the next load fetches a fresh one
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          console.log('[CacheBuster] Unregistered SWs:', regs.length);
        }

        if (cancelled) return;

        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);

        // 3) Hard reload to load the new build with a clean SW
        window.location.reload();
      } catch (err) {
        console.error('[CacheBuster] Failed to clear caches:', err);
        // Still mark version so we don't retry endlessly
        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
