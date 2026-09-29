import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff,
  Lock, Mail, Phone, ShieldCheck, User, Zap
} from 'lucide-react';
import { API_URL } from '../config';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SKILLS_OPTIONS = ['First Aid', 'CPR', 'Driving', 'Medical', 'Oxygen Delivery', 'Blood Donation'];

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('requester');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('');
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleSkill(skill) {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        role,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      };

      if (role === 'helper') {
        payload.blood_group = bloodGroup;
        payload.skills = skills;
      }

      await axios.post(`${API_URL}/auth/register`, payload);
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 503 || (typeof err.response?.data === 'string' && err.response.data.includes('suspended'))) {
        setError('The backend server is currently resuming. Please try again in a few seconds.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to the backend server. Please check your internet connection.');
      } else {
        setError(err.response?.data?.error || 'Registration failed. Please check your details.');
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

        {/* Live Network Status */}
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
            width: 7, height: 7, borderRadius: '50%',
            background: '#1A7F4E', display: 'inline-block',
            boxShadow: '0 0 0 2px rgba(26,127,78,0.25)',
          }} />
          Network Active • Ready for Dispatch
        </div>
      </header>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', justifyContent: 'center' }}>
        {/* Left Editorial Panel */}
        <div
          className="hidden lg:flex"
          style={{
            width: '44%',
            background: '#0D0C0A',
            borderRight: '1px solid #1E1D1A',
            padding: '4rem 4.5rem',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: '#F0EFE9',
          }}
        >
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
              Join the Network
            </p>

            <h1 style={{
              fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(2.2rem, 3.2vw, 3rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.035em',
              color: '#FFFFFF',
              marginBottom: '1.5rem',
            }}>
              Be the first line of defense.
            </h1>

            <p style={{
              fontSize: '1rem',
              color: '#A09D94',
              lineHeight: 1.65,
              maxWidth: 440,
              marginBottom: '2.5rem',
            }}>
              Register as a citizen requester to report emergencies in seconds, or join as a verified responder to save lives in your neighborhood.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                {
                  roleName: 'Requester Account',
                  badge: 'For Citizens & Families',
                  desc: 'Instant GPS dispatch for emergency blood, ambulance, or oxygen. Real-time arrival radar & direct helper messaging.',
                  accent: '#1854B4',
                },
                {
                  roleName: 'Certified Responder',
                  badge: 'For Volunteers & Medical Personnel',
                  desc: 'Receive tactical alerts within your radius. On-call toggle, verification badges, and rapid turn-by-turn routing.',
                  accent: '#1A7F4E',
                },
              ].map(({ roleName, badge, desc, accent }) => (
                <div
                  key={roleName}
                  style={{
                    background: '#151412',
                    border: '1px solid #23221E',
                    borderRadius: 12,
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#FFFFFF' }}>{roleName}</p>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: accent, background: '#22201C', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                      {badge}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#7E7C75', lineHeight: 1.55 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: '2rem', borderTop: '1px solid #1E1D1A' }}>
            <p style={{ fontSize: '0.75rem', color: '#5A5850', fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif" }}>
              RESQON v1.0.0 • Emergency Coordination Platform
            </p>
          </div>
        </div>

        {/* Right Form Card */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
          background: '#F0EFE9',
          overflowY: 'auto',
        }}>
          <div
            className="scale-in"
            style={{
              width: '100%',
              maxWidth: 480,
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

            <p style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#8A8878',
              marginBottom: '0.35rem',
              fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
            }}>
              Join the Network
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
              Create operator account
            </h2>

            <p style={{ fontSize: '0.875rem', color: '#5A5850', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Select your role and enter your details to register.
            </p>

            {/* Role Selector Tabs */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: '#5A5850',
                marginBottom: '0.5rem',
              }}>
                I am registering as:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
                {[
                  ['requester', 'Requester (Need Help)'],
                  ['helper', 'Certified Responder'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRole(val)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: 8,
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      transition: 'all 0.16s ease',
                      background: role === val ? '#0D0C0A' : '#FFFFFF',
                      color: role === val ? '#F0EFE9' : '#5A5850',
                      border: role === val ? '1.5px solid #0D0C0A' : '1.5px solid #E8E7E0',
                      boxShadow: role === val ? '0 4px 12px rgba(13,12,10,0.15)' : 'none',
                    }}
                  >
                    {label}
                  </button>
                ))}
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
                }}
              >
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#8A8878', display: 'flex' }}>
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Your legal or full name"
                    autoComplete="name"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem 0.7rem 2.6rem',
                      background: '#FFFFFF',
                      border: '1.5px solid #D0CEC4',
                      borderRadius: 8,
                      fontSize: '0.9375rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#8A8878', display: 'flex' }}>
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
                      padding: '0.7rem 0.85rem 0.7rem 2.6rem',
                      background: '#FFFFFF',
                      border: '1.5px solid #D0CEC4',
                      borderRadius: 8,
                      fontSize: '0.9375rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '0.35rem' }}>
                  Contact Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#8A8878', display: 'flex' }}>
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    placeholder="+880 1XXX-XXXXXX"
                    autoComplete="tel"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.85rem 0.7rem 2.6rem',
                      background: '#FFFFFF',
                      border: '1.5px solid #D0CEC4',
                      borderRadius: 8,
                      fontSize: '0.9375rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5850' }}>
                    Password
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#8A8878' }}>
                    Min. 6 characters
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#8A8878', display: 'flex' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '0.7rem 2.6rem 0.7rem 2.6rem',
                      background: '#FFFFFF',
                      border: '1.5px solid #D0CEC4',
                      borderRadius: 8,
                      fontSize: '0.9375rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    style={{
                      position: 'absolute', right: '0.85rem', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', color: '#8A8878',
                      padding: 0, display: 'flex',
                    }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {role === 'helper' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '0.35rem' }}>
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        background: '#FFFFFF',
                        border: '1.5px solid #D0CEC4',
                        borderRadius: 8,
                        fontSize: '0.9375rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Select blood type</option>
                      {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#5A5850', marginBottom: '0.5rem' }}>
                      Specialist Response Qualifications
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {SKILLS_OPTIONS.map(skill => {
                        const active = skills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            style={{
                              padding: '0.35rem 0.8rem',
                              borderRadius: 99,
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.14s ease',
                              fontFamily: "'Plus Jakarta Sans', 'Geist', sans-serif",
                              background: active ? '#0D0C0A' : '#FFFFFF',
                              color: active ? '#F0EFE9' : '#5A5850',
                              border: active ? '1px solid #0D0C0A' : '1px solid #D0CEC4',
                              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                            }}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

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
                    Creating account…
                  </span>
                ) : (
                  <>
                    Complete Registration <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #F0EFE9', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: '#5A5850', margin: 0 }}>
                Already have an operator account?{' '}
                <Link
                  to="/login"
                  style={{
                    color: '#D93B2B',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Sign in →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}