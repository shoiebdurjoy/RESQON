import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Zap } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const BLOOD_GROUPS   = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const SKILLS_OPTIONS = ['First Aid','CPR','Driving','Medical','Oxygen Delivery','Blood Donation'];

export default function Register() {
  const navigate = useNavigate();
  const [role,       setRole]       = useState('requester');
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [bloodGroup, setBloodGroup] = useState('');
  const [skills,     setSkills]     = useState([]);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);

  function toggleSkill(skill) {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { role, name: name.trim(), email: email.trim(), phone: phone.trim(), password };
      if (role === 'helper') { payload.blood_group = bloodGroup; payload.skills = skills; }
      await axios.post(`${API_URL}/auth/register`, payload);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0EFE9' }}>
      {/* Left panel — brand dark for editorial contrast */}
      <div className="hidden lg:flex slide-left" style={{ width: '42%', flexShrink: 0, flexDirection: 'column', justifyContent: 'space-between', background: '#0D0C0A', borderRight: '1px solid #1E1D1A', padding: '3rem 3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} style={{ color: '#D93B2B' }} strokeWidth={2.5} />
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#D93B2B' }}>EMERGON</span>
        </div>
        <div>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: 'clamp(2.5rem,4vw,3.5rem)', lineHeight: 1.05, letterSpacing: '-0.03em', color: '#F0EFE9', marginBottom: '1.5rem' }}>
            Join the<br />response<br /><span style={{ color: '#D93B2B' }}>network.</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { r:'Requester', desc:'Create emergency requests when you need urgent help.',  bg:'#EBF2FC', border:'#B4CFF0', text:'#1248A0' },
              { r:'Helper',    desc:'Respond to emergencies in your area and save lives.',   bg:'#EDF8F2', border:'#A8DCBC', text:'#15663E' },
            ].map(({ r, desc, bg, border, text }) => (
              <div key={r} style={{ background: '#141311', border: '1px solid #252320', borderRadius: 8, padding: '0.875rem 1rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: text === '#1248A0' ? '#60A5FA' : '#4ADE80', marginBottom: '0.2rem' }}>{r}</p>
                <p style={{ fontSize: '0.8125rem', color: '#4E4D49', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#353230' }}>CSE471 Assignment — BRAC University</p>
      </div>

      {/* Right — form (light) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2.5rem 1.5rem', overflowY: 'auto', background: '#F0EFE9' }}>
        <div className="slide-right" style={{ width: '100%', maxWidth: 440, paddingBottom: '2rem' }}>
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: '0.375rem', marginBottom: '2rem' }}>
            <Zap size={17} style={{ color: '#D93B2B' }} strokeWidth={2.5} />
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.0625rem', color: '#D93B2B' }}>EMERGON</span>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em', color: '#0D0C0A', marginBottom: '0.375rem', lineHeight: 1.1 }}>Create account</h1>
          <p style={{ fontSize: '0.875rem', color: '#8A8878', marginBottom: '2rem' }}>Join as a requester or register as a helper.</p>

          {error && (
            <div key={error} className="error-shake" style={{ background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, padding: '0.625rem 0.875rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#B02E20', fontWeight: 500 }}>{error}</div>
          )}

          {/* Role selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.5rem' }}>I am a</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {[['requester','Requester'],['helper','Helper']].map(([val, label]) => (
                <button key={val} type="button" onClick={() => setRole(val)}
                  style={{ padding: '0.75rem', borderRadius: 6, textAlign: 'center', cursor: 'pointer', fontFamily: "'Sora', sans-serif", fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.14s ease',
                    background: role === val ? '#0D0C0A' : '#FFFFFF', color: role === val ? '#F0EFE9' : '#5A5850',
                    border: role === val ? '1px solid #0D0C0A' : '1px solid #D0CEC4' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label:'Full name',     type:'text',  val:name,  set:setName,  ph:'Your full name',   ac:'name'  },
              { label:'Email address', type:'email', val:email, set:setEmail, ph:'you@example.com',  ac:'email' },
              { label:'Phone number',  type:'tel',   val:phone, set:setPhone, ph:'+880 1XXX-XXXXXX', ac:'tel'   },
            ].map(({ label, type, val, set, ph, ac }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.375rem' }}>{label}</label>
                <input type={type} className="input-field" value={val} onChange={e => set(e.target.value)} placeholder={ph} required autoComplete={ac} />
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.375rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} className="input-field" style={{ paddingRight: '2.75rem' }}
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8A8878', padding: 0, display: 'flex' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {role === 'helper' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.375rem' }}>Blood group</label>
                  <select className="input-field" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} required>
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', marginBottom: '0.5rem' }}>Skills</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {SKILLS_OPTIONS.map(skill => {
                      const active = skills.includes(skill);
                      return (
                        <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                          style={{ padding: '0.3rem 0.75rem', borderRadius: 99, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.14s ease', fontFamily: "'Sora', sans-serif",
                            background: active ? '#0D0C0A' : '#FFFFFF', color: active ? '#F0EFE9' : '#5A5850', border: active ? '1px solid #0D0C0A' : '1px solid #D0CEC4' }}>
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={loading} className="btn-ink"
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem', fontWeight: 700, marginTop: '0.25rem', justifyContent: 'center' }}>
              {loading
                ? <span style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem' }}>
                    <span style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite', display:'inline-block' }} />
                    Creating account…
                  </span>
                : 'Create account'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#8A8878', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#D93B2B', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}