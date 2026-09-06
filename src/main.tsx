import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

document.body.style.background = '#020617';
document.body.style.color = '#e2e8f0';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
