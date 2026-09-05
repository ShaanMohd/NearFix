import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Map, 
  CalendarCheck, 
  Bell, 
  User, 
  Briefcase, 
  Clock, 
  LogOut,
  ShieldCheck
} from 'lucide-react';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const role = localStorage.getItem('userRole') || 'customer';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userProfile');
    navigate('/');
  };

  const customerNavItems = [
    { path: '/app', icon: Home, label: 'Discover' },
    { path: '/app/map', icon: Map, label: 'Map View' },
    { path: '/app/bookings', icon: CalendarCheck, label: 'My Bookings' },
    { path: '/app/notifications', icon: Bell, label: 'Notifications' },
    { path: '/app/profile', icon: User, label: 'My Profile' }
  ];

  const workerNavItems = [
    { path: '/app/workerHome', icon: Home, label: 'Dashboard' },
    { path: '/app/worker/bookings', icon: CalendarCheck, label: 'Booking Requests' },
    { path: '/app/worker/schedule', icon: Clock, label: 'My Schedule' },
    { path: '/app/notifications', icon: Bell, label: 'Notifications' },
    { path: '/app/workerProfile', icon: Briefcase, label: 'My Profile' }
  ];

  const navItems = role === 'worker' ? workerNavItems : customerNavItems;

  return (
    <div className="layout-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar glass-panel" style={{ width: '260px', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div className="logo-section" style={{ padding: '8px 12px 24px 12px', cursor: 'pointer' }} onClick={() => navigate(role === 'worker' ? '/app/workerHome' : '/app')}>
          <h2 className="heading-gradient" style={{ margin: 0, fontSize: '1.7rem', fontWeight: '800' }}>NearFix</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {role === 'worker' ? 'Worker Console' : 'Hyperlocal Services'}
          </span>
        </div>

        <nav className="desktop-nav" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
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
                  cursor: 'pointer',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-light)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={20} className="nav-icon" />
                <span className="nav-label" style={{ fontSize: '0.95rem' }}>{item.label}</span>
              </div>
            );
          })}

          <div style={{ flex: 1 }}></div>

          <div 
            className="nav-item" 
            style={{ 
              color: '#ef4444', 
              marginTop: 'auto', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '14px', 
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
        {/* Dynamic Mobile Header */}
        <header className="mobile-header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
          <div>
            <h2 className="heading-gradient" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>NearFix</h2>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <LogOut size={22} />
          </button>
        </header>

        <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav glass-panel">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <div 
              key={item.path} 
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <Icon size={22} className="nav-icon" />
              <span className="nav-label" style={{ fontSize: '0.75rem' }}>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
