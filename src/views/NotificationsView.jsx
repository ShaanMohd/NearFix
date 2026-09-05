import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertOctagon, CheckCircle2, XCircle, Clock, Loader2, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationsView() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const role = localStorage.getItem('userRole') || 'customer';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--accent-primary)' }}>
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '20px' }}>
          <Bell size={48} color="var(--accent-primary)" style={{ opacity: 0.5, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '6px' }}>No Notifications Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            You will be alerted here when service updates or booking requests occur.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(n => (
            <div 
              key={n._id} 
              className="glass-panel" 
              onClick={() => {
                if (!n.isRead) handleMarkSingleRead(n._id);
                if (role === 'worker') navigate('/app/worker/bookings');
                else navigate('/app/bookings');
              }}
              style={{ 
                padding: '16px 20px', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: 'pointer',
                background: n.isRead ? '#ffffff' : (n.type === 'EMERGENCY_BOOKING_REQUEST' ? '#fff5f5' : 'var(--accent-light)'),
                borderLeft: n.type === 'EMERGENCY_BOOKING_REQUEST' ? '4px solid #ef4444' : (n.isRead ? '1px solid var(--border-glass)' : '4px solid var(--accent-primary)'),
                transition: 'transform 0.2s ease'
              }}
            >
              {getNotifIcon(n.type)}
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: n.isRead ? '500' : '700', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {n.message}
                </p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              {!n.isRead && (
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: n.type === 'EMERGENCY_BOOKING_REQUEST' ? '#ef4444' : 'var(--accent-primary)' }}></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
