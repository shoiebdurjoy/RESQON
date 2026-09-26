import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateEmergency from './pages/CreateEmergency';
import RequestDetails from './pages/RequestDetails';
import NotificationHistory from './pages/NotificationHistory';
import AppNavbar from './components/AppNavbar';

// Module 3 pages
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import RiskFlagged from './pages/RiskFlagged';
import TrendsDashboard from './pages/TrendsDashboard';
import AIAssistant from './pages/AIAssistant';

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0EFE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="scale-in" style={{ background: '#FFFFFF', border: '1px solid #E4E2DA', borderRadius: 12, padding: '1.75rem 2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E4E2DA', borderTopColor: '#D93B2B', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: '#8A8878', letterSpacing: '0.04em' }}>Loading…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function PrivateRoute({ role = 'any', children }) {
  const { isAuthenticated, isLoading, isHelper, isRequester } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'helper' && !isHelper) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === 'requester' && !isRequester) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0EFE9', color: '#0D0C0A', fontFamily: "'Sora', sans-serif" }}>
      <AppNavbar />
      {children}
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute role="any">
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/emergency/create"
        element={
          <PrivateRoute role="requester">
            <CreateEmergency />
          </PrivateRoute>
        }
      />

      <Route
        path="/emergency/:id"
        element={
          <PrivateRoute role="any">
            <RequestDetails />
          </PrivateRoute>
        }
      />

      <Route
        path="/notification/history"
        element={
          <PrivateRoute role="any">
            <NotificationHistory />
          </PrivateRoute>
        }
      />

      {/* Module 3 Routes */}
      <Route
        path="/analytics"
        element={
          <PrivateRoute role="any">
            <AnalyticsDashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/risk"
        element={
          <PrivateRoute role="any">
            <RiskFlagged />
          </PrivateRoute>
        }
      />

      <Route
        path="/trends"
        element={
          <PrivateRoute role="any">
            <TrendsDashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/ai"
        element={
          <PrivateRoute role="any">
            <AIAssistant />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}