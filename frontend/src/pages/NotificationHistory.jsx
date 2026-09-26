import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Bell, CheckCircle2, MessageSquare, XCircle } from 'lucide-react';

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

  const completed = history.filter(h => String(h.request?.status).toLowerCase() === 'completed').length;
  const cancelled = history.filter(h => String(h.request?.status).toLowerCase() === 'cancelled').length;

  return (
    <div className="page-enter" style={{ maxWidth: 1024, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', lineHeight: 1.15, marginBottom: '0.375rem' }}>
          Activity History
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#5A5850' }}>
          Review all your emergency requests, timelines, and chat history.
        </p>

        {!isLoading && history.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginTop: '1rem' }}>
            {[
              { icon: <Bell size={11} />,        label: `${history.length} total`,  color: '#2E2D2A', bg: '#F7F6F1', border: '#D0CEC4' },
              { icon: <CheckCircle2 size={11} />, label: `${completed} completed`,   color: '#15663E', bg: '#EDF8F2', border: '#A8DCBC' },
              { icon: <XCircle size={11} />,      label: `${cancelled} cancelled`,   color: '#B02E20', bg: '#FEF3F1', border: '#F5C4BE' },
            ].map(({ icon, label, color, bg, border }) => (
              <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color, background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '0.2rem 0.625rem' }}>
                {icon} {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !history.length && (
        <div className="fade-in" style={{ border: '1px dashed #D0CEC4', borderRadius: 10, background: '#F7F6F1', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📂</p>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#2E2D2A', marginBottom: '0.25rem' }}>No history yet</p>
          <p style={{ fontSize: '0.8125rem', color: '#8A8878' }}>Your accepted and completed requests will appear here.</p>
        </div>
      )}

      {/* History list — Task C: blur glass status cards */}
      {!isLoading && history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map((entry, i) => {
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
                          {request.emergency_type || 'Emergency'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#8A8878' }}>#{request.id}</span>
                        <span className={STATUS_BADGE[status] || 'badge-pending'}>{request.status}</span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: '#5A5850', lineHeight: 1.5, maxWidth: 480, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {request.description}
                      </p>
                    </div>
                  </div>
                  <Link to={`/emergency/${request.id}`} className="btn-primary"
                    style={{ padding: '0.35rem 0.875rem', fontSize: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>
                    Open →
                  </Link>
                </div>

                {/* Timeline cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  {[
                    { label: 'Created',  time: timeline.created_at,   icon: '📋' },
                    { label: 'Accepted', time: timeline.accepted_at,  icon: '✅' },
                    { label: status === 'cancelled' ? 'Cancelled' : 'Completed', time: timeline.completed_at, icon: status === 'cancelled' ? '❌' : '🎉' },
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
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                    {lastMsg ? (
                      <p style={{ fontSize: '0.75rem', color: '#5A5850', marginTop: '0.15rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        Last: "{lastMsg.content}"
                      </p>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.1rem', fontStyle: 'italic' }}>No chat messages.</p>
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