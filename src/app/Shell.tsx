import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePreferences } from '../features/preferences/usePreferences.js';
import { PreferencesControls } from '../features/preferences/PreferencesControls.js';
import { I18nProvider } from '../i18n/index.js';
import { useI18n } from '../i18n/index.js';

const TITLES: Record<string, string> = {
  '/': 'Landing – Saans',
  '/app': 'Today – Saans',
  '/app/settings': 'Settings – Saans',
};

function ShellNav() {
  const { t } = useI18n();
  return (
    <nav className="site-nav" aria-label="Main navigation">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/app">App</NavLink>
      <NavLink to="/app/settings">{t('settings.nav')}</NavLink>
    </nav>
  );
}

export function Shell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const { prefs, setTheme, setTextScale, toggleMotion, setLanguage } = usePreferences();
  const [announced, setAnnounced] = useState('');

  useEffect(() => {
    const title = TITLES[location.pathname] ?? 'Page not found – Saans';
    document.title = title;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setAnnounced(title);
    const id = setTimeout(() => {
      mainRef.current?.focus();
    }, 50);
    return () => clearTimeout(id);
  }, [location.pathname]);

  return (
    <I18nProvider language={prefs.language}>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <div id="route-announcer" aria-live="polite" aria-atomic="true" ref={announceRef}>
        {announced}
      </div>

      <header className="site-header" role="banner">
        <div className="container">
          <Link to="/" className="site-logo">
            Saans<span>.</span>
          </Link>
          <ShellNav />
        </div>
      </header>

      <main id="main" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer" role="contentinfo">
        <div className="container">
          <PreferencesControls
            theme={prefs.theme}
            textScale={prefs.textScale}
            motionOff={prefs.motionOff}
            language={prefs.language}
            onTheme={setTheme}
            onTextScale={setTextScale}
            onToggleMotion={toggleMotion}
            onLanguage={setLanguage}
          />
          <div className="footer-legal">
            <p>
              Air quality data by{' '}
              <a
                href="https://open-meteo.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open-Meteo.com
              </a>{' '}
              (CC BY 4.0), based on Copernicus Atmosphere Monitoring Service information.
            </p>
            <p>Saans gives general guidance, not medical advice.</p>
          </div>
        </div>
      </footer>
    </I18nProvider>
  );
}
