import { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { Bot, BrainCircuit, CheckCircle2, Clock3, Gauge, Loader2, Send, Users } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useCountUp } from '../hooks/useCountUp';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

/* Task H: urgency-dependent light theme colors */
const URGENCY_META = {
  high:   { bg: '#FEF3F1', border: '#F5C4BE', color: '#B02E20', dot: '#D93B2B', label: 'HIGH'   },
  medium: { bg: '#FDF6E8', border: '#E8D090', color: '#9A5E08', dot: '#C4780A', label: 'MEDIUM' },
  low:    { bg: '#EDF8F2', border: '#A8DCBC', color: '#15663E', dot: '#1A7F4E', label: 'LOW'    },
};

function MetricCard({ label, value, unit, icon, accent, subtitle, animDelay = 0 }) {
  const animValue = useCountUp(typeof value === 'number' ? value : 0);
  return (
    <div className="card section-enter" style={{ padding: '1.375rem 1.5rem', borderLeft: `4px solid ${accent}`, animationDelay: `${animDelay}ms`, transition: 'box-shadow 0.22s ease, transform 0.22s ease' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#5A5850' }}>{label}</p>
        <span style={{ color: accent, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
        <p className="num-reveal" style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '2.5rem', letterSpacing: '-0.03em', color: '#0D0C0A', lineHeight: 1, animationDelay: `${animDelay + 80}ms` }}>{value == null ? '—' : (typeof value === 'number' ? animValue : value)}</p>
        {unit && <span style={{ fontSize: '0.875rem', color: '#8A8878', fontWeight: 500 }}>{unit}</span>}
      </div>
      {subtitle && <p style={{ fontSize: '0.75rem', color: '#8A8878', marginTop: '0.375rem', lineHeight: 1.45 }}>{subtitle}</p>}
    </div>
  );
}

export default function AIAssistant() {
  const { token } = useContext(AuthContext);

  const [description, setDescription] = useState('');
  const [aiResult,    setAiResult]    = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState('');
  const [perf,        setPerf]        = useState(null);
  const [perfLoading, setPerfLoading] = useState(true);
  const [perfError,   setPerfError]   = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    async function loadPerf() {
      setPerfLoading(true); setPerfError('');
      try {
        const res = await axios.get(`${API_URL}/analytics/performance`, { headers });
        setPerf(res.data.performance);
      } catch { setPerfError('Failed to load performance metrics.'); }
      finally  { setPerfLoading(false); }
    }
    loadPerf();
  }, [token]);

  async function handleSummarise() {
    if (!description.trim()) return;
    setAiLoading(true); setAiError(''); setAiResult(null);
    try {
      const res = await axios.post(`${API_URL}/ai/summarize`, { description: description.trim() }, { headers });
      setAiResult(res.data);
    } catch (err) {
      setAiError(err.response?.data?.error || 'AI summarisation failed. Please try again.');
    } finally { setAiLoading(false); }
  }

  const urgencyMeta = aiResult ? (URGENCY_META[aiResult.suggested_urgency] || URGENCY_META.medium) : null;

  return (
    <div className="page-enter" style={{ maxWidth: 1280, margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header — Task G: removed "Member 4 · Module 3" */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', lineHeight: 1.15 }}>
          AI Emergency Assistant
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#5A5850', marginTop: '0.375rem' }}>
          Generates summaries, suggests urgency levels, and surfaces performance insights.
        </p>
      </div>

      {/* ── AI Summariser ────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
          <BrainCircuit size={15} style={{ color: '#8A8878' }} />
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A' }}>AI Summary & Urgency Suggester</p>
        </div>
        <p style={{ fontSize: '0.8125rem', color: '#5A5850', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Paste or type an emergency description. The AI will generate a concise summary and recommend an urgency level.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <textarea rows={5} value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. My father collapsed at home, he is 68 years old and has chest pain and difficulty breathing…"
            className="input-field"
            style={{ resize: 'vertical', lineHeight: 1.6, fontSize: '0.875rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#8A8878' }}>{description.length} characters</p>
            <button onClick={handleSummarise} disabled={aiLoading || !description.trim()} className="btn-ink"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>
              {aiLoading ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Analysing…</> : <><Send size={14} /> Analyse with AI</>}
            </button>
          </div>
        </div>

        {aiError && (
          <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.75rem 1rem', marginTop: '1rem', fontSize: '0.875rem', color: '#B02E20' }}>{aiError}</div>
        )}

        {/* Task H: result box colored by urgency */}
        {aiResult && urgencyMeta && (
          <div className="result-reveal" style={{ marginTop: '1.25rem', background: urgencyMeta.bg, border: `1px solid ${urgencyMeta.border}`, borderRadius: 8, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* AI badge row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5850' }}>
                <Bot size={13} /> AI Analysis
              </div>
              {!aiResult.ai_available && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#FDF6E8', color: '#9A5E08', border: '1px solid #E8D090', borderRadius: 3, padding: '0.15rem 0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Rule-based fallback
                </span>
              )}
              {aiResult.ai_available && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, background: '#EDF8F2', color: '#15663E', border: '1px solid #A8DCBC', borderRadius: 3, padding: '0.15rem 0.5rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  ✓ OpenAI
                </span>
              )}
            </div>

            {/* Summary */}
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.375rem' }}>Summary</p>
              <p style={{ fontSize: '0.9375rem', color: '#0D0C0A', lineHeight: 1.65 }}>{aiResult.summary}</p>
            </div>

            {/* Urgency + Reasoning */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.5rem' }}>Suggested Urgency</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.7)', border: `2px solid ${urgencyMeta.border}`, borderRadius: 6, padding: '0.5rem 1rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: urgencyMeta.dot, display: 'inline-block' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', letterSpacing: '0.06em', color: urgencyMeta.color }}>{urgencyMeta.label}</span>
                </div>
              </div>
              {aiResult.reasoning && (
                <div>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.375rem' }}>Reasoning</p>
                  <p style={{ fontSize: '0.875rem', color: '#2E2D2A', lineHeight: 1.6 }}>{aiResult.reasoning}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Performance Metrics ──────────────────────────────────────── */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Gauge size={15} style={{ color: '#8A8878' }} />
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0D0C0A' }}>System Performance</p>
        </div>

        {perfLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem' }}>
            {[1,2,3].map(i => (
              <div key={i} className="card" style={{ padding: '1.375rem' }}>
                <div className="shimmer" style={{ height: 14, width: 120, marginBottom: '0.875rem' }} />
                <div className="shimmer" style={{ height: 44, width: 80 }} />
              </div>
            ))}
          </div>
        )}

        {perfError && (
          <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#B02E20' }}>{perfError}</div>
        )}

        {perf && !perfLoading && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <MetricCard label="Avg Handling Time"   value={perf.avg_handling_time_minutes ?? 'N/A'} unit={perf.avg_handling_time_minutes != null ? 'min' : ''} icon={<Clock3 size={20} />}       accent="#1854B4" subtitle="Accepted → Completed"                                    animDelay={0}   />
              <MetricCard label="Response Efficiency"  value={perf.response_efficiency}              unit="%"                                                  icon={<CheckCircle2 size={20} />} accent="#1A7F4E" subtitle="Completed ÷ (Completed + Cancelled)"              animDelay={70}  />
              <MetricCard label="Helper Participation" value={perf.helper_participation_rate}        unit="%"                                                  icon={<Users size={20} />}        accent="#C4780A" subtitle={`${perf.active_helpers} of ${perf.total_helpers} helpers active`} animDelay={140} />
            </div>

            {/* Progress bars */}
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0D0C0A', marginBottom: '1rem' }}>Performance at a Glance</p>
              {[
                { label: 'Response Efficiency',  value: perf.response_efficiency,      bar: '#1A7F4E', track: '#EDF8F2' },
                { label: 'Helper Participation', value: perf.helper_participation_rate, bar: '#C4780A', track: '#FDF6E8' },
              ].map(({ label, value, bar, track }) => (
                <div key={label} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>
                    <span style={{ fontWeight: 500, color: '#5A5850' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: '#0D0C0A' }}>{value}%</span>
                  </div>
                  <div style={{ height: 6, background: track, borderRadius: 99, overflow: 'hidden' }}>
                    <div className="anim-bar" style={{ height: 6, background: bar, borderRadius: 99, width: `${Math.min(value, 100)}%` }} />
                  </div>
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #E4E2DA', marginTop: '0.25rem' }}>
                <div style={{ background: '#EDF8F2', border: '1px solid #A8DCBC', borderRadius: 6, padding: '0.875rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.375rem' }}>Completed</p>
                  <p style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '2rem', color: '#1A7F4E', lineHeight: 1 }}>{perf.total_completed}</p>
                </div>
                <div style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.875rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.375rem' }}>Cancelled</p>
                  <p style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 800, fontSize: '2rem', color: '#D93B2B', lineHeight: 1 }}>{perf.total_cancelled}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}