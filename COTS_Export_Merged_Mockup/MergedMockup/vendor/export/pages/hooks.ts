/**
 * Data hooks over the mock service layer.
 *
 * Deliberately expose loading / error / empty so pages can render every interaction
 * state, not just the ideal populated one (acceptance criterion A24).
 */

import { useCallback, useEffect, useState } from "react";
import { subscribe } from "../services/store";

export interface Async<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): Async<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((v) => {
        if (!cancelled) {
          setData(v);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "The data could not be loaded.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  // Re-fetch whenever the store mutates, so a change on one page is reflected on another.
  useEffect(() => subscribe(reload), [reload]);

  return { data, loading, error, reload };
}
