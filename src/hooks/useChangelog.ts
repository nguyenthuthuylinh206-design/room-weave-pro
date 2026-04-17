import { useEffect, useState } from 'react';
import type { ChangelogEntry } from '@/types/changelog';

interface UseChangelogResult {
  changelog: ChangelogEntry | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Fetch /changelog.json with cache-bust query param.
 * Only fetches when `enabled` is true (typically when needRefresh becomes true).
 * Returns null on failure — UI should still render the update prompt.
 */
export function useChangelog(enabled: boolean): UseChangelogResult {
  const [changelog, setChangelog] = useState<ChangelogEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/changelog.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ChangelogEntry;
        if (!cancelled) {
          setChangelog(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[Changelog] Fetch failed:', err);
          setChangelog(null);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { changelog, loading, error };
}
