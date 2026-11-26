import { useState, useCallback } from 'react';
import { z } from 'zod';
import { ProfileInputSchema } from '../../shared/schemas.js';
import { readJson, writeJson, removeKey } from './storage.js';

type ProfileInput = z.infer<typeof ProfileInputSchema>;
const STORAGE_KEY = 'saans:profile';

export function useStoredProfile(): [ProfileInput | undefined, (p: ProfileInput) => void, () => void] {
  const [profile, setProfile] = useState<ProfileInput | undefined>(
    () => readJson(STORAGE_KEY, ProfileInputSchema),
  );

  const save = useCallback((p: ProfileInput) => {
    setProfile(p);
    writeJson(STORAGE_KEY, p);
  }, []);

  const clear = useCallback(() => {
    setProfile(undefined);
    removeKey(STORAGE_KEY);
  }, []);

  return [profile, save, clear];
}
