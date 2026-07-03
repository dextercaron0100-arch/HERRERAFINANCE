import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { hydrateDatabaseFromFirestore } from './data/mockDatabase.ts';

const originalConsoleError = console.error;
console.error = (...args) => {
  const msg = args.map(a => typeof a === 'object' && a !== null ? (a.message || a.toString()) : String(a)).join(' ');
  if (msg.includes('resource-exhausted') || msg.includes('quota limits are reset') || msg.includes('maximum backoff delay')) {
    return;
  }
  originalConsoleError(...args);
};

async function bootstrap() {
  try {
    await hydrateDatabaseFromFirestore();
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the production database.';
    createRoot(document.getElementById('root')!).render(
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h1 className="text-xl font-bold">Database unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">{message}</p>
          <p className="mt-3 text-xs text-slate-400">No demo data was created and no cached data was uploaded.</p>
        </div>
      </div>,
    );
  }
}

void bootstrap();
