import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStateProvider } from '../src/app/AppState.js';
import { Settings } from '../src/features/settings/Settings.js';
import { I18nProvider } from '../src/i18n/index.js';
import * as api from '../src/data/api.js';

const PLACE = { name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 };
const PROFILE = {
  ageGroup: 'adult' as const,
  conditions: ['asthmaCopd' as const],
  commuteMode: 'metro' as const,
  hasPurifier: true,
  hasN95: false,
  outdoorHours: { start: 5, end: 21 },
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderSettings() {
  localStorage.setItem('saans:place', JSON.stringify(PLACE));
  localStorage.setItem('saans:profile', JSON.stringify(PROFILE));
  return render(
    <MemoryRouter>
      <AppStateProvider>
        <I18nProvider language="en">
          <Settings />
        </I18nProvider>
      </AppStateProvider>
    </MemoryRouter>,
  );
}

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  it('shows h1 Settings and saved place/profile', () => {
    renderSettings();
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeDefined();
    expect(screen.getByText(/Delhi, Delhi, India/)).toBeDefined();
    expect(screen.getByText(/Asthma or COPD/)).toBeDefined();
  });

  it('shows empty messages when nothing saved yet', () => {
    render(
      <MemoryRouter>
        <AppStateProvider>
          <I18nProvider language="en">
            <Settings />
          </I18nProvider>
        </AppStateProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText(/no place saved yet/i)).toBeDefined();
    expect(screen.getByText(/no profile saved yet/i)).toBeDefined();
  });

  it('Change place reuses PlaceSearch, picks place and allows cancel', async () => {
    vi.useFakeTimers();
    vi.spyOn(api, 'searchPlaces').mockResolvedValue([
      { name: 'Mumbai', region: 'Maharashtra', country: 'India', lat: 19.08, lon: 72.88 },
    ]);
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /change place/i }));
    expect(screen.getByRole('heading', { level: 1, name: /change place/i })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /change place/i }));
    fireEvent.change(screen.getByRole('searchbox', { name: /search for a city/i }), { target: { value: 'Mum' } });
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await waitFor(() => { expect(screen.getByText('Mumbai, Maharashtra, India')).toBeDefined(); });
    fireEvent.click(screen.getByText('Mumbai, Maharashtra, India'));
    expect(screen.getByText(/Mumbai, Maharashtra, India/)).toBeDefined();
  });

  it('Edit profile reuses ProfileForm with prefilled values and saves', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    expect(screen.getByRole('heading', { level: 1, name: /edit profile/i })).toBeDefined();
    fireEvent.click(screen.getByRole('radio', { name: /senior/i }));
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    expect(screen.getByRole('heading', { level: 1, name: /settings/i })).toBeDefined();
    expect(screen.getByText(/Senior/)).toBeDefined();
  });

  it('opens dialog on Delete my data and closes on Cancel with focus return', async () => {
    renderSettings();
    const deleteBtn = screen.getByRole('button', { name: /delete my data/i });
    fireEvent.click(deleteBtn);
    await waitFor(() => { expect(screen.getByText(/delete all data/i)).toBeDefined(); });
    const dialog = document.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(dialog?.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(deleteBtn);
  });

  it('closes dialog on Escape and returns focus to trigger', async () => {
    renderSettings();
    const deleteBtn = screen.getByRole('button', { name: /delete my data/i });
    fireEvent.click(deleteBtn);
    const dialog = document.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(true);
    if (dialog) fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(dialog?.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(deleteBtn);
  });

  it('Confirm clears storage and navigates to /app', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /delete my data/i }));
    await waitFor(() => { expect(screen.getByRole('button', { name: /^delete$/i })).toBeDefined(); });
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(localStorage.getItem('saans:place')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });
});
