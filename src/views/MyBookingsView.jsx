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

export default function MyBookingsView() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

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
        return <span style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Accepted</span>;
      case 'Completed':
        return <span style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Service Completed</span>;
      case 'Rejected':
        return <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={14}/> Rejected</span>;
      case 'Cancelled':
        return <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: '8px', fontWeight: '600', fontSize: '0.8rem' }}>Cancelled</span>;
      default:
        return <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> Pending Worker Response</span>;
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--accent-primary)' }}>
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '20px' }}>
          <CalendarCheck size={48} color="var(--accent-primary)" style={{ opacity: 0.6, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px' }}>No Bookings Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Find verified professionals on the map or discover feed and select a service.
          </p>
          <button onClick={() => navigate('/app')} className="btn-primary" style={{ padding: '10px 24px' }}>
            Discover Workers
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bookings.map(b => (
            <div 
              key={b._id} 
              className="glass-panel" 
              style={{ 
                padding: '24px', 
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
                  <img 
                    src={b.workerId?.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=100&h=100'} 
                    alt={b.workerId?.name} 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Date & Time:</span>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {b.date} • {b.time}
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
                    ₹{b.totalAmount || b.serviceCharge || 500}
                    {b.isEmergency && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: '4px' }}>(incl. ₹{b.emergencyCharge || 150} emergency fee)</span>}
                  </div>
                </div>
              </div>

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '450px', borderRadius: '20px', padding: '28px' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '20px', padding: '28px' }}>
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
