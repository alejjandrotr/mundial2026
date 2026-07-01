import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './pages/Dashboard';
import SimulatorPage from './pages/SimulatorPage';
import type { ReactElement } from 'react';

import ChangePasswordModal from './components/ChangePasswordModal';

// Rutas protegidas (solo para usuarios autenticados)
function ProtectedRoute({ children }: { children: ReactElement }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

// Rutas públicas (solo para usuarios NO autenticados)
function PublicRoute({ children }: { children: ReactElement }) {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/" replace />;
  return children;
}

function App() {
  const { currentUser } = useAuth();
  return (
    <>
      <Routes>
        <Route 
          path="/login" 
          element={<PublicRoute><Login /></PublicRoute>} 
        />
        <Route 
          path="/register" 
          element={<PublicRoute><Register /></PublicRoute>} 
        />
        <Route 
          path="/" 
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} 
        />
        <Route 
          path="/simulator" 
          element={<ProtectedRoute><SimulatorPage /></ProtectedRoute>} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {currentUser?.mustChangePassword && <ChangePasswordModal />}
    </>
  );
}

export default App;
