import React, { useState, useEffect } from 'react';
import { 
  CalendarCheck, 
  Clock, 
  AlertTriangle, 
  Star, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Loader2,
  MapPin,
  Send,
  User,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';

export default function MyBookingsView() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');

  // Review Modal State
  const [reviewBooking, setReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Complaint Modal State
  const [complaintBooking, setComplaintBooking] = useState(null);
  const [category, setCategory] = useState('Poor service');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [quotationActionLoading, setQuotationActionLoading] = useState(false);

  const handleConfirmCompleted = (booking) => {
    if (booking.isEmergency && booking.emergencySurchargePercent && booking.quotationStatus !== 'Approved') {
      alert('Cannot confirm completion: You must review and approve the worker\'s emergency quotation before completing the service.');
      return;
    }

    if (!window.confirm(`Confirm that ${booking.workerId?.name || 'the worker'} has completed the service to your satisfaction?`)) {
      return;
    }
    setCompletingId(booking._id);
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/api/jobs/${booking._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'Completed' })
    })
      .then(res => res.json())
      .then(data => {
        setCompletingId(null);
        fetchBookings();
        // Automatically open the Review modal to rate the experience
        setReviewBooking(booking);
      })
      .catch(err => {
        console.error('Error completing service:', err);
        setCompletingId(null);
      });
  };

  const handleRespondQuotation = async (bookingId, action) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (action === 'decline' && !window.confirm('Are you sure you want to decline this quotation? The worker will be asked to revise it.')) {
      return;
    }

    setQuotationActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${bookingId}/quotation-respond`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      setQuotationActionLoading(false);
      if (res.ok) {
        if (action === 'approve') {
          alert('✅ Emergency quotation approved successfully! The worker is now authorized to proceed.');
        } else {
          alert('⚠️ Quotation declined. The worker has been notified to revise their quotation.');
        }
        fetchBookings();
      } else {
        alert(data.message || 'Failed to update quotation.');
      }
    } catch (err) {
      setQuotationActionLoading(false);
      alert('Network error: ' + err.message);
    }
  };

  const fetchBookings = () => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/jobs?asCustomer=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setBookings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching bookings:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = (bookingId) => {
    const token = localStorage.getItem('token');
    fetch(`http://localhost:5000/api/jobs/${bookingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'Cancelled' })
    })
      .then(res => res.json())
      .then(() => fetchBookings())
      .catch(err => console.error('Error cancelling booking:', err));
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmittingReview(true);
    const token = localStorage.getItem('token');

    fetch('http://localhost:5000/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        workerId: reviewBooking.workerId?._id || reviewBooking.workerId,
        bookingId: reviewBooking._id,
        rating,
        comment: reviewComment
      })
    })
      .then(res => res.json())
      .then(() => {
        setSubmittingReview(false);
        setReviewBooking(null);
        setReviewComment('');
        alert('Thank you for rating your service experience!');
        fetchBookings();
      })
      .catch(err => {
        console.error('Review error:', err);
        setSubmittingReview(false);
      });
  };

  const handleSubmitComplaint = (e) => {
    e.preventDefault();
    if (!complaintBooking) return;
    setSubmittingComplaint(true);
    const token = localStorage.getItem('token');

    fetch('http://localhost:5000/api/complaints', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        workerId: complaintBooking.workerId?._id || complaintBooking.workerId,
        bookingId: complaintBooking._id,
        category,
        description: complaintDesc
      })
    })
      .then(res => res.json())
      .then(() => {
        setSubmittingComplaint(false);
        setComplaintBooking(null);
        setComplaintDesc('');
        alert('Complaint submitted successfully. Our admin team will investigate and take required action.');
        fetchBookings();
      })
      .catch(err => {
        console.error('Complaint error:', err);
        setSubmittingComplaint(false);
      });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted':
        return <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Confirmed / Accepted</span>;
      case 'EmergencyAcceptedPendingCustomer':
        return <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🚨 ETA Ready • Confirm Dispatch</span>;
      case 'RescheduleProposed':
        return <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>📅 Alternative Proposed</span>;
      case 'Completed':
        return <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Service Completed</span>;
      case 'Rejected':
        return <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={14}/> Rejected</span>;
      case 'Cancelled':
        return <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '8px', fontWeight: '600', fontSize: '0.8rem' }}>Cancelled</span>;
      case 'Expired':
        return <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>⏱️ Offer Expired (5m)</span>;
      default:
        return <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> Awaiting Worker Response</span>;
    }
  };

  const handleUpdateBookingStatus = (bookingId, status) => {
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
      .then(() => fetchBookings())
      .catch(err => console.error('Error updating booking status:', err));
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
    if (filterStatus === 'Accepted') return b.status === 'Accepted';
    if (filterStatus === 'Completed') return b.status === 'Completed';
    if (filterStatus === 'Cancelled') return b.status === 'Cancelled' || b.status === 'Rejected' || b.status === 'Expired';
    return true;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 6px 0' }}>My Bookings</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Track appointment status, rate completed services, or report issues.
          </p>
        </div>
        <button 
          onClick={() => navigate('/app')}
          className="btn-primary" 
          style={{ padding: '10px 18px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> New Booking
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#ffffff', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '24px' }}>
        {[
          { id: 'All', label: 'All' },
          { id: 'Emergency', label: 'Emergency 🚨', count: emergencyCount, badgeBg: activeEmergencyCount > 0 ? '#ef4444' : '#6b7280' },
          { id: 'Pending', label: 'Pending' },
          { id: 'Accepted', label: 'Accepted' },
          { id: 'Completed', label: 'Completed' },
          { id: 'Cancelled', label: 'Cancelled' }
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--accent-primary)' }}>
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '20px' }}>
          <CalendarCheck size={48} color="var(--accent-primary)" style={{ opacity: 0.6, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>
            {filterStatus === 'All' ? 'No Bookings Yet' : `No ${filterStatus} Bookings`}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {filterStatus === 'All' ? 'Find verified professionals on the map or discover feed and select a service.' : `There are currently no bookings under the ${filterStatus} category.`}
          </p>
          {filterStatus === 'All' ? (
            <button onClick={() => navigate('/app')} className="btn-primary" style={{ padding: '10px 24px' }}>
              Discover Workers
            </button>
          ) : (
            <button onClick={() => setFilterStatus('All')} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', padding: '8px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
              View All Bookings
            </button>
          )}
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
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                borderLeft: b.isEmergency ? '4px solid #ef4444' : '4px solid var(--accent-primary)' 
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar 
                    src={b.workerId?.avatar} 
                    name={b.workerId?.name || 'Professional'} 
                    size={48} 
                  />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 2px 0', fontWeight: '700' }}>
                      {b.serviceType}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Worker: <strong>{b.workerId?.name || 'Professional'}</strong> ({b.workerId?.phone || 'N/A'})
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {b.isEmergency && (
                    <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🚨 EMERGENCY REQUEST
                    </span>
                  )}
                  {getStatusBadge(b.status)}
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Schedule:</span>
                  <div style={{ fontWeight: '600', color: b.isEmergency ? '#ef4444' : 'var(--text-primary)', marginTop: '2px' }}>
                    {b.isEmergency 
                      ? (b.estimatedArrivalTime ? `ETA: ${b.estimatedArrivalTime}` : 'Immediate (ASAP)') 
                      : `${b.date} • ${b.time} (${b.estimatedDuration || 60} mins)`}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Service Location:</span>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {b.location || 'Customer Address'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
                  <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {b.isEmergency && b.emergencySurchargePercent ? (
                      b.totalAmount ? (
                        <>
                          ₹{b.totalAmount}
                          <span style={{ fontSize: '0.75rem', color: '#dc2626', marginLeft: '4px' }}>
                            (Labor ₹{b.laborCharge} + 10% ₹{b.emergencyCharge}{b.materialCost > 0 ? ` + Mat. ₹${b.materialCost}` : ''})
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#b45309', fontSize: '0.85rem' }}>Quoted after inspection (+10% surcharge)</span>
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

              {/* Emergency Quotation Review & Action Section */}
              {b.isEmergency && b.status === 'Accepted' && (
                <div>
                  {b.quotationStatus === 'Submitted' && (
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '16px 20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', fontWeight: '800', color: '#166534' }}>
                            📋 Emergency Quotation from {b.workerId?.name || 'Worker'}
                          </h4>
                          <span style={{ fontSize: '0.82rem', color: '#15803d' }}>
                            Please review the agreed labor charge, 10% emergency priority surcharge, and materials.
                          </span>
                        </div>
                        <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
                          Action Required
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '0.88rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Labor Charge:</span>
                          <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem', marginTop: '2px' }}>₹{b.laborCharge}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Emergency Surcharge (10%):</span>
                          <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '1rem', marginTop: '2px' }}>+₹{b.emergencyCharge}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Material Costs:</span>
                          <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem', marginTop: '2px' }}>₹{b.materialCost || 0}</div>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Final Total Amount:</span>
                          <div style={{ fontWeight: '900', color: '#15803d', fontSize: '1.15rem', marginTop: '2px' }}>₹{b.totalAmount}</div>
                        </div>
                      </div>

                      {b.workerNote && (
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          <strong>Worker Note:</strong> "{b.workerNote}"
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid #bbf7d0', paddingTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleRespondQuotation(b._id, 'decline')}
                          disabled={quotationActionLoading}
                          style={{ background: '#ffffff', border: '1px solid #ef4444', color: '#ef4444', padding: '8px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Decline Quotation
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondQuotation(b._id, 'approve')}
                          disabled={quotationActionLoading}
                          className="btn-primary"
                          style={{ background: '#16a34a', borderColor: '#15803d', padding: '8px 22px', fontSize: '0.85rem', fontWeight: '700' }}
                        >
                          Approve Quotation (₹{b.totalAmount})
                        </button>
                      </div>
                    </div>
                  )}

                  {b.quotationStatus === 'Approved' && (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 18px', borderRadius: '12px' }}>
                      <strong style={{ color: '#065f46', display: 'block', fontSize: '0.9rem' }}>
                        ✅ Quotation Approved (Agreed Total: ₹{b.totalAmount})
                      </strong>
                      <span style={{ fontSize: '0.82rem', color: '#047857' }}>
                        Breakdown: Labor ₹{b.laborCharge} + 10% Emergency Surcharge (₹{b.emergencyCharge}){b.materialCost > 0 ? ` + Materials ₹${b.materialCost}` : ''}.
                        The worker is authorized to complete the repair.
                      </span>
                    </div>
                  )}

                  {b.quotationStatus === 'Declined' && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ color: '#b91c1c', display: 'block', fontSize: '0.9rem' }}>⚠️ Quotation Declined</strong>
                        <span style={{ fontSize: '0.82rem', color: '#991b1b' }}>
                          Awaiting a revised quotation from {b.workerId?.name || 'the worker'}. You can also cancel this request if you do not wish to proceed.
                        </span>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(b._id)}
                        style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}

                  {(!b.quotationStatus || b.quotationStatus === 'Pending') && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 18px', borderRadius: '12px' }}>
                      <strong style={{ color: '#b45309', display: 'block', fontSize: '0.9rem' }}>⏳ Awaiting Site Inspection & Quotation</strong>
                      <span style={{ fontSize: '0.82rem', color: '#92400e' }}>
                        {b.workerId?.name || 'Worker'} will inspect the problem on arrival and submit a quotation with a 10% emergency priority surcharge for your approval before starting work.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Banner for Emergency Accepted Pending Customer Confirmation */}
              {b.status === 'EmergencyAcceptedPendingCustomer' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '800', color: '#b45309' }}>
                      🚨 Worker Accepted! Ready to Dispatch
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#92400e' }}>
                      Worker's Estimated Arrival Time: <strong>{b.estimatedArrivalTime || '20-30 mins'}</strong>. Please confirm to finalize dispatch.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleUpdateBookingStatus(b._id, 'Cancelled')}
                      style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus(b._id, 'Accepted')}
                      className="btn-primary"
                      style={{ padding: '6px 16px', fontSize: '0.82rem', background: '#dc2626' }}
                    >
                      Confirm Dispatch
                    </button>
                  </div>
                </div>
              )}

              {/* Action Banner for Reschedule Proposed */}
              {b.status === 'RescheduleProposed' && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '800', color: '#1d4ed8' }}>
                      📅 Worker Proposed an Alternative Appointment Time
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#1e40af' }}>
                      Proposed Slot: <strong>{b.proposedAlternative?.date} at {b.proposedAlternative?.time}</strong> ({b.proposedAlternative?.estimatedDuration || 60} mins)
                      {b.proposedAlternative?.note && <span> • "{b.proposedAlternative.note}"</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleUpdateBookingStatus(b._id, 'Cancelled')}
                      style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Decline & Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus(b._id, 'Accepted')}
                      className="btn-primary"
                      style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                    >
                      Approve Alternative Time
                    </button>
                  </div>
                </div>
              )}

              {b.description && (
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  <strong>Description:</strong> {b.description}
                </p>
              )}

              {/* Actions Footer */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                {b.status === 'Pending' && (
                  <button 
                    onClick={() => handleCancelBooking(b._id)}
                    style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel Request
                  </button>
                )}

                {b.status === 'Accepted' && (
                  <button
                    onClick={() => handleConfirmCompleted(b)}
                    disabled={completingId === b._id}
                    className="btn-primary"
                    style={{
                      padding: '7px 16px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      background: '#16a34a',
                      borderColor: '#15803d',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                      cursor: 'pointer'
                    }}
                  >
                    {completingId === b._id ? (
                      <>
                        <Loader2 size={15} className="spinner" /> Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> Confirm Service Completed
                      </>
                    )}
                  </button>
                )}

                {b.status === 'Completed' && (
                  <button 
                    onClick={() => setReviewBooking(b)}
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Star size={14} fill="white" /> Rate & Review
                  </button>
                )}

                {(b.status === 'Completed' || b.status === 'Cancelled' || b.status === 'Accepted') && (
                  <button 
                    onClick={() => setComplaintBooking(b)}
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={14} color="#d97706" /> Submit Complaint
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: 'min(94vw, 460px)', maxHeight: '90vh', maxHeight: '90dvh', overflowY: 'auto', borderRadius: '20px', padding: 'clamp(18px, 4vw, 28px)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 8px 0' }}>Rate Your Service Experience</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              How was your service with <strong>{reviewBooking.workerId?.name}</strong>?
            </p>

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '8px' }}>Rating Star</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Star size={30} fill={star <= rating ? '#f59e0b' : 'none'} color={star <= rating ? '#f59e0b' : '#cbd5e1'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Your Feedback / Review</label>
                <textarea 
                  rows={3} 
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share details about punctuality, quality of work, cleanliness..."
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setReviewBooking(null)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingReview}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                >
                  {submittingReview ? 'Submitting...' : 'Submit Rating'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {complaintBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: 'min(94vw, 480px)', maxHeight: '90vh', maxHeight: '90dvh', overflowY: 'auto', borderRadius: '20px', padding: 'clamp(18px, 4vw, 28px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#ef4444' }}>
              <ShieldAlert size={22} />
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>Submit a Complaint</h2>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Report issues regarding worker <strong>{complaintBooking.workerId?.name}</strong>. Admin will investigate your case.
            </p>

            <form onSubmit={handleSubmitComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Complaint Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', height: '42px', fontSize: '0.9rem' }}
                >
                  <option value="Worker did not arrive">Worker did not arrive</option>
                  <option value="Poor service">Poor service</option>
                  <option value="Misconduct">Misconduct</option>
                  <option value="Inappropriate behaviour">Inappropriate behaviour</option>
                  <option value="Overcharging">Overcharging</option>
                  <option value="Property damage">Property damage</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Detailed Explanation</label>
                <textarea 
                  rows={4} 
                  value={complaintDesc}
                  onChange={e => setComplaintDesc(e.target.value)}
                  placeholder="Describe what happened clearly including dates and amounts if applicable..."
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setComplaintBooking(null)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingComplaint}
                  style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingComplaint ? 'Submitting...' : 'File Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
