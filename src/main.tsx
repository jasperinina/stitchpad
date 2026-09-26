import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  window.addEventListener('load', () =>
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        const announce = () => window.dispatchEvent(new Event('stitchpad:update-ready'));
        if (registration.waiting) announce();
        registration.addEventListener('updatefound', () =>
          registration.installing?.addEventListener('statechange', () => {
            if (registration.waiting && navigator.serviceWorker.controller) announce();
          }),
        );
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
      })
      .catch(() => undefined),
  );
