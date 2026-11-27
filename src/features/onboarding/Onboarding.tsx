import { useState, useRef, useEffect } from 'react';
import type { z } from 'zod';
import type { Place } from '../../../shared/schemas.js';
import { ProfileInputSchema } from '../../../shared/schemas.js';
import { useI18n } from '../../i18n/index.js';
import { PlaceSearch } from './PlaceSearch.js';
import { ProfileForm } from './ProfileForm.js';

type ProfileInput = z.infer<typeof ProfileInputSchema>;

interface Props {
  onComplete: (place: Place, profile: ProfileInput) => void;
  initialPlace?: Place;
  initialProfile?: ProfileInput;
}

export function Onboarding({ onComplete, initialPlace, initialProfile }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlace, setSelectedPlace] = useState<Place | undefined>(initialPlace);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step]);

  function handleProfileSubmit(profile: ProfileInput) {
    if (selectedPlace) onComplete(selectedPlace, profile);
  }

  return (
    <section className="section">
      <div className="container">
        <div className="card onboarding-card">
          <p className="step-indicator">{t('onboarding.step', { current: String(step), total: '2' })}</p>
          <h1 ref={headingRef} tabIndex={-1}>{t(step === 1 ? 'onboarding.step1.title' : 'onboarding.step2.title')}</h1>
          {step === 1 ? (
            <PlaceSearch onSelect={(p) => { setSelectedPlace(p); setStep(2); }} />
          ) : (
            <>
              <button type="button" className="btn btn-ghost onboarding-back" onClick={() => setStep(1)}>
                {t('onboarding.back')}
              </button>
              <ProfileForm initial={initialProfile} onSubmit={handleProfileSubmit} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
