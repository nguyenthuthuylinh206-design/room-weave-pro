import { useEffect } from 'react';
import { APP_VERSION } from '@/lib/app-version';
import { isPreviewOrIframe, cleanupServiceWorkers } from '@/lib/pwa-environment';

/**
 * CacheBuster — force-clear stale caches & service workers.
 *
 * - Trên preview / iframe / localhost: LUÔN cleanup mỗi lần load (không phụ
 *   thuộc version), vì editor không bao giờ bump version giữa các sửa nhỏ.
 * - Trên production: chỉ cleanup khi version thay đổi (so với localStorage),
 *   sau đó hard reload để load build mới.
 */
const CURRENT_VERSION = APP_VERSION;
const STORAGE_KEY = 'app_version';
const PREVIEW_RELOAD_FLAG = '__cachebuster_preview_reloaded__';

export function CacheBuster() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (isPreviewOrIframe()) {
          // Preview/iframe: cleanup mọi lần load, reload tối đa 1 lần/session
          const didCleanup = await cleanupServiceWorkers();
          if (cancelled) return;
          if (didCleanup && !sessionStorage.getItem(PREVIEW_RELOAD_FLAG)) {
            sessionStorage.setItem(PREVIEW_RELOAD_FLAG, '1');
            window.location.reload();
          }
          return;
        }

        // Production: chỉ chạy khi version mismatch
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === CURRENT_VERSION) return;

        console.log('[CacheBuster] Version mismatch:', { stored, current: CURRENT_VERSION });
        await cleanupServiceWorkers();
        if (cancelled) return;

        localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
        window.location.reload();
      } catch (err) {
        console.error('[CacheBuster] Failed:', err);
        try {
          localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
        } catch {
          /* ignore */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
