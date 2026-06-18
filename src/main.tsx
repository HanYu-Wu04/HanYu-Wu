import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {printConsoleBrand} from './consoleBrand.ts';
import './index.css';

if (!window.__hanYuConsoleBrandPrinted) {
  window.__hanYuConsoleBrandPrinted = true;
  printConsoleBrand();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
