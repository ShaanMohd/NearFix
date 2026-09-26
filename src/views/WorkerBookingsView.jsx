import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, Clock, CheckCircle2, XCircle, 
  MapPin, Loader2, Zap, Phone, AlertOctagon 
} from 'lucide-react';
import CustomerLocationMap from '../components/CustomerLocationMap';

export default function WorkerBookingsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [expandedMapId, setExpandedMapId] = useState(null);

  const toggleMap = (id) => {
    setExpandedMapId(prev => prev === id ? null : id);
  };

  const token = localStorage.getItem('token');

  const renderLocationBadge = (job) => {
    let coordsText = null;
    let googleMapsUrl = null;
    if (job.customerLocation?.coordinates && job.customerLocation.coordinates.length === 2) {
      const [lng, lat] = job.customerLocation.coordinates;
      coordsText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (job.serviceAddress || job.location) {
      const addr = job.serviceAddress || job.location;
      googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
      const m = addr.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
      if (m) coordsText = `${Number(m[1]).toFixed(4)}, ${Number(m[2]).toFixed(4)}`;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
        <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={14} color="var(--accent-primary)" /> {job.serviceAddress || job.location || 'Customer Address'}
        </span>
        {coordsText && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#059669',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            GPS: {coordsText} ↗
          </a>
        )}
      </div>
    );
  };

  const fetchBookings = () => {
    if (!token) return;
    fetch('http://localhost:5000/api/jobs?asWorker=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching worker bookings:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  const handleUpdateStatus = (id, status) => {
    fetch(`http://localhost:5000/api/jobs/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    })
      .then(res => res.json())
      .then(() => fetchBookings())
      .catch(err => console.error('Error updating status:', err));
  };

  const filteredBookings = bookings.filter(b => {
    if (filterStatus === 'All') return true;
    return b.status === filterStatus;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>Booking Requests</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Manage customer appointment requests and update service fulfillment status.
          </p>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#ffffff', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          {['All', 'Pending', 'Accepted', 'Completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterStatus === status ? 'var(--accent-primary)' : 'transparent',
                color: filterStatus === status ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: filterStatus === status ? '700' : '500',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--accent-primary)' }}>
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '20px', color: 'var(--text-secondary)' }}>
          <CalendarCheck size={44} style={{ opacity: 0.4, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>No Bookings Found</h3>
          <p style={{ fontSize: '0.9rem', margin: 0 }}>No booking requests match your selected status filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredBookings.map(b => (
            <div 
              key={b._id}
              className="glass-panel"
              style={{
                padding: 'clamp(16px, 3.5vw, 24px)',
                borderRadius: '18px',
                borderLeft: b.isEmergency ? '6px solid #ef4444' : (b.status === 'Completed' ? '4px solid #10b981' : b.status === 'Accepted' ? '4px solid var(--accent-primary)' : '4px solid #f59e0b'),
                background: b.isEmergency ? '#fff5f5' : '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={b.customerId?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100'} 
                    alt="" 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: '700' }}>
                      {b.serviceType}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Customer: <strong>{b.customerId?.name || 'Customer'}</strong></span>
                      <span>• <Phone size={12} style={{ display: 'inline' }} /> {b.customerId?.phone || 'N/A'}</span>
                    </span>
                    {renderLocationBadge(b)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {b.isEmergency && (
                    <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🚨 EMERGENCY
                    </span>
                  )}
                  <span style={{ background: b.status === 'Completed' ? 'rgba(16,185,129,0.1)' : b.status === 'Accepted' ? 'var(--accent-light)' : 'rgba(245,158,11,0.1)', color: b.status === 'Completed' ? '#10b981' : b.status === 'Accepted' ? 'var(--accent-primary)' : '#d97706', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>
                    {b.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', background: b.isEmergency ? '#ffffff' : 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>{b.location || 'Customer Address'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Schedule:</span>
                  <div style={{ fontWeight: '700', color: b.isEmergency ? '#ef4444' : 'var(--text-primary)', marginTop: '2px' }}>
                    {b.isEmergency ? 'ASAP' : `${b.date} • ${b.time}`}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Earnings / Fee:</span>
                  <div style={{ fontWeight: '800', color: 'var(--accent-primary)', marginTop: '2px', fontSize: '0.98rem' }}>
                    ₹{b.totalAmount || 500}
                    {b.isEmergency && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: '4px' }}>(incl. ₹150 Emergency)</span>}
                  </div>
                </div>
              </div>

              {b.description && (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  <strong>Description:</strong> "{b.description}"
                </p>
              )}

              {/* Customer Location & Map */}
              {expandedMapId === b._id && (
                <CustomerLocationMap 
                  customerLocation={b.customerLocation}
                  serviceAddress={b.serviceAddress || b.location}
                  customerName={b.customerId?.name || 'Customer'}
                />
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => toggleMap(b._id)}
                  style={{
                    background: expandedMapId === b._id ? 'var(--accent-primary)' : 'rgba(37,99,235,0.08)',
                    border: '1px solid var(--accent-primary)',
                    color: expandedMapId === b._id ? '#ffffff' : 'var(--accent-primary)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <MapPin size={15} /> {expandedMapId === b._id ? 'Hide Location Map' : 'View Location & Map'}
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {b.status === 'Pending' && (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(b._id, 'Rejected')}
                        style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(b._id, 'Accepted')}
                        className="btn-primary"
                        style={{ padding: '8px 20px', fontSize: '0.85rem', background: b.isEmergency ? '#ef4444' : 'var(--accent-primary)' }}
                      >
                        Accept Request
                      </button>
                    </>
                  )}

                  {b.status === 'Accepted' && (
                    <button 
                      onClick={() => handleUpdateStatus(b._id, 'Completed')}
                      className="btn-primary"
                      style={{ padding: '8px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CheckCircle2 size={16} /> Mark Service Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
