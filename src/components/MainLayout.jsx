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
  LogIn,
  ShieldCheck
} from 'lucide-react';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem('token');
  const isLoggedIn = Boolean(token && token !== 'null' && token !== 'undefined');

  let storedProfile = {};
  try {
    storedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
  } catch (e) {
    storedProfile = {};
  }
  const role = storedProfile.role || localStorage.getItem('userRole') || 'customer';

  React.useEffect(() => {
    if (isLoggedIn && storedProfile.role && localStorage.getItem('userRole') !== storedProfile.role) {
      localStorage.setItem('userRole', storedProfile.role);
    }
  }, [isLoggedIn, storedProfile.role]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userProfile');
    navigate('/');
  };

  const handleNavClick = (path) => {
    if (!isLoggedIn && path !== '/app') {
      const redirectLogin = path.startsWith('/app/worker') ? '/login/worker' : '/login/customer';
      navigate(`${redirectLogin}?redirect=${encodeURIComponent(path)}`);
      return;
    }
    navigate(path);
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

  const [unreadNotifs, setUnreadNotifs] = React.useState(0);

  React.useEffect(() => {
    if (!token) return;
    const checkUnread = () => {
      fetch('http://localhost:5000/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.unreadCount === 'number') {
            setUnreadNotifs(data.unreadCount);
          }
        })
        .catch(() => {});
    };
    checkUnread();
    const interval = setInterval(checkUnread, 6000);
    return () => clearInterval(interval);
  }, [token]);

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
            const showBadge = item.label === 'Notifications' && unreadNotifs > 0;

            return (
              <div 
                key={item.path} 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
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
                {showBadge && (
                  <span style={{
                    marginLeft: 'auto',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.72rem',
                    fontWeight: '800',
                    padding: '1px 7px',
                    borderRadius: '10px',
                    lineHeight: '1.4'
                  }}>
                    {unreadNotifs}
                  </span>
                )}
              </div>
            );
          })}

          <div style={{ flex: 1 }}></div>

          {isLoggedIn ? (
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
          ) : (
            <div 
              className="nav-item" 
              style={{ 
                color: 'var(--accent-primary)', 
                marginTop: 'auto', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontWeight: '600',
                background: 'rgba(79, 70, 229, 0.06)'
              }} 
              onClick={() => navigate(location.pathname.startsWith('/app/worker') ? '/login/worker' : '/login/customer')}
            >
              <LogIn size={20} className="nav-icon" />
              <span className="nav-label">Sign In</span>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Dynamic Mobile Header */}
        <header className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="heading-gradient" style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>NearFix</h2>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', background: 'var(--accent-light)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '6px' }}>
              {role === 'worker' ? 'Worker' : 'Local'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isLoggedIn ? (
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }} title="Log Out">
                <LogOut size={20} />
              </button>
            ) : (
              <button onClick={() => navigate(location.pathname.startsWith('/app/worker') ? '/login/worker' : '/login/customer')} style={{ background: 'var(--accent-light)', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem' }} title="Sign In">
                <LogIn size={16} /> Sign In
              </button>
            )}
          </div>
        </header>

        <div className="content-scroll">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showBadge = item.label === 'Notifications' && unreadNotifs > 0;

          return (
            <div 
              key={item.path} 
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <Icon size={20} className="nav-icon" />
                {showBadge && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-6px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: '800',
                    width: '15px',
                    height: '15px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1
                  }}>
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </div>
              <span className="nav-label">{item.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
