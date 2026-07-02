import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.map(a => typeof a === 'object' && a !== null ? (a.message || a.toString()) : String(a)).join(' ');
  if (msg.includes('resource-exhausted') || msg.includes('quota limits are reset') || msg.includes('maximum backoff delay')) {
    return;
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
