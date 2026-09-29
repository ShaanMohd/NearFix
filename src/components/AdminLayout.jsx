import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  Settings, 
  LogOut, 
  Bell, 
  CheckCircle2, 
  Search,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import Avatar from './Avatar';
import { resolveAvatarUrl } from '../utils/avatar';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [adminProfile, setAdminProfile] = useState(() => {
    return JSON.parse(localStorage.getItem('adminProfile') || localStorage.getItem('userProfile') || '{}');
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && (data.user || data._id)) {
            const userObj = data.user || data;
            setAdminProfile(userObj);
            localStorage.setItem('adminProfile', JSON.stringify(userObj));
            localStorage.setItem('userProfile', JSON.stringify(userObj));
          }
        })
        .catch(() => {});
    }

    const handleStorageChange = () => {
      const updated = JSON.parse(localStorage.getItem('adminProfile') || localStorage.getItem('userProfile') || '{}');
      setAdminProfile(updated);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const adminName = adminProfile.name || 'Admin User';
  const adminEmail = adminProfile.email || 'admin@nearfix.com';
  const adminAvatar = resolveAvatarUrl(adminProfile.avatar, adminName);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('adminProfile');
    navigate('/');
  };

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/verification', icon: ShieldCheck, label: 'Worker Verification' },
    { path: '/admin/complaints', icon: AlertTriangle, label: 'Complaints' },
    { path: '/admin/workers', icon: Users, label: 'Workers' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' }
  ];

  const handleNav = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout-container">
      {/* Desktop Left Vertical Sidebar */}
      <aside className="sidebar glass-panel" style={{ width: '270px', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div className="logo-section" style={{ padding: '4px 12px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="heading-gradient" style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>NearFix</h2>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '4px' }}>
              Admin Panel
            </span>
          </div>
        </div>

        <nav className="desktop-nav" style={{ marginTop: '12px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <div 
                key={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '4px'
                }}
              >
                <Icon size={20} className="nav-icon" />
                <span className="nav-label" style={{ fontSize: '0.95rem' }}>{item.label}</span>
              </div>
            );
          })}

          <div style={{ flex: 1 }}></div>

          {/* Quick link to client application */}
          <div 
            onClick={() => navigate('/app')}
            className="nav-item"
            style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.85rem', 
              padding: '10px 14px', 
              borderRadius: '10px',
              border: '1px dashed var(--border-glass)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Switch to App</span>
            <ExternalLink size={14} />
          </div>

          {/* Log Out */}
          <div 
            className="nav-item" 
            style={{ 
              color: 'var(--error)', 
              marginTop: 'auto', 
              opacity: 0.95,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600'
            }} 
            onClick={handleLogout}
          >
            <LogOut size={20} className="nav-icon" />
            <span className="nav-label">Log Out</span>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header 
          style={{ 
            background: '#ffffff', 
            borderBottom: '1px solid var(--border-glass)', 
            padding: '12px 20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            minHeight: '64px',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 30,
            gap: '12px'
          }}
        >
          {/* Left: Mobile hamburger & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-header-menu-btn"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-glass)',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="heading-gradient" style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800' }}>NearFix</h2>
              <span style={{ fontSize: '0.68rem', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '2px 7px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                Admin
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-glass)', 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: 'var(--text-secondary)',
                  position: 'relative'
                }}
              >
                <Bell size={17} />
                <span style={{ position: 'absolute', top: '7px', right: '7px', width: '8px', height: '8px', background: 'var(--error)', borderRadius: '50%' }}></span>
              </button>

              {notificationsOpen && (
                <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '48px', width: '280px', padding: '14px', zIndex: 100, boxShadow: 'var(--shadow-lg)', background: '#ffffff', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Admin Alerts</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: '600' }}>3 New</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                    <div style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                      <strong>Rahul V.</strong> submitted KYC docs
                    </div>
                    <div style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                      New complaint ticket <strong>#CMP-1049</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Avatar */}
            <div 
              onClick={() => navigate('/admin/settings')} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 6px', borderRadius: '10px' }}
            >
              <Avatar 
                src={adminProfile.avatar} 
                name={adminName} 
                size={34} 
                style={{ border: '2px solid var(--accent-light)' }} 
              />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', display: 'none' }} className="desktop-header-actions">
                {adminName}
              </span>
            </div>

            {/* Logout icon */}
            <button 
              onClick={handleLogout} 
              title="Log Out"
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--error)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                padding: '6px',
                borderRadius: '8px'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Mobile Slide-down Drawer Menu for Admin */}
        {mobileMenuOpen && (
          <div 
            className="glass-panel"
            style={{ 
              position: 'fixed', 
              top: '64px', 
              left: 0, 
              right: 0, 
              background: '#ffffff', 
              borderBottom: '1px solid var(--border-glass)', 
              boxShadow: 'var(--shadow-lg)', 
              zIndex: 99, 
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              animation: 'slideUp 0.25s ease-out'
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <div
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: isActive ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontWeight: isActive ? '700' : '600',
                    fontSize: '0.92rem',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => handleNav('/app')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  background: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Switch to App <ExternalLink size={14} />
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #fee2e2',
                  background: '#fef2f2',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Main Admin Content */}
        <div className="content-scroll">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
