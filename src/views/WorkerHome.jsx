import React, { useState, useEffect } from 'react';
import { 
  MapPin, Clock, CheckCircle2, XCircle, Loader2, 
  Briefcase, Zap, ShieldCheck, AlertOctagon, Power, Calendar, User, DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerLocationMap from '../components/CustomerLocationMap';
import Avatar from '../components/Avatar';

export default function WorkerHome() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [expandedMapId, setExpandedMapId] = useState(null);

  const toggleMap = (id) => {
    setExpandedMapId(prev => prev === id ? null : id);
  };

  const currentUser = JSON.parse(localStorage.getItem('userProfile')) || {};
  const token = localStorage.getItem('token');

  const fetchJobsAndProfile = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Fetch Profile for availability
      const userRes = await fetch(`http://localhost:5000/api/users/profile/${currentUser.id || currentUser._id}`);
      const userData = await userRes.json();
      if (userData) {
        setIsAvailable(userData.isAvailable !== false);
      }

      // Fetch Bookings as Worker
      const jobsRes = await fetch('http://localhost:5000/api/jobs?asWorker=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const jobsData = await jobsRes.json();
      setRequests(Array.isArray(jobsData) ? jobsData : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndProfile();
  }, [token]);

  const handleToggleAvailability = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    try {
      await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailable: newStatus })
      });
    } catch (err) {
      console.error('Error toggling availability:', err);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchJobsAndProfile();
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

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

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const acceptedBookings = requests.filter(r => r.status === 'Accepted');
  const completedBookings = requests.filter(r => r.status === 'Completed');

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header & Availability Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>Worker Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Welcome back! Manage incoming booking requests and your service availability.
          </p>
        </div>

        <button
          onClick={handleToggleAvailability}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            border: isAvailable ? '1px solid #10b981' : '1px solid #ef4444',
            background: isAvailable ? '#ecfdf5' : '#fef2f2',
            color: isAvailable ? '#10b981' : '#ef4444',
            fontWeight: '700',
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          <Power size={18} /> {isAvailable ? 'Status: ONLINE (Accepting Jobs)' : 'Status: BUSY / OFFLINE'}
        </button>
      </div>

      {/* KYC Status Banner */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={22} color="var(--accent-primary)" />
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>KYC Verification Status:</span>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', marginLeft: '6px', color: currentUser.verificationStatus === 'Verified' ? 'var(--success)' : 'var(--warning)' }}>
              {currentUser.verificationStatus || 'Verified'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/app/workerProfile')}
          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
        >
          Manage Profile & KYC →
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Pending Requests</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: '#d97706' }}>{pendingRequests.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid var(--accent-primary)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Accepted Bookings</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: 'var(--accent-primary)' }}>{acceptedBookings.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', borderLeft: '4px solid #10b981' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Services Completed</span>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', marginTop: '4px', color: '#10b981' }}>{completedBookings.length}</div>
        </div>
      </div>

      {/* Pending Booking Requests Section */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Pending Requests ({pendingRequests.length})
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: 'var(--accent-primary)' }}>
            <Loader2 size={36} className="animate-spin" />
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '36px 20px', borderRadius: '16px', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No pending booking requests right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingRequests.map(req => (
              <div 
                key={req._id}
                className="glass-panel"
                style={{
                  padding: 'clamp(16px, 3.5vw, 24px)',
                  borderRadius: '18px',
                  borderLeft: req.isEmergency ? '6px solid #ef4444' : '4px solid #f59e0b',
                  background: req.isEmergency ? '#fff5f5' : '#ffffff',
                  boxShadow: req.isEmergency ? '0 4px 20px rgba(239,68,68,0.15)' : 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Request Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar 
                      src={req.customerId?.avatar} 
                      name={req.customerId?.name || 'Customer'} 
                      size={48} 
                    />
                    <div>
                      <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: '700' }}>
                        Customer: {req.customerId?.name || 'Customer'} {req.customerId?.phone && <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>• 📞 {req.customerId.phone}</span>}
                      </h3>
                      {renderLocationBadge(req)}
                    </div>
                  </div>

                  {req.isEmergency ? (
                    <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🚨 EMERGENCY REQUEST (ASAP)
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>
                      Normal Request
                    </span>
                  )}
                </div>

                {/* Details Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', background: req.isEmergency ? '#ffffff' : 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Service Category:</span>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{req.serviceType}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Preferred Schedule:</span>
                    <div style={{ fontWeight: '700', color: req.isEmergency ? '#ef4444' : 'var(--text-primary)', marginTop: '2px' }}>
                      {req.isEmergency ? 'ASAP (Immediate)' : `${req.date} • ${req.time}`}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Payout:</span>
                    <div style={{ fontWeight: '800', color: req.isEmergency ? '#ef4444' : 'var(--accent-primary)', marginTop: '2px', fontSize: '1rem' }}>
                      ₹{req.totalAmount || 500}
                      {req.isEmergency && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '4px' }}>(incl. ₹150 Emergency Fee)</span>}
                    </div>
                  </div>
                </div>

                {req.description && (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    <strong>Customer Notes:</strong> "{req.description}"
                  </p>
                )}

                {/* Customer Location & Map Feature */}
                {expandedMapId === req._id && (
                  <CustomerLocationMap 
                    customerLocation={req.customerLocation}
                    serviceAddress={req.serviceAddress || req.location}
                    customerName={req.customerId?.name || 'Customer'}
                  />
                )}

                {/* Accept / Reject & View Map Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => toggleMap(req._id)}
                    style={{
                      background: expandedMapId === req._id ? 'var(--accent-primary)' : 'rgba(37,99,235,0.08)',
                      border: '1px solid var(--accent-primary)',
                      color: expandedMapId === req._id ? '#ffffff' : 'var(--accent-primary)',
                      padding: '8px 16px',
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
                    <MapPin size={15} /> {expandedMapId === req._id ? 'Hide Location Map' : 'View Location & Map'}
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleUpdateStatus(req._id, 'Rejected')}
                      style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 18px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <XCircle size={16} /> Reject Request
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(req._id, 'Accepted')}
                      className="btn-primary"
                      style={{ 
                        padding: '8px 22px', 
                        fontSize: '0.88rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        background: req.isEmergency ? '#ef4444' : 'var(--accent-primary)' 
                      }}
                    >
                      <CheckCircle2 size={16} /> Accept Request
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Accepted Bookings Section */}
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '16px' }}>Accepted Bookings ({acceptedBookings.length})</h2>
        {acceptedBookings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active accepted bookings.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {acceptedBookings.map(b => (
              <div key={b._id} className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700' }}>{b.serviceType}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Customer: <strong>{b.customerId?.name}</strong> ({b.customerId?.phone || 'N/A'}) • {b.date} ({b.time})
                    </p>
                    {renderLocationBadge(b)}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => toggleMap(b._id)}
                      style={{
                        background: expandedMapId === b._id ? 'var(--accent-primary)' : 'rgba(37,99,235,0.08)',
                        border: '1px solid var(--accent-primary)',
                        color: expandedMapId === b._id ? '#ffffff' : 'var(--accent-primary)',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <MapPin size={14} /> {expandedMapId === b._id ? 'Hide Map' : 'View Map'}
                    </button>

                    <button 
                      onClick={() => handleUpdateStatus(b._id, 'Completed')}
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CheckCircle2 size={16} /> Mark Service Completed
                    </button>
                  </div>
                </div>

                {expandedMapId === b._id && (
                  <CustomerLocationMap 
                    customerLocation={b.customerLocation}
                    serviceAddress={b.serviceAddress || b.location}
                    customerName={b.customerId?.name || 'Customer'}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}