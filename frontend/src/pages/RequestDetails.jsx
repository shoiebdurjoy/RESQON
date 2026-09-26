import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { ArrowLeft, MapPin, Navigation, PhoneCall, User, UserCheck } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

import AuthContext from '../context/AuthContext';
import ChatBox from '../components/ChatBox';
import StatusTimeline from '../components/StatusTimeline';
import { socket } from '../socket';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const TYPE_META = {
  blood:     { icon: '🩸', accent: '#D93B2B' },
  ambulance: { icon: '🚑', accent: '#1854B4' },
  oxygen:    { icon: '💨', accent: '#0891B2' },
};

const URGENCY_DOT = { high: '#D93B2B', medium: '#C4780A', low: '#1A7F4E' };

const STATUS_BADGE = {
  pending:   'badge-pending',
  accepted:  'badge-accepted',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

function SkeletonBlock({ h = 20, w = '100%' }) {
  return <div className="shimmer" style={{ height: h, width: w, marginBottom: '0.5rem' }} />;
}

function RequesterMap({ lat, lng }) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const center = useMemo(() => ({ lat: Number(lat), lng: Number(lng) }), [lat, lng]);
  if (!isLoaded) return <div className="shimmer" style={{ height: 280, borderRadius: 8 }} />;
  return (
    <GoogleMap mapContainerStyle={{ width: '100%', height: 280, borderRadius: 8 }} center={center} zoom={15}>
      <Marker position={center} />
    </GoogleMap>
  );
}

export default function RequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isHelper, isRequester } = useContext(AuthContext);

  const [requestData,   setRequestData]   = useState(null);
  const [isLoading,     setIsLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userLocation,  setUserLocation]  = useState(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d < 1 ? '< 1 km away' : `${d.toFixed(1)} km away`;
  }

  async function fetchRequest() {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/emergency/${id}`, { headers });
      setRequestData(res.data?.request || null);
    } catch {
      setRequestData(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !id) return;
    fetchRequest();
  }, [token, id]);

  useEffect(() => {
    if (!id) return;
    function onStatusUpdated(payload) {
      if (Number(payload?.request_id) !== Number(id)) return;
      fetchRequest();
    }
    socket.on('request_status_updated', onStatusUpdated);
    return () => socket.off('request_status_updated', onStatusUpdated);
  }, [id]);

  async function runAction(path) {
    setActionLoading(true);
    try {
      let payload = {};
      if (path === 'complete') {
        const note = window.prompt('Optional: Enter resolution summary (e.g. medical aid given, patient transported safely):');
        if (note !== null && note.trim()) {
          payload.resolution_note = note.trim();
        }
      }
      await axios.put(`${API_URL}/emergency/${id}/${path}`, payload, { headers });
      if (path === 'reject') {
        toast.success('Request rejected.');
        navigate('/dashboard');
        return;
      }
      toast.success(path === 'complete' ? 'Request marked as completed!' : 'Status updated.');
      await fetchRequest();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <SkeletonBlock h={28} w={240} />
          <SkeletonBlock h={16} w="90%" />
          <SkeletonBlock h={16} w="70%" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}><SkeletonBlock h={80} /></div>
          <div className="card" style={{ padding: '1.5rem' }}><SkeletonBlock h={80} /></div>
        </div>
      </div>
    );
  }

  /* ── Not found ────────────────────────────────────────────────────── */
  if (!requestData) {
    return (
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.25rem', color: '#0D0C0A', marginBottom: '0.375rem' }}>
          Request not found
        </p>
        <p style={{ fontSize: '0.875rem', color: '#5A5850', marginBottom: '1.5rem' }}>
          This request may not exist or you may not have access.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <ArrowLeft size={14} /> Back to Operations
        </button>
      </div>
    );
  }

  const status      = String(requestData.status || '').toLowerCase();
  const typeMeta    = TYPE_META[requestData.emergency_type] || { icon: '🆘', accent: '#8A8878' };
  const urgencyDot  = URGENCY_DOT[requestData.urgency_level] || '#8A8878';

  const currentUserId = Number(user?.id);
  const requesterId = Number(requestData.requester?.id);
  const helperId = Number(requestData.helper?.id);

  const isRequesterUser = currentUserId === requesterId;
  const isAssignedHelper = Boolean(helperId && currentUserId === helperId);
  const isParticipant = isRequesterUser || isAssignedHelper;

  const showChat = isParticipant && status !== 'cancelled' && status !== 'pending';
  const canAccept = status === 'pending' && !isRequesterUser;
  const canComplete = status === 'accepted' && (isAssignedHelper || isRequesterUser);
  const canCancel = (status === 'pending' && isRequesterUser) || (status === 'accepted' && (isAssignedHelper || isRequesterUser));
  const hasActions = canAccept || canComplete || canCancel;

  return (
    <div style={{ maxWidth: 1024, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── Header card ──────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', borderLeft: `4px solid ${typeMeta.accent}` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            {/* Type icon */}
            <div style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>
              {typeMeta.icon}
            </div>
            <div>
              {/* Badges row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5850', background: '#F7F6F1', border: '1px solid #D0CEC4', borderRadius: 3, padding: '0.18rem 0.5rem' }}>
                  {requestData.emergency_type}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', borderRadius: 3, padding: '0.18rem 0.5rem', background: '#F7F6F1', border: '1px solid #D0CEC4', color: '#5A5850' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: urgencyDot, display: 'inline-block' }} />
                  {requestData.urgency_level} urgency
                </span>
                <span className={STATUS_BADGE[status] || 'badge-pending'}>{requestData.status}</span>
              </div>

              <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.375rem', letterSpacing: '-0.02em', color: '#0D0C0A', marginBottom: '0.375rem', lineHeight: 1.2 }}>
                Incident Dossier #{requestData.id}
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#5A5850', lineHeight: 1.6, maxWidth: 520 }}>
                {requestData.description}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to={`/trends?id=${requestData.id}`} className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.375rem 0.875rem', fontSize: '0.8125rem', textDecoration: 'none' }}>
              Lifecycle Audit
            </Link>
            <button onClick={() => navigate('/dashboard')} className="btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.375rem 0.875rem', fontSize: '0.8125rem', flexShrink: 0 }}>
              <ArrowLeft size={13} /> Return
            </button>
          </div>
        </div>

        {/* Location row with Proximity calculation */}
        <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.625rem', fontSize: '0.75rem', color: '#8A8878' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <MapPin size={12} />
            <span>{Number(requestData.latitude).toFixed(5)}, {Number(requestData.longitude).toFixed(5)}</span>
          </span>
          {userLocation && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#1854B4', fontWeight: 600, background: '#EBF2FC', padding: '0.12rem 0.45rem', borderRadius: 4 }}>
              <Navigation size={11} />
              {getDistanceKm(userLocation.lat, userLocation.lng, requestData.latitude, requestData.longitude)}
            </span>
          )}
          {requestData.created_at && (
            <span>· Created {new Date(requestData.created_at).toLocaleString()}</span>
          )}
        </div>

        {requestData.resolution_note && (
          <div style={{ marginTop: '0.875rem', padding: '0.75rem 1rem', background: '#EDF8F2', border: '1px solid #A8DCBC', borderRadius: 8 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#15663E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Incident Resolution Summary</p>
            <p style={{ fontSize: '0.8125rem', color: '#0D0C0A' }}>{requestData.resolution_note}</p>
          </div>
        )}
      </div>

      {/* ── People cards ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
        {/* Requester */}
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#EBF2FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={18} style={{ color: '#1854B4' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878' }}>Reporting Party</p>
              {requestData.requester?.blood_group && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#B02E20', background: '#FEF3F1', border: '1px solid #F5C4BE', padding: '0.05rem 0.35rem', borderRadius: 4 }}>
                  🩸 {requestData.requester.blood_group}
                </span>
              )}
            </div>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A', lineHeight: 1.2, marginTop: '0.15rem' }}>{requestData.requester?.name || 'N/A'}</p>
            {requestData.requester?.phone && (
              <div style={{ marginTop: '0.35rem' }}>
                <a
                  href={`tel:${requestData.requester.phone}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                    color: '#1854B4', background: '#EBF2FC', border: '1px solid #B4CFF0',
                    borderRadius: 6, textDecoration: 'none'
                  }}
                  title="Direct Phone Call"
                >
                  <PhoneCall size={11} /> Call {requestData.requester.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Helper */}
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: requestData.helper ? '#EDF8F2' : '#F7F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck size={18} style={{ color: requestData.helper ? '#1A7F4E' : '#8A8878' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878' }}>Assigned Response Unit</p>
              {requestData.helper?.blood_group && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#B02E20', background: '#FEF3F1', border: '1px solid #F5C4BE', padding: '0.05rem 0.35rem', borderRadius: 4 }}>
                  🩸 {requestData.helper.blood_group}
                </span>
              )}
            </div>
            {requestData.helper ? (
              <>
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A', lineHeight: 1.2, marginTop: '0.15rem' }}>{requestData.helper.name}</p>
                {Array.isArray(requestData.helper?.skills) && requestData.helper.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                    {requestData.helper.skills.map(s => (
                      <span key={s} style={{ fontSize: '0.625rem', fontWeight: 600, color: '#15663E', background: '#EDF8F2', border: '1px solid #A8DCBC', padding: '0.05rem 0.35rem', borderRadius: 3 }}>
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                )}
                {requestData.helper.phone && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <a
                      href={`tel:${requestData.helper.phone}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 600,
                        color: '#15663E', background: '#EDF8F2', border: '1px solid #A8DCBC',
                        borderRadius: 6, textDecoration: 'none'
                      }}
                      title="Direct Phone Call"
                    >
                      <PhoneCall size={11} /> Call {requestData.helper.phone}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#8A8878', fontStyle: 'italic', marginTop: '0.15rem' }}>No Unit Dispatched</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Requester Location Map ───────────────────────────────────── */}
      {requestData.latitude && requestData.longitude && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <MapPin size={12} /> Incident Coordinates & Staging Area
          </p>
          <RequesterMap lat={requestData.latitude} lng={requestData.longitude} />
          <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.5rem', fontVariantNumeric: 'tabular-nums' }}>
            {Number(requestData.latitude).toFixed(5)}, {Number(requestData.longitude).toFixed(5)}
          </p>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────── */}
      {hasActions && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.75rem' }}>Incident Command Actions</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
            {canAccept && (
              <>
                <button onClick={() => runAction('accept')} disabled={actionLoading} className="btn-success"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                  Acknowledge & Mobilize
                </button>
                <button onClick={() => runAction('reject')} disabled={actionLoading} className="btn-ghost">
                  Stand Down
                </button>
              </>
            )}
            {canComplete && (
              <button onClick={() => runAction('complete')} disabled={actionLoading} className="btn-success"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                Mark Incident Resolved
              </button>
            )}
            {canCancel && (
              <button onClick={() => runAction('cancel')} disabled={actionLoading} className="btn-danger"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                {isRequesterUser ? 'Abort Dispatch' : 'Withdraw Unit'}
              </button>
            )}
            {actionLoading && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#5A5850' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #D0CEC4', borderTopColor: '#D93B2B', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Processing…
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Timeline + Chat ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Pass requestData directly as the request prop */}
        <StatusTimeline request={requestData} />

        {showChat ? (
          <ChatBox requestId={requestData.id} currentUserId={user?.id} token={token} />
        ) : (
          <div className="card" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 200 }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</p>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#2E2D2A', marginBottom: '0.25rem' }}>Tactical Comms Inactive</p>
            <p style={{ fontSize: '0.8125rem', color: '#8A8878', lineHeight: 1.5 }}>
              Tactical comms channel activates upon response unit mobilization.
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}