import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Shell } from '../src/app/Shell.js';
import { loadPreferences, savePreferences } from '../src/features/preferences/prefs.js';

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Shell />
    </MemoryRouter>,
  );
}

describe('Preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-motion');
    document.documentElement.style.fontSize = '';
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to system theme', () => {
    const prefs = loadPreferences();
    expect(prefs.theme).toBe('system');
  });

  it('defaults to textScale 1', () => {
    const prefs = loadPreferences();
    expect(prefs.textScale).toBe(1);
  });

  it('defaults to motionOff false', () => {
    const prefs = loadPreferences();
    expect(prefs.motionOff).toBe(false);
  });

  it('theme selection updates data-theme attribute', () => {
    renderShell();
    const darkLabel = screen.getByLabelText('Dark');
    fireEvent.click(darkLabel);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('motion toggle updates data-motion attribute', () => {
    renderShell();
    const btn = screen.getByRole('button', { name: /Pause animations/i });
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-motion')).toBe('off');
  });

  it('motion toggle back to on', () => {
    renderShell();
    const btn = screen.getByRole('button', { name: /Pause animations/i });
    fireEvent.click(btn);
    const resumeBtn = screen.getByRole('button', { name: /Resume animations/i });
    fireEvent.click(resumeBtn);
    expect(document.documentElement.getAttribute('data-motion')).toBe('on');
  });

  it('text scale increase updates font-size', () => {
    renderShell();
    const increaseBtn = screen.getByRole('button', { name: /Increase text size/i });
    fireEvent.click(increaseBtn);
    expect(document.documentElement.style.fontSize).not.toBe('100%');
  });

  it('preferences persist to localStorage', () => {
    const prefs = { theme: 'dark' as const, textScale: 2 as const, motionOff: true };
    savePreferences(prefs);
    const loaded = loadPreferences();
    expect(loaded.theme).toBe('dark');
    expect(loaded.textScale).toBe(2);
    expect(loaded.motionOff).toBe(true);
  });

  it('corrupt localStorage falls back to defaults', () => {
    localStorage.setItem('saans:prefs', 'not-valid-json{{{');
    const prefs = loadPreferences();
    expect(prefs.theme).toBe('system');
    expect(prefs.textScale).toBe(1);
    expect(prefs.motionOff).toBe(false);
  });

  it('invalid values in localStorage fall back to defaults', () => {
    localStorage.setItem('saans:prefs', JSON.stringify({ theme: 'rainbow', textScale: 99, motionOff: 'yes' }));
    const prefs = loadPreferences();
    expect(prefs.theme).toBe('system');
    expect(prefs.textScale).toBe(1);
    expect(prefs.motionOff).toBe(false);
  });

  it('works when localStorage throws on getItem', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => { throw new Error('storage denied'); });
    const prefs = loadPreferences();
    expect(prefs.theme).toBe('system');
    Storage.prototype.getItem = original;
  });

  it('works when localStorage throws on setItem', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => { throw new Error('storage full'); });
    expect(() => savePreferences({ theme: 'light', textScale: 1, motionOff: false })).not.toThrow();
    Storage.prototype.setItem = original;
  });
});
