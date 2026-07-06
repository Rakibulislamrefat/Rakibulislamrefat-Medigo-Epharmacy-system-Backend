/**
 * Main App.tsx with all providers set up
 * src/App.tsx
 */

import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes';
import './App.css'; // Your global styles

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <AppRoutes />
      </div>
    </AuthProvider>
  );
}

export default App;

/**
 * Example routes with protected routes
 * src/routes/index.tsx
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

// Pages
import LoginPage from '../pages/LoginPage';
import OrderPage from '../pages/OrderPage';
import PharmacistDashboard from '../pages/PharmacistDashboard';

// Protected Route Component
function ProtectedRoute({ 
  element, 
  requiredRole 
}: { 
  element: React.ReactNode; 
  requiredRole?: string 
}) {
  const { user } = useContext(AuthContext) || {};

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{element}</>;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* User Routes */}
        <Route
          path="/order"
          element={
            <ProtectedRoute element={<OrderPage />} requiredRole="user" />
          }
        />

        {/* Pharmacist Routes */}
        <Route
          path="/pharmacist/dashboard"
          element={
            <ProtectedRoute 
              element={<PharmacistDashboard />} 
              requiredRole="pharmacist" 
            />
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/order" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
