import { useContext, useEffect, useMemo, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowUpDown, CheckCircle2, ChevronRight, Clock3,
  FileCheck2, Filter, Navigation, PhoneCall, Plus, Search,
  SlidersHorizontal, Volume2, Wifi, Zap
} from 'lucide-react';

import AuthContext from '../context/AuthContext';
import { socket } from '../socket';
import { API_URL } from '../config';

const TYPE_META = {
  blood:     { icon: '🩸', border: 'accent-red'   },
  ambulance: { icon: '🚑', border: 'accent-blue'  },
  oxygen:    { icon: '💨', border: 'accent-blue'  },
};

const URGENCY_META = {
  high:   { dot: '#D93B2B', text: '#D93B2B', label: 'High'   },
  medium: { dot: '#C4780A', text: '#C4780A', label: 'Medium' },
  low:    { dot: '#1A7F4E', text: '#1A7F4E', label: 'Low'    },
};

const STATUS_BADGE = {
  pending:   'badge-pending',
  accepted:  'badge-accepted',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

const STAT_STYLE = {
  pending:   { accent: '#C4780A', bg: '#FDF6E8', border: '#E8D090' },
  accepted:  { accent: '#1854B4', bg: '#EBF2FC', border: '#B4CFF0' },
  completed: { accent: '#1A7F4E', bg: '#EDF8F2', border: '#A8DCBC' },
};

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d < 1 ? '< 1 km away' : `${d.toFixed(1)} km away`;
}

function playEmergencyChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

function StatCard({ label, value, icon, statKey, animDelay = 0 }) {
  const animValue = useCountUp(value);
  const s = STAT_STYLE[statKey] || { accent: '#8A8878', bg: '#F7F6F1', border: '#D0CEC4' };
  return (
    <div className="section-enter" style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '1.5rem', borderLeft: `4px solid ${s.accent}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.22s ease, transform 0.22s ease', animationDelay: `${animDelay}ms` }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: s.accent }}>{label}</p>
        <span style={{ color: s.accent, opacity: 0.7, transition: 'transform 0.2s ease' }}>{icon}</span>
      </div>
      <p className="num-reveal" style={{ fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-0.035em', color: '#0D0C0A', lineHeight: 1, animationDelay: `${animDelay + 80}ms` }}>{animValue}</p>
    </div>
  );
}

function EmergencyCard({ item, onAccept, onReject, onComplete, onCancel, currentUserId, userLocation, actionLoading, animDelay = 0 }) {
  const urgency  = URGENCY_META[item.urgency_level] || URGENCY_META.low;
  const typeMeta = TYPE_META[item.emergency_type] || {};
  const status   = String(item.status || '').toLowerCase();

  const isOwner = Number(item.requester?.id || item.requester_id) === Number(currentUserId);
  const isAssigned = Number(item.helper?.id || item.helper_id) === Number(currentUserId);

  const canAccept = !isOwner && status === 'pending';
  const canComplete = (isAssigned || isOwner) && status === 'accepted';
  const canCancel = (isOwner && (status === 'pending' || status === 'accepted')) || (isAssigned && status === 'accepted');

  const distanceText = userLocation
    ? calculateDistanceKm(userLocation.lat, userLocation.lng, item.latitude, item.longitude)
    : null;

  const contactPhone = isOwner ? item.helper?.phone : item.requester?.phone;

  return (
    <article className={`card card-hover section-enter ${typeMeta.border || ''}`} style={{ padding: '1.25rem', animationDelay: `${animDelay}ms`, display: 'flex', flexDirection: 'column' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>{typeMeta.icon || '🆘'}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A', lineHeight: 1.2, textTransform: 'capitalize' }}>{item.emergency_type}</p>
              {isOwner && (
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#1854B4', background: '#EBF2FC', padding: '0.1rem 0.4rem', borderRadius: 4, textTransform: 'uppercase' }}>
                  Reporting Party
                </span>
              )}
              {isAssigned && (
                <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#15663E', background: '#EDF8F2', padding: '0.1rem 0.4rem', borderRadius: 4, textTransform: 'uppercase' }}>
                  Assigned Unit
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#8A8878' }}>#{item.id}</p>
          </div>
        </div>
        <span className={STATUS_BADGE[status] || 'badge-pending'}>{item.status}</span>
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.875rem', color: '#5A5850', lineHeight: 1.55, marginBottom: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {item.description}
      </p>

      {/* Meta & Distance */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '1rem', fontSize: '0.75rem', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: urgency.text }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: urgency.dot, display: 'inline-block' }} />
          {urgency.label} urgency
        </span>
        {distanceText && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#1854B4', fontWeight: 600, background: '#EBF2FC', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
            <Navigation size={10} />
            {distanceText}
          </span>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#8A8878' }}>
          <Clock3 size={11} />
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Direct Call Button if phone is accessible */}
      {contactPhone && (status === 'accepted' || status === 'completed') && (
        <div style={{ marginBottom: '0.875rem' }}>
          <a
            href={`tel:${contactPhone}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 600,
              color: '#15663E', background: '#EDF8F2', border: '1px solid #A8DCBC',
              borderRadius: 6, textDecoration: 'none'
            }}
          >
            <PhoneCall size={11} /> Direct Comms: {contactPhone}
          </a>
        </div>
      )}

      {/* Responder / Requester credentials tags */}
      {(item.requester?.blood_group || item.helper?.skills?.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
          {item.requester?.blood_group && (
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#B02E20', background: '#FEF3F1', border: '1px solid #F5C4BE', padding: '0.1rem 0.45rem', borderRadius: 4 }}>
              🩸 {item.requester.blood_group}
            </span>
          )}
          {Array.isArray(item.helper?.skills) && item.helper.skills.slice(0, 2).map(skill => (
            <span key={skill} style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#15663E', background: '#EDF8F2', border: '1px solid #A8DCBC', padding: '0.1rem 0.45rem', borderRadius: 4 }}>
              ✓ {skill}
            </span>
          ))}
        </div>
      )}

      {/* Actions footer */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.6rem', borderTop: '1px solid #F0EFE9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Link to={`/emergency/${item.id}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8125rem', fontWeight: 600, color: '#D93B2B', textDecoration: 'none' }}>
            Incident File <ChevronRight size={13} />
          </Link>
          <Link to={`/trends?id=${item.id}`}
            title="Inspect incident lifecycle audit trail"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.6875rem', fontWeight: 600, color: '#1854B4', textDecoration: 'none', background: '#EBF2FC', border: '1px solid #B4CFF0', padding: '0.12rem 0.45rem', borderRadius: 4 }}>
            Lifecycle Audit
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {canAccept && (
            <>
              <button onClick={() => onAccept(item.id)} disabled={actionLoading[`accept-${item.id}`]} className="btn-primary"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                {actionLoading[`accept-${item.id}`] ? 'Mobilizing…' : 'Acknowledge & Mobilize'}
              </button>
              <button onClick={() => onReject(item.id)} disabled={actionLoading[`reject-${item.id}`]} className="btn-ghost"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                Stand Down
              </button>
            </>
          )}

          {canComplete && (
            <button onClick={() => onComplete(item.id)} disabled={actionLoading[`complete-${item.id}`]} className="btn-success"
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
              {actionLoading[`complete-${item.id}`] ? '…' : 'Resolve Incident'}
            </button>
          )}

          {canCancel && (
            <button onClick={() => onCancel(item.id)} disabled={actionLoading[`cancel-${item.id}`]} className="btn-danger"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              {actionLoading[`cancel-${item.id}`] ? '…' : isOwner ? 'Abort Dispatch' : 'Withdraw Unit'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div className="shimmer" style={{ height: 20, width: 120 }} />
        <div className="shimmer" style={{ height: 20, width: 64, borderRadius: 3 }} />
      </div>
      <div className="shimmer" style={{ height: 14, width: '100%', marginBottom: '0.5rem' }} />
      <div className="shimmer" style={{ height: 14, width: '75%', marginBottom: '1rem' }} />
      <div className="shimmer" style={{ height: 28, width: 90, borderRadius: 6 }} />
    </div>
  );
}

export default function Dashboard() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [communityRequests, setCommunityRequests] = useState([]);
  const [myRequests,        setMyRequests]        = useState([]);
  const [userLocation,      setUserLocation]      = useState(null);
  const [isLoading,         setIsLoading]         = useState(true);
  const [actionLoading,     setActionLoading]     = useState({});
  const [statusFilter,      setStatusFilter]      = useState('pending');
  const [typeFilter,        setTypeFilter]        = useState('');
  const [dateFilter,        setDateFilter]        = useState('');
  const [activeTab,         setActiveTab]         = useState(() => searchParams.get('tab') === 'mine' ? 'mine' : 'community');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [sortOrder,         setSortOrder]         = useState('urgency'); // 'urgency' | 'distance' | 'newest' | 'oldest'

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'mine' || tab === 'community') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // GPS geolocation fetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  async function fetchCommunityRequests() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter)   params.set('type', typeFilter);
    if (dateFilter)   params.set('date', dateFilter);
    const res = await axios.get(`${API_URL}/emergency/all?${params}`, { headers: authHeaders });
    setCommunityRequests(res.data.requests || []);
  }

  async function fetchMyRequests() {
    const res = await axios.get(`${API_URL}/emergency/my`, { headers: authHeaders });
    setMyRequests(res.data.requests || []);
  }

  async function bootstrapData() {
    setIsLoading(true);
    try {
      await Promise.all([fetchCommunityRequests(), fetchMyRequests()]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !user) return;
    bootstrapData();
  }, [token, user, statusFilter, typeFilter, dateFilter]);

  // Real-time socket listeners
  useEffect(() => {
    if (!token || !user) return;

    const onUpdate = () => {
      fetchCommunityRequests();
      fetchMyRequests();
    };

    const onNew = (payload) => {
      const incoming = payload?.request;
      if (!incoming) return;

      if (incoming.urgency_level === 'high') {
        playEmergencyChime();
        toast.error(`🚨 High Urgency ${incoming.emergency_type?.toUpperCase()} reported!`, {
          duration: 5000,
        });
      }

      setCommunityRequests(prev => prev.some(r => r.id === incoming.id) ? prev : [incoming, ...prev]);
    };

    socket.on('request_status_updated', onUpdate);
    socket.on('new_emergency_request', onNew);

    return () => {
      socket.off('request_status_updated', onUpdate);
      socket.off('new_emergency_request', onNew);
    };
  }, [token, user, statusFilter, typeFilter, dateFilter]);

  async function doAction(key, fn) {
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      await fn();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  }

  const handleAccept = (id) => doAction(`accept-${id}`, async () => {
    await axios.put(`${API_URL}/emergency/${id}/accept`, {}, { headers: authHeaders });
    toast.success('Unit mobilized. Incident status updated to active response.');
    await Promise.all([fetchCommunityRequests(), fetchMyRequests()]);
  });

  const handleReject = (id) => doAction(`reject-${id}`, async () => {
    await axios.put(`${API_URL}/emergency/${id}/reject`, {}, { headers: authHeaders });
    setCommunityRequests(p => p.filter(r => r.id !== id));
  });

  const handleComplete = (id) => doAction(`complete-${id}`, async () => {
    const note = window.prompt('Optional: Enter incident resolution summary (e.g. medical transport complete, patient transferred to care):');
    const payload = (note !== null && note.trim()) ? { resolution_note: note.trim() } : {};
    await axios.put(`${API_URL}/emergency/${id}/complete`, payload, { headers: authHeaders });
    toast.success('Incident resolved and logged into incident archive.');
    await Promise.all([fetchCommunityRequests(), fetchMyRequests()]);
  });

  const handleCancel = (id) => doAction(`cancel-${id}`, async () => {
    await axios.put(`${API_URL}/emergency/${id}/cancel`, {}, { headers: authHeaders });
    toast.success('Incident status updated.');
    await Promise.all([fetchCommunityRequests(), fetchMyRequests()]);
  });

  // Calculate stats from combined requests
  const stats = useMemo(() => {
    const src = communityRequests.length ? communityRequests : myRequests;
    return {
      pending:   src.filter(r => r.status?.toLowerCase() === 'pending').length,
      accepted:  src.filter(r => r.status?.toLowerCase() === 'accepted').length,
      completed: src.filter(r => r.status?.toLowerCase() === 'completed').length,
    };
  }, [communityRequests, myRequests]);

  // High-urgency pending emergencies
  const criticalEmergencies = useMemo(() => {
    return communityRequests.filter(
      r => r.urgency_level?.toLowerCase() === 'high' && r.status?.toLowerCase() === 'pending'
    );
  }, [communityRequests]);

  const filteredAndSortedList = useMemo(() => {
    let list = [...(activeTab === 'community' ? communityRequests : myRequests)];

    // Live keyword filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        const idMatch = String(item.id).includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const typeMatch = item.emergency_type?.toLowerCase().includes(q);
        const reqMatch = item.requester?.name?.toLowerCase().includes(q) || item.requester?.blood_group?.toLowerCase().includes(q);
        const helpMatch = item.helper?.name?.toLowerCase().includes(q);
        return idMatch || descMatch || typeMatch || reqMatch || helpMatch;
      });
    }

    // Sort order
    const urgencyWeight = { high: 3, medium: 2, low: 1 };
    list.sort((a, b) => {
      if (sortOrder === 'urgency') {
        const diff = (urgencyWeight[b.urgency_level?.toLowerCase()] || 0) - (urgencyWeight[a.urgency_level?.toLowerCase()] || 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortOrder === 'distance' && userLocation) {
        const getRawDist = (it) => {
          if (!it.latitude || !it.longitude) return Infinity;
          const dy = it.latitude - userLocation.lat;
          const dx = it.longitude - userLocation.lng;
          return dy * dy + dx * dx;
        };
        return getRawDist(a) - getRawDist(b);
      }
      if (sortOrder === 'oldest') {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return list;
  }, [activeTab, communityRequests, myRequests, searchQuery, sortOrder, userLocation]);

  return (
    <div className="page-enter" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header with direct emergency create button */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878' }}>
              RESQON Incident Command System
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', fontWeight: 600, color: '#15663E', background: '#EDF8F2', border: '1px solid #A8DCBC', borderRadius: 3, padding: '0.1rem 0.5rem' }}>
              <Wifi size={10} /> Tactical Network: Live
            </span>
          </div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif", fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2.125rem)', letterSpacing: '-0.035em', color: '#0D0C0A', lineHeight: 1.15 }}>
            Incident Command Operations Center
          </h1>
        </div>

        <Link
          to="/emergency/create"
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem', textDecoration: 'none', boxShadow: '0 2px 8px rgba(217,59,43,0.25)' }}
        >
          <Plus size={16} strokeWidth={2.5} /> Report Incident
        </Link>
      </div>

      {/* Critical High-Urgency Alert Banner */}
      {criticalEmergencies.length > 0 && (
        <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚨</span>
            <div>
              <p style={{ fontWeight: 800, fontSize: '0.875rem', color: '#D93B2B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Priority 1 Tactical Alert ({criticalEmergencies.length} active)
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#5A5850', marginTop: '0.15rem' }}>
                Immediate unit mobilization requested for life-critical incidents.
              </p>
            </div>
          </div>
          <Link
            to={`/emergency/${criticalEmergencies[0].id}`}
            className="btn-primary"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', flexShrink: 0, textDecoration: 'none' }}
          >
            Mobilize Unit (#{criticalEmergencies[0].id})
          </Link>
        </div>
      )}

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <StatCard label="Awaiting Dispatch" value={stats.pending}   statKey="pending"   icon={<Clock3       size={22} />} animDelay={0}   />
        <StatCard label="Units Mobilized"   value={stats.accepted}  statKey="accepted"  icon={<CheckCircle2 size={22} />} animDelay={70}  />
        <StatCard label="Resolved"          value={stats.completed} statKey="completed" icon={<FileCheck2   size={22} />} animDelay={140} />
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #E4E2DA', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => { setActiveTab('community'); setSearchParams({ tab: 'community' }); }}
          style={{
            background: activeTab === 'community' ? '#FEF3F1' : 'transparent',
            color: activeTab === 'community' ? '#D93B2B' : '#5A5850',
            border: activeTab === 'community' ? '1px solid #F5C4BE' : '1px solid transparent',
            fontWeight: 700, fontSize: '0.8125rem', padding: '0.4rem 0.9rem', borderRadius: 8,
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif"
          }}
        >
          Active Incident Queue ({communityRequests.length})
        </button>
        <button
          onClick={() => { setActiveTab('mine'); setSearchParams({ tab: 'mine' }); }}
          style={{
            background: activeTab === 'mine' ? '#FEF3F1' : 'transparent',
            color: activeTab === 'mine' ? '#D93B2B' : '#5A5850',
            border: activeTab === 'mine' ? '1px solid #F5C4BE' : '1px solid transparent',
            fontWeight: 700, fontSize: '0.8125rem', padding: '0.4rem 0.9rem', borderRadius: 8,
            cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif"
          }}
        >
          My Field Assignments & Incidents ({myRequests.length})
        </button>
      </div>

      {/* Search & Operational Filters Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', fontWeight: 600, color: '#2E2D2A' }}>
            <Filter size={14} style={{ color: '#8A8878' }} />
            <span>Search & Dispatch Filters</span>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#D93B2B', fontWeight: 600 }}
            >
              Clear Search ({filteredAndSortedList.length} matching)
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.625rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8878' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search keyword, ID, blood..."
              className="input-field"
              style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
            />
          </div>
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="input-field" style={{ fontSize: '0.8125rem' }}>
            <option value="urgency">Sort: Priority Urgency (Default)</option>
            {userLocation && <option value="distance">Sort: Nearest First (GPS)</option>}
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
          {activeTab === 'community' && (
            <>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ fontSize: '0.8125rem' }}>
                {[['','All Statuses'],['pending','Awaiting Dispatch'],['accepted','Mobilized / Active'],['completed','Resolved'],['cancelled','Cancelled']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field" style={{ fontSize: '0.8125rem' }}>
                {[['','All Classifications'],['blood','🩸 Blood'],['ambulance','🚑 Ambulance'],['oxygen','💨 Oxygen']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="input-field" style={{ fontSize: '0.8125rem' }} />
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.875rem' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Emergency cards */}
      {!isLoading && filteredAndSortedList.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>
          {filteredAndSortedList.map((item, i) => (
            <EmergencyCard
              key={item.id}
              item={item}
              currentUserId={user?.id}
              userLocation={userLocation}
              onAccept={handleAccept}
              onReject={handleReject}
              onComplete={handleComplete}
              onCancel={handleCancel}
              actionLoading={actionLoading}
              animDelay={i * 55}
            />
          ))}
        </div>
      )}

      {!isLoading && !filteredAndSortedList.length && (
        <div className="fade-in" style={{ border: '1px dashed #D0CEC4', borderRadius: 10, background: '#F7F6F1', padding: '3.5rem 1.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <Search size={28} style={{ margin: '0 auto 0.75rem', color: '#D0CEC4' }} />
          <p style={{ fontWeight: 600, color: '#5A5850', fontSize: '0.9375rem' }}>
            {searchQuery ? `No incidents found matching "${searchQuery}"` : activeTab === 'community' ? 'No active incidents match current operational criteria' : 'No active incidents reported or response units currently assigned to you'}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#8A8878', marginTop: '0.25rem' }}>
            {searchQuery ? 'Try clearing your search query or adjusting your filters.' : activeTab === 'community' ? 'Adjust filter parameters or monitor tactical frequency for incoming emergency dispatches.' : 'Incidents you report or response operations you accept will appear here.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary"
              style={{ marginTop: '0.75rem', fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
            >
              Reset Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}