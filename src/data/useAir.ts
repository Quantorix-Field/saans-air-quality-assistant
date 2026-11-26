import { useState, useEffect, useCallback, useRef } from 'react';
import { z } from 'zod';
import type { AirResponse, Place } from '../../shared/schemas.js';
import { AirResponseSchema } from '../../shared/schemas.js';
import { getAir } from './api.js';
import { readJson, writeJson } from './storage.js';
import type { ApiErrorKind } from './apiClient.js';
import { ApiError } from './apiClient.js';

const STORAGE_KEY = 'saans:last-air';
const STALE_HOURS = 3;
const VISIBILITY_REFETCH_MS = 10 * 60 * 1000;

function placeKey(p: Place): string {
  return `${String(p.lat)},${String(p.lon)}`;
}

const CachedAirSchema = z.object({
  placeKey: z.string(),
  savedAt: z.number(),
  data: AirResponseSchema,
});
type CachedAir = z.infer<typeof CachedAirSchema>;

export type AirStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseAirResult {
  status: AirStatus;
  data: AirResponse | undefined;
  error: ApiErrorKind | undefined;
  ageHours: number | undefined;
  isStale: boolean;
  isOffline: boolean;
  refresh: () => void;
}

function computeAge(data: AirResponse, savedAt: number): number {
  const elapsed = (Date.now() - savedAt) / (1000 * 60 * 60);
  return data.dataAgeHours + Math.max(0, elapsed);
}

export function useAir(place: Place | undefined): UseAirResult {
  const [status, setStatus] = useState<AirStatus>('idle');
  const [data, setData] = useState<AirResponse | undefined>();
  const [error, setError] = useState<ApiErrorKind | undefined>();
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const abortRef = useRef<AbortController | null>(null);
  const lastHiddenRef = useRef<number>(0);
  const fetchCountRef = useRef(0);

  const fetchData = useCallback((p: Place) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const fetchId = ++fetchCountRef.current;

    setStatus('loading');
    setError(undefined);

    getAir(p, controller.signal).then((result) => {
      if (fetchCountRef.current !== fetchId) return;
      const now = Date.now();
      setData(result);
      setSavedAt(now);
      setStatus('success');
      setError(undefined);
      const cached: CachedAir = {
        placeKey: placeKey(p),
        savedAt: now,
        data: result,
      };
      writeJson(STORAGE_KEY, cached);
    }).catch((err: unknown) => {
      if (fetchCountRef.current !== fetchId) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (err instanceof Error && err.name === 'AbortError') return;
      if (err instanceof ApiError) {
        setError(err.kind);
      } else {
        setError('network');
      }
      setStatus('error');
    });
  }, []);

  // Load cache and fetch on place change
  useEffect(() => {
    if (!place) {
      setStatus('idle');
      setData(undefined);
      setError(undefined);
      setSavedAt(undefined);
      return;
    }

    const pk = placeKey(place);
    const cached = readJson(STORAGE_KEY, CachedAirSchema);
    if (cached && cached.placeKey === pk) {
      setData(cached.data);
      setSavedAt(cached.savedAt);
      setStatus('success');
    }

    fetchData(place);

    return () => {
      abortRef.current?.abort();
    };
  }, [place, fetchData]);

  // Online event refetch
  useEffect(() => {
    const onOnline = () => {
      setIsOffline(false);
      if (place) fetchData(place);
    };
    const onOffline = () => setIsOffline(true);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [place, fetchData]);

  // Visibility refetch after 10 minutes hidden
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        lastHiddenRef.current = Date.now();
      } else {
        const elapsed = Date.now() - lastHiddenRef.current;
        if (elapsed > VISIBILITY_REFETCH_MS && place) {
          fetchData(place);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [place, fetchData]);

  const ageHours = data && savedAt !== undefined
    ? computeAge(data, savedAt)
    : undefined;

  const isStale = ageHours !== undefined
    ? ageHours > STALE_HOURS || isOffline
    : false;

  const refresh = useCallback(() => {
    if (place) fetchData(place);
  }, [place, fetchData]);

  return { status, data, error, ageHours, isStale, isOffline, refresh };
}
