import { useContext, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, BarChart3, Bell, Bot, LogOut,
  Menu, Plus, ShieldAlert, TrendingUp, Users, X, Zap,
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { socket } from '../socket';

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const NAV_ITEMS_ALL = [
  { to: '/dashboard',            label: 'Dashboard',  icon: Activity,    role: 'any'       },
  { to: '/emergency/create',     label: 'New Request', icon: Plus,        role: 'requester' },
  { to: '/notification/history', label: 'History',     icon: Bell,        role: 'any'       },
  { to: '/analytics',            label: 'Analytics',  icon: BarChart3,   role: 'any'       },
  { to: '/risk',                 label: 'Risk',        icon: ShieldAlert, role: 'any'       },
  { to: '/trends',               label: 'Trends',      icon: TrendingUp,  role: 'any'       },
  { to: '/ai',                   label: 'AI',          icon: Bot,         role: 'any'       },
];

export default function AppNavbar() {
  const { user, token, logout, isHelper } = useContext(AuthContext);
  const navigate = useNavigate();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [helperOnline,  setHelperOnline]  = useState(false);
  const [toggling,      setToggling]      = useState(false);
  const [onlineCount,   setOnlineCount]   = useState(0);
  const [hasUnread,     setHasUnread]     = useState(false);

  useEffect(() => {
    if (!token || !isHelper) return;
    axios.get(`${API_URL}/helper/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setHelperOnline(r.data?.helper?.is_available ?? false))
      .catch(() => {});
  }, [token, isHelper]);

  // Online helpers count
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

  // Unread history badge
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
    socket.on('new_emergency_request',    checkUnread);
    socket.on('request_status_updated',   checkUnread);
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

  const role = isHelper ? 'Helper' : 'Requester';
  const roleStyle = isHelper
    ? { background: '#EDF8F2', color: '#15663E', border: '1px solid #A8DCBC' }
    : { background: '#EBF2FC', color: '#1248A0', border: '1px solid #B4CFF0' };

  const NAV_ITEMS = NAV_ITEMS_ALL.filter(
    item => item.role === 'any' || (item.role === 'requester' && !isHelper) || (item.role === 'helper' && isHelper)
  );

  function handleLogout() { logout(); navigate('/login'); }

  const linkBase = {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.3rem 0.7rem', fontSize: '0.8125rem', fontWeight: 500,
    borderRadius: 6, textDecoration: 'none',
    transition: 'color 0.15s ease, background 0.15s ease, transform 0.15s ease',
    fontFamily: "'Sora', sans-serif",
    position: 'relative',
  };

  return (
    <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #E4E2DA', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 56, gap: '0.5rem' }}>

        {/* Brand */}
        <NavLink to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', marginRight: '1.5rem', flexShrink: 0 }}>
          <Zap size={17} style={{ color: '#D93B2B' }} strokeWidth={2.5} />
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.02em', color: '#D93B2B' }}>
            EMERGON
          </span>
        </NavLink>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', flex: 1 }} className="hidden lg:flex">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                ...linkBase,
                color: isActive ? '#D93B2B' : '#5A5850',
                background: isActive ? '#FEF3F1' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              })}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
              {to === '/notification/history' && hasUnread && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D93B2B', display: 'inline-block', marginLeft: 2, flexShrink: 0 }} />
              )}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginLeft: 'auto' }}>

          {/* Helper availability toggle */}
          {isHelper && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: helperOnline ? '#15663E' : '#8A8878', fontFamily: "'Sora', sans-serif", letterSpacing: '0.02em' }}>
                {helperOnline ? 'Online' : 'Offline'}
              </span>
              <button
                onClick={toggleAvailability}
                disabled={toggling}
                title={helperOnline ? 'Go offline' : 'Go online'}
                style={{
                  position: 'relative', width: 40, height: 22, borderRadius: 99,
                  border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
                  background: helperOnline ? '#1A7F4E' : '#D0CEC4',
                  transition: 'background 0.2s ease',
                  opacity: toggling ? 0.65 : 1,
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3,
                  left: helperOnline ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#FFFFFF',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  display: 'block',
                }} />
              </button>
            </div>
          )}

          {/* Online helpers counter */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: onlineCount > 0 ? '#15663E' : '#8A8878', background: onlineCount > 0 ? '#EDF8F2' : '#F7F6F1', border: `1px solid ${onlineCount > 0 ? '#A8DCBC' : '#D0CEC4'}`, borderRadius: 99, padding: '0.2rem 0.6rem', fontFamily: "'Sora', sans-serif", flexShrink: 0 }}>
            <Users size={11} strokeWidth={2.5} />
            {onlineCount} online
          </div>

          <span style={{ ...roleStyle, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', borderRadius: 3, padding: '0.18rem 0.5rem', fontFamily: "'Sora', sans-serif" }}>
            {role}
          </span>

          <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#5A5850', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || user?.email}
            </span>
            <button onClick={handleLogout}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, color: '#5A5850', background: 'transparent', border: '1px solid #E4E2DA', borderRadius: 6, cursor: 'pointer', fontFamily: "'Sora', sans-serif", transition: 'all 0.14s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF3F1'; e.currentTarget.style.color = '#D93B2B'; e.currentTarget.style.borderColor = '#F5C4BE'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5A5850'; e.currentTarget.style.borderColor = '#E4E2DA'; }}
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>

          <button onClick={() => setMobileOpen(o => !o)} className="flex lg:hidden"
            style={{ width: 34, height: 34, border: '1px solid #E4E2DA', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: '#5A5850', alignItems: 'center', justifyContent: 'center' }}>
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="drawer-open" style={{ background: '#FFFFFF', borderTop: '1px solid #E4E2DA', padding: '0.5rem 1.5rem 1rem' }}>
          {/* Mobile availability toggle */}
          {isHelper && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', marginBottom: '0.25rem', border: `1px solid ${helperOnline ? '#A8DCBC' : '#E4E2DA'}`, borderRadius: 6, background: helperOnline ? '#EDF8F2' : '#F7F6F1' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: helperOnline ? '#15663E' : '#5A5850', fontFamily: "'Sora', sans-serif" }}>
                {helperOnline ? 'Online — tap to go offline' : 'Offline — tap to go online'}
              </span>
              <button onClick={toggleAvailability} disabled={toggling}
                style={{ position: 'relative', width: 44, height: 24, borderRadius: 99, border: 'none', cursor: toggling ? 'not-allowed' : 'pointer', background: helperOnline ? '#1A7F4E' : '#D0CEC4', transition: 'background 0.2s ease', opacity: toggling ? 0.65 : 1, flexShrink: 0, padding: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: helperOnline ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', display: 'block' }} />
              </button>
            </div>
          )}
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.55rem 0.75rem', marginBottom: '0.1rem',
                fontSize: '0.875rem', fontWeight: 500, borderRadius: 6,
                color: isActive ? '#D93B2B' : '#2E2D2A',
                background: isActive ? '#FEF3F1' : 'transparent',
                textDecoration: 'none', fontFamily: "'Sora', sans-serif",
              })}
            >
              <Icon size={15} /> {label}
            </NavLink>
          ))}
          <div style={{ borderTop: '1px solid #E4E2DA', marginTop: '0.625rem', paddingTop: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8125rem', color: '#5A5850', fontFamily: "'Sora', sans-serif" }}>{user?.name}</span>
            <button onClick={handleLogout}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, color: '#B02E20', background: '#FEF3F1', border: '1px solid #F5C4BE', borderRadius: 6, cursor: 'pointer', fontFamily: "'Sora', sans-serif" }}>
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}