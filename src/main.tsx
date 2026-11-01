import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Sheet } from './dev/Sheet';

const isSheet = import.meta.env.DEV && new URLSearchParams(location.search).has('sheet');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isSheet ? <Sheet /> : <App />}</React.StrictMode>,
);
