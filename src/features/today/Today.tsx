import { useAppState } from '../../app/AppState.js';
import { useI18n } from '../../i18n/index.js';
import { Onboarding } from '../onboarding/Onboarding.js';
import type { z } from 'zod';
import type { Place } from '../../../shared/schemas.js';
import { ProfileInputSchema } from '../../../shared/schemas.js';

type ProfileInput = z.infer<typeof ProfileInputSchema>;

export function Today() {
  const { place, profile, setPlace, setProfile } = useAppState();
  const { t } = useI18n();

  if (!place || !profile) {
    function handleComplete(p: Place, prof: ProfileInput) {
      setPlace(p);
      setProfile(prof);
    }
    return (
      <Onboarding
        onComplete={handleComplete}
        initialPlace={place}
        initialProfile={profile}
      />
    );
  }

  return (
    <section className="section">
      <div className="container">
        <h1>{t('today.title', { place: place.name })}</h1>
        <p>{t('today.placeholder')}</p>
      </div>
    </section>
  );
}
