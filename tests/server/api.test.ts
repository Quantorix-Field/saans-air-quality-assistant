// @vitest-environment node
import { describe, it, expect } from 'vitest';
import airDefault from '../../api/air.js';
import geocodeDefault from '../../api/geocode.js';
import adviceDefault from '../../api/advice.js';
import askDefault from '../../api/ask.js';

describe('api module exports', () => {
  it('air has a fetch function', () => {
    expect(typeof airDefault.fetch).toBe('function');
  });

  it('geocode has a fetch function', () => {
    expect(typeof geocodeDefault.fetch).toBe('function');
  });

  it('advice has a fetch function', () => {
    expect(typeof adviceDefault.fetch).toBe('function');
  });

  it('ask has a fetch function', () => {
    expect(typeof askDefault.fetch).toBe('function');
  });
});

describe('wrong-method requests return 405 without network calls', () => {
  it('POST to air returns 405', async () => {
    const res = await airDefault.fetch(new Request('https://saans.test/api/air?lat=28.61&lon=77.21', { method: 'POST' }));
    expect(res.status).toBe(405);
  });

  it('POST to geocode returns 405', async () => {
    const res = await geocodeDefault.fetch(new Request('https://saans.test/api/geocode?q=Delhi', { method: 'POST' }));
    expect(res.status).toBe(405);
  });

  it('GET to advice returns 405', async () => {
    const res = await adviceDefault.fetch(new Request('https://saans.test/api/advice', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('GET to ask returns 405', async () => {
    const res = await askDefault.fetch(new Request('https://saans.test/api/ask', { method: 'GET' }));
    expect(res.status).toBe(405);
  });
});
