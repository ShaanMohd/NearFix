import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, Clock, CheckCircle2, XCircle, 
  MapPin, Loader2, Zap, Phone, AlertOctagon, Calendar, X
} from 'lucide-react';
import CustomerLocationMap from '../components/CustomerLocationMap';
import Avatar from '../components/Avatar';
import { 
  getTodayLocalDateString, 
  getDefaultBookingTimeString, 
  isDateTimeInPast, 
  formatTime12h 
} from '../utils/bookingDateUtils';

export default function WorkerBookingsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [expandedMapId, setExpandedMapId] = useState(null);

  // Propose Alternative Modal State
  const [proposeModalJob, setProposeModalJob] = useState(null);
  const [altDate, setAltDate] = useState(getTodayLocalDateString());
  const [altTime, setAltTime] = useState(getDefaultBookingTimeString());
  const [altDuration, setAltDuration] = useState(60);
  const [altNote, setAltNote] = useState('');
  const [submittingAlt, setSubmittingAlt] = useState(false);
  const [altError, setAltError] = useState('');

  // Emergency Accept Modal State
  const [emergencyAcceptJob, setEmergencyAcceptJob] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState('20-30 mins');
  const [submittingArrival, setSubmittingArrival] = useState(false);
  const [arrivalError, setArrivalError] = useState('');

  // Live countdown timer ticker
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleUpdateStatus = async (id, status, extraBody = {}) => {
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, ...extraBody })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        fetchBookings();
        return { success: true };
      } else {
        alert(data.message || 'Failed to update status.');
        return { success: false, message: data.message };
      }
    } catch (err) {
      alert('Error: ' + err.message);
      return { success: false, message: err.message };
    }
  };

  // Submit Emergency Offer Acceptance with ETA
  const handleConfirmEmergencyAccept = async (e) => {
    e.preventDefault();
    if (!estimatedArrival.trim()) {
      setArrivalError('Please provide an estimated arrival time.');
      return;
    }

    setSubmittingArrival(true);
    setArrivalError('');
    const res = await handleUpdateStatus(emergencyAcceptJob._id, 'EmergencyAcceptedPendingCustomer', {
      estimatedArrivalTime: estimatedArrival.trim()
    });

    setSubmittingArrival(false);
    if (res.success) {
      setEmergencyAcceptJob(null);
      alert('✅ Emergency offer accepted! Customer has been notified with your arrival ETA.');
    } else {
      setArrivalError(res.message || 'Failed to accept emergency offer.');
    }
  };

  // Submit Alternative Time Proposal
  const handleConfirmAlternativeProposal = async (e) => {
    e.preventDefault();
    if (!altDate || !altTime) {
      setAltError('Please select both a date and time.');
      return;
    }
    if (isDateTimeInPast(altDate, altTime)) {
      setAltError('Proposed appointment time must be in the future.');
      return;
    }

    setSubmittingAlt(true);
    setAltError('');
    const res = await handleUpdateStatus(proposeModalJob._id, 'RescheduleProposed', {
      alternativeDate: altDate,
      alternativeTime: formatTime12h(altTime),
      alternativeDuration: Number(altDuration) || 60,
      workerNote: altNote.trim()
    });

    setSubmittingAlt(false);
    if (res.success) {
      setProposeModalJob(null);
      alert('📅 Alternative appointment time proposed to customer. Awaiting customer confirmation.');
    } else {
      setAltError(res.message || 'Failed to propose alternative time.');
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const emergencyCount = bookings.filter(b => b.isEmergency).length;
  const activeEmergencyCount = bookings.filter(b => b.isEmergency && (b.status === 'Pending' || b.status === 'EmergencyAcceptedPendingCustomer')).length;

  const filteredBookings = sortedBookings.filter(b => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Emergency') return b.isEmergency === true;
    if (filterStatus === 'Pending') {
      return b.status === 'Pending' || b.status === 'EmergencyAcceptedPendingCustomer' || b.status === 'RescheduleProposed';
    }
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
          {[
            { id: 'All', label: 'All' },
            { id: 'Emergency', label: 'Emergency 🚨', count: emergencyCount, badgeBg: activeEmergencyCount > 0 ? '#ef4444' : '#6b7280' },
            { id: 'Pending', label: 'Pending' },
            { id: 'Accepted', label: 'Accepted' },
            { id: 'Completed', label: 'Completed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterStatus === tab.id ? (tab.id === 'Emergency' ? '#ef4444' : 'var(--accent-primary)') : 'transparent',
                color: filterStatus === tab.id ? '#ffffff' : (tab.id === 'Emergency' && activeEmergencyCount > 0 ? '#ef4444' : 'var(--text-secondary)'),
                fontWeight: filterStatus === tab.id ? '700' : '600',
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
                  background: filterStatus === tab.id ? 'rgba(255,255,255,0.25)' : tab.badgeBg,
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
          {filteredBookings.map(b => {
            let isExpired = false;
            let secondsRemaining = 0;
            if (b.isEmergency) {
              if (b.status === 'Expired') {
                isExpired = true;
              } else if (b.expiresAt) {
                const diff = Math.floor((new Date(b.expiresAt).getTime() - currentTime) / 1000);
                if (diff <= 0) isExpired = true;
                else secondsRemaining = diff;
              }
            }
            const mins = Math.floor(secondsRemaining / 60);
            const secs = secondsRemaining % 60;

            return (
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
                    <Avatar 
                      src={b.customerId?.avatar} 
                      name={b.customerId?.name || 'Customer'} 
                      size={48} 
                    />
                    <div>
                      <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: '700' }}>
                        {b.serviceType}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Customer: <strong>{b.customerId?.name || 'Customer'}</strong> {b.customerId?.phone && `(📞 ${b.customerId.phone})`}
                      </p>
                      {renderLocationBadge(b)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {b.isEmergency && (
                      isExpired ? (
                        <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.75rem' }}>
                          ⏱️ OFFER EXPIRED
                        </span>
                      ) : (
                        <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          🚨 EMERGENCY (+₹150) • {mins}m {String(secs).padStart(2, '0')}s
                        </span>
                      )
                    )}

                    {b.status === 'EmergencyAcceptedPendingCustomer' && (
                      <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem' }}>
                        ETA Sent ({b.estimatedArrivalTime}) • Awaiting Customer
                      </span>
                    )}

                    {b.status === 'RescheduleProposed' && (
                      <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem' }}>
                        Alternative Proposed • Awaiting Customer
                      </span>
                    )}

                    {b.status === 'Accepted' && (
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem' }}>
                        Confirmed / Accepted
                      </span>
                    )}

                    {b.status === 'Completed' && (
                      <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.75rem' }}>
                        Completed
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '12px', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Schedule:</span>
                    <div style={{ fontWeight: '700', color: b.isEmergency ? '#ef4444' : 'var(--text-primary)', marginTop: '2px' }}>
                      {b.isEmergency ? 'Immediate (ASAP)' : `${b.date} • ${b.time} (${b.estimatedDuration || 60} mins)`}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Earnings / Fee:</span>
                    <div style={{ fontWeight: '800', color: 'var(--accent-primary)', marginTop: '2px', fontSize: '0.98rem' }}>
                      ₹{b.totalAmount || 500}
                      {b.isEmergency && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: '4px' }}>(incl. ₹150 Emergency)</span>}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Requested At:</span>
                    <div style={{ fontWeight: '600', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
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

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {b.status === 'Pending' && (
                      isExpired ? (
                        <span style={{ fontSize: '0.84rem', color: '#9ca3af', fontWeight: '600' }}>
                          Offer Expired
                        </span>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(b._id, 'Rejected')}
                            style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            Reject
                          </button>

                          {!b.isEmergency && (
                            <button 
                              onClick={() => {
                                setProposeModalJob(b);
                                setAltDate(getTodayLocalDateString());
                                setAltTime(getDefaultBookingTimeString());
                                setAltDuration(b.estimatedDuration || 60);
                                setAltNote('');
                                setAltError('');
                              }}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Calendar size={14} /> Propose Alternative Time
                            </button>
                          )}

                          <button 
                            onClick={() => {
                              if (b.isEmergency) {
                                setEmergencyAcceptJob(b);
                                setEstimatedArrival('20-30 mins');
                                setArrivalError('');
                              } else {
                                handleUpdateStatus(b._id, 'Accepted');
                              }
                            }}
                            className="btn-primary"
                            style={{ padding: '8px 20px', fontSize: '0.85rem', background: b.isEmergency ? '#ef4444' : 'var(--accent-primary)' }}
                          >
                            {b.isEmergency ? 'Accept Emergency Offer' : 'Accept Request'}
                          </button>
                        </>
                      )
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
            );
          })}
        </div>
      )}

      {/* MODAL: ACCEPT EMERGENCY OFFER (ETA) */}
      {emergencyAcceptJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '460px', borderRadius: '24px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setEmergencyAcceptJob(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', color: '#dc2626' }}>Accept Emergency Offer</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>Provide Estimated Arrival Time for {emergencyAcceptJob.customerId?.name}.</p>
            {arrivalError && <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>⚠️ {arrivalError}</div>}
            <form onSubmit={handleConfirmEmergencyAccept} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="text" value={estimatedArrival} onChange={e => setEstimatedArrival(e.target.value)} placeholder="e.g. 25 mins or 3:30 PM" className="input-field" style={{ width: '100%', borderRadius: '10px' }} required />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setEmergencyAcceptJob(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingArrival} className="btn-primary" style={{ padding: '10px 22px', background: '#dc2626' }}>{submittingArrival ? 'Sending...' : 'Confirm & Send ETA'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROPOSE ALTERNATIVE TIME */}
      {proposeModalJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setProposeModalJob(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0' }}>Propose Alternative Time</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>Suggest a new slot for {proposeModalJob.customerId?.name}.</p>
            {altError && <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.85rem' }}>⚠️ {altError}</div>}
            <form onSubmit={handleConfirmAlternativeProposal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.84rem', fontWeight: '700' }}>Date *</label>
                  <input type="date" min={getTodayLocalDateString()} value={altDate} onChange={e => setAltDate(e.target.value)} className="input-field" style={{ width: '100%', borderRadius: '10px' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.84rem', fontWeight: '700' }}>Time *</label>
                  <input type="time" value={altTime} onChange={e => setAltTime(e.target.value)} className="input-field" style={{ width: '100%', borderRadius: '10px' }} required />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: '700' }}>Duration (mins)</label>
                <input type="number" min={15} step={15} value={altDuration} onChange={e => setAltDuration(e.target.value)} className="input-field" style={{ width: '100%', borderRadius: '10px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: '700' }}>Note</label>
                <input type="text" value={altNote} onChange={e => setAltNote(e.target.value)} placeholder="e.g. Schedule adjustment" className="input-field" style={{ width: '100%', borderRadius: '10px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setProposeModalJob(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingAlt} className="btn-primary" style={{ padding: '10px 22px' }}>{submittingAlt ? 'Sending...' : 'Send Proposal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
