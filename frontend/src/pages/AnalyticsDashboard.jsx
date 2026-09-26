import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Users, XCircle } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useCountUp } from '../hooks/useCountUp';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const TYPE_ICON  = { blood: '🩸', ambulance: '🚑', oxygen: '💨' };
const TYPE_BAR   = { blood: '#D93B2B', ambulance: '#1854B4', oxygen: '#0891B2' };

const STATUS_BADGE = {
  pending: 'badge-pending', accepted: 'badge-accepted',
  completed: 'badge-completed', cancelled: 'badge-cancelled',
};

/* Task D: bigger labels, better StatCard */
function StatCard({ label, value, icon, accent, subtitle, animDelay = 0 }) {
  const animValue = useCountUp(value ?? 0);
  return (
    <div className="card section-enter" style={{ padding: '1.375rem 1.5rem', borderLeft: `4px solid ${accent}`, animationDelay: `${animDelay}ms`, transition: 'box-shadow 0.22s ease, transform 0.22s ease' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5850' }}>{label}</p>
        <span style={{ color: accent, opacity: 0.8 }}>{icon}</span>
      </div>
      <p className="num-reveal" style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-0.03em', color: '#0D0C0A', lineHeight: 1, animationDelay: `${animDelay + 80}ms` }}>{value == null ? '—' : animValue}</p>
      {subtitle && <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.375rem' }}>{subtitle}</p>}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { token } = useContext(AuthContext);
  const [stats,     setStats]     = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [barReady,  setBarReady]  = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    async function load() {
      setLoading(true); setError('');
      try {
        const [sRes, aRes] = await Promise.all([
          axios.get(`${API_URL}/dashboard/stats`,   { headers }),
          axios.get(`${API_URL}/analytics/summary`, { headers }),
        ]);
        setStats(sRes.data);
        setAnalytics(aRes.data.analytics);
      } catch { setError('Failed to load data. Please try again.'); }
      finally  { setLoading(false); }
    }
    load();
  }, [token]);

  const s = stats?.stats     || {};
  const a = analytics        || {};
  const activities   = stats?.recent_activities || [];
  const typeEntries  = Object.entries(a.type_counts || {});
  const maxTypeCount = typeEntries.length ? Math.max(...typeEntries.map(([,c]) => c), 1) : 1;
  const animCompletion  = useCountUp(a.completion_rate ?? 0);
  const animAvgResponse = useCountUp(a.avg_response_time_minutes ?? 0);

  useEffect(() => { if (!loading) { const t = setTimeout(() => setBarReady(true), 100); return () => clearTimeout(t); } }, [loading]);

  return (
    <div className="page-enter" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header — Task G: removed "Member 1 · Module 3" */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', lineHeight: 1.15 }}>
          Interactive Dashboard
        </h1>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="card" style={{ padding: '1.375rem' }}>
              <div className="shimmer" style={{ height: 14, width: 120, marginBottom: '0.875rem' }} />
              <div className="shimmer" style={{ height: 44, width: 80 }} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#B02E20', fontWeight: 500 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats — Task D: bigger labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
            <StatCard label="Active Emergencies" value={s.total_active}        icon={<AlertTriangle size={20} />} accent="#C4780A" subtitle="Pending + accepted"  animDelay={0}   />
            <StatCard label="Available Helpers"  value={s.available_helpers}   icon={<Users size={20} />}         accent="#1854B4" subtitle="Online now"          animDelay={65}  />
            <StatCard label="Completed"          value={s.completed_requests}  icon={<CheckCircle2 size={20} />}  accent="#1A7F4E" subtitle="All time"            animDelay={130} />
            <StatCard label="Cancelled"          value={s.cancelled_requests}  icon={<XCircle size={20} />}       accent="#D93B2B" subtitle="All time"            animDelay={195} />
          </div>

          {/* Analytics row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

            {/* Type breakdown */}
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '1rem' }}>
                Request Types
              </p>
              {a.most_requested_type && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '2rem' }}>{TYPE_ICON[a.most_requested_type] || '🆘'}</span>
                  <div>
                    <p style={{ fontSize: '0.6875rem', color: '#8A8878', fontWeight: 600 }}>Most requested</p>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0D0C0A', textTransform: 'capitalize' }}>{a.most_requested_type}</p>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {typeEntries.map(([type, count]) => {
                  const pct = Math.round((count / maxTypeCount) * 100);
                  const bar = TYPE_BAR[type] || '#8A8878';
                  return (
                    <div key={type}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: '#5A5850', fontWeight: 500, textTransform: 'capitalize' }}>{TYPE_ICON[type]} {type}</span>
                        <span style={{ fontWeight: 700, color: '#0D0C0A' }}>{count}</span>
                      </div>
                      <div className="progress-track">
                        <div className={`progress-fill anim-bar`} style={{ width: `${pct}%`, background: bar }} />
                      </div>
                    </div>
                  );
                })}
                {!typeEntries.length && <p style={{ fontSize: '0.8125rem', color: '#8A8878', fontStyle: 'italic' }}>No data yet.</p>}
              </div>
            </div>

            {/* Completion rate */}
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '1rem' }}>
                Completion Rate
              </p>
              <p className="num-reveal" style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '3.25rem', letterSpacing: '-0.03em', color: '#1A7F4E', lineHeight: 1, marginBottom: '0.5rem' }}>
                {animCompletion}<span style={{ fontSize: '1.5rem', color: '#8A8878' }}>%</span>
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#5A5850', marginBottom: '1rem', lineHeight: 1.5 }}>
                Of all non-cancelled requests resolved successfully.
              </p>
              <div className="progress-track" style={{ height: 8 }}>
                <div className="progress-fill progress-green anim-bar" style={{ width: `${Math.min(a.completion_rate || 0, 100)}%`, height: 8 }} />
              </div>
            </div>

            {/* Avg response time */}
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '1rem' }}>
                Avg Response Time
              </p>
              {a.avg_response_time_minutes != null ? (
                <>
                  <p className="num-reveal" style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '3.25rem', letterSpacing: '-0.03em', color: '#1854B4', lineHeight: 1, marginBottom: '0.25rem' }}>
                    {animAvgResponse}
                    <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#8A8878' }}> min</span>
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: '#5A5850', lineHeight: 1.5 }}>
                    From request creation to helper acceptance.
                  </p>
                  <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 600,
                    color:       a.avg_response_time_minutes <= 10 ? '#15663E' : a.avg_response_time_minutes <= 30 ? '#9A5E08' : '#B02E20',
                    background:  a.avg_response_time_minutes <= 10 ? '#EDF8F2' : a.avg_response_time_minutes <= 30 ? '#FDF6E8' : '#FEF3F1',
                    borderRadius: 4, padding: '0.2rem 0.625rem',
                    border: `1px solid ${a.avg_response_time_minutes <= 10 ? '#A8DCBC' : a.avg_response_time_minutes <= 30 ? '#E8D090' : '#F5C4BE'}` }}>
                    <Clock3 size={11} />
                    {a.avg_response_time_minutes <= 10 ? 'Excellent' : a.avg_response_time_minutes <= 30 ? 'Good' : 'Needs improvement'}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: '#8A8878', fontStyle: 'italic' }}>No accepted requests yet.</p>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={15} style={{ color: '#8A8878' }} />
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A' }}>Recent Activity</p>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#8A8878' }}>{activities.length} records</span>
            </div>

            {!activities.length ? (
              <p style={{ fontSize: '0.875rem', color: '#8A8878', fontStyle: 'italic', padding: '1rem 0' }}>No recent activity.</p>
            ) : (
              <div style={{ borderTop: '1px solid #E4E2DA' }}>
                {activities.map((item, i) => (
                  <div key={item.id} className="section-enter" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '0.875rem 0', borderBottom: '1px solid #F7F6F1', animationDelay: `${i * 45}ms` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '1.25rem', lineHeight: 1, flexShrink: 0, marginTop: '0.1rem' }}>{TYPE_ICON[item.emergency_type] || '🆘'}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0D0C0A', textTransform: 'capitalize' }}>
                          {item.emergency_type} · <span style={{ fontWeight: 400, color: '#5A5850' }}>{item.urgency_level} urgency</span>
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#5A5850', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description_snippet}
                        </p>
                        <p style={{ fontSize: '0.6875rem', color: '#8A8878', marginTop: '0.15rem' }}>
                          {item.requester_name || 'Unknown'} · {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={STATUS_BADGE[item.status] || 'badge-pending'} style={{ flexShrink: 0 }}>{item.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}