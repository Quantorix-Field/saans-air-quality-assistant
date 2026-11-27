import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Onboarding } from '../src/features/onboarding/Onboarding.js';
import * as api from '../src/data/api.js';
import { I18nProvider } from '../src/i18n/index.js';

const DELHI = { name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 };

function renderOnboarding(onComplete = vi.fn(), props: Partial<Parameters<typeof Onboarding>[0]> = {}) {
  return render(
    <MemoryRouter>
      <I18nProvider language="en">
        <Onboarding onComplete={onComplete} {...props} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('Onboarding', () => {
  it('shows step 1 of 2 indicator initially', () => {
    renderOnboarding();
    expect(screen.getByText(/step 1 of 2/i)).toBeDefined();
  });

  it('shows step 1 heading initially', () => {
    renderOnboarding();
    expect(screen.getByRole('heading', { level: 1, name: /choose your city/i })).toBeDefined();
  });

  it('advances to step 2 after place selection and moves focus to step heading', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI]);
    renderOnboarding();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => { expect(screen.getByText('Delhi, Delhi, India')).toBeDefined(); });
    fireEvent.click(screen.getByText('Delhi, Delhi, India'));
    await waitFor(() => {
      const h1 = screen.getByRole('heading', { level: 1, name: /your profile/i });
      expect(h1).toBeDefined();
      expect(document.activeElement).toBe(h1);
    });
    expect(screen.getByText(/step 2 of 2/i)).toBeDefined();
  });

  it('Back button returns to step 1 and focuses step 1 heading', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI]);
    renderOnboarding();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => { expect(screen.getByText('Delhi, Delhi, India')).toBeDefined(); });
    fireEvent.click(screen.getByText('Delhi, Delhi, India'));
    await waitFor(() => { expect(screen.getByRole('button', { name: /back/i })).toBeDefined(); });
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    const h1 = screen.getByRole('heading', { level: 1, name: /choose your city/i });
    expect(h1).toBeDefined();
    expect(document.activeElement).toBe(h1);
  });

  it('prefills profile with initialProfile', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI]);
    const initProfile = {
      ageGroup: 'senior' as const,
      conditions: [] as [],
      commuteMode: 'walk' as const,
      hasPurifier: false,
      hasN95: false,
      outdoorHours: { start: 8, end: 18 },
    };
    renderOnboarding(vi.fn(), { initialProfile: initProfile });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => { expect(screen.getByText('Delhi, Delhi, India')).toBeDefined(); });
    fireEvent.click(screen.getByText('Delhi, Delhi, India'));
    await waitFor(() => {
      expect((screen.getByRole('radio', { name: /senior/i }) as HTMLInputElement).checked).toBe(true);
    });
  });

  it('calls onComplete with place and profile', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([DELHI]);
    const onComplete = vi.fn();
    renderOnboarding(onComplete);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Del' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => { expect(screen.getByText('Delhi, Delhi, India')).toBeDefined(); });
    fireEvent.click(screen.getByText('Delhi, Delhi, India'));
    await waitFor(() => { expect(screen.getByRole('button', { name: /save/i })).toBeDefined(); });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => { expect(onComplete).toHaveBeenCalledOnce(); });
    const call = onComplete.mock.calls[0] as [{ name: string }, { ageGroup: string }] | undefined;
    const place = call?.[0];
    const profile = call?.[1];
    expect(place?.name).toBe('Delhi');
    expect(profile?.ageGroup).toBe('adult');
  });
});
