import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppStateProvider, useAppState } from '../src/app/AppState.js';
import * as storage from '../src/data/storage.js';

function TestConsumer() {
  const { place, profile, setPlace, setProfile, clearAll } = useAppState();
  return (
    <div>
      <span data-testid="place">{place?.name ?? 'none'}</span>
      <span data-testid="profile">{profile?.ageGroup ?? 'none'}</span>
      <button onClick={() => setPlace({ name: 'Delhi', region: 'Delhi', country: 'India', lat: 28.61, lon: 77.21 })}>set place</button>
      <button onClick={() => setProfile({ ageGroup: 'senior', conditions: [], commuteMode: 'bus', hasPurifier: false, hasN95: false, outdoorHours: { start: 6, end: 20 } })}>set profile</button>
      <button onClick={clearAll}>clear all</button>
    </div>
  );
}

function renderConsumer() {
  return render(
    <MemoryRouter>
      <AppStateProvider>
        <TestConsumer />
      </AppStateProvider>
    </MemoryRouter>,
  );
}

describe('AppState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('place starts undefined', () => {
    renderConsumer();
    expect(screen.getByTestId('place').textContent).toBe('none');
  });

  it('setPlace updates state and persists to storage', () => {
    renderConsumer();
    act(() => { screen.getByText('set place').click(); });
    expect(screen.getByTestId('place').textContent).toBe('Delhi');
    expect(localStorage.getItem('saans:place')).toContain('Delhi');
  });

  it('setProfile updates state and persists to storage', () => {
    renderConsumer();
    act(() => { screen.getByText('set profile').click(); });
    expect(screen.getByTestId('profile').textContent).toBe('senior');
    expect(localStorage.getItem('saans:profile')).toContain('senior');
  });

  it('clearAll resets both and removes all saans keys', () => {
    const spy = vi.spyOn(storage, 'clearAllSaansData');
    renderConsumer();
    act(() => { screen.getByText('set place').click(); });
    act(() => { screen.getByText('set profile').click(); });
    act(() => { screen.getByText('clear all').click(); });
    expect(screen.getByTestId('place').textContent).toBe('none');
    expect(screen.getByTestId('profile').textContent).toBe('none');
    expect(spy).toHaveBeenCalled();
  });

  it('useAppState throws outside provider', () => {
    function Bad() { useAppState(); return null; }
    expect(() => render(<Bad />)).toThrow();
  });
});
