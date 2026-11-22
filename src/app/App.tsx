import { Routes, Route } from 'react-router-dom';
import { Shell } from './Shell.js';
import { Landing } from '../features/landing/Landing.js';
import { Today } from '../features/today/Today.js';
import { NotFound } from '../features/not-found/NotFound.js';

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Today />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
