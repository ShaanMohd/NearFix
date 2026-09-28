import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertOctagon, CheckCircle2, XCircle, Clock, Loader2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationsView() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('All');

  const fetchNotifications = () => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching notifications:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = () => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(() => fetchNotifications())
      .catch(err => console.error('Error marking read:', err));
  };

  const handleMarkSingleRead = (id) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(() => fetchNotifications())
      .catch(err => console.error('Error marking read:', err));
  };

  const handleBookingAction = (e, bookingId, status) => {
    e.stopPropagation();
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/api/jobs/${bookingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    })
      .then(res => res.json())
      .then(() => {
        alert(`Booking ${status.toLowerCase()} successfully!`);
        fetchNotifications();
      })
      .catch(err => alert('Error updating booking: ' + err.message));
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'EMERGENCY_BOOKING_REQUEST':
        return <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><AlertOctagon size={20} /></div>;
      case 'BOOKING_ACCEPTED':
        return <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}><CheckCircle2 size={20} /></div>;
      case 'BOOKING_REJECTED':
        return <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><XCircle size={20} /></div>;
      case 'SERVICE_COMPLETED':
        return <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}><CheckCircle2 size={20} /></div>;
      default:
        return <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Calendar size={20} /></div>;
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const role = localStorage.getItem('userRole') || 'customer';

  // Strict reverse-chronological sorting (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const emergencyCount = notifications.filter(n => n.type && n.type.includes('EMERGENCY')).length;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = sortedNotifications.filter(n => {
    if (filterTab === 'All') return true;
    if (filterTab === 'Emergency') return n.type && n.type.includes('EMERGENCY');
    if (filterTab === 'Unread') return !n.isRead;
    return true;
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Stay updated with real-time service requests and booking progress.
          </p>
        </div>
        <button 
          onClick={handleMarkAllRead}
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
        >
          <CheckCheck size={16} /> Mark all as read
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#ffffff', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '20px' }}>
        {[
          { id: 'All', label: 'All', count: notifications.length },
          { id: 'Emergency', label: 'Emergency 🚨', count: emergencyCount, badgeBg: '#ef4444' },
          { id: 'Unread', label: 'Unread', count: unreadCount, badgeBg: 'var(--accent-primary)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: filterTab === tab.id ? (tab.id === 'Emergency' ? '#ef4444' : 'var(--accent-primary)') : 'transparent',
              color: filterTab === tab.id ? '#ffffff' : (tab.id === 'Emergency' && emergencyCount > 0 ? '#ef4444' : 'var(--text-secondary)'),
              fontWeight: filterTab === tab.id ? '700' : '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span style={{
                background: filterTab === tab.id ? 'rgba(255,255,255,0.25)' : (tab.badgeBg || '#6b7280'),
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: '800',
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--accent-primary)' }}>
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '20px' }}>
          <Bell size={48} color="var(--accent-primary)" style={{ opacity: 0.5, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '6px' }}>
            {filterTab === 'All' ? 'No Notifications Yet' : `No ${filterTab} Notifications`}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {filterTab === 'All' ? 'You will be alerted here when service updates or booking requests occur.' : `No notifications match the ${filterTab} filter.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredNotifications.map(n => {
            const isBookingNotif = (n.type === 'BOOKING_REQUEST' || n.type === 'EMERGENCY_BOOKING_REQUEST');
            const booking = n.bookingId;
            const isPendingWorkerBooking = role === 'worker' && isBookingNotif && booking && booking.status === 'Pending';

            return (
              <div 
                key={n._id} 
                className="glass-panel" 
                onClick={() => {
                  if (!n.isRead) handleMarkSingleRead(n._id);
                  if (role === 'worker') navigate('/app/worker/bookings');
                  else navigate('/app/bookings');
                }}
                style={{ 
                  padding: '18px 20px', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  cursor: 'pointer',
                  background: n.isRead ? '#ffffff' : (n.type === 'EMERGENCY_BOOKING_REQUEST' ? '#fff5f5' : 'var(--accent-light)'),
                  borderLeft: n.type === 'EMERGENCY_BOOKING_REQUEST' ? '4px solid #ef4444' : (n.isRead ? '1px solid var(--border-glass)' : '4px solid var(--accent-primary)'),
                  transition: 'transform 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {getNotifIcon(n.type)}
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: n.isRead ? '600' : '800', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} />
                      <span>{formatRelativeTime(n.createdAt)} • {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: n.type === 'EMERGENCY_BOOKING_REQUEST' ? '#ef4444' : 'var(--accent-primary)' }}></div>
                  )}
                </div>

                {/* If there's an attached booking with pending status for a worker */}
                {isPendingWorkerBooking && (
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        Service: {booking.serviceType} • {booking.date} ({booking.time})
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        📍 {booking.serviceAddress || booking.location || 'Customer Address'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={(e) => handleBookingAction(e, booking._id, 'Rejected')}
                        style={{
                          background: 'none',
                          border: '1px solid #ef4444',
                          color: '#ef4444',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleBookingAction(e, booking._id, 'Accepted')}
                        className="btn-primary"
                        style={{
                          padding: '6px 18px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          background: n.type === 'EMERGENCY_BOOKING_REQUEST' ? '#ef4444' : 'var(--accent-primary)'
                        }}
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
