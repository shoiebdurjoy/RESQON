const rawBackend = import.meta.env.VITE_BACKEND_URL;

// Ensure production always routes to the active backend, seamlessly migrating from any old suspended hosts
export const BACKEND_URL = (!rawBackend || rawBackend.includes('resqon-wmme'))
  ? (import.meta.env.DEV ? 'http://localhost:5000' : 'https://resqon-backend.onrender.com')
  : rawBackend;

export const API_URL = `${BACKEND_URL}/api`;
export const SOCKET_URL = BACKEND_URL;

export default {
  BACKEND_URL,
  API_URL,
  SOCKET_URL
};
