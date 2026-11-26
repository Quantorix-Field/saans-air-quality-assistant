import { useState, useCallback } from 'react';
import type { Place } from '../../shared/schemas.js';
import { PlaceSchema } from '../../shared/schemas.js';
import { readJson, writeJson, removeKey } from './storage.js';

const STORAGE_KEY = 'saans:place';

export function useStoredPlace(): [Place | undefined, (p: Place) => void, () => void] {
  const [place, setPlace] = useState<Place | undefined>(
    () => readJson(STORAGE_KEY, PlaceSchema),
  );

  const save = useCallback((p: Place) => {
    setPlace(p);
    writeJson(STORAGE_KEY, p);
  }, []);

  const clear = useCallback(() => {
    setPlace(undefined);
    removeKey(STORAGE_KEY);
  }, []);

  return [place, save, clear];
}
