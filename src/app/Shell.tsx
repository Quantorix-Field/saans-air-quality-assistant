import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePreferences } from '../features/preferences/usePreferences.js';
import { PreferencesControls } from '../features/preferences/PreferencesControls.js';

export function Shell() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const { prefs, setTheme, setTextScale, toggleMotion } = usePreferences();
  const [announced, setAnnounced] = useState('');

  // Move focus to main and update live region on route change
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Landing – Saans',
      '/app': 'Today – Saans',
    };
    const title = titles[location.pathname] ?? 'Page not found – Saans';
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
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <div id="route-announcer" aria-live="polite" aria-atomic="true" ref={announceRef}>
        {announced}
      </div>

      <header className="site-header" role="banner">
        <div className="container">
          <Link to="/" className="site-logo" aria-label="Saans home">
            Saans<span>.</span>
          </Link>
          <nav className="site-nav" aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/app">App</NavLink>
          </nav>
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
            onTheme={setTheme}
            onTextScale={setTextScale}
            onToggleMotion={toggleMotion}
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
    </>
  );
}
