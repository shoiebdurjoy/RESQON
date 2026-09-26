import { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import AuthContext from '../context/AuthContext';

const API_URL    = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const SOCKET_URL =  import.meta.env.VITE_BACKEND_URL   || 'http://localhost:5000';

export default function AvailabilityToggle() {
  const { token, user } = useContext(AuthContext);
  const [available, setAvailable] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const socket  = useMemo(() => io(SOCKET_URL, { auth: { token } }), [token]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/helper/profile`, { headers })
      .then(r => setAvailable(r.data?.helper?.is_available ?? false))
      .catch(() => {});
    socket.on('helper_availability_updated', data => {
      if (data.helper_id === user?.id) setAvailable(data.is_available);
    });
    return () => socket.disconnect();
  }, [token]);

  async function toggle() {
    setLoading(true);
    try {
      const res = await axios.put(`${API_URL}/helper/availability`, { is_available: !available }, { headers });
      setAvailable(res.data?.helper?.is_available ?? !available);
      socket.emit('update_availability', { is_available: !available });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const isOn = available;

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', borderLeft: `3px solid ${isOn ? '#1A7F4E' : '#D0CEC4'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
      <div>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.25rem' }}>Availability</p>
        <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: isOn ? '#1A7F4E' : '#5A5850' }}>{isOn ? 'Online — accepting requests' : 'Offline'}</p>
        <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.2rem' }}>
          {isOn ? 'You appear as available to requesters.' : 'Toggle to start accepting emergencies.'}
        </p>
      </div>
      <button onClick={toggle} disabled={loading}
        style={{ flexShrink: 0, width: 52, height: 28, borderRadius: 99, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: isOn ? '#1A7F4E' : '#E4E2DA', position: 'relative', transition: 'background 0.2s ease', outline: 'none' }}>
        <span style={{ position: 'absolute', top: 3, left: isOn ? 27 : 3, width: 22, height: 22, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOn ? '#1A7F4E' : '#D0CEC4' }} />
        </span>
      </button>
    </div>
  );
}