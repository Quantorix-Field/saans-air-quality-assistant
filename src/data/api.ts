import type { z } from 'zod';
import type { Language } from '../../shared/domain/types.js';
import type { AirResponse, Place, AdviceResponse } from '../../shared/schemas.js';
import {
  AirResponseSchema,
  GeocodeResponseSchema,
  AdviceResponseSchema,
  ProfileInputSchema,
} from '../../shared/schemas.js';
import { requestJson } from './apiClient.js';

type ProfileInput = z.infer<typeof ProfileInputSchema>;

/** Round a coordinate to 2 decimal places (privacy: §2 P4). */
export function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getAir(place: Place, signal?: AbortSignal): Promise<AirResponse> {
  const lat = roundCoord(place.lat);
  const lon = roundCoord(place.lon);
  const url = `/api/air?lat=${String(lat)}&lon=${String(lon)}`;
  return requestJson(url, undefined, AirResponseSchema, signal);
}

export async function searchPlaces(
  query: string,
  allCountries: boolean,
  signal?: AbortSignal,
): Promise<Place[]> {
  const q = encodeURIComponent(query);
  const all = allCountries ? '1' : '0';
  const url = `/api/geocode?q=${q}&all=${all}`;
  const res = await requestJson(url, undefined, GeocodeResponseSchema, signal);
  return res.results;
}

export interface AdviceParams {
  place: Place;
  profile: ProfileInput;
  language: Language;
}

export async function getAdvice(
  params: AdviceParams,
  signal?: AbortSignal,
): Promise<AdviceResponse> {
  const { place, profile, language } = params;
  const body = {
    lat: roundCoord(place.lat),
    lon: roundCoord(place.lon),
    profile,
    language,
  };
  return requestJson('/api/advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, AdviceResponseSchema, signal);
}
