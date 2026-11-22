import type { Profile } from './types.js';

/** Extra caution steps for sensitive groups: at most 2. A precaution heuristic, not a clinical score. */
export function sensitivityShift(profile: Pick<Profile, 'ageGroup' | 'conditions'>): 0 | 1 | 2 {
  const sensitiveAge = profile.ageGroup === 'child' || profile.ageGroup === 'senior';
  const pregnant = profile.conditions.includes('pregnancy');
  const chronic = profile.conditions.includes('asthmaCopd') || profile.conditions.includes('heart');
  return ((sensitiveAge || pregnant ? 1 : 0) + (chronic ? 1 : 0)) as 0 | 1 | 2;
}

/** Personal caution tier from 0 (relaxed) to 5 (stay in). */
export function personalTier(bandLevel: number, profile: Pick<Profile, 'ageGroup' | 'conditions'>): number {
  return Math.min(5, Math.max(0, bandLevel + sensitivityShift(profile)));
}
