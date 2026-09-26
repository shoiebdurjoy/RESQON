import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Bot, Crosshair, MapPin, Sparkles } from 'lucide-react';

import AuthContext from '../context/AuthContext';
import MapView from '../components/MapView';
import { API_URL } from '../config';

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
  const location = useLocation();
  const prefill = location.state || {};
  const { token } = useContext(AuthContext);

  const [emergencyType,      setEmergencyType]      = useState(prefill.emergencyType || 'blood');
  const [description,        setDescription]        = useState(prefill.description || '');
  const [urgencyLevel,       setUrgencyLevel]       = useState(prefill.urgencyLevel || 'medium');
  const [requesterLocation,  setRequesterLocation]  = useState(null);
  const [locationAddress,    setLocationAddress]    = useState('Detecting your location…');
  const [helpers,            setHelpers]            = useState([]);
  const [isSubmitting,       setIsSubmitting]       = useState(false);
  const [isDetecting,        setIsDetecting]        = useState(true);
  const [aiTriageLoading,    setAiTriageLoading]    = useState(false);
  const [aiTriageResult,     setAiTriageResult]     = useState(null);

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
      toast.success('Incident dispatched. Units notified across tactical network.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch incident.');
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

  async function handleAutoTriage() {
    if (!description.trim()) {
      toast.error('Please enter a brief incident description before running AI Auto-Triage.');
      return;
    }
    setAiTriageLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai/summarize`, { description: description.trim() }, { headers: authHeaders });
      setAiTriageResult(res.data);
      if (res.data?.suggested_urgency) {
        setUrgencyLevel(res.data.suggested_urgency);
      }
      toast.success(`AI assessed priority as ${res.data.suggested_urgency?.toUpperCase()}. Priority adjusted.`);
    } catch {
      toast.error('AI Triage service temporarily unavailable. Please select urgency manually.');
    } finally {
      setAiTriageLoading(false);
    }
  }

  const selectedType = TYPES.find(t => t.value === emergencyType);

  return (
    <div className="page-enter" style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#5A5850', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '1rem', fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif", fontWeight: 500 }}>
          <ArrowLeft size={14} /> Back to Operations
        </button>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.035em', color: '#0D0C0A', lineHeight: 1.15 }}>
          Dispatch Emergency Incident
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#5A5850', marginTop: '0.375rem' }}>
          Initiate emergency dispatch. Transmit GPS field coordinates and triage parameters to mobilize rapid response units.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Step 1 — Type */}
        <div className="card section-enter stagger-1" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.875rem' }}>
            1 — Incident Classification
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {TYPES.map(t => {
              const active = emergencyType === t.value;
              return (
                <button key={t.value} type="button" onClick={() => setEmergencyType(t.value)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.375rem',
                    padding: '1rem', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                    transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                    background: active ? t.bg : '#FFFFFF',
                    border: active ? `2px solid ${t.accent}` : '1.5px solid #E8E7E0',
                    transform: active ? 'translateY(-2px)' : '',
                    boxShadow: active ? `0 6px 16px ${t.accent}25` : '0 1px 3px rgba(0,0,0,0.03)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878' }}>
              2 — Incident Description & SitRep
            </label>
            <button
              type="button"
              onClick={handleAutoTriage}
              disabled={aiTriageLoading || !description.trim()}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600 }}
              title="Analyze situation description with AI to determine triage urgency level"
            >
              <Bot size={13} style={{ color: '#D93B2B' }} />
              {aiTriageLoading ? 'Evaluating SitRep…' : '⚡ AI Auto-Triage'}
            </button>
          </div>

          <textarea
            rows={5}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={`Provide detailed situation report (SitRep) for ${selectedType?.label || 'incident'} — symptoms, casualties, immediate hazards, and access requirements…`}
            className="input-field"
            style={{ resize: 'vertical', lineHeight: 1.6 }}
          />

          <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.375rem' }}>
            {description.length} characters — accurate reporting speeds response
          </p>

          {aiTriageResult && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#F7F6F1', border: '1px solid #E4E2DA', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <Bot size={13} style={{ color: '#D93B2B' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0D0C0A' }}>AI Priority Assessment:</span>
                <span style={{
                  fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                  padding: '0.1rem 0.4rem', borderRadius: 4,
                  background: aiTriageResult.suggested_urgency === 'high' ? '#FEF3F1' : '#EDF8F2',
                  color: aiTriageResult.suggested_urgency === 'high' ? '#B02E20' : '#15663E',
                  border: `1px solid ${aiTriageResult.suggested_urgency === 'high' ? '#F5C4BE' : '#A8DCBC'}`
                }}>
                  {aiTriageResult.suggested_urgency} Priority
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#5A5850', lineHeight: 1.5 }}>
                {aiTriageResult.reasoning || aiTriageResult.summary}
              </p>
            </div>
          )}
        </div>

        {/* Step 3 — Urgency */}
        <div className="card section-enter stagger-3" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.875rem' }}>
            3 — Triage Priority Level
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {URGENCIES.map(u => {
              const active = urgencyLevel === u.value;
              return (
                <button key={u.value} type="button" onClick={() => setUrgencyLevel(u.value)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.625rem 1rem', borderRadius: 8, cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif", transition: 'all 0.16s ease', textAlign: 'left',
                    background: active ? '#0D0C0A' : '#FFFFFF',
                    border: `1.5px solid ${active ? '#0D0C0A' : '#E8E7E0'}`,
                    boxShadow: active ? '0 4px 12px rgba(13,12,10,0.15)' : 'none',
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
            4 — Geolocation & Field Coordinates
          </p>

          {/* Detected location bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.875rem 1rem', borderRadius: 6, background: requesterLocation ? '#EDF8F2' : '#F7F6F1', border: `1px solid ${requesterLocation ? '#A8DCBC' : '#D0CEC4'}`, marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', flex: 1, minWidth: 0 }}>
              <MapPin size={15} style={{ color: requesterLocation ? '#1A7F4E' : '#8A8878', marginTop: '0.1rem', flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0D0C0A' }}>
                  {isDetecting ? 'Detecting coordinates…' : requesterLocation ? 'Field coordinates confirmed' : 'Location coordinates not set'}
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
              {isDetecting ? 'Acquiring GPS…' : 'Acquire GPS coordinates'}
            </button>
          </div>

          {/* Map */}
          <MapView
            requesterLocation={requesterLocation}
            helpers={helpers}
            onLocationChange={async (lat, lng) => { await updateRequesterLocation(lat, lng); }}
          />
          <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <MapPin size={11} /> Click on map or drag pin to position exact incident staging point.
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
                  Transmitting…
                </span>
              : 'Dispatch Incident'}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}