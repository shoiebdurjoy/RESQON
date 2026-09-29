import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
        <p style={{ fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif", fontSize: '0.8125rem', fontWeight: 600, color: '#8A8878', letterSpacing: '0.04em' }}>Loading…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// App shell layout with universal navigation bar (accessible in preview and auth mode)
function AppLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F0EFE9', color: '#0D0C0A', fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif" }}>
      <AppNavbar />
      {children}
    </div>
  );
}

// Enforces authentication on sensitive operational routes (e.g. creating emergency requests)
function PrivateRoute({ role = 'any', children }) {
  const { isAuthenticated, isLoading, isHelper, isRequester } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role === 'helper' && !isHelper) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === 'requester' && !isRequester) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Publicly accessible exploration routes (visitors can view live emergencies and tools) */}
      <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
      <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
      <Route path="/analytics" element={<AppLayout><AnalyticsDashboard /></AppLayout>} />
      <Route path="/risk" element={<AppLayout><RiskFlagged /></AppLayout>} />
      <Route path="/trends" element={<AppLayout><TrendsDashboard /></AppLayout>} />
      <Route path="/ai" element={<AppLayout><AIAssistant /></AppLayout>} />
      <Route path="/emergency/:id" element={<AppLayout><RequestDetails /></AppLayout>} />

      {/* World-class Authentication routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected operator-only actions */}
      <Route
        path="/emergency/create"
        element={
          <PrivateRoute role="any">
            <CreateEmergency />
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

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
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