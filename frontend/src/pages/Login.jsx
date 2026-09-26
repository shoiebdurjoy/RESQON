import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Zap } from 'lucide-react';
import AuthContext from '../context/AuthContext';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Login failed. Check your credentials.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F0EFE9' }}>
      {/* Left panel — brand dark for editorial contrast */}
      <div className="hidden lg:flex slide-left" style={{ width: '42%', background: '#0D0C0A', borderRight: '1px solid #1E1D1A', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} style={{ color: '#D93B2B' }} strokeWidth={2.5} />
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#D93B2B' }}>EMERGON</span>
        </div>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#353230', marginBottom: '1.25rem' }}>Emergency Response Platform</p>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 900, fontSize: '3.5rem', letterSpacing: '-0.04em', color: '#F0EFE9', lineHeight: 1.05 }}>
            Help<br />routed<br />in<br /><span style={{ color: '#D93B2B' }}>seconds.</span>
          </h1>
          <p style={{ fontSize: '0.9375rem', color: '#4E4D49', marginTop: '1.5rem', lineHeight: 1.7, maxWidth: 300 }}>
            A mission-critical platform connecting people in crisis with available helpers in real time.
          </p>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#353230', fontFamily: "'Sora', sans-serif" }}>Smart Emergency System · CSE471</p>
      </div>

      {/* Right panel — light */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#F0EFE9' }}>
        <div className="slide-right" style={{ width: '100%', maxWidth: 400 }}>
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}>
            <Zap size={18} style={{ color: '#D93B2B' }} strokeWidth={2.5} />
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1rem', color: '#D93B2B' }}>EMERGON</span>
          </div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.5rem' }}>Sign in</p>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', marginBottom: '2rem', lineHeight: 1.15 }}>Welcome back</h2>

          {error && (
            <div key={error} className="error-shake" style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#B02E20', fontWeight: 500 }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#8A8878', marginBottom: '0.375rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#8A8878', marginBottom: '0.375rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-ink"
              style={{ marginTop: '0.5rem', padding: '0.75rem', fontSize: '0.9375rem', fontWeight: 700, justifyContent: 'center' }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Signing in…</> : 'Sign in →'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#8A8878', textAlign: 'center' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#D93B2B', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}