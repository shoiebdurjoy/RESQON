import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, BarChart3, Bell, Bot, ChevronDown,
  LogOut, Menu, Plus, ShieldAlert, TrendingUp,
  User, Users, X, Zap
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { socket } from '../socket';
import ProfileModal from './ProfileModal';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const INTEL_ITEMS = [
  {
    to: '/analytics',
    label: 'Command Metrics',
    description: 'Dispatch KPIs, response latency & completion rate',
    icon: BarChart3,
    color: '#1854B4',
    bg: '#EBF2FC',
  },
  {
    to: '/risk',
    label: 'Risk Stratification',
    description: 'Automated triage priority & response queue',
    icon: ShieldAlert,
    color: '#C4780A',
    bg: '#FDF6E8',
  },
  {
    to: '/trends',
    label: 'Incident Trends',
    description: '30-day temporal demand & volume curves',
    icon: TrendingUp,
    color: '#1A7F4E',
    bg: '#EDF8F2',
  },
];

export default function AppNavbar() {
  const { user, token, logout, isHelper } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [helperOnline, setHelperOnline] = useState(false);
  const [toggling,     setToggling]     = useState(false);
  const [onlineCount,  setOnlineCount]  = useState(0);
  const [hasUnread,    setHasUnread]    = useState(false);

  // Dropdown menus
  const [intelOpen,        setIntelOpen]        = useState(false);
  const [profileOpen,      setProfileOpen]      = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const intelRef   = useRef(null);
  const profileRef = useRef(null);

  // Auto-close menus on route transition
  useEffect(() => {
    setIntelOpen(false);
    setProfileOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e) {
      if (intelRef.current && !intelRef.current.contains(e.target)) {
        setIntelOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch responder online status
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_URL}/helper/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setHelperOnline(r.data?.helper?.is_available ?? false))
      .catch(() => {});
  }, [token]);

  // Active units counter
  useEffect(() => {
    if (!token) return;
    function fetchCount() {
      axios.get(`${API_URL}/helper/available`)
        .then(r => setOnlineCount(r.data?.helpers?.length ?? 0))
        .catch(() => {});
    }
    fetchCount();
    socket.on('helper_availability_updated', fetchCount);
    return () => socket.off('helper_availability_updated', fetchCount);
  }, [token]);

  // Unread incident badge
  useEffect(() => {
    if (!token) return;
    function checkUnread() {
      const lastRead = localStorage.getItem('historyLastRead');
      axios.get(`${API_URL}/notification/history`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const items = r.data?.history || [];
          const hasNew = items.some(item => {
            const t = item.request?.created_at || item.request?.accepted_at;
            return t && (!lastRead || new Date(t) > new Date(lastRead));
          });
          setHasUnread(hasNew);
        })
        .catch(() => {});
    }
    checkUnread();
    socket.on('new_emergency_request',  checkUnread);
    socket.on('request_status_updated', checkUnread);
    window.addEventListener('historyRead', () => setHasUnread(false));
    return () => {
      socket.off('new_emergency_request',  checkUnread);
      socket.off('request_status_updated', checkUnread);
    };
  }, [token]);

  async function toggleAvailability() {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await axios.put(
        `${API_URL}/helper/toggle-availability`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHelperOnline(res.data?.is_available ?? !helperOnline);
    } catch {}
    finally { setToggling(false); }
  }

  if (!token) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isIntelActive = ['/analytics', '/risk', '/trends'].some(p => location.pathname.startsWith(p));
  const userInitials = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  const linkBase = {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
    padding: '0.35rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
    borderRadius: 6, textDecoration: 'none',
    transition: 'color 0.15s ease, background 0.15s ease',
    fontFamily: "'Sora', sans-serif",
    position: 'relative',
  };

  return (
    <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E2DA', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', height: 56, gap: '0.75rem' }}>

        {/* ── Brand Logo ────────────────────────────────────────────── */}
        <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FEF3F1', border: '1px solid #F5C4BE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} style={{ color: '#D93B2B' }} strokeWidth={2.5} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: '#0D0C0A' }}>
              RESQON
            </span>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8878' }} className="hidden sm:inline">
              OPS CENTER
            </span>
          </div>
        </NavLink>

        <div style={{ width: 1, height: 20, background: '#E4E2DA', margin: '0 0.25rem' }} className="hidden lg:block" />

        {/* ── Desktop Navigation ────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden lg:flex">
          {/* Operations */}
          <NavLink
            to="/dashboard"
            style={({ isActive }) => ({
              ...linkBase,
              color: isActive ? '#D93B2B' : '#5A5850',
              background: isActive ? '#FEF3F1' : 'transparent',
              fontWeight: isActive ? 600 : 500,
            })}
          >
            <Activity size={14} strokeWidth={2} />
            Operations
          </NavLink>

          {/* Incidents Archive */}
          <NavLink
            to="/notification/history"
            style={({ isActive }) => ({
              ...linkBase,
              color: isActive ? '#D93B2B' : '#5A5850',
              background: isActive ? '#FEF3F1' : 'transparent',
              fontWeight: isActive ? 600 : 500,
            })}
          >
            <Bell size={14} strokeWidth={2} />
            Incidents
            {hasUnread && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D93B2B', display: 'inline-block', marginLeft: 2 }} />
            )}
          </NavLink>

          {/* Intelligence Dropdown */}
          <div ref={intelRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIntelOpen(o => !o)}
              style={{
                ...linkBase,
                border: 'none',
                background: isIntelActive || intelOpen ? '#FEF3F1' : 'transparent',
                color: isIntelActive || intelOpen ? '#D93B2B' : '#5A5850',
                fontWeight: isIntelActive ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              <BarChart3 size={14} strokeWidth={2} />
              Intelligence
              <ChevronDown size={12} style={{ transition: 'transform 0.15s ease', transform: intelOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            {intelOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 280,
                background: '#FFFFFF', border: '1px solid #E4E2DA', borderRadius: 10,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                padding: '0.4rem', zIndex: 60,
              }}>
                <div style={{ padding: '0.35rem 0.6rem 0.45rem', borderBottom: '1px solid #F0EFE9' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878' }}>
                    Tactical Intelligence
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.3rem' }}>
                  {INTEL_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                          padding: '0.5rem 0.6rem', borderRadius: 6, textDecoration: 'none',
                          background: active ? '#FEF3F1' : 'transparent',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F7F6F1'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Icon size={14} style={{ color: item.color }} strokeWidth={2} />
                        </div>
                        <div>
                          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: active ? '#D93B2B' : '#0D0C0A', lineHeight: 1.2 }}>
                            {item.label}
                          </p>
                          <p style={{ fontSize: '0.6875rem', color: '#8A8878', marginTop: 2, lineHeight: 1.35 }}>
                            {item.description}
                          </p>
                        </div>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Triage */}
          <NavLink
            to="/ai"
            style={({ isActive }) => ({
              ...linkBase,
              color: isActive ? '#D93B2B' : '#5A5850',
              background: isActive ? '#FEF3F1' : 'transparent',
              fontWeight: isActive ? 600 : 500,
            })}
          >
            <Bot size={14} strokeWidth={2} />
            AI Assistant
          </NavLink>
        </div>

        {/* ── Right-Side Actions ────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginLeft: 'auto' }}>

          {/* Primary Action Button: Report Incident */}
          <NavLink
            to="/emergency/create"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.38rem 0.85rem', fontSize: '0.8125rem', fontWeight: 700,
              borderRadius: 6, textDecoration: 'none', color: '#FFFFFF',
              background: '#D93B2B', boxShadow: '0 1px 3px rgba(217,59,43,0.3)',
              fontFamily: "'Sora', sans-serif", transition: 'background 0.15s ease, transform 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#B02E20'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#D93B2B'; e.currentTarget.style.transform = ''; }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Report Incident</span>
          </NavLink>

          {/* Responder Duty Status Pill */}
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            title={helperOnline ? 'Click to go off-duty' : 'Click to go on-duty (available for emergency dispatch)'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.3rem 0.65rem', borderRadius: 99,
              fontSize: '0.75rem', fontWeight: 600, fontFamily: "'Sora', sans-serif",
              border: helperOnline ? '1px solid #A8DCBC' : '1px solid #D0CEC4',
              background: helperOnline ? '#EDF8F2' : '#F7F6F1',
              color: helperOnline ? '#15663E' : '#5A5850',
              cursor: toggling ? 'not-allowed' : 'pointer',
              transition: 'all 0.18s ease',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: helperOnline ? '#1A7F4E' : '#8A8878',
                display: 'inline-block',
                boxShadow: helperOnline ? '0 0 0 2px rgba(26,127,78,0.2)' : 'none',
              }}
            />
            {toggling ? 'Updating…' : helperOnline ? 'On Duty' : 'Off Duty'}
          </button>

          {/* Active Field Responders Counter */}
          <div
            title={`${onlineCount} active field responders currently on duty`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.75rem', fontWeight: 600,
              color: onlineCount > 0 ? '#15663E' : '#8A8878',
              background: onlineCount > 0 ? '#EDF8F2' : '#F7F6F1',
              border: `1px solid ${onlineCount > 0 ? '#A8DCBC' : '#D0CEC4'}`,
              borderRadius: 99, padding: '0.22rem 0.55rem',
              fontFamily: "'Sora', sans-serif", flexShrink: 0,
            }}
            className="hidden sm:inline-flex"
          >
            <Users size={12} strokeWidth={2.5} />
            {onlineCount} Active
          </div>

          {/* Consolidated Profile Dropdown */}
          <div ref={profileRef} style={{ position: 'relative' }} className="hidden sm:block">
            <button
              onClick={() => setProfileOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.45rem',
                padding: '0.22rem 0.45rem', borderRadius: 99,
                border: '1px solid #E4E2DA', background: profileOpen ? '#F7F6F1' : 'transparent',
                cursor: 'pointer', transition: 'background 0.15s ease',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: '#0D0C0A', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.75rem', fontFamily: "'Sora', sans-serif",
              }}>
                {userInitials}
              </div>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2E2D2A', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown size={12} style={{ color: '#8A8878', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {profileOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 230,
                background: '#FFFFFF', border: '1px solid #E4E2DA', borderRadius: 10,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                padding: '0.75rem', zIndex: 60,
              }}>
                <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #F0EFE9' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0D0C0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Operator'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#8A8878', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </p>
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                      borderRadius: 3, padding: '0.12rem 0.4rem',
                      background: isHelper ? '#EDF8F2' : '#EBF2FC',
                      color: isHelper ? '#15663E' : '#1854B4',
                      border: `1px solid ${isHelper ? '#A8DCBC' : '#B4CFF0'}`,
                    }}>
                      {isHelper ? 'Field Specialist' : 'Dispatcher'}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: helperOnline ? '#15663E' : '#8A8878', fontWeight: 500 }}>
                      {helperOnline ? '• On-call' : '• Off-call'}
                    </span>
                  </div>
                </div>

                <NavLink
                  to="/dashboard"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.5rem', fontSize: '0.8125rem', color: '#5A5850',
                    borderRadius: 6, textDecoration: 'none', fontFamily: "'Sora', sans-serif",
                    fontWeight: 500,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F7F6F1'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Activity size={13} /> Operations Console
                </NavLink>

                <button
                  onClick={() => { setProfileOpen(false); setProfileModalOpen(true); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.4rem 0.5rem', fontSize: '0.8125rem', color: '#5A5850',
                    borderRadius: 6, border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: "'Sora', sans-serif", fontWeight: 500,
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F7F6F1'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <User size={13} /> Qualifications & Profile
                </button>

                <div style={{ borderTop: '1px solid #F0EFE9', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.5rem', fontSize: '0.8125rem', color: '#D93B2B',
                      borderRadius: 6, border: 'none', background: 'transparent',
                      cursor: 'pointer', fontFamily: "'Sora', sans-serif", fontWeight: 600,
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FEF3F1'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="flex lg:hidden"
            style={{
              width: 34, height: 34, border: '1px solid #E4E2DA', borderRadius: 6,
              background: 'transparent', cursor: 'pointer', color: '#5A5850',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div style={{ background: '#FFFFFF', borderTop: '1px solid #E4E2DA', padding: '0.75rem 1.25rem 1.25rem' }}>

          {/* Mobile Duty Status Toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.625rem 0.875rem', marginBottom: '0.75rem',
            border: `1px solid ${helperOnline ? '#A8DCBC' : '#E4E2DA'}`,
            borderRadius: 8, background: helperOnline ? '#EDF8F2' : '#F7F6F1',
          }}>
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: helperOnline ? '#15663E' : '#2E2D2A', lineHeight: 1.2 }}>
                {helperOnline ? '🟢 On Duty — Ready for Dispatch' : '⚪ Off Duty'}
              </p>
              <p style={{ fontSize: '0.6875rem', color: '#8A8878', marginTop: 2 }}>
                {onlineCount} responder{onlineCount === 1 ? '' : 's'} active across network
              </p>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              style={{
                position: 'relative', width: 44, height: 24, borderRadius: 99,
                border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
                background: helperOnline ? '#1A7F4E' : '#D0CEC4',
                transition: 'background 0.2s ease', opacity: toggling ? 0.65 : 1,
                flexShrink: 0, padding: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: helperOnline ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#FFFFFF',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                display: 'block',
              }} />
            </button>
          </div>

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <NavLink
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.6rem 0.75rem', borderRadius: 6, textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600,
                color: isActive ? '#D93B2B' : '#2E2D2A',
                background: isActive ? '#FEF3F1' : 'transparent',
              })}
            >
              <Activity size={16} /> Operations Console
            </NavLink>

            <NavLink
              to="/notification/history"
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.6rem 0.75rem', borderRadius: 6, textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600,
                color: isActive ? '#D93B2B' : '#2E2D2A',
                background: isActive ? '#FEF3F1' : 'transparent',
              })}
            >
              <Bell size={16} /> Incident History
              {hasUnread && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D93B2B', display: 'inline-block', marginLeft: 4 }} />
              )}
            </NavLink>

            {/* Sub-group: Tactical Intelligence */}
            <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #F0EFE9' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8878', padding: '0.2rem 0.75rem' }}>
                Intelligence & Analytics
              </p>
              {INTEL_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.55rem 0.75rem', borderRadius: 6, textDecoration: 'none',
                    fontSize: '0.8125rem', fontWeight: 500,
                    color: isActive ? '#D93B2B' : '#5A5850',
                    background: isActive ? '#FEF3F1' : 'transparent',
                  })}
                >
                  <Icon size={15} /> {label}
                </NavLink>
              ))}
            </div>

            <NavLink
              to="/ai"
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.6rem 0.75rem', borderRadius: 6, textDecoration: 'none',
                fontSize: '0.875rem', fontWeight: 600,
                color: isActive ? '#D93B2B' : '#2E2D2A',
                background: isActive ? '#FEF3F1' : 'transparent',
              })}
            >
              <Bot size={16} /> AI Emergency Assistant
            </NavLink>

            <button
              onClick={() => { setMobileOpen(false); setProfileModalOpen(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.6rem 0.75rem', borderRadius: 6,
                fontSize: '0.875rem', fontWeight: 600,
                color: '#2E2D2A', background: 'transparent', border: 'none',
                cursor: 'pointer', width: '100%', textAlign: 'left',
                fontFamily: "'Sora', sans-serif",
              }}
            >
              <User size={16} /> Responder Qualifications & Profile
            </button>
          </div>

          {/* User Signout Footer */}
          <div style={{ borderTop: '1px solid #E4E2DA', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0D0C0A' }}>{user?.name || user?.email}</p>
              <p style={{ fontSize: '0.6875rem', color: '#8A8878' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
                color: '#B02E20', background: '#FEF3F1', border: '1px solid #F5C4BE',
                borderRadius: 6, cursor: 'pointer', fontFamily: "'Sora', sans-serif",
              }}
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      )}

      {/* Responder Qualifications & Profile Modal */}
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </nav>
  );
}