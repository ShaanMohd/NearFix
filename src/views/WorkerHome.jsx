import React, { useState, useEffect } from 'react';
import { 
  MapPin, Clock, CheckCircle2, XCircle, Loader2, 
  Briefcase, Zap, ShieldCheck, AlertOctagon, Power, Calendar, User, DollarSign,
  X, AlertTriangle, ArrowRight, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomerLocationMap from '../components/CustomerLocationMap';
import Avatar from '../components/Avatar';
import { 
  getTodayLocalDateString, 
  getCurrentLocalTimeString, 
  getDefaultBookingTimeString, 
  getWorkerAvailability, 
  isDateTimeInPast, 
  combineLocalDateAndTimeToDate, 
  formatTime12h, 
  formatDateReadable 
} from '../utils/bookingDateUtils';

export default function WorkerHome() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailableUntil, setUnavailableUntil] = useState(null);
  const [expandedMapId, setExpandedMapId] = useState(null);

  // Availability / Busy Modal State
  const [showBusyModal, setShowBusyModal] = useState(false);
  const [busyDate, setBusyDate] = useState(getTodayLocalDateString());
  const [busyTime, setBusyTime] = useState(getDefaultBookingTimeString());
  const [busyError, setBusyError] = useState('');
  const [savingAvailability, setSavingAvailability] = useState(false);

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

  // Live countdown ticker state (updates every second for emergency timers)
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        setUnavailableUntil(userData.unavailableUntil || null);
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

  const [openOffers, setOpenOffers] = useState([]);

  const fetchOpenEmergencyOffers = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/jobs/emergency/open', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOpenOffers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching open emergency offers:', e);
    }
  };

  useEffect(() => {
    fetchJobsAndProfile();
    fetchOpenEmergencyOffers();
    const interval = setInterval(fetchOpenEmergencyOffers, 4000);
    return () => clearInterval(interval);
  }, [token]);

  // Click on Availability Toggle
  const handleAvailabilityToggleClick = async () => {
    if (isAvailable) {
      // Switching to Busy: open modal to ask "Unavailable until"
      setBusyDate(getTodayLocalDateString());
      setBusyTime(getDefaultBookingTimeString());
      setBusyError('');
      setShowBusyModal(true);
    } else {
      // Switching back to Available: directly resume
      try {
        setSavingAvailability(true);
        const res = await fetch('http://localhost:5000/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isAvailable: true, unavailableUntil: null })
        });
        if (res.ok) {
          setIsAvailable(true);
          setUnavailableUntil(null);
        }
      } catch (err) {
        console.error('Error resuming availability:', err);
      } finally {
        setSavingAvailability(false);
      }
    }
  };

  // Quick preset buttons for busy duration
  const applyBusyPresetHours = (hoursToAdd) => {
    const target = new Date();
    target.setMinutes(target.getMinutes() + hoursToAdd * 60);
    const yr = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const da = String(target.getDate()).padStart(2, '0');
    const hr = String(target.getHours()).padStart(2, '0');
    const mi = String(target.getMinutes()).padStart(2, '0');
    setBusyDate(`${yr}-${mo}-${da}`);
    setBusyTime(`${hr}:${mi}`);
    setBusyError('');
  };

  const applyBusyTomorrowMorning = () => {
    const target = new Date();
    target.setDate(target.getDate() + 1);
    const yr = target.getFullYear();
    const mo = String(target.getMonth() + 1).padStart(2, '0');
    const da = String(target.getDate()).padStart(2, '0');
    setBusyDate(`${yr}-${mo}-${da}`);
    setBusyTime('09:00');
    setBusyError('');
  };

  // Submit Busy modal
  const handleSaveBusyStatus = async (e) => {
    e.preventDefault();
    setBusyError('');
    if (!busyDate || !busyTime) {
      setBusyError('Please select a valid date and time.');
      return;
    }

    if (isDateTimeInPast(busyDate, busyTime)) {
      setBusyError('Unavailable until date and time must be in the future.');
      return;
    }

    const dt = combineLocalDateAndTimeToDate(busyDate, busyTime);
    try {
      setSavingAvailability(true);
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isAvailable: false,
          unavailableUntil: dt.toISOString()
        })
      });

      if (res.ok) {
        setIsAvailable(false);
        setUnavailableUntil(dt.toISOString());
        setShowBusyModal(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setBusyError(data.message || 'Failed to update availability.');
      }
    } catch (err) {
      setBusyError('Error updating availability: ' + err.message);
    } finally {
      setSavingAvailability(false);
    }
  };

  // General update status helper
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
        fetchJobsAndProfile();
        return { success: true };
      } else {
        alert(data.message || 'Failed to update booking status.');
        return { success: false, message: data.message };
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
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

    if (emergencyAcceptJob.status === 'Open' || emergencyAcceptJob.isPublicOffer) {
      try {
        const res = await fetch(`http://localhost:5000/api/jobs/${emergencyAcceptJob._id}/emergency-claim`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ estimatedArrivalTime: estimatedArrival.trim() })
        });
        const data = await res.json();
        setSubmittingArrival(false);
        if (res.ok) {
          setEmergencyAcceptJob(null);
          alert('✅ Emergency offer claimed successfully! The customer has been notified with your arrival ETA.');
          fetchJobsAndProfile();
          fetchOpenEmergencyOffers();
        } else {
          setArrivalError(data.message || 'Failed to claim emergency offer.');
          fetchOpenEmergencyOffers();
        }
      } catch (err) {
        setSubmittingArrival(false);
        setArrivalError('Network error: ' + err.message);
      }
    } else {
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

  const sortedRequests = [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const pendingRequests = sortedRequests.filter(r => r.status === 'Pending' || r.status === 'EmergencyAcceptedPendingCustomer' || r.status === 'RescheduleProposed');
  const acceptedBookings = sortedRequests.filter(r => r.status === 'Accepted');
  const completedBookings = sortedRequests.filter(r => r.status === 'Completed');

  // Compute dynamic worker availability
  const currentWorkerObj = { isAvailable, unavailableUntil };
  const avail = getWorkerAvailability(currentWorkerObj);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header & Availability Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>Worker Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Welcome back! Manage incoming booking requests and your service availability.
          </p>
        </div>

        <button
          onClick={handleAvailabilityToggleClick}
          disabled={savingAvailability}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '14px',
            border: avail.isAvailable ? '2px solid #10b981' : '2px solid #d97706',
            background: avail.isAvailable ? '#ecfdf5' : '#fffbeb',
            color: avail.isAvailable ? '#059669' : '#b45309',
            fontWeight: '700',
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
          title={avail.isAvailable ? 'Click to set status to Busy' : 'Click to resume Availability'}
        >
          <Power size={18} /> 
          <span>
            {avail.isAvailable ? 'Status: Available Now' : `Status: ${avail.statusText}`}
          </span>
          <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '4px' }}>
            ({avail.isAvailable ? 'Click to change' : 'Click to resume'})
          </span>
        </button>
      </div>

      {/* KYC Status Banner */}
      <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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

      {/* Available Public Emergency Offers Section */}
      {openOffers.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: '#dc2626' }}>
              Available Emergency Offers ({openOffers.length})
            </h2>
            <span style={{ fontSize: '0.8rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>
              High Priority • First Come First Served
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {openOffers.map(offer => {
              const mins = Math.floor((offer.secondsRemaining || 0) / 60);
              const secs = (offer.secondsRemaining || 0) % 60;

              return (
                <div 
                  key={offer._id}
                  className="glass-panel"
                  style={{
                    padding: '20px 24px',
                    borderRadius: '18px',
                    borderLeft: '6px solid #ef4444',
                    background: '#fff5f5',
                    boxShadow: '0 4px 20px rgba(239,68,68,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '6px' }}>
                        🚨 {offer.serviceType} Emergency
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '800' }}>
                        "{offer.description}"
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span>📍 {offer.serviceArea}</span>
                        <span>•</span>
                        <strong style={{ color: '#059669' }}>🧭 ~{offer.distanceKm} km away</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                        ₹{offer.totalAmount}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700' }}>
                        (incl. ₹150 Emergency Surcharge)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid rgba(239,68,68,0.15)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} /> Time Remaining: {mins}m {String(secs).padStart(2, '0')}s
                    </span>

                    <button
                      onClick={() => {
                        setEmergencyAcceptJob({ ...offer, isPublicOffer: true });
                        setEstimatedArrival('15-20 mins');
                        setArrivalError('');
                      }}
                      className="btn-primary"
                      style={{
                        background: '#ef4444',
                        padding: '8px 22px',
                        fontSize: '0.88rem',
                        fontWeight: '800',
                        borderRadius: '10px',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.3)'
                      }}
                    >
                      Accept Offer & Enter ETA →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            {pendingRequests.map(req => {
              // Calculate expiration countdown for emergency
              let isExpired = false;
              let secondsRemaining = 0;
              if (req.isEmergency) {
                if (req.status === 'Expired') {
                  isExpired = true;
                } else if (req.expiresAt) {
                  const diff = Math.floor((new Date(req.expiresAt).getTime() - currentTime) / 1000);
                  if (diff <= 0) {
                    isExpired = true;
                  } else {
                    secondsRemaining = diff;
                  }
                }
              }

              const mins = Math.floor(secondsRemaining / 60);
              const secs = secondsRemaining % 60;

              return (
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {req.isEmergency ? (
                        isExpired ? (
                          <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '6px 12px', borderRadius: '10px', fontWeight: '800', fontSize: '0.8rem' }}>
                            ⏱️ EMERGENCY OFFER EXPIRED
                          </span>
                        ) : (
                          <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '10px', fontWeight: '800', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🚨 EMERGENCY OFFER (+₹150) • Expires in {mins}m {String(secs).padStart(2, '0')}s
                          </span>
                        )
                      ) : (
                        <span style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>
                          Normal Booking Request
                        </span>
                      )}

                      {req.status === 'RescheduleProposed' && (
                        <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>
                          Awaiting Customer Approval
                        </span>
                      )}

                      {req.status === 'EmergencyAcceptedPendingCustomer' && (
                        <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>
                          ETA Sent: {req.estimatedArrivalTime} (Awaiting Customer Confirmation)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Breakdown */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', background: req.isEmergency ? '#ffffff' : 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.88rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Service Category:</span>
                      <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>{req.serviceType}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Schedule / Duration:</span>
                      <div style={{ fontWeight: '700', color: req.isEmergency ? '#ef4444' : 'var(--text-primary)', marginTop: '2px' }}>
                        {req.isEmergency ? 'Immediate Dispatch (ASAP)' : `${req.date} • ${req.time} (${req.estimatedDuration || 60} mins)`}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Estimated Payout:</span>
                      <div style={{ fontWeight: '800', color: req.isEmergency ? '#ef4444' : 'var(--accent-primary)', marginTop: '2px', fontSize: '1rem' }}>
                        ₹{req.totalAmount || 500}
                        {req.isEmergency && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '4px' }}>(incl. ₹150 Emergency Surcharge)</span>}
                      </div>
                    </div>
                  </div>

                  {req.description && (
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <strong>Customer Notes:</strong> "{req.description}"
                    </p>
                  )}

                  {req.proposedAlternative && req.status === 'RescheduleProposed' && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', color: '#166534' }}>
                      <strong>Your Proposed Alternative:</strong> {req.proposedAlternative.date} at {req.proposedAlternative.time} ({req.proposedAlternative.estimatedDuration || 60} mins)
                      {req.proposedAlternative.note && <span> • "{req.proposedAlternative.note}"</span>}
                    </div>
                  )}

                  {/* Customer Location & Map Feature */}
                  {expandedMapId === req._id && (
                    <CustomerLocationMap 
                      customerLocation={req.customerLocation}
                      serviceAddress={req.serviceAddress || req.location}
                      customerName={req.customerId?.name || 'Customer'}
                      workerLocation={req.workerId?.location || req.workerId?.currentLocation}
                    />
                  )}

                  {/* Action Buttons */}
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

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {/* If emergency expired, disable actions */}
                      {req.isEmergency && isExpired ? (
                        <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: '600', padding: '8px 14px' }}>
                          Offer expired after 5 minutes
                        </span>
                      ) : req.status === 'Pending' ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(req._id, 'Rejected')}
                            style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 16px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <XCircle size={16} /> Reject
                          </button>

                          {!req.isEmergency && (
                            <button 
                              onClick={() => {
                                setProposeModalJob(req);
                                setAltDate(getTodayLocalDateString());
                                setAltTime(getDefaultBookingTimeString());
                                setAltDuration(req.estimatedDuration || 60);
                                setAltNote('');
                                setAltError('');
                              }}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155', padding: '8px 16px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Calendar size={15} /> Propose Alternative Time
                            </button>
                          )}

                          <button 
                            onClick={() => {
                              if (req.isEmergency) {
                                setEmergencyAcceptJob(req);
                                setEstimatedArrival('20-30 mins');
                                setArrivalError('');
                              } else {
                                handleUpdateStatus(req._id, 'Accepted');
                              }
                            }}
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
                            <CheckCircle2 size={16} /> {req.isEmergency ? 'Accept Emergency Offer' : 'Accept Request'}
                          </button>
                        </>
                      ) : req.status === 'EmergencyAcceptedPendingCustomer' ? (
                        <span style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: '700', padding: '6px 12px' }}>
                          Awaiting customer dispatch confirmation...
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Pending Customer Action
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
              <div key={b._id} className="glass-panel" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: b.isEmergency ? '4px solid #ef4444' : '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar src={b.customerId?.avatar} name={b.customerId?.name} size={38} />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>{b.serviceType}</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Customer: <strong>{b.customerId?.name}</strong> {b.customerId?.phone && `(📞 ${b.customerId.phone})`}
                      </p>
                    </div>
                  </div>
                  <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}>
                    {b.isEmergency ? `🚨 Emergency ETA: ${b.estimatedArrivalTime || 'Immediate'}` : `📅 ${b.date} • ${b.time}`}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} /> {b.serviceAddress || b.location}
                </div>

                {b.isEmergency && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '10px', fontSize: '0.84rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      {b.quotationStatus === 'Approved' ? (
                        <span style={{ color: '#047857', fontWeight: '700' }}>
                          ✅ Approved Quotation: Total ₹{b.totalAmount} (Labor ₹{b.laborCharge} + 10% Surcharge ₹{b.emergencyCharge}{b.materialCost > 0 ? ` + Mat. ₹${b.materialCost}` : ''})
                        </span>
                      ) : b.quotationStatus === 'Submitted' ? (
                        <span style={{ color: '#1d4ed8', fontWeight: '700' }}>
                          📋 Quotation Submitted (₹{b.totalAmount}) • Awaiting Customer Approval
                        </span>
                      ) : b.quotationStatus === 'Declined' ? (
                        <span style={{ color: '#dc2626', fontWeight: '700' }}>
                          ⚠️ Quotation Declined by Customer • Please revise in Bookings
                        </span>
                      ) : (
                        <span style={{ color: '#b45309', fontWeight: '700' }}>
                          📋 Inspection & Quotation Pending (+10% Surcharge applies)
                        </span>
                      )}
                    </div>
                    {b.quotationStatus !== 'Approved' && (
                      <button
                        onClick={() => navigate('/worker/bookings')}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#dc2626' }}
                      >
                        Manage Quotation
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      color: '#059669',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '5px 12px',
                      borderRadius: '8px'
                    }}
                  >
                    <Clock size={14} /> Service in Progress • Customer Confirms Completion
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL 1: SET WORKER UNAVAILABLE / BUSY UNTIL --- */}
      {showBusyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '28px', position: 'relative' }}>
            <button 
              onClick={() => setShowBusyModal(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', color: '#1e293b' }}>
              Set Status to Busy
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '18px', lineHeight: '1.4' }}>
              When do you expect to become available again? You will still be visible in Discover & Map View, and customers can send urgent offers or request future appointments.
            </p>

            {busyError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem' }}>
                ⚠️ {busyError}
              </div>
            )}

            {/* Quick preset buttons */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Quick Presets:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => applyBusyPresetHours(1)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>+1 Hour</button>
                <button type="button" onClick={() => applyBusyPresetHours(2)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>+2 Hours</button>
                <button type="button" onClick={() => applyBusyPresetHours(4)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>+4 Hours</button>
                <button type="button" onClick={applyBusyTomorrowMorning} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>Tomorrow 9 AM</button>
              </div>
            </div>

            <form onSubmit={handleSaveBusyStatus} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Unavailable Until Date</label>
                  <input 
                    type="date" 
                    min={getTodayLocalDateString()}
                    value={busyDate}
                    onChange={e => setBusyDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Time</label>
                  <input 
                    type="time" 
                    value={busyTime}
                    onChange={e => setBusyTime(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowBusyModal(false)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingAvailability}
                  className="btn-primary"
                  style={{ padding: '10px 22px', fontSize: '0.9rem', background: '#d97706' }}
                >
                  {savingAvailability ? 'Saving...' : 'Confirm Busy Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ACCEPT EMERGENCY OFFER (REQUIRES ETA) --- */}
      {emergencyAcceptJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '460px', borderRadius: '24px', padding: '28px', position: 'relative' }}>
            <button 
              onClick={() => setEmergencyAcceptJob(null)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', color: '#dc2626' }}>
              Accept Emergency Offer
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Please provide an <strong>Estimated Arrival Time</strong> for {emergencyAcceptJob.customerId?.name}. The customer will review your ETA and confirm dispatch.
            </p>

            {arrivalError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem' }}>
                ⚠️ {arrivalError}
              </div>
            )}

            <form onSubmit={handleConfirmEmergencyAccept} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Quick Arrival Presets:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {['15 mins', '20-25 mins', '30 mins', '45 mins', '1 hour'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEstimatedArrival(t)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        border: estimatedArrival === t ? '2px solid #ef4444' : '1px solid var(--border-glass)',
                        background: estimatedArrival === t ? '#fef2f2' : 'var(--bg-tertiary)',
                        color: estimatedArrival === t ? '#ef4444' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  Estimated Arrival Time Text *
                </label>
                <input 
                  type="text" 
                  value={estimatedArrival}
                  onChange={e => setEstimatedArrival(e.target.value)}
                  placeholder="e.g., 20 mins or 3:15 PM"
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setEmergencyAcceptJob(null)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingArrival}
                  className="btn-primary"
                  style={{ padding: '10px 22px', fontSize: '0.9rem', background: '#dc2626' }}
                >
                  {submittingArrival ? 'Sending...' : 'Confirm & Send ETA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: PROPOSE ALTERNATIVE APPOINTMENT TIME --- */}
      {proposeModalJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '28px', position: 'relative' }}>
            <button 
              onClick={() => setProposeModalJob(null)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0' }}>
              Propose Alternative Time
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Suggest a different appointment time for {proposeModalJob.customerId?.name}. The customer must approve your proposed time before it becomes confirmed.
            </p>

            {altError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem' }}>
                ⚠️ {altError}
              </div>
            )}

            <form onSubmit={handleConfirmAlternativeProposal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Proposed Date *</label>
                  <input 
                    type="date" 
                    min={getTodayLocalDateString()}
                    value={altDate}
                    onChange={e => setAltDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Proposed Time *</label>
                  <input 
                    type="time" 
                    value={altTime}
                    onChange={e => setAltTime(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Estimated Duration (Minutes)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[30, 45, 60, 90, 120].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setAltDuration(mins)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        border: altDuration === mins ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                        background: altDuration === mins ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                        color: altDuration === mins ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.84rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Note for Customer (Optional)</label>
                <input 
                  type="text" 
                  value={altNote}
                  onChange={e => setAltNote(e.target.value)}
                  placeholder="e.g., Earlier morning slot available or finishing nearby job"
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setProposeModalJob(null)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingAlt}
                  className="btn-primary"
                  style={{ padding: '10px 22px', fontSize: '0.9rem' }}
                >
                  {submittingAlt ? 'Sending...' : 'Send Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}