import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, Clock, CheckCircle2, XCircle, 
  MapPin, Loader2, Zap, Phone, AlertOctagon, Calendar, X, FileText
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

  // Emergency Quotation Modal State
  const [quotationModalJob, setQuotationModalJob] = useState(null);
  const [quotationLabor, setQuotationLabor] = useState('');
  const [quotationMaterial, setQuotationMaterial] = useState('');
  const [quotationNote, setQuotationNote] = useState('');
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationError, setQuotationError] = useState('');

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

  const [openOffers, setOpenOffers] = useState([]);

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

  const fetchOpenEmergencyOffers = () => {
    if (!token) return;
    fetch('http://localhost:5000/api/jobs/emergency/open', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setOpenOffers(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error fetching open emergency offers:', err));
  };

  useEffect(() => {
    fetchBookings();
    fetchOpenEmergencyOffers();

    // Poll for emergency broadcast requests every 5 seconds
    const interval = setInterval(() => {
      fetchOpenEmergencyOffers();
    }, 5000);

    return () => clearInterval(interval);
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
          fetchBookings();
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

  const handleOpenQuotationModal = (job) => {
    setQuotationModalJob(job);
    setQuotationLabor(job.laborCharge ? String(job.laborCharge) : '');
    setQuotationMaterial(job.materialCost ? String(job.materialCost) : '');
    setQuotationNote(job.workerNote || '');
    setQuotationError('');
  };

  const handleSubmitQuotation = async (e) => {
    e.preventDefault();
    if (!quotationModalJob) return;

    const parsedLabor = parseFloat(quotationLabor);
    if (isNaN(parsedLabor) || parsedLabor <= 0) {
      setQuotationError('Please enter a valid labor charge greater than 0.');
      return;
    }

    const parsedMaterial = quotationMaterial ? parseFloat(quotationMaterial) : 0;
    if (isNaN(parsedMaterial) || parsedMaterial < 0) {
      setQuotationError('Material cost cannot be negative.');
      return;
    }

    setQuotationSubmitting(true);
    setQuotationError('');

    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${quotationModalJob._id}/quotation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          laborCharge: parsedLabor,
          materialCost: parsedMaterial,
          note: quotationNote.trim()
        })
      });

      const data = await res.json();
      setQuotationSubmitting(false);

      if (res.ok) {
        setQuotationModalJob(null);
        alert('✅ Emergency quotation submitted to customer successfully!');
        fetchBookings();
      } else {
        setQuotationError(data.message || 'Failed to submit quotation.');
      }
    } catch (err) {
      setQuotationSubmitting(false);
      setQuotationError('Network error: ' + err.message);
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

  const emergencyCount = bookings.filter(b => b.isEmergency).length + openOffers.length;
  const activeEmergencyCount = bookings.filter(b => b.isEmergency && (b.status === 'Pending' || b.status === 'EmergencyAcceptedPendingCustomer')).length + openOffers.length;

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

      {/* Available Public Emergency Offers Section */}
      {openOffers.length > 0 && (filterStatus === 'All' || filterStatus === 'Emergency') && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#dc2626' }}>
              Broadcast Emergency Offers ({openOffers.length})
            </h2>
            <span style={{ fontSize: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>
              Fastest Response Required
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {openOffers.map(offer => {
              const mins = Math.floor((offer.secondsRemaining || 0) / 60);
              const secs = (offer.secondsRemaining || 0) % 60;

              return (
                <div 
                  key={offer._id}
                  className="glass-panel"
                  style={{
                    padding: '18px 22px',
                    borderRadius: '16px',
                    borderLeft: '6px solid #ef4444',
                    background: '#fff5f5',
                    boxShadow: '0 4px 18px rgba(239,68,68,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#b91c1c', padding: '3px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', marginBottom: '6px' }}>
                        🚨 {offer.serviceType} Emergency
                      </div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: '800' }}>
                        "{offer.description}"
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        <span>📍 {offer.serviceArea}</span>
                        <span>•</span>
                        <strong style={{ color: '#059669' }}>🧭 ~{offer.distanceKm} km away</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                        ₹{offer.totalAmount}
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: '700' }}>
                        (incl. ₹150 Emergency Surcharge)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid rgba(239,68,68,0.15)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} /> Time Remaining: {mins}m {String(secs).padStart(2, '0')}s
                    </span>

                    <button
                      onClick={() => {
                        setEmergencyAcceptJob({ ...offer, isPublicOffer: true });
                        setEstimatedArrival('20-30 mins');
                      }}
                      className="btn-primary"
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        borderRadius: '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Zap size={14} /> Accept Offer & Enter ETA
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                          🚨 EMERGENCY ({b.emergencySurchargePercent ? '+10% Surcharge' : '+₹150'}) {b.status === 'Open' || b.status === 'Pending' ? `• ${mins}m ${String(secs).padStart(2, '0')}s` : ''}
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
                      {b.isEmergency && b.emergencySurchargePercent ? (
                        b.totalAmount ? (
                          <>
                            ₹{b.totalAmount}
                            <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '4px' }}>
                              (Labor ₹{b.laborCharge} + 10% ₹{b.emergencyCharge}{b.materialCost > 0 ? ` + Mat. ₹${b.materialCost}` : ''})
                            </span>
                          </>
                        ) : (
                          <span style={{ color: '#b45309', fontSize: '0.85rem' }}>Quote after inspection (+10% Surcharge)</span>
                        )
                      ) : (
                        <>
                          ₹{b.totalAmount || b.serviceCharge || 500}
                          {b.isEmergency && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: '4px' }}>(incl. ₹{b.emergencyCharge || 150} emergency fee)</span>}
                        </>
                      )}
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

                {/* Emergency Quotation Status Box */}
                {b.isEmergency && b.status === 'Accepted' && (
                  <div>
                    {(!b.quotationStatus || b.quotationStatus === 'Pending') && (
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong style={{ color: '#b45309', display: 'block', fontSize: '0.9rem' }}>📋 Inspection & Quotation Pending</strong>
                          <span style={{ fontSize: '0.82rem', color: '#92400e' }}>
                            Inspect the site and submit labor + material quotation. Surcharge is 10% of labor charge.
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenQuotationModal(b)}
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.82rem', background: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FileText size={14} /> Submit Quotation
                        </button>
                      </div>
                    )}

                    {b.quotationStatus === 'Submitted' && (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong style={{ color: '#1d4ed8', display: 'block', fontSize: '0.9rem' }}>📋 Quotation Submitted • Awaiting Customer Approval</strong>
                          <span style={{ fontSize: '0.82rem', color: '#1e40af' }}>
                            Labor: ₹{b.laborCharge} + 10% Surcharge: ₹{b.emergencyCharge}{b.materialCost > 0 ? ` + Materials: ₹${b.materialCost}` : ''} = <strong>Total ₹{b.totalAmount}</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenQuotationModal(b)}
                          style={{ background: '#ffffff', border: '1px solid #93c5fd', color: '#1d4ed8', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Revise Quote
                        </button>
                      </div>
                    )}

                    {b.quotationStatus === 'Declined' && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <strong style={{ color: '#b91c1c', display: 'block', fontSize: '0.9rem' }}>⚠️ Quotation Declined by Customer</strong>
                          <span style={{ fontSize: '0.82rem', color: '#991b1b' }}>
                            Customer requested a revised quotation. Please review and resubmit.
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenQuotationModal(b)}
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.82rem', background: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <FileText size={14} /> Revise & Resubmit
                        </button>
                      </div>
                    )}

                    {b.quotationStatus === 'Approved' && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '12px' }}>
                        <strong style={{ color: '#065f46', display: 'block', fontSize: '0.9rem' }}>✅ Quotation Approved (Locked)</strong>
                        <span style={{ fontSize: '0.82rem', color: '#047857' }}>
                          Labor: ₹{b.laborCharge} + 10% Surcharge: ₹{b.emergencyCharge}{b.materialCost > 0 ? ` + Materials: ₹${b.materialCost}` : ''} = <strong>Final Agreed Total: ₹{b.totalAmount}</strong>
                        </span>
                        <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '4px' }}>
                          Work is authorized. Customer will confirm completion upon finishing.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Customer Location & Map */}
                {expandedMapId === b._id && (
                  <CustomerLocationMap 
                    customerLocation={b.customerLocation}
                    serviceAddress={b.serviceAddress || b.location}
                    customerName={b.customerId?.name || 'Customer'}
                    workerLocation={b.workerId?.location || b.workerId?.currentLocation}
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
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          color: '#047857',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          padding: '7px 14px',
                          borderRadius: '8px'
                        }}
                      >
                        <Clock size={15} /> Service in Progress • Customer Confirms Completion
                      </span>
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
      {/* MODAL: SUBMIT EMERGENCY QUOTATION */}
      {quotationModalJob && (() => {
        const previewLabor = parseFloat(quotationLabor) || 0;
        const previewMaterial = parseFloat(quotationMaterial) || 0;
        const previewSurcharge = Math.round(previewLabor * 0.10);
        const previewTotal = previewLabor + previewSurcharge + previewMaterial;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '28px', position: 'relative' }}>
              <button onClick={() => setQuotationModalJob(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', color: '#dc2626' }}>
                {quotationModalJob.quotationStatus === 'Declined' ? 'Revise Emergency Quotation' : 'Submit Emergency Quotation'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px', lineHeight: '1.4' }}>
                Enter the agreed labor charge and any material costs for customer <strong>{quotationModalJob.customerId?.name}</strong>. The 10% emergency surcharge is automatically calculated.
              </p>

              {quotationError && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', marginBottom: '14px', fontSize: '0.85rem' }}>
                  ⚠️ {quotationError}
                </div>
              )}

              <form onSubmit={handleSubmitQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Labor / Service Charge (₹): <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={quotationLabor}
                    onChange={e => setQuotationLabor(e.target.value)}
                    placeholder="e.g. 1000"
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Material Costs (₹, optional):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quotationMaterial}
                    onChange={e => setQuotationMaterial(e.target.value)}
                    placeholder="e.g. 500 (0 if none)"
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Real-time Authoritative Calculation Preview */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Labor Charge:</span>
                    <strong>₹{previewLabor}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#dc2626' }}>
                    <span>Emergency Priority Surcharge (10%):</span>
                    <strong>+₹{previewSurcharge}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Material Costs:</span>
                    <strong>+₹{previewMaterial}</strong>
                  </div>
                  <div style={{ height: '1px', background: '#cbd5e1', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '800', color: '#15803d' }}>
                    <span>Total Quoted Amount:</span>
                    <span>₹{previewTotal}</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Work / Parts Note (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={quotationNote}
                    onChange={e => setQuotationNote(e.target.value)}
                    placeholder="e.g. Replaced faulty copper elbow joint and pipe seals"
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setQuotationModalJob(null)}
                    disabled={quotationSubmitting}
                    style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quotationSubmitting}
                    className="btn-primary"
                    style={{ padding: '10px 22px', background: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {quotationSubmitting ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                    {quotationSubmitting ? 'Submitting...' : 'Submit Quotation to Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
