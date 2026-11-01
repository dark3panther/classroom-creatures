import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Icon } from './dev/Icon';
import { Sheet } from './dev/Sheet';

// desktop app on macOS: leave room for the window buttons and let the top bar drag the window
if (/Electron/.test(navigator.userAgent) && /Mac/.test(navigator.platform)) document.documentElement.classList.add('desktop-mac');

const qs = new URLSearchParams(location.search);
const isSheet = import.meta.env.DEV && qs.has('sheet');
const isIcon = import.meta.env.DEV && qs.has('icon');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isIcon ? <Icon /> : isSheet ? <Sheet /> : <App />}</React.StrictMode>,
);
