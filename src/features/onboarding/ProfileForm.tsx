import { useState, useRef } from 'react';
import { z } from 'zod';
import { ProfileInputSchema } from '../../../shared/schemas.js';
import { useI18n } from '../../i18n/index.js';
import type { MessageKey } from '../../i18n/index.js';

type ProfileInput = z.infer<typeof ProfileInputSchema>;
type CommuteMode = ProfileInput['commuteMode'];
type Condition = ProfileInput['conditions'][number];
type AgeGroup = ProfileInput['ageGroup'];
type TFn = (key: MessageKey, params?: Record<string, string>) => string;

const DEFAULTS: ProfileInput = {
  ageGroup: 'adult',
  conditions: [],
  commuteMode: 'metro',
  hasPurifier: false,
  hasN95: false,
  outdoorHours: { start: 5, end: 21 },
};

const AGE_GROUPS: AgeGroup[] = ['child', 'adult', 'senior'];
const CONDITIONS: Condition[] = ['asthmaCopd', 'heart', 'pregnancy'];
const COMMUTE_MODES: CommuteMode[] = [
  'walk', 'cycle', 'twoWheeler', 'carPetrol', 'carDiesel',
  'bus', 'metro', 'eTwoWheeler', 'workFromHome',
];

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function buildTimeOptions(start: number, end: number): number[] {
  const opts: number[] = [];
  for (let i = start; i <= end; i++) opts.push(i);
  return opts;
}

function AgeGroupFieldset({ value, onChange, t }: { value: AgeGroup; onChange: (v: AgeGroup) => void; t: TFn }) {
  return (
    <fieldset className="form-fieldset">
      <legend className="form-legend">{t('profile.ageGroup')}</legend>
      <div className="form-radio-group">
        {AGE_GROUPS.map((ag) => (
          <label key={ag} className="form-check-label">
            <input type="radio" name="ageGroup" value={ag} checked={value === ag} onChange={() => onChange(ag)} />
            {t(`profile.ageGroup.${ag}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ConditionsFieldset({ selected, onToggle, t }: {
  selected: Condition[];
  onToggle: (c: Condition, checked: boolean) => void;
  t: TFn;
}) {
  return (
    <fieldset className="form-fieldset">
      <legend className="form-legend">{t('profile.conditions')}</legend>
      <div className="form-checkbox-group">
        {CONDITIONS.map((c) => (
          <label key={c} className="form-check-label">
            <input
              type="checkbox"
              checked={selected.includes(c)}
              onChange={(e) => onToggle(c, e.target.checked)}
            />
            {t(`profile.conditions.${c}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CommuteSelect({ value, onChange, t }: { value: CommuteMode; onChange: (m: CommuteMode) => void; t: TFn }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="commute-select">{t('profile.commute')}</label>
      <select
        id="commute-select"
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value as CommuteMode)}
      >
        {COMMUTE_MODES.map((m) => (
          <option key={m} value={m}>{t(`profile.commute.${m}`)}</option>
        ))}
      </select>
    </div>
  );
}

function TimeSelect({ id, label, value, min, max, selectRef, errorId, onChange }: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  selectRef?: React.RefObject<HTMLSelectElement>;
  errorId?: string;
  onChange: (h: number) => void;
}) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="form-select"
        ref={selectRef}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={errorId}
        aria-invalid={errorId ? true : undefined}
      >
        {buildTimeOptions(min, max).map((h) => <option key={h} value={h}>{formatHour(h)}</option>)}
      </select>
    </div>
  );
}

function OutdoorHoursFieldset({ start, end, onStart, onEnd, timeError, startRef, t }: {
  start: number;
  end: number;
  onStart: (h: number) => void;
  onEnd: (h: number) => void;
  timeError: string;
  startRef: React.RefObject<HTMLSelectElement>;
  t: TFn;
}) {
  const errId = timeError ? 'outdoor-time-error' : undefined;
  return (
    <fieldset className="form-fieldset">
      <legend className="form-legend">{t('profile.outdoorHours')}</legend>
      <div className="outdoor-hours-row">
        <TimeSelect id="outdoor-start" label={t('profile.outdoorStart')} value={start} min={0} max={23} selectRef={startRef} errorId={errId} onChange={onStart} />
        <TimeSelect id="outdoor-end" label={t('profile.outdoorEnd')} value={end} min={1} max={24} errorId={errId} onChange={onEnd} />
      </div>
      {timeError && <p id="outdoor-time-error" className="form-error">{timeError}</p>}
    </fieldset>
  );
}

interface Props {
  initial?: ProfileInput;
  onSubmit: (profile: ProfileInput) => void;
  submitLabel?: string;
}

export function ProfileForm({ initial, onSubmit, submitLabel }: Props) {
  const { t } = useI18n();
  const init = initial ?? DEFAULTS;
  const [ageGroup, setAgeGroup] = useState(init.ageGroup);
  const [conditions, setConditions] = useState<Condition[]>(init.conditions);
  const [commuteMode, setCommuteMode] = useState<CommuteMode>(init.commuteMode);
  const [hasPurifier, setHasPurifier] = useState(init.hasPurifier);
  const [hasN95, setHasN95] = useState(init.hasN95);
  const [start, setStart] = useState(init.outdoorHours.start);
  const [end, setEnd] = useState(init.outdoorHours.end);
  const [timeError, setTimeError] = useState('');
  const startRef = useRef<HTMLSelectElement>(null);

  function toggleCondition(c: Condition, checked: boolean) {
    setConditions((prev) => (checked ? [...prev, c] : prev.filter((x) => x !== c)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = { ageGroup, conditions, commuteMode, hasPurifier, hasN95, outdoorHours: { start, end } };
    const result = ProfileInputSchema.safeParse(candidate);
    if (!result.success) {
      setTimeError(t('profile.timeError'));
      startRef.current?.focus();
      return;
    }
    setTimeError('');
    onSubmit(result.data);
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <AgeGroupFieldset value={ageGroup} onChange={setAgeGroup} t={t} />
      <ConditionsFieldset selected={conditions} onToggle={toggleCondition} t={t} />
      <CommuteSelect value={commuteMode} onChange={setCommuteMode} t={t} />
      <div className="form-checkbox-group">
        <label className="form-check-label">
          <input type="checkbox" checked={hasPurifier} onChange={(e) => setHasPurifier(e.target.checked)} />
          {t('profile.purifier')}
        </label>
        <label className="form-check-label">
          <input type="checkbox" checked={hasN95} onChange={(e) => setHasN95(e.target.checked)} />
          {t('profile.n95')}
        </label>
      </div>
      <OutdoorHoursFieldset
        start={start}
        end={end}
        onStart={setStart}
        onEnd={setEnd}
        timeError={timeError}
        startRef={startRef}
        t={t}
      />
      <div className="form-group">
        <p className="form-note">{t('profile.deviceNote')}</p>
        <p className="form-note">{t('profile.medicalNote')}</p>
      </div>
      <button type="submit" className="btn btn-primary">{submitLabel ?? t('profile.submit')}</button>
    </form>
  );
}
