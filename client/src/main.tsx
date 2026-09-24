/**
 * Browser entry point. Mounts App and nothing else.
 *
 * The missing-root check throws rather than creating the element: a missing
 * #root means the wrong index.html shipped, and a blank page that silently
 * works is harder to diagnose than a boot that stops.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
