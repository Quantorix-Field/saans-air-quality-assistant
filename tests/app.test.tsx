import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../src/app/App.js';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App smoke tests', () => {
  beforeEach(() => {
    // Reset document title
    document.title = '';
    // Clear localStorage
    localStorage.clear();
    // Apply default data-theme so tests are deterministic
    document.documentElement.setAttribute('data-theme', 'system');
  });

  it('renders landing page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /Know your air/i, level: 1 })).toBeDefined();
  });

  it('renders today page at /app', () => {
    renderAt('/app');
    expect(screen.getByRole('heading', { name: /Choose your city/i })).toBeDefined();
  });

  it('renders not-found for unknown path', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: /Page not found/i })).toBeDefined();
  });

  it('skip link is first focusable element and targets #main', () => {
    const { container } = renderAt('/');
    const skipLink = container.querySelector('.skip-link') as HTMLAnchorElement;
    expect(skipLink).toBeTruthy();
    expect(skipLink.getAttribute('href')).toBe('#main');
    // Should be first focusable element in the document
    const allFocusable = container.querySelectorAll(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    );
    expect(allFocusable[0]).toBe(skipLink);
  });

  it('main landmark exists with correct id', () => {
    renderAt('/');
    const main = document.getElementById('main');
    expect(main).toBeTruthy();
    expect(main?.tagName.toLowerCase()).toBe('main');
  });

  it('live region is present', () => {
    renderAt('/');
    const live = document.getElementById('route-announcer');
    expect(live).toBeTruthy();
    expect(live?.getAttribute('aria-live')).toBe('polite');
  });

  it('initial render sets title but does NOT move focus to main', () => {
    vi.useFakeTimers();
    const { container } = renderAt('/');
    expect(document.title).toBe('Landing – Saans');
    vi.runAllTimers();
    const main = container.querySelector('#main');
    expect(document.activeElement).not.toBe(main);
    vi.useRealTimers();
  });

  it('subsequent navigation updates live region and moves focus to main', async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter initialEntries={['/', '/app']} initialIndex={0}>
        <App />
      </MemoryRouter>,
    );

    // Initial mount on '/'
    act(() => {
      vi.runAllTimers();
    });
    expect(document.title).toBe('Landing – Saans');
    const live = document.getElementById('route-announcer');
    expect(live?.textContent).toBe('');

    // Navigate to /app via link
    const appLink = screen.getByRole('link', { name: /^App$/i });
    act(() => {
      fireEvent.click(appLink);
    });

    expect(document.title).toBe('Today – Saans');
    expect(live?.textContent).toBe('Today – Saans');

    act(() => {
      vi.advanceTimersByTime(50);
    });
    const main = document.getElementById('main');
    expect(document.activeElement).toBe(main);
    vi.useRealTimers();
  });
});
