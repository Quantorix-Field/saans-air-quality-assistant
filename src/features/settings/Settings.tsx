import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import type { Place } from '../../../shared/schemas.js';
import { ProfileInputSchema } from '../../../shared/schemas.js';
import { useAppState } from '../../app/AppState.js';
import { useI18n } from '../../i18n/index.js';
import type { MessageKey } from '../../i18n/index.js';
import { PlaceSearch } from '../onboarding/PlaceSearch.js';
import { ProfileForm } from '../onboarding/ProfileForm.js';

type ProfileInput = z.infer<typeof ProfileInputSchema>;
type EditMode = 'place' | 'profile' | null;
type TFn = (key: MessageKey, params?: Record<string, string>) => string;

function formatProfileSummary(profile: ProfileInput, t: TFn): string {
  const parts: string[] = [
    t(`profile.ageGroup.${profile.ageGroup}`),
    ...profile.conditions.map((c) => t(`profile.conditions.${c}`)),
    t(`profile.commute.${profile.commuteMode}`),
  ];
  if (profile.hasPurifier) parts.push(t('profile.purifier'));
  if (profile.hasN95) parts.push(t('profile.n95'));
  const start = `${String(profile.outdoorHours.start).padStart(2, '0')}:00`;
  const end = `${String(profile.outdoorHours.end).padStart(2, '0')}:00`;
  parts.push(`${start}–${end}`);
  return parts.join(', ');
}

function DeleteDataDialog({ dialogRef, onCancel, onConfirm, t }: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  onCancel: () => void;
  onConfirm: () => void;
  t: TFn;
}) {
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && el.hasAttribute('open')) {
        e.preventDefault();
        el.close();
      }
    };
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [dialogRef]);

  return (
    <dialog ref={dialogRef} className="confirm-dialog" onClose={onCancel}>
      <h2 className="confirm-dialog-title">{t('settings.deleteConfirmTitle')}</h2>
      <p className="confirm-dialog-body">{t('settings.deleteConfirmBody')}</p>
      <div className="confirm-dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={() => dialogRef.current?.close()}>
          {t('settings.deleteCancel')}
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          {t('settings.deleteConfirm')}
        </button>
      </div>
    </dialog>
  );
}

function EditSection({ mode, place, profile, onPlace, onProfile, onCancel, t }: {
  mode: 'place' | 'profile';
  place: Place | undefined;
  profile: ProfileInput | undefined;
  onPlace: (p: Place) => void;
  onProfile: (prof: ProfileInput) => void;
  onCancel: () => void;
  t: TFn;
}) {
  const titleKey = mode === 'place' ? 'settings.changePlace' : 'settings.editProfile';
  return (
    <section className="section">
      <div className="container">
        <div className="card onboarding-card">
          <h1>{t(titleKey)}</h1>
          <button type="button" className="btn btn-ghost onboarding-back" onClick={onCancel}>
            {t('settings.cancel')}
          </button>
          {mode === 'place' ? (
            <PlaceSearch onSelect={onPlace} />
          ) : (
            <ProfileForm initial={profile} onSubmit={onProfile} submitLabel={t('settings.saveProfile')} />
          )}
          {mode === 'place' && place && (
            <p className="form-note">{[place.name, place.region, place.country].filter(Boolean).join(', ')}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function SettingsRow({ title, value, actionLabel, onAction }: {
  title: string;
  value: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="settings-section">
      <h2 className="form-label">{title}</h2>
      <p>{value}</p>
      <div className="settings-row">
        <button type="button" className="btn btn-secondary" onClick={onAction}>{actionLabel}</button>
      </div>
    </div>
  );
}

export function Settings() {
  const { place, profile, setPlace, setProfile, clearAll } = useAppState();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<EditMode>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const deletingRef = useRef(false);

  function handleDialogClose() {
    if (!deletingRef.current) deleteButtonRef.current?.focus();
    deletingRef.current = false;
  }

  function handleConfirmDelete() {
    deletingRef.current = true;
    clearAll();
    dialogRef.current?.close();
    void navigate('/app');
  }

  if (editing !== null) {
    return (
      <EditSection
        mode={editing}
        place={place}
        profile={profile}
        onPlace={(p) => { setPlace(p); setEditing(null); }}
        onProfile={(prof) => { setProfile(prof); setEditing(null); }}
        onCancel={() => setEditing(null)}
        t={t}
      />
    );
  }

  const placeText = place ? [place.name, place.region, place.country].filter(Boolean).join(', ') : t('settings.noPlace');
  const profileText = profile ? formatProfileSummary(profile, t) : t('settings.noProfile');

  return (
    <section className="section">
      <div className="container">
        <h1>{t('settings.title')}</h1>
        <SettingsRow title={t('settings.yourPlace')} value={placeText} actionLabel={t('settings.changePlace')} onAction={() => setEditing('place')} />
        <SettingsRow title={t('settings.yourProfile')} value={profileText} actionLabel={t('settings.editProfile')} onAction={() => setEditing('profile')} />
        <div className="settings-section">
          <button type="button" className="btn btn-ghost" ref={deleteButtonRef} onClick={() => dialogRef.current?.showModal()}>
            {t('settings.deleteData')}
          </button>
        </div>
      </div>
      <DeleteDataDialog dialogRef={dialogRef} onCancel={handleDialogClose} onConfirm={handleConfirmDelete} t={t} />
    </section>
  );
}
