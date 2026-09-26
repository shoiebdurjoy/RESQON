import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Bell, CheckCircle2, Clock3, Filter, MessageSquare, Search, XCircle } from 'lucide-react';

import AuthContext from '../context/AuthContext';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const TYPE_META = {
  blood:     { icon: '🩸', accent: '#D93B2B' },
  ambulance: { icon: '🚑', accent: '#1854B4' },
  oxygen:    { icon: '💨', accent: '#0891B2' },
};

const STATUS_BADGE = {
  pending:   'badge-pending',
  accepted:  'badge-accepted',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
};

/* Task C: glass card styles per status */
const STATUS_CARD_STYLE = {
  completed: { bg: 'rgba(237,248,242,0.85)', border: '#A8DCBC', left: '#1A7F4E' },
  accepted:  { bg: 'rgba(235,242,252,0.85)', border: '#B4CFF0', left: '#1854B4' },
  cancelled: { bg: 'rgba(254,243,241,0.85)', border: '#F5C4BE', left: '#D93B2B' },
  pending:   { bg: 'rgba(253,246,232,0.85)', border: '#E8D090', left: '#C4780A' },
};

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div className="shimmer" style={{ height: 18, width: 150 }} />
        <div className="shimmer" style={{ height: 18, width: 80, borderRadius: 3 }} />
      </div>
      <div className="shimmer" style={{ height: 13, width: '90%', marginBottom: '0.4rem' }} />
      <div className="shimmer" style={{ height: 13, width: '65%', marginBottom: '1rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem' }}>
        {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 52, borderRadius: 6 }} />)}
      </div>
    </div>
  );
}

export default function NotificationHistory() {
  const { token } = useContext(AuthContext);
  const [history,   setHistory]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    localStorage.setItem('historyLastRead', new Date().toISOString());
    window.dispatchEvent(new Event('historyRead'));
  }, []);

  useEffect(() => {
    if (!token) return;
    async function loadHistory() {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/notification/history`, { headers: authHeaders });
        setHistory(res.data?.history || []);
      } catch {
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [token, authHeaders]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery,  setSearchQuery]  = useState('');

  const completed = history.filter(h => String(h.request?.status).toLowerCase() === 'completed').length;
  const accepted  = history.filter(h => String(h.request?.status).toLowerCase() === 'accepted').length;
  const pending   = history.filter(h => String(h.request?.status).toLowerCase() === 'pending').length;
  const cancelled = history.filter(h => String(h.request?.status).toLowerCase() === 'cancelled').length;

  const filteredHistory = useMemo(() => {
    return history.filter(entry => {
      const status = String(entry.request?.status || '').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(entry.request?.id).includes(q);
        const descMatch = entry.request?.description?.toLowerCase().includes(q);
        const typeMatch = entry.request?.emergency_type?.toLowerCase().includes(q);
        return idMatch || descMatch || typeMatch;
      }
      return true;
    });
  }, [history, statusFilter, searchQuery]);

  return (
    <div className="page-enter" style={{ maxWidth: 1024, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.035em', color: '#0D0C0A', lineHeight: 1.15, marginBottom: '0.375rem' }}>
          Incident Audit Trail & History
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#5A5850' }}>
          Comprehensive operational audit trail of incident dispatches, response milestones, and tactical communications.
        </p>

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8A8878' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search historical logs by ID or description…"
              className="input-field"
              style={{ paddingLeft: '2rem', fontSize: '0.8125rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              { key: 'all',       label: `All Logs (${history.length})` },
              { key: 'completed', label: `Resolved (${completed})` },
              { key: 'accepted',  label: `Mobilized (${accepted})` },
              { key: 'pending',   label: `Pending (${pending})` },
              { key: 'cancelled', label: `Aborted (${cancelled})` },
            ].map(pill => {
              const active = statusFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  style={{
                    padding: '0.28rem 0.75rem', borderRadius: 99, fontSize: '0.75rem',
                    fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                    border: active ? '1px solid #0D0C0A' : '1px solid #E8E7E0',
                    background: active ? '#0D0C0A' : '#FFFFFF',
                    color: active ? '#FFFFFF' : '#5A5850',
                    transition: 'all 0.14s cubic-bezier(0.16,1,0.3,1)',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !filteredHistory.length && (
        <div className="fade-in" style={{ border: '1px dashed #D0CEC4', borderRadius: 10, background: '#F7F6F1', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</p>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#2E2D2A', marginBottom: '0.25rem' }}>No Incident Records Logged</p>
          <p style={{ fontSize: '0.8125rem', color: '#8A8878' }}>
            {searchQuery || statusFilter !== 'all' ? 'No records match your search or filter parameters.' : 'Dispatched and resolved incident logs will appear here once recorded.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="btn-secondary"
              style={{ marginTop: '0.75rem', fontSize: '0.8125rem', padding: '0.35rem 0.85rem' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* History list — Task C: blur glass status cards */}
      {!isLoading && filteredHistory.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredHistory.map((entry, i) => {
            const request  = entry.request  || {};
            const messages = entry.messages || [];
            const timeline = entry.status_timeline || {};
            const status   = String(request.status || '').toLowerCase();
            const typeMeta = TYPE_META[request.emergency_type] || { icon: '🆘', accent: '#8A8878' };
            const cardStyle = STATUS_CARD_STYLE[status] || STATUS_CARD_STYLE.pending;
            const lastMsg  = messages[messages.length - 1];

            return (
              <article key={request.id} className="section-enter"
                style={{
                  background: cardStyle.bg,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: `1px solid ${cardStyle.border}`,
                  borderLeft: `4px solid ${cardStyle.left}`,
                  borderRadius: 10,
                  padding: '1.25rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.22s ease, transform 0.22s ease',
                  animationDelay: `${i * 65}ms`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; }}>

                {/* Top row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>{typeMeta.icon}</span>
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A', textTransform: 'capitalize' }}>
                          {request.emergency_type || 'Incident'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#8A8878' }}>#{request.id}</span>
                        <span className={STATUS_BADGE[status] || 'badge-pending'}>{request.status}</span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: '#5A5850', lineHeight: 1.5, maxWidth: 480, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {request.description}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <Link to={`/trends?id=${request.id}`} className="btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
                      Lifecycle Audit
                    </Link>
                    <Link to={`/emergency/${request.id}`} className="btn-primary"
                      style={{ padding: '0.35rem 0.875rem', fontSize: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
                      Incident File →
                    </Link>
                  </div>
                </div>

                {/* Timeline cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  {[
                    { label: 'Dispatched', time: timeline.created_at,  icon: '📋' },
                    { label: 'Mobilized',  time: timeline.accepted_at, icon: '✅' },
                    { label: status === 'cancelled' ? 'Aborted' : 'Resolved', time: timeline.completed_at, icon: status === 'cancelled' ? '❌' : '🎉' },
                  ].map(({ label, time, icon }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${cardStyle.border}`, borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.2rem' }}>
                        {icon} {label}
                      </p>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2E2D2A' }}>
                        {time ? new Date(time).toLocaleString() : <span style={{ fontStyle: 'italic', color: '#D0CEC4', fontWeight: 400 }}>—</span>}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Chat summary */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', padding: '0.625rem 0.875rem', background: messages.length ? '#EBF2FC' : 'rgba(255,255,255,0.5)', border: `1px solid ${messages.length ? '#B4CFF0' : cardStyle.border}`, borderRadius: 6 }}>
                  <MessageSquare size={13} style={{ color: messages.length ? '#1854B4' : '#8A8878', flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: messages.length ? '#1248A0' : '#5A5850' }}>
                      {messages.length} tactical transmission{messages.length !== 1 ? 's' : ''}
                    </span>
                    {lastMsg ? (
                      <p style={{ fontSize: '0.75rem', color: '#5A5850', marginTop: '0.15rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        Transmission: "{lastMsg.content}"
                      </p>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.1rem', fontStyle: 'italic' }}>No tactical transmissions logged.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}