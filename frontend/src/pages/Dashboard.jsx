import { useContext, useEffect, useMemo, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Clock3,
  FileCheck2, Filter, Search, Wifi,
} from 'lucide-react';

import AuthContext from '../context/AuthContext';
import { socket } from '../socket';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

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
      <p className="num-reveal" style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-0.03em', color: '#0D0C0A', lineHeight: 1, animationDelay: `${animDelay + 80}ms` }}>{animValue}</p>
    </div>
  );
}

function EmergencyCard({ item, onAccept, onReject, onComplete, onCancel, isHelper, actionLoading, animDelay = 0 }) {
  const urgency  = URGENCY_META[item.urgency_level] || URGENCY_META.low;
  const typeMeta = TYPE_META[item.emergency_type] || {};
  const status   = String(item.status || '').toLowerCase();
  const canAccept = isHelper && status === 'pending';
  const canReject = isHelper && status === 'pending';

  return (
    <article className={`card card-hover section-enter ${typeMeta.border || ''}`} style={{ padding: '1.25rem', animationDelay: `${animDelay}ms` }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>{typeMeta.icon || '🆘'}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A', lineHeight: 1.2, textTransform: 'capitalize' }}>{item.emergency_type}</p>
            <p style={{ fontSize: '0.75rem', color: '#8A8878' }}>#{item.id}</p>
          </div>
        </div>
        <span className={STATUS_BADGE[status] || 'badge-pending'}>{item.status}</span>
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.875rem', color: '#5A5850', lineHeight: 1.55, marginBottom: '0.875rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {item.description}
      </p>

      {/* Meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, color: urgency.text }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: urgency.dot, display: 'inline-block' }} />
          {urgency.label} urgency
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#8A8878' }}>
          <Clock3 size={11} />
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <Link to={`/emergency/${item.id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8125rem', fontWeight: 600, color: '#D93B2B', textDecoration: 'none' }}>
          View details <ChevronRight size={13} />
        </Link>
        {(canAccept || canReject) && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canAccept && (
              <button onClick={() => onAccept(item.id)} disabled={actionLoading[`accept-${item.id}`]} className="btn-primary"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                {actionLoading[`accept-${item.id}`] ? 'Accepting…' : 'Accept'}
              </button>
            )}
            {canReject && (
              <button onClick={() => onReject(item.id)} disabled={actionLoading[`reject-${item.id}`]} className="btn-ghost"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                Reject
              </button>
            )}
          </div>
        )}
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
  const { user, token, isHelper, isRequester } = useContext(AuthContext);
  const [requesterRequests,  setRequesterRequests]  = useState([]);
  const [helperPoolRequests, setHelperPoolRequests] = useState([]);
  const [assignedTasks,      setAssignedTasks]      = useState([]);
  const [isLoading,          setIsLoading]          = useState(true);
  const [actionLoading,      setActionLoading]      = useState({});
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter,   setTypeFilter]   = useState('');
  const [dateFilter,   setDateFilter]   = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  async function fetchRequesterRequests() {
    const res = await axios.get(`${API_URL}/emergency/my`, { headers: authHeaders });
    setRequesterRequests(res.data.requests || []);
  }
  async function fetchHelperPoolRequests() {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter)   params.set('type', typeFilter);
    if (dateFilter)   params.set('date', dateFilter);
    const res = await axios.get(`${API_URL}/emergency/all?${params}`, { headers: authHeaders });
    setHelperPoolRequests(res.data.requests || []);
  }
  async function fetchAssignedTasks() {
    const res = await axios.get(`${API_URL}/emergency/my`, { headers: authHeaders });
    setAssignedTasks(res.data.requests || []);
  }
  async function bootstrapData() {
    setIsLoading(true);
    try {
      if (isRequester) await fetchRequesterRequests();
      if (isHelper) await Promise.all([fetchHelperPoolRequests(), fetchAssignedTasks()]);
    } finally { setIsLoading(false); }
  }

  useEffect(() => {
    if (!token || !user) return;
    bootstrapData();
  }, [token, user, isRequester, isHelper, statusFilter, typeFilter, dateFilter]);

  useEffect(() => {
    if (!token || !user) return;
    const onUpdate = () => {
      if (isRequester) fetchRequesterRequests();
      if (isHelper) { fetchHelperPoolRequests(); fetchAssignedTasks(); }
    };
    const onNew = (payload) => {
      if (!isHelper) return;
      const incoming = payload?.request;
      if (!incoming) return;
      setHelperPoolRequests(prev => prev.some(r => r.id === incoming.id) ? prev : [incoming, ...prev]);
    };
    socket.on('request_status_updated', onUpdate);
    socket.on('new_emergency_request', onNew);
    return () => { socket.off('request_status_updated', onUpdate); socket.off('new_emergency_request', onNew); };
  }, [token, user, isRequester, isHelper, statusFilter, typeFilter, dateFilter]);

  async function doAction(key, fn) {
    setActionLoading(p => ({ ...p, [key]: true }));
    try { await fn(); } finally { setActionLoading(p => ({ ...p, [key]: false })); }
  }

  const handleAccept   = (id) => doAction(`accept-${id}`,   () => axios.put(`${API_URL}/emergency/${id}/accept`,   {}, { headers: authHeaders }).then(() => Promise.all([fetchHelperPoolRequests(), fetchAssignedTasks()])));
  const handleReject   = (id) => doAction(`reject-${id}`,   () => axios.put(`${API_URL}/emergency/${id}/reject`,   {}, { headers: authHeaders }).then(() => setHelperPoolRequests(p => p.filter(r => r.id !== id))));
  const handleComplete = (id) => doAction(`complete-${id}`, () => axios.put(`${API_URL}/emergency/${id}/complete`, {}, { headers: authHeaders }).then(() => Promise.all([fetchAssignedTasks(), fetchHelperPoolRequests()])));
  const handleCancel   = (id) => doAction(`cancel-${id}`,   () => axios.put(`${API_URL}/emergency/${id}/cancel`,   {}, { headers: authHeaders }).then(() => Promise.all([fetchAssignedTasks(), fetchHelperPoolRequests()])));

  const stats = useMemo(() => {
    const src = isRequester ? requesterRequests : assignedTasks.length ? assignedTasks : helperPoolRequests;
    return {
      pending:   src.filter(r => r.status?.toLowerCase() === 'pending').length,
      accepted:  src.filter(r => r.status?.toLowerCase() === 'accepted').length,
      completed: src.filter(r => r.status?.toLowerCase() === 'completed').length,
    };
  }, [isRequester, requesterRequests, helperPoolRequests, assignedTasks]);

  const listForCards = isRequester ? requesterRequests : helperPoolRequests;

  return (
    <div className="page-enter" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878' }}>
            {isHelper ? 'Helper' : 'Requester'} view
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', fontWeight: 600, color: '#15663E', background: '#EDF8F2', border: '1px solid #A8DCBC', borderRadius: 3, padding: '0.1rem 0.5rem' }}>
            <Wifi size={10} /> Live
          </span>
        </div>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: 'clamp(1.5rem, 3vw, 2rem)', letterSpacing: '-0.025em', color: '#0D0C0A', lineHeight: 1.15 }}>
          Coordination Dashboard
        </h1>
      </div>

      {/* Stats strip — Task A: prominent, color-coded */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <StatCard label="Pending"   value={stats.pending}   statKey="pending"   icon={<Clock3       size={22} />} animDelay={0}   />
        <StatCard label="Accepted"  value={stats.accepted}  statKey="accepted"  icon={<CheckCircle2 size={22} />} animDelay={70}  />
        <StatCard label="Completed" value={stats.completed} statKey="completed" icon={<FileCheck2   size={22} />} animDelay={140} />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: '#2E2D2A' }}>
          <Filter size={14} style={{ color: '#8A8878' }} />
          Filter requests
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ fontSize: '0.8125rem' }}>
            {[['','All Status'],['pending','Pending'],['accepted','Accepted'],['completed','Completed'],['cancelled','Cancelled']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field" style={{ fontSize: '0.8125rem' }}>
            {[['','All Types'],['blood','🩸 Blood'],['ambulance','🚑 Ambulance'],['oxygen','💨 Oxygen']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="input-field" style={{ fontSize: '0.8125rem' }} />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.875rem' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Emergency cards */}
      {!isLoading && listForCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>
          {listForCards.map((item, i) => (
            <EmergencyCard key={item.id} item={item} isHelper={isHelper}
              onAccept={handleAccept} onReject={handleReject}
              onComplete={handleComplete} onCancel={handleCancel}
              actionLoading={actionLoading} animDelay={i * 55} />
          ))}
        </div>
      )}

      {!isLoading && !listForCards.length && (
        <div className="fade-in" style={{ border: '1px dashed #D0CEC4', borderRadius: 10, background: '#F7F6F1', padding: '3.5rem 1.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <Search size={28} style={{ margin: '0 auto 0.75rem', color: '#D0CEC4' }} />
          <p style={{ fontWeight: 600, color: '#5A5850', fontSize: '0.9375rem' }}>No emergency requests found</p>
          <p style={{ fontSize: '0.8125rem', color: '#8A8878', marginTop: '0.25rem' }}>Try adjusting your filters</p>
        </div>
      )}

      {/* Assigned tasks (helper only) */}
      {isHelper && !isLoading && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #E4E2DA' }}>
            <AlertTriangle size={16} style={{ color: '#C4780A' }} />
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, fontSize: '1.125rem', color: '#0D0C0A' }}>My Assigned Tasks</h2>
          </div>
          {assignedTasks.length === 0 ? (
            <div style={{ border: '1px dashed #D0CEC4', borderRadius: 10, padding: '2.5rem 1.5rem', textAlign: 'center', background: '#F7F6F1' }}>
              <p style={{ fontSize: '0.875rem', color: '#8A8878' }}>No assigned tasks yet.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.875rem' }}>
              {assignedTasks.map((task, i) => {
                const urgency  = URGENCY_META[task.urgency_level] || URGENCY_META.low;
                const typeMeta = TYPE_META[task.emergency_type] || {};
                const status   = String(task.status || '').toLowerCase();
                return (
                  <article key={task.id} className={`card card-hover section-enter ${typeMeta.border || ''}`} style={{ padding: '1.25rem', animationDelay: `${i * 55}ms` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.625rem', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{typeMeta.icon || '🆘'}</span>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0D0C0A', textTransform: 'capitalize' }}>{task.emergency_type}</p>
                          <p style={{ fontSize: '0.75rem', color: '#8A8878' }}>#{task.id}</p>
                        </div>
                      </div>
                      <span className={STATUS_BADGE[status] || 'badge-pending'}>{task.status}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#5A5850', lineHeight: 1.5, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {task.description}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <Link to={`/emergency/${task.id}`} className="btn-ghost" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}>
                        View <ChevronRight size={12} />
                      </Link>
                      {status === 'accepted' && (
                        <>
                          <button onClick={() => handleComplete(task.id)} disabled={actionLoading[`complete-${task.id}`]} className="btn-success" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                            {actionLoading[`complete-${task.id}`] ? 'Completing…' : 'Complete'}
                          </button>
                          <button onClick={() => handleCancel(task.id)} disabled={actionLoading[`cancel-${task.id}`]} className="btn-danger" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                            {actionLoading[`cancel-${task.id}`] ? '…' : 'Cancel'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}