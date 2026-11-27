import { useRef, useState, useEffect, useCallback } from 'react';
import type { Place } from '../../../shared/schemas.js';
import { searchPlaces, roundCoord } from '../../data/api.js';
import { useI18n } from '../../i18n/index.js';
import type { MessageKey } from '../../i18n/index.js';

type TFn = (key: MessageKey, params?: Record<string, string>) => string;
type SearchStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error';

const GEO_DENIED = 1;
const GEO_UNAVAILABLE = 2;
const GEO_TIMEOUT = 3;

function geoErrorMessage(code: number, t: TFn): string {
  if (code === GEO_DENIED) return t('place.geoError.denied');
  if (code === GEO_UNAVAILABLE) return t('place.geoError.unavailable');
  if (code === GEO_TIMEOUT) return t('place.geoError.timeout');
  return t('place.geoError.unsupported');
}

function buildGeoPlace(pos: GeolocationPosition, t: TFn): Place {
  return {
    name: t('place.myLocation'),
    region: '',
    country: '',
    lat: roundCoord(pos.coords.latitude),
    lon: roundCoord(pos.coords.longitude),
  };
}

function placeLabel(p: Place): string {
  return [p.name, p.region, p.country].filter(Boolean).join(', ');
}

function getStatusText(status: SearchStatus, count: number, t: TFn): string {
  if (status === 'loading') return t('place.loading');
  if (status === 'results') return t('place.resultsFound', { n: String(count) });
  if (status === 'empty') return t('place.noResults');
  if (status === 'error') return t('place.error');
  return '';
}

function isAbortError(err: unknown): boolean {
  return (err instanceof DOMException || err instanceof Error) && err.name === 'AbortError';
}

function usePlaceSearch(query: string, outsideIndia: boolean) {
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback((q: string, all: boolean) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading');
    searchPlaces(q, all, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setResults(res);
        setStatus(res.length > 0 ? 'results' : 'empty');
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted || isAbortError(err)) return;
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setStatus('idle');
      return;
    }
    const id = setTimeout(() => { runSearch(query.trim(), outsideIndia); }, 300);
    return () => clearTimeout(id);
  }, [query, outsideIndia, runSearch]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResults([]);
    setStatus('idle');
  }, []);

  return { results, status, runSearch, reset };
}

function useGeoLocation(t: TFn, onPicked: (place: Place) => void) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t('place.geoError.unsupported'));
      return;
    }
    setGeoError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); onPicked(buildGeoPlace(pos, t)); },
      (err) => { setLocating(false); setGeoError(geoErrorMessage(err.code, t)); },
      { timeout: 10_000 },
    );
  }, [t, onPicked]);

  return { locating, geoError, requestLocation };
}

function PlaceResultsList({ results, onPick }: { results: Place[]; onPick: (p: Place) => void }) {
  if (results.length === 0) return null;
  return (
    <ul className="place-results">
      {results.map((p, i) => (
        <li key={`${p.lat},${p.lon},${i}`}>
          <button type="button" className="place-result-btn" onClick={() => onPick(p)}>
            {placeLabel(p)}
          </button>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  onSelect: (place: Place) => void;
  nextFocusRef?: React.RefObject<HTMLElement | null>;
}

export function PlaceSearch({ onSelect, nextFocusRef }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [outsideIndia, setOutsideIndia] = useState(false);
  const { results, status, runSearch, reset } = usePlaceSearch(query, outsideIndia);

  const handleSelect = useCallback((place: Place) => {
    setQuery('');
    reset();
    onSelect(place);
    nextFocusRef?.current?.focus();
  }, [reset, onSelect, nextFocusRef]);

  const { locating, geoError, requestLocation } = useGeoLocation(t, handleSelect);

  return (
    <div className="form-group">
      <label className="form-label" htmlFor="place-search-input">{t('place.searchLabel')}</label>
      <input
        id="place-search-input"
        className="form-input"
        type="search"
        placeholder={t('place.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      <label className="form-check-label">
        <input type="checkbox" checked={outsideIndia} onChange={(e) => setOutsideIndia(e.target.checked)} />
        {t('place.outsideIndia')}
      </label>
      <div className="place-status">
        <span aria-live="polite" aria-atomic="true">{getStatusText(status, results.length, t)}</span>
        {status === 'error' && (
          <button type="button" className="btn btn-ghost" onClick={() => runSearch(query.trim(), outsideIndia)}>
            {t('place.retry')}
          </button>
        )}
      </div>
      {status === 'results' && <PlaceResultsList results={results} onPick={handleSelect} />}
      <button type="button" className="btn btn-secondary" onClick={requestLocation} disabled={locating}>
        {locating ? t('place.locating') : t('place.useLocation')}
      </button>
      {geoError && <div role="alert" className="geo-error">{geoError}</div>}
    </div>
  );
}
