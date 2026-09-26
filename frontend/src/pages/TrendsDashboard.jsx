import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CheckCircle2, Clock3, Search, TrendingUp } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

/* Task F: emoji+text map for proper alignment */
const TYPE_ICON = { blood: '🩸', ambulance: '🚑', oxygen: '💨' };
const TYPE_LABEL = { blood: 'Blood', ambulance: 'Ambulance', oxygen: 'Oxygen' };
const TYPE_BAR  = { blood: '#D93B2B', ambulance: '#1854B4', oxygen: '#0891B2' };

const STAGE_META = {
  created:     { icon: '📋', dot: '#8A8878', label: 'Request Created'   },
  accepted:    { icon: '✅', dot: '#1854B4', label: 'Helper Accepted'   },
  completed:   { icon: '🎉', dot: '#1A7F4E', label: 'Completed'         },
  cancelled:   { icon: '❌', dot: '#D93B2B', label: 'Cancelled'         },
  in_progress: { icon: '⏳', dot: '#C4780A', label: 'In Progress (Now)' },
};

function TimelineStage({ stage, isLast }) {
  const meta = STAGE_META[stage.stage] || { icon: '●', dot: '#8A8878', label: stage.stage };
  const done = Boolean(stage.timestamp);
  return (
    <div style={{ display: 'flex', gap: '0.875rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? `${meta.dot}14` : '#F7F6F1', border: `2px solid ${done ? meta.dot : '#D0CEC4'}`, fontSize: '0.875rem' }}>
          {done ? meta.icon : <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D0CEC4', display: 'block' }} />}
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, marginTop: 4, background: done ? `${meta.dot}30` : '#E4E2DA', minHeight: 24 }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : '1.125rem', flex: 1 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: done ? '#0D0C0A' : '#8A8878', marginBottom: '0.15rem' }}>
          {stage.label || meta.label}
        </p>
        {stage.timestamp
          ? <p style={{ fontSize: '0.75rem', color: '#5A5850' }}>{new Date(stage.timestamp).toLocaleString()}</p>
          : <p style={{ fontSize: '0.75rem', color: '#D0CEC4', fontStyle: 'italic' }}>Not yet reached</p>}
        {stage.elapsed_minutes != null && (
          <p style={{ fontSize: '0.6875rem', color: '#1854B4', marginTop: '0.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
            <Clock3 size={10} /> {stage.elapsed_minutes} min since previous
          </p>
        )}
      </div>
    </div>
  );
}

export default function TrendsDashboard() {
  const { token } = useContext(AuthContext);

  const [trends,          setTrends]          = useState(null);
  const [trendsLoading,   setTrendsLoading]   = useState(true);
  const [trendsError,     setTrendsError]     = useState('');
  const [requestId,       setRequestId]       = useState('');
  const [timeline,        setTimeline]        = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError,   setTimelineError]   = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    async function loadTrends() {
      setTrendsLoading(true); setTrendsError('');
      try {
        const res = await axios.get(`${API_URL}/analytics/trends?days=30`, { headers });
        setTrends(res.data);
      } catch { setTrendsError('Failed to load trend data.'); }
      finally  { setTrendsLoading(false); }
    }
    loadTrends();
  }, [token]);

  async function fetchTimeline() {
    if (!requestId.trim()) return;
    setTimelineLoading(true); setTimelineError(''); setTimeline(null);
    try {
      const res = await axios.get(`${API_URL}/emergency/${requestId.trim()}/timeline`, { headers });
      setTimeline(res.data);
    } catch (err) {
      setTimelineError(err.response?.data?.error || 'Request not found or access denied.');
    } finally { setTimelineLoading(false); }
  }

  const typeEntries    = Object.entries(trends?.totals || {});
  const maxTrendsCount = typeEntries.length ? Math.max(...typeEntries.map(([,c]) => c), 1) : 1;

  return (
    <div className="page-enter" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header — Task G: removed "Member 3 · Module 3" */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', lineHeight: 1.15 }}>
          Trends & Timeline
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#5A5850', marginTop: '0.375rem' }}>
          Track emergency demand over 30 days and inspect per-request status timelines.
        </p>
      </div>

      {/* ── Trend Tracking ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <TrendingUp size={15} style={{ color: '#8A8878' }} />
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A' }}>
            Emergency Type Trends — Last 30 Days
          </p>
        </div>

        {trendsLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 36, borderRadius: 6 }} />)}
          </div>
        )}
        {trendsError && (
          <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#B02E20' }}>{trendsError}</div>
        )}

        {trends && !trendsLoading && (
          <>
            {/* Type cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {typeEntries.map(([type, count], i) => {
                const bar = TYPE_BAR[type] || '#8A8878';
                const isHigh = trends.high_demand_type === type;
                return (
                  <div key={type} className="section-enter" style={{ background: isHigh ? '#FEF3F1' : '#F7F6F1', border: `1px solid ${isHigh ? '#F5C4BE' : '#E4E2DA'}`, borderRadius: 8, padding: '1rem', transition: 'box-shadow 0.22s ease, transform 0.22s ease', animationDelay: `${i * 65}ms` }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{TYPE_ICON[type] || '🆘'}</span>
                      {isHigh && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: '#D93B2B', color: '#fff', borderRadius: 3, padding: '0.15rem 0.45rem' }}>
                          Peak
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.02em', color: bar, lineHeight: 1 }}>{count}</p>
                    <p style={{ fontSize: '0.75rem', color: '#5A5850', marginTop: '0.25rem' }}>{TYPE_LABEL[type] || type} requests</p>
                  </div>
                );
              })}
            </div>

            {/* Bar chart — Task F: fixed emoji+text alignment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
              {typeEntries.map(([type, count]) => {
                const bar = TYPE_BAR[type] || '#8A8878';
                const pct = Math.round((count / maxTrendsCount) * 100);
                return (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <span style={{ width: 108, flexShrink: 0, fontSize: '0.8125rem', fontWeight: 500, color: '#2E2D2A', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{TYPE_ICON[type]}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{TYPE_LABEL[type] || type}</span>
                    </span>
                    <div className="progress-track" style={{ flex: 1, height: 8 }}>
                      <div className="progress-fill anim-bar" style={{ width: `${pct}%`, height: 8, background: bar }} />
                    </div>
                    <span style={{ width: 32, textAlign: 'right', fontSize: '0.875rem', fontWeight: 700, color: bar, flexShrink: 0 }}>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Peak day */}
            {trends.peak_day?.date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: '#FDF6E8', border: '1px solid #E8D090', borderRadius: 6, padding: '0.625rem 0.875rem', fontSize: '0.8125rem', color: '#9A5E08', fontWeight: 500 }}>
                <CalendarDays size={14} style={{ flexShrink: 0 }} />
                Peak day: <strong>{trends.peak_day.date}</strong> — {trends.peak_day.count} {trends.peak_day.emergency_type} request(s).
              </div>
            )}

            <p style={{ fontSize: '0.6875rem', color: '#8A8878', marginTop: '0.75rem' }}>
              Period: {trends.start_date} → {trends.end_date} ({trends.period_days} days)
            </p>
          </>
        )}
      </div>

      {/* ── Status Timeline ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
          <CheckCircle2 size={15} style={{ color: '#8A8878' }} />
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A' }}>Request Status Timeline</p>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#5A5850', marginBottom: '1.25rem' }}>
          Enter a Request ID to view its complete lifecycle — creation, acceptance, and completion.
        </p>

        {/* Search */}
        <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <input type="number" min="1" placeholder="Request ID (e.g. 42)" value={requestId}
            onChange={e => setRequestId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchTimeline()}
            className="input-field" style={{ maxWidth: 220, fontSize: '0.875rem' }} />
          <button onClick={fetchTimeline} disabled={timelineLoading || !requestId.trim()} className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
            {timelineLoading
              ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #D0CEC4', borderTopColor: '#8A8878', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : <Search size={13} />}
            {timelineLoading ? 'Loading…' : 'Fetch Timeline'}
          </button>
        </div>

        {timelineError && (
          <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#B02E20', marginBottom: '1rem' }}>{timelineError}</div>
        )}

        {timeline && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
              {[
                { label: 'Request ID',     value: `#${timeline.request_id}` },
                { label: 'Type',           value: `${TYPE_ICON[timeline.emergency_type] || '🆘'} ${TYPE_LABEL[timeline.emergency_type] || timeline.emergency_type}` },
                { label: 'Urgency',        value: timeline.urgency_level },
                { label: 'Total Duration', value: timeline.total_duration_minutes != null ? `${timeline.total_duration_minutes} min` : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#F7F6F1', border: '1px solid #E4E2DA', borderRadius: 6, padding: '0.625rem 0.875rem' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.2rem' }}>{label}</p>
                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0D0C0A', textTransform: 'capitalize' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Timeline steps */}
            <div style={{ background: '#F7F6F1', border: '1px solid #E4E2DA', borderRadius: 8, padding: '1.25rem 1.5rem' }}>
              {timeline.timeline.map((stage, i) => (
                <TimelineStage key={stage.stage} stage={stage} isLast={i === timeline.timeline.length - 1} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}