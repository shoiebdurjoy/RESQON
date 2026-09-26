import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AlertOctagon, ArrowUpDown, Clock3, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const TYPE_ICON = { blood: '🩸', ambulance: '🚑', oxygen: '💨' };

const URGENCY_ACCENT = {
  high:   '#D93B2B',
  medium: '#C4780A',
  low:    '#1A7F4E',
};

/* Task E: card background by risk score level */
function getRiskCardStyle(score) {
  if (score >= 7) return { bg: '#FEF3F1', border: '#F5C4BE', left: '#D93B2B' };
  if (score >= 5) return { bg: '#FDF6E8', border: '#E8D090', left: '#C4780A' };
  return { bg: '#FFFFFF', border: '#E4E2DA', left: '#8A8878' };
}

function RiskBadge({ score }) {
  const style = score >= 7
    ? { background: '#D93B2B', color: '#fff', border: '1px solid #B02E20' }
    : score >= 5
    ? { background: '#C4780A', color: '#fff', border: '1px solid #A06208' }
    : { background: '#FDF6E8', color: '#9A5E08', border: '1px solid #E8D090' };
  return (
    <span style={{ ...style, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', borderRadius: 3, padding: '0.18rem 0.55rem' }}>
      ⚡ {score}
    </span>
  );
}

function RequestCard({ item, showRiskReasons = false, animDelay = 0 }) {
  const accent = URGENCY_ACCENT[item.urgency_level] || '#8A8878';
  const cardStyle = getRiskCardStyle(item.risk_score);
  const isCritical = item.risk_score >= 7;
  return (
    <article className={`section-enter ${isCritical ? 'pulse-danger' : ''}`}
      style={{ background: cardStyle.bg, border: `1px solid ${cardStyle.border}`, borderLeft: `4px solid ${cardStyle.left}`, borderRadius: 10, padding: '1.125rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.22s ease, transform 0.22s ease', animationDelay: `${animDelay}ms` }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{TYPE_ICON[item.emergency_type] || '🆘'}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0D0C0A', textTransform: 'capitalize' }}>{item.emergency_type}</p>
            <p style={{ fontSize: '0.6875rem', color: '#8A8878' }}>#{item.id}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <RiskBadge score={item.risk_score} />
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', borderRadius: 3, padding: '0.15rem 0.45rem', background: `${accent}14`, color: accent, border: `1px solid ${accent}40` }}>
            {item.urgency_level}
          </span>
        </div>
      </div>

      <p style={{ fontSize: '0.8125rem', color: '#5A5850', lineHeight: 1.55, marginBottom: '0.625rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {item.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#8A8878', marginBottom: showRiskReasons && item.risk_reasons?.length ? '0.625rem' : '0.875rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <Clock3 size={11} /> {item.minutes_pending} min pending
        </span>
        <span>{item.requester_name || 'Unknown'}</span>
      </div>

      {showRiskReasons && item.risk_reasons?.length > 0 && (
        <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 5, padding: '0.5rem 0.75rem', marginBottom: '0.875rem' }}>
          {item.risk_reasons.map((r, i) => (
            <p key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#B02E20', fontWeight: 500, marginBottom: i < item.risk_reasons.length - 1 ? '0.25rem' : 0 }}>
              <AlertOctagon size={11} style={{ flexShrink: 0 }} /> {r}
            </p>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Link to={`/emergency/${item.id}`} className="btn-primary"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none' }}>
          View →
        </Link>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: '1.125rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
        <div className="shimmer" style={{ height: 18, width: 100 }} />
        <div className="shimmer" style={{ height: 18, width: 56, borderRadius: 3 }} />
      </div>
      <div className="shimmer" style={{ height: 13, width: '85%', marginBottom: '0.4rem' }} />
      <div className="shimmer" style={{ height: 13, width: '55%', marginBottom: '0.875rem' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="shimmer" style={{ height: 28, width: 64, borderRadius: 6 }} />
      </div>
    </div>
  );
}

export default function RiskFlagged() {

  const { token } = useContext(AuthContext);
  const [flagged,          setFlagged]          = useState([]);
  const [sorted,           setSorted]           = useState([]);
  const [availableHelpers, setAvailableHelpers] = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [activeTab,        setActiveTab]        = useState('flagged');
  const [lastRefresh,      setLastRefresh]      = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true); setError('');
    try {
      const [fRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/emergency/risk-flags`, { headers }),
        axios.get(`${API_URL}/emergency/sorted`,     { headers }),
      ]);
      setFlagged(fRes.data.flagged || []);
      setSorted(sRes.data.requests || []);
      setAvailableHelpers(fRes.data.available_helpers ?? 0);
      setLastRefresh(new Date());
    } catch { setError('Failed to load risk data. Please try again.'); }
    finally  { setLoading(false); }
  }

  useEffect(() => {
    if (!token) return;
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const tabs = [
    { key: 'flagged', label: 'High-Risk Flagged',  icon: ShieldAlert, count: flagged.length },
    { key: 'sorted',  label: 'Sorted by Priority', icon: ArrowUpDown,  count: sorted.length  },
  ];
  const activeList = activeTab === 'flagged' ? flagged : sorted;

  return (
    <div className="page-enter" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header — Task G: removed "Member 2 · Module 3" */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', lineHeight: 1.15 }}>
            Risk Flagging System
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#5A5850', marginTop: '0.375rem' }}>
            Detects high-risk emergencies based on urgency, delay, and helper availability.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#EBF2FC', border: '1px solid #B4CFF0', borderRadius: 6, padding: '0.5rem 0.875rem' }}>
            <Users size={14} style={{ color: '#1854B4' }} />
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.25rem', color: '#0D0C0A', lineHeight: 1 }}>{availableHelpers}</span>
            <span style={{ fontSize: '0.75rem', color: '#5A5850' }}>helpers online</span>
          </div>
          <button onClick={load} disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: '#5A5850', background: 'transparent', border: '1px solid #D0CEC4', borderRadius: 6, padding: '0.3rem 0.75rem', cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Risk legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Risk 7+',  desc: 'Critical',  bg: '#FEF3F1', border: '#F5C4BE', color: '#B02E20' },
          { label: 'Risk 5–6', desc: 'High',      bg: '#FDF6E8', border: '#E8D090', color: '#9A5E08' },
          { label: 'Risk 4',   desc: 'Elevated',  bg: '#F7F6F1', border: '#D0CEC4', color: '#5A5850' },
        ].map(({ label, desc, bg, border, color }) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color, background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: '0.2rem 0.625rem' }}>
            {label} — {desc}
          </span>
        ))}
        <span style={{ fontSize: '0.75rem', color: '#8A8878', alignSelf: 'center', marginLeft: '0.25rem' }}>
          Score = urgency + delay + availability
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', background: '#F7F6F1', border: '1px solid #E4E2DA', borderRadius: 8, padding: '0.25rem', width: 'fit-content', marginBottom: '1.25rem' }}>
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const active = activeTab === key;
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.4rem 0.875rem', fontSize: '0.8125rem', fontWeight: active ? 700 : 500, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Sora', sans-serif", transition: 'all 0.14s ease', background: active ? '#FFFFFF' : 'transparent', color: active ? '#0D0C0A' : '#5A5850', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              <Icon size={13} />
              {label}
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: active ? '#FEF3F1' : '#E4E2DA', color: active ? '#D93B2B' : '#8A8878', borderRadius: 99, padding: '0.1rem 0.45rem' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#B02E20', fontWeight: 500 }}>{error}</div>
      ) : !activeList.length ? (
        <div style={{ border: '1px dashed #D0CEC4', borderRadius: 10, background: '#F7F6F1', padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.625rem' }}>{activeTab === 'flagged' ? '✅' : '📋'}</p>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#2E2D2A', marginBottom: '0.25rem' }}>
            {activeTab === 'flagged' ? 'No high-risk emergencies' : 'No pending requests'}
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#8A8878' }}>
            {activeTab === 'flagged' ? 'All requests are within normal response thresholds.' : 'There are no pending requests at this time.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {activeList.map((item, i) => (
            <RequestCard key={item.id} item={item}
              showRiskReasons={activeTab === 'flagged' || item.is_high_risk}
              animDelay={i * 55} />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}