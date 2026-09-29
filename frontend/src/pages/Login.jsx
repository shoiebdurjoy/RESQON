import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff,
  Lock, Mail, ShieldCheck, Sparkles, Zap
} from 'lucide-react';
import AuthContext from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Return to intended page or dashboard on login
  const from = location.state?.from || '/dashboard';

  // If already authenticated, redirect straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Demo profile quick autofill
  function autofillDemo(type) {
    if (type === 'requester') {
      setEmail('shoiebdurjoy999@gmail.com');
      setPassword('Password123');
      setError('');
    } else if (type === 'helper') {
      setEmail('sarah.khan@example.com');
      setPassword('Password123');
      setError('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 503 || (typeof err.response?.data === 'string' && err.response.data.includes('suspended'))) {
        setError('The backend service is currently resuming. Please retry in a few seconds.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to the backend server. Please verify your connection.');
      } else {
        setError(err.response?.data?.error || 'Invalid email or password. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0EFE9', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header / Return Bar */}
      <header style={{
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E4E2DA',
        background: '#FFFFFF',
      }}>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#2E2D2A',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#D93B2B'}
          onMouseLeave={e => e.currentTarget.style.color = '#2E2D2A'}
        >
          <ArrowLeft size={16} />
          <span>Back to Live Operations</span>
        </Link>

        {/* Live Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#15663E',
          background: '#EDF8F2',
          border: '1px solid #A8DCBC',
          padding: '0.28rem 0.75rem',
          borderRadius: 99,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
        }}>
          <span style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#1A7F4E',
            display: 'inline-block',
            boxShadow: '0 0 0 2px rgba(26,127,78,0.25)',
            animation: 'pulse 2s infinite',
          }} />
          Network Active • Sub-90s SLA
        </div>
      </header>

      {/* Main Split Section */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}>
        {/* Left Branding / Editorial Showcase (Hidden on small mobile, visible on desktop) */}
        <div
          className="hidden lg:flex"
          style={{
            width: '46%',
            background: '#0D0C0A',
            borderRight: '1px solid #1E1D1A',
            padding: '4rem 4.5rem',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#F0EFE9',
          }}
        >
          {/* Logo & Headline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '2.5rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: '#D93B2B', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(217,59,43,0.3)',
              }}>
                <Zap size={20} color="#FFFFFF" strokeWidth={2.5} />
              </div>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                fontWeight: 900,
                fontSize: '1.25rem',
                letterSpacing: '-0.04em',
                color: '#F0EFE9',
              }}>
                RESQON
              </span>
            </div>

            <p style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#D93B2B',
              marginBottom: '1rem',
              fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
            }}>
              Autonomous Crisis Coordination Network
            </p>

            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(2.2rem, 3.2vw, 3.1rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.035em',
              color: '#FFFFFF',
              marginBottom: '1.5rem',
            }}>
              When every second counts.
            </h1>

            <p style={{
              fontSize: '1rem',
              color: '#A09D94',
              lineHeight: 1.65,
              maxWidth: 440,
              marginBottom: '3rem',
            }}>
              Connecting citizens in acute crisis with on-duty field responders, blood donors, and rapid medical transport in real time.
            </p>

            {/* Feature Capability Highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                {
                  icon: Zap,
                  title: 'Rapid Proximity Dispatch',
                  desc: 'GPS-guided coordination routing the closest available units in under 90 seconds.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Clinical Triage & Verification',
                  desc: 'AI-assisted severity classification and 100% verified specialist responders.',
                },
                {
                  icon: Lock,
                  title: 'Encrypted Real-Time Comms',
                  desc: 'End-to-end private channels between callers, dispatchers, and field units.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  style={{
                    background: '#151412',
                    border: '1px solid #23221E',
                    borderRadius: 12,
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: '#22201C',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <Icon size={16} color="#D93B2B" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#F0EFE9', marginBottom: '0.2rem' }}>
                      {title}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: '#7E7C75', lineHeight: 1.5 }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Compliance Notice */}
          <div style={{ paddingTop: '2rem', borderTop: '1px solid #1E1D1A' }}>
            <p style={{ fontSize: '0.75rem', color: '#5A5850', fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif" }}>
              RESQON v1.0.0 • Mission-Critical Operations Platform
            </p>
          </div>
        </div>

        {/* Right Form Card Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
          background: '#F0EFE9',
        }}>
          <div
            className="scale-in"
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#FFFFFF',
              border: '1px solid #E4E2DA',
              borderRadius: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
              padding: '2.5rem 2.25rem',
            }}
          >
            {/* Mobile Header Logo */}
            <div className="flex lg:hidden" style={{ alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#D93B2B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color="#FFFFFF" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif", fontWeight: 900, fontSize: '1.125rem', letterSpacing: '-0.035em', color: '#0D0C0A' }}>
                RESQON
              </span>
            </div>

            {/* Form Title */}
            <p style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#8A8878',
              marginBottom: '0.35rem',
              fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
            }}>
              Operations Console Sign In
            </p>

            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
              fontWeight: 800,
              fontSize: '1.75rem',
              letterSpacing: '-0.035em',
              color: '#0D0C0A',
              marginBottom: '0.5rem',
              lineHeight: 1.2,
            }}>
              Welcome back
            </h2>

            <p style={{ fontSize: '0.875rem', color: '#5A5850', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Enter your credentials to access dispatch tools, or select a demo profile below.
            </p>

            {/* 1-Click Demo Profiles */}
            <div style={{
              background: '#F7F6F1',
              border: '1px solid #E4E2DA',
              borderRadius: 10,
              padding: '0.75rem 0.875rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                <Sparkles size={13} color="#D93B2B" />
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5A5850' }}>
                  1-Click Instant Demo Credentials
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => autofillDemo('requester')}
                  style={{
                    padding: '0.45rem 0.6rem',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: '#FFFFFF',
                    border: '1px solid #D0CEC4',
                    color: '#2E2D2A',
                    fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D0C0A'; e.currentTarget.style.background = '#0D0C0A'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#D0CEC4'; e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#2E2D2A'; }}
                >
                  Requester Demo
                </button>
                <button
                  type="button"
                  onClick={() => autofillDemo('helper')}
                  style={{
                    padding: '0.45rem 0.6rem',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: '#FFFFFF',
                    border: '1px solid #D0CEC4',
                    color: '#2E2D2A',
                    fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#15663E'; e.currentTarget.style.background = '#15663E'; e.currentTarget.style.color = '#FFFFFF'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#D0CEC4'; e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#2E2D2A'; }}
                >
                  Helper Demo
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                key={error}
                className="error-shake"
                style={{
                  background: '#FEF3F1',
                  border: '1px solid #F5C4BE',
                  borderRadius: 8,
                  padding: '0.75rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.8125rem',
                  color: '#B02E20',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: '#5A5850',
                  marginBottom: '0.4rem',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '0.85rem', top: '50%',
                    transform: 'translateY(-50%)', color: '#8A8878',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.875rem 0.75rem 2.6rem',
                      background: '#FFFFFF',
                      border: '1.5px solid #D0CEC4',
                      borderRadius: 8,
                      fontSize: '0.9375rem',
                      fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#0D0C0A';
                      e.target.style.boxShadow = '0 0 0 3px rgba(13,12,10,0.08)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#D0CEC4';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: '#5A5850',
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}>
                    Password
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#8A8878' }}>
                    Min. 6 characters
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', left: '0.85rem', top: '50%',
                    transform: 'translateY(-50%)', color: '#8A8878',
                    display: 'flex', alignItems: 'center',
                  }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                      background: '#FFFFFF',
                      border: '1.5px solid #D0CEC4',
                      borderRadius: 8,
                      fontSize: '0.9375rem',
                      fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#0D0C0A';
                      e.target.style.boxShadow = '0 0 0 3px rgba(13,12,10,0.08)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#D0CEC4';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    style={{
                      position: 'absolute', right: '0.85rem', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', color: '#8A8878',
                      padding: 0, display: 'flex', alignItems: 'center',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 8,
                  background: '#0D0C0A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.16s ease',
                  boxShadow: '0 4px 14px rgba(13,12,10,0.18)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.transform = 'none'; }}
              >
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      width: 15, height: 15, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#FFFFFF',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign In to Console <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Register */}
            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #F0EFE9', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: '#5A5850', margin: 0 }}>
                Don't have an operator account?{' '}
                <Link
                  to="/register"
                  style={{
                    color: '#D93B2B',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  Create account →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}