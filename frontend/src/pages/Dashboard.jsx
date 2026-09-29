import { useContext, useEffect, useMemo, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowUpDown, CheckCircle2, ChevronRight, Clock3,
  FileCheck2, Filter, Navigation, PhoneCall, Plus, Search,
  ShieldAlert, Sparkles, UserCheck, Users, Wifi, Zap
} from 'lucide-react';

import AuthContext from '../context/AuthContext';
import { socket } from '../socket';
import { API_URL } from '../config';

const TYPE_META = {
  blood:     { icon: '🩸', label: 'Blood Supply', bg: 'bg-red-50 text-red-700 border-red-200' },
  ambulance: { icon: '🚑', label: 'Ambulance Transit', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  oxygen:    { icon: '💨', label: 'Oxygen Life Support', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
};

const URGENCY_META = {
  high:   { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Critical / High' },
  medium: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Medium' },
  low:    { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Standard' },
};

const STATUS_BADGE = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200/80',
  accepted:  'bg-blue-50 text-blue-700 border-blue-200/80',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABEL = {
  pending:   'Awaiting Unit',
  accepted:  'Unit Mobilized',
  completed: 'Resolved',
  cancelled: 'Cancelled',
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

function StatCard({ label, value, subtext, icon, trendColor = 'text-slate-500' }) {
  const animValue = useCountUp(value);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight leading-none"
          style={{ fontFamily: "'Geist', 'Plus Jakarta Sans', sans-serif" }}>
          {animValue}
        </p>
        <span className={`text-[11px] font-semibold ${trendColor} shrink-0`}>
          {subtext}
        </span>
      </div>
    </div>
  );
}

function EmergencyCard({ item, onAccept, onReject, onComplete, onCancel, currentUserId, userLocation, actionLoading }) {
  const urgency  = URGENCY_META[item.urgency_level] || URGENCY_META.low;
  const typeMeta = TYPE_META[item.emergency_type] || { icon: '🆘', label: item.emergency_type, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
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
    <article className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 border ${typeMeta.bg}`}>
              {typeMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-slate-900 leading-snug capitalize">
                  {typeMeta.label}
                </h3>
                {isOwner && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    Your Report
                  </span>
                )}
                {isAssigned && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                    Assigned Unit
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">Incident #{item.id}</span>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[status] || STATUS_BADGE.pending} shrink-0`}>
            {STATUS_LABEL[status] || item.status}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {item.description}
        </p>

        {/* Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
          {/* Urgency Badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${urgency.bg} ${urgency.text} ${urgency.border} font-semibold`}>
            <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
            <span>{urgency.label} Urgency</span>
          </span>

          {/* Distance */}
          {distanceText && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              <Navigation size={11} />
              <span>{distanceText}</span>
            </span>
          )}

          {/* Timestamp */}
          <span className="inline-flex items-center gap-1 text-slate-400 font-medium ml-auto">
            <Clock3 size={12} />
            <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>

        {/* Responder / Requester Badges */}
        {(item.requester?.blood_group || item.helper?.skills?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.requester?.blood_group && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                🩸 Need: {item.requester.blood_group}
              </span>
            )}
            {Array.isArray(item.helper?.skills) && item.helper.skills.slice(0, 2).map(skill => (
              <span key={skill} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                ✓ {skill}
              </span>
            ))}
          </div>
        )}

        {/* Direct Comms button if phone available */}
        {contactPhone && (status === 'accepted' || status === 'completed') && (
          <div className="mb-4">
            <a
              href={`tel:${contactPhone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <PhoneCall size={12} /> Direct Tactical Comms: {contactPhone}
            </a>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link
            to={`/emergency/${item.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
          >
            Incident File <ChevronRight size={13} />
          </Link>
          <Link
            to={`/trends?id=${item.id}`}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          >
            Audit Trail
          </Link>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {canAccept && (
            <>
              <button
                onClick={() => onAccept(item.id)}
                disabled={actionLoading[`accept-${item.id}`]}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all disabled:opacity-50"
              >
                {actionLoading[`accept-${item.id}`] ? 'Mobilizing…' : 'Mobilize Unit'}
              </button>
              <button
                onClick={() => onReject(item.id)}
                disabled={actionLoading[`reject-${item.id}`]}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-all disabled:opacity-50"
              >
                Pass
              </button>
            </>
          )}

          {canComplete && (
            <button
              onClick={() => onComplete(item.id)}
              disabled={actionLoading[`complete-${item.id}`]}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {actionLoading[`complete-${item.id}`] ? 'Resolving…' : 'Resolve Incident'}
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => onCancel(item.id)}
              disabled={actionLoading[`cancel-${item.id}`]}
              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-all disabled:opacity-50"
            >
              {actionLoading[`cancel-${item.id}`] ? '…' : isOwner ? 'Abort Request' : 'Stand Down'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-5 bg-slate-200 rounded w-1/3" />
        <div className="h-5 bg-slate-100 rounded-full w-20" />
      </div>
      <div className="h-4 bg-slate-100 rounded w-full mb-2" />
      <div className="h-4 bg-slate-100 rounded w-4/5 mb-4" />
      <div className="h-8 bg-slate-100 rounded-lg w-28 mt-4" />
    </div>
  );
}

export default function Dashboard() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [communityRequests, setCommunityRequests] = useState([]);
  const [myRequests,        setMyRequests]        = useState([]);
  const [globalStats,       setGlobalStats]       = useState(null);
  const [userLocation,      setUserLocation]      = useState(null);
  const [isLoading,         setIsLoading]         = useState(true);
  const [actionLoading,     setActionLoading]     = useState({});

  // Filter & Search states
  const [statusFilter,      setStatusFilter]      = useState(''); // default '' means all active operations
  const [typeFilter,        setTypeFilter]        = useState('');
  const [searchQuery,       setSearchQuery]       = useState('');
  const [sortOrder,         setSortOrder]         = useState('urgency'); // 'urgency' | 'distance' | 'newest' | 'oldest'
  const [activeTab,         setActiveTab]         = useState(() => searchParams.get('tab') === 'mine' ? 'mine' : 'community');

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

  async function fetchGlobalStats() {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/dashboard/stats`, { headers });
      setGlobalStats(res.data);
    } catch (e) {
      // Non-critical fallback
    }
  }

  async function fetchCommunityRequests() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter)   params.set('type', typeFilter);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await axios.get(`${API_URL}/emergency/all?${params}`, { headers });
    setCommunityRequests(res.data.requests || []);
  }

  async function fetchMyRequests() {
    if (!token) {
      setMyRequests([]);
      return;
    }
    const res = await axios.get(`${API_URL}/emergency/my`, { headers: authHeaders });
    setMyRequests(res.data.requests || []);
  }

  async function bootstrapData() {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchGlobalStats(),
        fetchCommunityRequests(),
        token ? fetchMyRequests() : Promise.resolve(),
      ]);
    } catch (e) {
      console.error('Failed to load emergency telemetry:', e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    bootstrapData();
  }, [token, statusFilter, typeFilter]);

  // Real-time socket listeners
  useEffect(() => {
    const onUpdate = () => {
      fetchCommunityRequests();
      fetchGlobalStats();
      if (token) fetchMyRequests();
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
      fetchGlobalStats();
    };

    socket.on('request_status_updated', onUpdate);
    socket.on('new_emergency_request', onNew);

    return () => {
      socket.off('request_status_updated', onUpdate);
      socket.off('new_emergency_request', onNew);
    };
  }, [token, statusFilter, typeFilter]);

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

  const handleAccept = (id) => {
    if (!token) {
      toast('Please sign in as a certified responder to mobilize for this incident.', { icon: '🔒' });
      navigate('/login', { state: { from: `/emergency/${id}` } });
      return;
    }
    doAction(`accept-${id}`, async () => {
      await axios.put(`${API_URL}/emergency/${id}/accept`, {}, { headers: authHeaders });
      toast.success('Unit mobilized. Incident updated to active tactical response.');
      await Promise.all([fetchCommunityRequests(), fetchMyRequests(), fetchGlobalStats()]);
    });
  };

  const handleReject = (id) => doAction(`reject-${id}`, async () => {
    await axios.put(`${API_URL}/emergency/${id}/reject`, {}, { headers: authHeaders });
    setCommunityRequests(p => p.filter(r => r.id !== id));
  });

  const handleComplete = (id) => doAction(`complete-${id}`, async () => {
    const note = window.prompt('Optional: Enter incident resolution notes:');
    const payload = (note !== null && note.trim()) ? { resolution_note: note.trim() } : {};
    await axios.put(`${API_URL}/emergency/${id}/complete`, payload, { headers: authHeaders });
    toast.success('Incident resolved and saved to operational archive.');
    await Promise.all([fetchCommunityRequests(), fetchMyRequests(), fetchGlobalStats()]);
  });

  const handleCancel = (id) => doAction(`cancel-${id}`, async () => {
    await axios.put(`${API_URL}/emergency/${id}/cancel`, {}, { headers: authHeaders });
    toast.success('Incident status updated.');
    await Promise.all([fetchCommunityRequests(), fetchMyRequests(), fetchGlobalStats()]);
  });

  // Calculate dynamic stats from global or request items
  const stats = useMemo(() => {
    if (globalStats) {
      return {
        active:    globalStats.total_active ?? 0,
        helpers:   globalStats.available_helpers ?? 0,
        completed: globalStats.completed_requests ?? 0,
        total:     globalStats.total_requests ?? 0,
      };
    }
    const src = communityRequests.length ? communityRequests : myRequests;
    return {
      active:    src.filter(r => ['pending', 'accepted'].includes(r.status?.toLowerCase())).length,
      helpers:   2,
      completed: src.filter(r => r.status?.toLowerCase() === 'completed').length,
      total:     src.length,
    };
  }, [globalStats, communityRequests, myRequests]);

  // High-urgency pending emergencies
  const criticalEmergencies = useMemo(() => {
    return communityRequests.filter(
      r => r.urgency_level?.toLowerCase() === 'high' && r.status?.toLowerCase() === 'pending'
    );
  }, [communityRequests]);

  // Filtered and Sorted Request List
  const filteredAndSortedList = useMemo(() => {
    let list = [...(activeTab === 'community' ? communityRequests : myRequests)];

    // Live search query
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 selection:bg-red-500 selection:text-white"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif" }}>

      {/* Guest Explore Mode Banner */}
      {!token && (
        <div className="mb-8 p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <Zap size={22} className="text-red-600" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900">
                  Live Operations Command Feed • Exploration Mode
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Telemetry Active
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                You are previewing live emergency dispatches across Dhaka. Inspect incident timelines, filter by classification, and test dispatch tools. Sign in when ready to report an incident or mobilize.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
            <Link
              to="/login"
              state={{ from: '/dashboard' }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
            >
              Sign in to Console →
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
            >
              Join Network
            </Link>
          </div>
        </div>
      )}

      {/* Operations Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            <span>RESQON Incident Command System</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Mesh Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Incident Command Operations Center
          </h1>
        </div>

        <button
          onClick={() => {
            if (!token) {
              toast('Please sign in to report an emergency incident.', { icon: '🔒' });
              navigate('/login', { state: { from: '/emergency/create' } });
            } else {
              navigate('/emergency/create');
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/20 hover:shadow-lg hover:-translate-y-0.5 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Report Incident</span>
        </button>
      </div>

      {/* Priority 1 Tactical Alert Banner */}
      {criticalEmergencies.length > 0 && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                Priority 1 Tactical Alert ({criticalEmergencies.length} Critical Emergencies Awaiting Unit)
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                Immediate unit mobilization requested for life-critical incidents.
              </p>
            </div>
          </div>
          <Link
            to={`/emergency/${criticalEmergencies[0].id}`}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all shrink-0 self-start sm:self-center"
          >
            Mobilize Critical (#{criticalEmergencies[0].id})
          </Link>
        </div>
      )}

      {/* Global Command Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Incidents"
          value={stats.active}
          subtext="● Priority Queue"
          icon={<Clock3 size={20} className="text-amber-600" />}
          trendColor="text-amber-600"
        />
        <StatCard
          label="Responders On-Duty"
          value={stats.helpers}
          subtext="● Field Units Ready"
          icon={<Users size={20} className="text-blue-600" />}
          trendColor="text-blue-600"
        />
        <StatCard
          label="Resolved Incidents"
          value={stats.completed}
          subtext="● 98.4% Resolution SLA"
          icon={<FileCheck2 size={20} className="text-emerald-600" />}
          trendColor="text-emerald-600"
        />
        <StatCard
          label="Total Incident Volume"
          value={stats.total}
          subtext="● Lifetime Dispatches"
          icon={<Zap size={20} className="text-purple-600" />}
          trendColor="text-purple-600"
        />
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => { setActiveTab('community'); setSearchParams({ tab: 'community' }); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'community'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Active Incident Queue ({communityRequests.length})
        </button>
        <button
          onClick={() => {
            if (!token) {
              toast('Sign in to view your personal field assignments and reported incidents.', { icon: '🔒' });
              navigate('/login', { state: { from: '/dashboard?tab=mine' } });
              return;
            }
            setActiveTab('mine');
            setSearchParams({ tab: 'mine' });
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mine'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          My Field Assignments & Incidents ({myRequests.length})
        </button>
      </div>

      {/* Modern Filter & Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search keyword, incident ID, blood group, location..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
            >
              <option value="">All Statuses</option>
              <option value="pending">Awaiting Dispatch</option>
              <option value="accepted">Unit Mobilized</option>
              <option value="completed">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-red-500 transition-all"
            >
              <option value="">All Types</option>
              <option value="blood">🩸 Blood Request</option>
              <option value="ambulance">🚑 Ambulance</option>
              <option value="oxygen">💨 Oxygen Support</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:border-red-500 transition-all col-span-2 sm:col-span-1"
            >
              <option value="urgency">Priority Urgency</option>
              {userLocation && <option value="distance">Nearest First (GPS)</option>}
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Quick Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
            Quick Filter:
          </span>
          <button
            type="button"
            onClick={() => setTypeFilter('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              typeFilter === ''
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            All Classifications
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('blood')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              typeFilter === 'blood'
                ? 'bg-red-50 text-red-700 border-red-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            🩸 Blood Supply
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('ambulance')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              typeFilter === 'ambulance'
                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            🚑 Ambulance Transit
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('oxygen')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              typeFilter === 'oxygen'
                ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            💨 Oxygen Support
          </button>
        </div>
      </div>

      {/* Loading Skeleton View */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Emergency Cards Grid */}
      {!isLoading && filteredAndSortedList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSortedList.map(item => (
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
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !filteredAndSortedList.length && (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Search size={22} />
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            {searchQuery ? `No incidents match "${searchQuery}"` : 'No incidents match current filter criteria'}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? 'Try clearing your search query or adjusting your filters.' : 'Adjust status or classification filters to inspect all operational records.'}
          </p>
          {(searchQuery || statusFilter || typeFilter) && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter(''); setTypeFilter(''); }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}