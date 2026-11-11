// Suppress browser-extension injected script errors (e.g. chrome-extension:// fetch interceptors)
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.startsWith('chrome-extension://')) {
    event.preventDefault();
  }
});
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && String(event.reason).includes('chrome-extension://')) {
    event.preventDefault();
  }
});

// Google Maps Platform client-side quota defense
(window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
