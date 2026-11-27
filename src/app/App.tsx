import { Routes, Route } from 'react-router-dom';
import { Shell } from './Shell.js';
import { AppStateProvider } from './AppState.js';
import { Landing } from '../features/landing/Landing.js';
import { Today } from '../features/today/Today.js';
import { Settings } from '../features/settings/Settings.js';
import { NotFound } from '../features/not-found/NotFound.js';

export function App() {
  return (
    <AppStateProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Today />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AppStateProvider>
  );
}
