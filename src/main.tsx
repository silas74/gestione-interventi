import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initPwa } from './lib/pwa';

// Initialize Progressive Web App (PWA) & Service Worker
initPwa();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
