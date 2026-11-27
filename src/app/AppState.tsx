import { createContext, useContext, useCallback } from 'react';
import type { Place } from '../../shared/schemas.js';
import type { z } from 'zod';
import { ProfileInputSchema } from '../../shared/schemas.js';
import { useStoredPlace } from '../data/useStoredPlace.js';
import { useStoredProfile } from '../data/useStoredProfile.js';
import { clearAllSaansData } from '../data/storage.js';

type ProfileInput = z.infer<typeof ProfileInputSchema>;

interface AppStateValue {
  place: Place | undefined;
  profile: ProfileInput | undefined;
  setPlace: (p: Place) => void;
  setProfile: (p: ProfileInput) => void;
  clearAll: () => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [place, savePlace, clearPlace] = useStoredPlace();
  const [profile, saveProfile, clearProfile] = useStoredProfile();

  const clearAll = useCallback(() => {
    clearAllSaansData();
    clearPlace();
    clearProfile();
  }, [clearPlace, clearProfile]);

  const value: AppStateValue = {
    place,
    profile,
    setPlace: savePlace,
    setProfile: saveProfile,
    clearAll,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
