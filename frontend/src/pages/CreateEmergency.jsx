import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Crosshair, MapPin } from 'lucide-react';

import AuthContext from '../context/AuthContext';
import MapView from '../components/MapView';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const TYPES = [
  { value: 'blood',     icon: '🩸', label: 'Blood',     desc: 'Transfusion or donation', accent: '#D93B2B', bg: '#FEF3F1', border: '#F5C4BE' },
  { value: 'ambulance', icon: '🚑', label: 'Ambulance', desc: 'Emergency transport',      accent: '#1854B4', bg: '#EBF2FC', border: '#B4CFF0' },
  { value: 'oxygen',    icon: '💨', label: 'Oxygen',    desc: 'Respiratory support',      accent: '#0891B2', bg: '#E0F7FA', border: '#81D4FA' },
];

const URGENCIES = [
  { value: 'high',   label: 'High',   desc: 'Life-threatening — now',      dot: '#D93B2B' },
  { value: 'medium', label: 'Medium', desc: 'Needs attention within 1hr',  dot: '#C4780A' },
  { value: 'low',    label: 'Low',    desc: 'Not immediately critical',     dot: '#1A7F4E' },
];

export default function CreateEmergency() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  const [emergencyType,      setEmergencyType]      = useState('blood');
  const [description,        setDescription]        = useState('');
  const [urgencyLevel,       setUrgencyLevel]       = useState('medium');
  const [requesterLocation,  setRequesterLocation]  = useState(null);
  const [locationAddress,    setLocationAddress]    = useState('Detecting your location…');
  const [helpers,            setHelpers]            = useState([]);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [isDetecting,        setIsDetecting]        = useState(true);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  async function reverseGeocode(lat, lng) {
    if (!GOOGLE_MAPS_API_KEY) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { latlng: `${lat},${lng}`, key: GOOGLE_MAPS_API_KEY },
      });
      return res.data?.results?.[0]?.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  async function updateRequesterLocation(lat, lng) {
    setRequesterLocation({ lat, lng });
    const address = await reverseGeocode(lat, lng);
    setLocationAddress(address);
  }

  useEffect(() => {
    axios.get(`${API_URL}/helper/available`).then(r => setHelpers(r.data?.helpers || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationAddress('Geolocation not supported.'); setIsDetecting(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await updateRequesterLocation(pos.coords.latitude, pos.coords.longitude); setIsDetecting(false); },
      () => { setLocationAddress('Could not auto-detect. Click the map to set location.'); setIsDetecting(false); }
    );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!emergencyType || !description.trim() || !urgencyLevel || !requesterLocation) {
      toast.error('Please fill all fields and select a location on the map.');
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/emergency/create`, {
        emergency_type: emergencyType, description: description.trim(),
        urgency_level: urgencyLevel, latitude: requesterLocation.lat, longitude: requesterLocation.lng,
      }, { headers: authHeaders });
      toast.success('Emergency request created.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) { toast.error('Geolocation not supported.'); return; }
    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => { await updateRequesterLocation(pos.coords.latitude, pos.coords.longitude); setIsDetecting(false); },
      () => { setIsDetecting(false); toast.error('Could not detect location.'); }
    );
  }

  const selectedType = TYPES.find(t => t.value === emergencyType);

  return (
    <div className="page-enter" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#5A5850', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem', fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', lineHeight: 1.15 }}>
          Create Emergency Request
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#5A5850', marginTop: '0.375rem' }}>
          Describe your situation and share your location so helpers can respond quickly.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Step 1 — Type */}
        <div className="card section-enter stagger-1" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.875rem' }}>
            1 — Emergency Type
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {TYPES.map(t => {
              const active = emergencyType === t.value;
              return (
                <button key={t.value} type="button" onClick={() => setEmergencyType(t.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem',
                    padding: '1rem', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'Sora', sans-serif",
                    transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                    background: active ? t.bg : '#FFFFFF',
                    border: active ? `2px solid ${t.accent}` : '2px solid #E4E2DA',
                    transform: active ? 'translateY(-1px)' : '',
                    boxShadow: active ? `0 4px 12px ${t.accent}22` : '',
                  }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{t.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: active ? t.accent : '#0D0C0A' }}>{t.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#8A8878', lineHeight: 1.4 }}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 — Description */}
        <div className="card section-enter stagger-2" style={{ padding: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.625rem' }}>
            2 — Description
          </label>
          <textarea
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={`Describe the ${selectedType?.label || 'emergency'} — include relevant details, how many people are affected, and any special requirements…`}
            className="input-field"
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />
          <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.375rem' }}>
            {description.length} characters — be as specific as possible
          </p>
        </div>

        {/* Step 3 — Urgency */}
        <div className="card section-enter stagger-3" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.875rem' }}>
            3 — Urgency Level
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {URGENCIES.map(u => {
              const active = urgencyLevel === u.value;
              return (
                <button key={u.value} type="button" onClick={() => setUrgencyLevel(u.value)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.625rem 1rem', borderRadius: 6, cursor: 'pointer',
                    fontFamily: "'Sora', sans-serif", transition: 'all 0.14s ease', textAlign: 'left',
                    background: active ? '#0D0C0A' : '#FFFFFF',
                    border: `1px solid ${active ? '#0D0C0A' : '#D0CEC4'}`,
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.dot, display: 'inline-block', flexShrink: 0 }} />
                  <span>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: '0.8125rem', color: active ? '#F0EFE9' : '#0D0C0A' }}>{u.label}</span>
                    <span style={{ display: 'block', fontSize: '0.6875rem', color: active ? '#D0CEC4' : '#8A8878', marginTop: '0.1rem' }}>{u.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4 — Location */}
        <div className="card section-enter stagger-4" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.875rem' }}>
            4 — Your Location
          </p>

          {/* Detected location bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: 6, background: requesterLocation ? '#EDF8F2' : '#F7F6F1', border: `1px solid ${requesterLocation ? '#A8DCBC' : '#D0CEC4'}`, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', flex: 1, minWidth: 0 }}>
              <MapPin size={15} style={{ color: requesterLocation ? '#1A7F4E' : '#8A8878', marginTop: '0.1rem', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0D0C0A' }}>
                  {isDetecting ? 'Detecting location…' : requesterLocation ? 'Location set' : 'Location not set'}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#5A5850', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                  {locationAddress}
                </p>
                {requesterLocation && (
                  <p style={{ fontSize: '0.6875rem', color: '#8A8878', marginTop: '0.1rem', fontVariantNumeric: 'tabular-nums' }}>
                    {requesterLocation.lat.toFixed(5)}, {requesterLocation.lng.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
            <button type="button" onClick={detectLocation} disabled={isDetecting}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.375rem 0.875rem', fontSize: '0.8125rem', flexShrink: 0 }}>
              {isDetecting
                ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #D0CEC4', borderTopColor: '#8A8878', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                : <Crosshair size={13} />}
              {isDetecting ? 'Detecting…' : 'Use my location'}
            </button>
          </div>

          {/* Map */}
          <MapView
            requesterLocation={requesterLocation}
            helpers={helpers}
            onLocationChange={async (lat, lng) => { await updateRequesterLocation(lat, lng); }}
          />
          <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MapPin size={11} /> Click the map or drag the marker to set your exact location.
          </p>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost"
            style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !requesterLocation} className="btn-primary"
            style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
            {isSubmitting
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                  Submitting…
                </span>
              : 'Create Emergency Request'}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}