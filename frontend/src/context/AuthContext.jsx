import { createContext, useContext, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

function decodeJwtPayload(jwtToken) {
  try {
    const payloadPart = jwtToken.split('.')[1];
    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch (_error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email, password) => {
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const accessToken = response.data?.access_token || response.data?.token;

      if (!accessToken) {
        throw new Error('Missing JWT token in login response');
      }

      const payload = decodeJwtPayload(accessToken);
      const role = response.data?.user?.role || payload?.role || null;
      const id = response.data?.user?.id || payload?.sub || payload?.id || null;
      const name = response.data?.user?.name || payload?.name || null;

      const userData = { id, role, name };
      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));

      return response.data;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = useMemo(() => {
    const currentRole = user?.role?.toLowerCase?.() || '';

    return {
      user,
      token,
      login,
      logout,
      isLoading,
      isAuthenticated: Boolean(token),
      isHelper: currentRole === 'helper',
      isRequester: currentRole === 'requester',
    };
  }, [user, token, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return context;
}

export default AuthContext;
