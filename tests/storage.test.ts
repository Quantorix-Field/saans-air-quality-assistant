import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { readJson, writeJson, removeKey, clearAllSaansData } from '../src/data/storage.js';

const TestSchema = z.object({ name: z.string(), age: z.number() });

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('readJson returns undefined for missing key', () => {
    expect(readJson('missing', TestSchema)).toBeUndefined();
  });

  it('writeJson + readJson round-trips valid data', () => {
    writeJson('saans:test', { name: 'Alice', age: 30 });
    expect(readJson('saans:test', TestSchema)).toEqual({ name: 'Alice', age: 30 });
  });

  it('readJson drops corrupt JSON and removes the key', () => {
    localStorage.setItem('saans:test', 'not{json');
    expect(readJson('saans:test', TestSchema)).toBeUndefined();
    expect(localStorage.getItem('saans:test')).toBeNull();
  });

  it('readJson drops wrong-shape data and removes the key', () => {
    localStorage.setItem('saans:test', JSON.stringify({ wrong: true }));
    expect(readJson('saans:test', TestSchema)).toBeUndefined();
    expect(localStorage.getItem('saans:test')).toBeNull();
  });

  it('writeJson rejects values over 50 KB', () => {
    const bigValue = { name: 'x'.repeat(60000), age: 1 };
    writeJson('saans:big', bigValue);
    expect(localStorage.getItem('saans:big')).toBeNull();
  });

  it('removeKey removes the key', () => {
    writeJson('saans:test', { name: 'Bob', age: 25 });
    removeKey('saans:test');
    expect(readJson('saans:test', TestSchema)).toBeUndefined();
  });

  it('clearAllSaansData removes only saans: keys', () => {
    localStorage.setItem('saans:one', '1');
    localStorage.setItem('saans:two', '2');
    localStorage.setItem('other:key', '3');

    clearAllSaansData();

    expect(localStorage.getItem('saans:one')).toBeNull();
    expect(localStorage.getItem('saans:two')).toBeNull();
    expect(localStorage.getItem('other:key')).toBe('3');
  });

  it('readJson handles localStorage throwing', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => { throw new Error('denied'); });
    expect(readJson('saans:test', TestSchema)).toBeUndefined();
    Storage.prototype.getItem = original;
  });

  it('writeJson handles localStorage throwing', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => { throw new Error('full'); });
    expect(() => writeJson('saans:test', { name: 'x', age: 1 })).not.toThrow();
    Storage.prototype.setItem = original;
  });

  it('clearAllSaansData handles localStorage throwing', () => {
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'length');
    Object.defineProperty(Storage.prototype, 'length', {
      get() { throw new Error('denied'); },
      configurable: true,
    });
    expect(() => clearAllSaansData()).not.toThrow();
    if (original) {
      Object.defineProperty(Storage.prototype, 'length', original);
    }
  });
});
