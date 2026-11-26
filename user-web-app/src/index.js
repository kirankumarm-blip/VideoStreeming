import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// In production, silence native console logs and warnings to protect sensitive tokens and metrics
if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
  try {
    if (window.localStorage?.getItem('ENABLE_DEBUG_LOGGER') !== 'true') {
      console.log = () => {};
      console.warn = () => {};
      console.debug = () => {};
      console.info = () => {};
    }
  } catch (_) {
    console.log = () => {};
    console.warn = () => {};
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(logger.debug))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
