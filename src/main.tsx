import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { PhaseProvider } from './context/PhaseContext.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PhaseProvider>
          <App />
        </PhaseProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
