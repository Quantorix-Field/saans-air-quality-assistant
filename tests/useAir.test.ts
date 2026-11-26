import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Place, AirResponse } from '../src/../shared/schemas.js';
import { clearApiCache, setNowFn } from '../src/data/apiClient.js';
import { useAir } from '../src/data/useAir.js';

const fakeAir: AirResponse = {
  hours: [{ time: '2026-01-01T12:00', pm25: 50, pm10: 60, no2: 20, so2: 10, o3: 30, co: 500 }],
  nowIndex: 0,
  usAqi: 80,
  observedAt: '2026-01-01T12:00',
  dataAgeHours: 0.5,
};

const delhi: Place = {
  name: 'Delhi',
  region: 'Delhi',
  country: 'India',
  lat: 28.61,
  lon: 77.21,
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useAir', () => {
  beforeEach(() => {
    localStorage.clear();
    clearApiCache();
    setNowFn(() => Date.now());
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    clearApiCache();
  });

  it('returns idle when place is undefined', () => {
    const { result } = renderHook(() => useAir(undefined));
    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('fetches and transitions to success', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse(fakeAir)),
    );
    const { result } = renderHook(() => useAir(delhi));
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.usAqi).toBe(80);
  });

  it('shows cached data for same place immediately', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse(fakeAir)),
    );
    const cached = {
      placeKey: '28.61,77.21',
      savedAt: Date.now(),
      data: { ...fakeAir, usAqi: 99 },
    };
    localStorage.setItem('saans:last-air', JSON.stringify(cached));

    const { result } = renderHook(() => useAir(delhi));
    // Should show cached data immediately (before fetch completes)
    expect(result.current.data?.usAqi).toBe(99);
  });

  it('marks data as stale when age > 3 hours', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.resolve(jsonResponse(fakeAir)),
    );
    const cached = {
      placeKey: '28.61,77.21',
      savedAt: Date.now() - 4 * 60 * 60 * 1000,
      data: { ...fakeAir, dataAgeHours: 0 },
    };
    localStorage.setItem('saans:last-air', JSON.stringify(cached));

    const { result } = renderHook(() => useAir(delhi));
    expect(result.current.isStale).toBe(true);
  });

  it('reports error on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => Promise.reject(new TypeError('Network error')),
    );

    const { result } = renderHook(() => useAir(delhi));
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.error).toBe('network');
  });

  it('aborts on unmount', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => { /* never resolves */ }),
    );
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    const { unmount } = renderHook(() => useAir(delhi));
    unmount();
    expect(abortSpy).toHaveBeenCalled();
  });

  it('re-fetches on window online event', async () => {
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      return Promise.resolve(jsonResponse(fakeAir));
    });

    const { result } = renderHook(() => useAir(delhi));
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    const countAfterInitial = callCount;
    clearApiCache();

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(callCount).toBeGreaterThan(countAfterInitial);
    });
  });

  it('refresh triggers a new fetch', async () => {
    let callCount = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      return Promise.resolve(jsonResponse(fakeAir));
    });

    const { result } = renderHook(() => useAir(delhi));
    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    const countAfterInitial = callCount;
    clearApiCache();

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(callCount).toBeGreaterThan(countAfterInitial);
    });
  });
});
