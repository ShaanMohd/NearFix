import React, { useState } from 'react';
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
  ExternalLink
} from 'lucide-react';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const adminProfile = JSON.parse(localStorage.getItem('adminProfile') || localStorage.getItem('userProfile') || '{}');
  const adminName = adminProfile.name || 'Admin User';
  const adminEmail = adminProfile.email || 'admin@nearfix.com';
  const adminAvatar = adminProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150';

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
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden' }}>
        {/* Top Header */}
        <header 
          style={{ 
            background: '#ffffff', 
            borderBottom: '1px solid var(--border-glass)', 
            padding: '16px 32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            minHeight: '70px',
            boxShadow: 'var(--shadow-sm)',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 className="heading-gradient" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>NearFix</h2>
            <div style={{ height: '20px', width: '1px', background: 'var(--border-glass)' }}></div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Safety & Verification Portal
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-glass)', 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: 'var(--text-secondary)',
                  position: 'relative'
                }}
              >
                <Bell size={18} />
                <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: 'var(--error)', borderRadius: '50%' }}></span>
              </button>

              {notificationsOpen && (
                <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '48px', width: '300px', padding: '16px', zIndex: 100, boxShadow: 'var(--shadow-lg)', background: '#ffffff', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Admin Alerts</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: '600' }}>3 New</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                      <strong>Rahul V.</strong> submitted KYC documents
                    </div>
                    <div style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                      New complaint ticket <strong>#CMP-1049</strong> received
                    </div>
                    <div style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                      <strong>Ananth K.</strong> submitted Plumber application
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Avatar and Name */}
            <div 
              onClick={() => navigate('/admin/settings')} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '10px', transition: 'background 0.2s' }}
            >
              <img 
                src={adminAvatar} 
                alt={adminName} 
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-light)' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>{adminName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Administrator</span>
              </div>
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
                padding: '8px',
                borderRadius: '8px'
              }}
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable Main Admin Content */}
        <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
