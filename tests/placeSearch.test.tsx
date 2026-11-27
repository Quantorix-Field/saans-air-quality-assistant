import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlaceSearch } from '../src/features/onboarding/PlaceSearch.js';
import * as api from '../src/data/api.js';
import { I18nProvider } from '../src/i18n/index.js';

const DELHI = { name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 };
const LONDON = { name: 'London', region: 'England', country: 'UK', lat: 51.51, lon: -0.13 };

function renderSearch(onSelect = vi.fn()) {
  return render(
    <MemoryRouter>
      <I18nProvider language="en">
        <PlaceSearch onSelect={onSelect} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('PlaceSearch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders labelled search input', () => {
    renderSearch();
    expect(screen.getByRole('searchbox', { name: /search for a city/i })).toBeDefined();
  });

  it('debounces search by 300ms', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI]);
    renderSearch();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Del' } });
    expect(spy).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(spy).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it('shows loading status while searching', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockReturnValue(new Promise(() => {}));
    renderSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    expect(screen.getByText(/searching/i)).toBeDefined();
    vi.useRealTimers();
  });

  it('renders results as buttons', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI, LONDON]);
    renderSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'De' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => {
      expect(screen.getByText('Delhi, Delhi, India')).toBeDefined();
    });
    expect(screen.getByText('London, England, UK')).toBeDefined();
  });

  it('shows result count in aria-live region', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI]);
    renderSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => {
      expect(screen.getByText('1 places found')).toBeDefined();
    });
  });

  it('shows no results message', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([]);
    renderSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'xyz' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => {
      expect(screen.getByText(/no places found/i)).toBeDefined();
    });
  });

  it('shows error and retry button on failure', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockRejectedValue(new Error('fail'));
    renderSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeDefined();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('retry triggers a new search', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(api, 'searchPlaces')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue([DELHI]);
    renderSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => { expect(screen.getByRole('button', { name: /retry/i })).toBeDefined(); });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  it('aborts stale request when new query starts', async () => {
    vi.useFakeTimers();
    let aborted = false;
    vi.spyOn(api, 'searchPlaces').mockImplementation((_q, _all, signal) => {
      return new Promise((_res, rej) => {
        signal?.addEventListener('abort', () => {
          aborted = true;
          rej(new DOMException('AbortError', 'AbortError'));
        });
      });
    });
    renderSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.advanceTimersByTimeAsync(300);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Delhi' } });
    await vi.advanceTimersByTimeAsync(300);
    vi.useRealTimers();
    expect(aborted).toBe(true);
  });

  it('outside India checkbox changes allCountries param', async () => {
    vi.useFakeTimers();
    const spy = vi.spyOn(api, 'searchPlaces').mockResolvedValue([LONDON]);
    renderSearch();
    fireEvent.click(screen.getByRole('checkbox', { name: /outside india/i }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Lon' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    expect(spy).toHaveBeenCalledWith('Lon', true, expect.anything());
  });

  it('calls onSelect and moves focus to nextFocusRef on pick', async () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    const nextRef = { current: null as HTMLButtonElement | null };
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI]);
    render(
      <MemoryRouter>
        <I18nProvider language="en">
          <PlaceSearch onSelect={onSelect} nextFocusRef={nextRef} />
          <button type="button" ref={(el) => { nextRef.current = el; }}>Next step</button>
        </I18nProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => { expect(screen.getByText('Delhi, Delhi, India')).toBeDefined(); });
    fireEvent.click(screen.getByText('Delhi, Delhi, India'));
    expect(onSelect).toHaveBeenCalledWith(DELHI);
    expect(document.activeElement).toBe(nextRef.current);
  });

  it('shows unsupported message when geolocation unavailable', () => {
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    expect(screen.getByRole('alert').textContent).toContain('not supported');
  });

  it('shows denied error on PERMISSION_DENIED (code 1)', async () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((_s, err: (e: { code: number; message: string }) => void) => {
        err({ code: 1, message: 'denied' });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('denied');
    });
  });

  it('shows unavailable error on POSITION_UNAVAILABLE (code 2)', async () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((_s, err: (e: { code: number; message: string }) => void) => {
        err({ code: 2, message: 'unavailable' });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('unavailable');
    });
  });

  it('shows timeout error on TIMEOUT (code 3)', async () => {
    const mockGeo = {
      getCurrentPosition: vi.fn((_s, err: (e: { code: number; message: string }) => void) => {
        err({ code: 3, message: 'timeout' });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('timed out');
    });
  });

  it('calls onSelect with rounded coords on geo success', async () => {
    const onSelect = vi.fn();
    const mockGeo = {
      getCurrentPosition: vi.fn((success: (p: { coords: { latitude: number; longitude: number } }) => void) => {
        success({ coords: { latitude: 28.6139391, longitude: 77.209023 } });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', { value: mockGeo, configurable: true });
    renderSearch(onSelect);
    fireEvent.click(screen.getByRole('button', { name: /use my location/i }));
    await waitFor(() => { expect(onSelect).toHaveBeenCalled(); });
    const call = onSelect.mock.calls[0];
    const arg = call?.[0] as { lat: number; lon: number } | undefined;
    if (!arg) throw new Error('onSelect not called');
    expect(arg.lat).toBe(28.61);
    expect(arg.lon).toBe(77.21);
  });
});
