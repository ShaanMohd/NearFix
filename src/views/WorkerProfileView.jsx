import React, { useState, useEffect } from 'react';
import { 
  MapPin, Star, ShieldCheck, Briefcase, Calendar, X, Zap, 
  Loader2, Plus, Image as ImageIcon, FileText, Upload, CheckCircle2, AlertOctagon, Eye, Trash2
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export default function WorkerProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('userProfile')) || {};
  const userRole = localStorage.getItem('userRole') || 'customer';

  const [worker, setWorker] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [serviceMode, setServiceMode] = useState('normal'); // 'normal' | 'emergency'
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [bookingLocation, setBookingLocation] = useState('');
  const [bookingDesc, setBookingDesc] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Portfolio Upload Modal (for worker)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioImgUrl, setPortfolioImgUrl] = useState('');

  // KYC Upload State (for worker)
  const [identityProof, setIdentityProof] = useState('');
  const [addressProof, setAddressProof] = useState('');
  const [skillCert, setSkillCert] = useState('');
  const [expProof, setExpProof] = useState('');
  const [submittingKYC, setSubmittingKYC] = useState(false);

  const targetWorkerId = id || currentUser.id || currentUser._id;

  const fetchProfileAndData = async () => {
    try {
      setLoading(true);
      // Fetch Worker Profile
      const profRes = await fetch(`http://localhost:5000/api/users/profile/${targetWorkerId}`);
      const profData = await profRes.json();
      setWorker(profData);

      if (profData?.documents) {
        setIdentityProof(profData.documents.identityProof || '');
        setAddressProof(profData.documents.addressProof || '');
        setSkillCert(profData.documents.skillCertificate || '');
        setExpProof(profData.documents.experienceProof || '');
      }

      // Fetch Portfolio Projects
      const portRes = await fetch(`http://localhost:5000/api/projects/worker/${targetWorkerId}`);
      const portData = await portRes.json();
      setPortfolio(Array.isArray(portData) ? portData : []);

      // Fetch Reviews
      const revRes = await fetch(`http://localhost:5000/api/reviews/worker/${targetWorkerId}`);
      const revData = await revRes.json();
      setReviews(Array.isArray(revData) ? revData : []);

      setLoading(false);
    } catch (err) {
      console.error('Error loading worker profile:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetWorkerId) {
      fetchProfileAndData();
    }
  }, [targetWorkerId]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBooking(true);
    const token = localStorage.getItem('token');
    const isEmergency = serviceMode === 'emergency';
    const serviceCharge = worker.hourlyRate || 500;
    const emergencyCharge = isEmergency ? 150 : 0;

    try {
      const res = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          workerId: worker._id || worker.id,
          serviceType: worker.skills?.[0] || worker.title || 'General Service',
          description: bookingDesc,
          date: isEmergency ? 'Today' : (bookingDate || 'Tomorrow'),
          time: isEmergency ? 'ASAP' : bookingTime,
          location: bookingLocation || currentUser.address || (typeof currentUser.location === 'string' ? currentUser.location : 'Customer Address'),
          isEmergency,
          serviceCharge,
          emergencyCharge
        })
      });

      if (res.ok) {
        setSubmittingBooking(false);
        setShowBookingModal(false);
        alert(isEmergency ? '🚨 Emergency request sent to worker with priority notification!' : '✅ Booking request sent successfully!');
        navigate('/app/bookings');
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to submit booking request.');
        setSubmittingBooking(false);
      }
    } catch (err) {
      console.error(err);
      setSubmittingBooking(false);
    }
  };

  const handleAddPortfolio = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: portfolioTitle,
          description: portfolioDesc,
          category: worker.skills?.[0] || 'General',
          imageUrl: portfolioImgUrl || 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600'
        })
      });

      if (res.ok) {
        setShowPortfolioModal(false);
        setPortfolioTitle('');
        setPortfolioDesc('');
        setPortfolioImgUrl('');
        fetchProfileAndData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleKYCSubmit = async (e) => {
    e.preventDefault();
    if (!identityProof || !addressProof) {
      alert('Please upload both mandatory Identity Proof and Address Proof documents before submitting.');
      return;
    }
    setSubmittingKYC(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documents: {
            identityProof,
            addressProof,
            skillCertificate: skillCert,
            experienceProof: expProof
          }
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setSubmittingKYC(false);
        // Sync updated user profile to localStorage
        const storedUser = JSON.parse(localStorage.getItem('userProfile')) || {};
        localStorage.setItem('userProfile', JSON.stringify({ ...storedUser, ...updatedUser }));
        alert('KYC Documents submitted successfully! Your application is now Pending Admin Verification.');
        fetchProfileAndData();
      } else {
        setSubmittingKYC(false);
        let errorMsg = `Server returned status ${res.status}`;
        try {
          const data = await res.json();
          if (data.message) errorMsg = data.message;
        } catch (_) {}
        alert(`Failed to submit KYC documents: ${errorMsg}`);
      }
    } catch (err) {
      console.error('KYC Submit error:', err);
      setSubmittingKYC(false);
      alert(`Network or Server error while submitting KYC: ${err.message}`);
    }
  };

  if (loading && !worker) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Loader2 className="animate-spin" size={40} color="var(--accent-primary)" /></div>;
  }

  if (!worker) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><h2>Worker Profile Not Found</h2></div>;
  }

  const isOwnProfile = (!id || id === currentUser.id || id === currentUser._id) && userRole === 'worker';
  const isVerified = worker.verificationStatus === 'Verified';
  const hourlyRate = worker.hourlyRate || 500;
  const emergencyFee = 150;
  const totalEmergencyAmount = hourlyRate + emergencyFee;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Verification Warning for Worker Own Profile */}
      {isOwnProfile && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '16px 20px', 
            borderRadius: '16px', 
            marginBottom: '24px',
            background: worker.verificationStatus === 'Verified' ? '#ecfdf5' : (worker.verificationStatus === 'Pending' ? '#fffbebf0' : '#fef2f2'),
            border: worker.verificationStatus === 'Verified' ? '1px solid #6ee7b7' : (worker.verificationStatus === 'Pending' ? '1px solid #fcd34d' : '1px solid #fca5a5'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {worker.verificationStatus === 'Verified' ? (
              <CheckCircle2 size={24} color="#10b981" />
            ) : (
              <AlertOctagon size={24} color={worker.verificationStatus === 'Pending' ? '#d97706' : '#ef4444'} />
            )}
            <div>
              <h4 style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Verification Status: <span style={{ textTransform: 'uppercase' }}>{worker.verificationStatus || 'Pending'}</span>
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {worker.verificationStatus === 'Verified' && 'Your account is verified. You appear in public search and map discovery.'}
                {worker.verificationStatus === 'Pending' && 'Your KYC documents are under admin review. Once verified, you will appear on the map.'}
                {worker.verificationStatus === 'Rejected' && `Application Rejected: ${worker.rejectionReason || 'Please resubmit valid credentials.'}`}
                {worker.verificationStatus === 'Suspended' && 'Your account is currently suspended by administration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '32px' }}>
        <img 
          src={worker.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=300&h=300'} 
          alt={worker.name}
          style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-light)' }}
        />

        <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>{worker.name}</h1>
              {isVerified && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--accent-light)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>
                  <ShieldCheck size={14} /> Verified Professional
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '4px 0 0 0', fontWeight: '600' }}>
              {worker.title || worker.skills?.[0] || 'Service Specialist'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <MapPin size={16} color="var(--accent-primary)" /> {worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala')} ({worker.serviceRadius || '15 km'} radius)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: '700' }}>
              <Star size={16} fill="#f59e0b" /> {worker.rating || 4.8} ({worker.reviewsCount || reviews.length} reviews)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
              <Briefcase size={16} color="var(--accent-primary)" /> {worker.experienceYears || 3} Years Experience
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(worker.skills || []).map(skill => (
              <span key={skill} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '8px', fontWeight: '500' }}>
                {skill}
              </span>
            ))}
          </div>

          {/* Book Service Action Button for Customer */}
          {userRole === 'customer' && (
            <div style={{ marginTop: '12px' }}>
              <button 
                onClick={() => setShowBookingModal(true)}
                className="btn-primary" 
                style={{ padding: '12px 28px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Calendar size={18} /> Book Service Now (₹{worker.hourlyRate || 500}/hr)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Gallery Section */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 4px 0' }}>Work Portfolio</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>Showcase of completed local service projects.</p>
          </div>

          {isOwnProfile && (
            <button 
              onClick={() => setShowPortfolioModal(true)}
              className="btn-primary" 
              style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Add Work Showcase
            </button>
          )}
        </div>

        {portfolio.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
            <ImageIcon size={40} style={{ opacity: 0.4, marginBottom: '8px' }} />
            <p>No portfolio items uploaded yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {portfolio.map(p => (
              <div key={p._id} style={{ background: '#ffffff', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-sm)' }}>
                <img 
                  src={p.imageUrl || (p.images && p.images[0]) || 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600'} 
                  alt={p.title} 
                  style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                />
                <div style={{ padding: '16px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: '700' }}>{p.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KYC Documents Section for Worker Own Profile */}
      {isOwnProfile && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={22} color="var(--accent-primary)" /> Verification & KYC Documents
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            Upload mandatory identity & address proofs to get verified by NearFix admin.
          </p>

          <form onSubmit={handleKYCSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <DocumentUploader 
              label="Identity Proof (Aadhaar / Voter ID)"
              required={true}
              value={identityProof}
              onChange={setIdentityProof}
            />

            <DocumentUploader 
              label="Address Proof (Bill / Rent Deed)"
              required={true}
              value={addressProof}
              onChange={setAddressProof}
            />

            <DocumentUploader 
              label="Skill Certificate"
              required={false}
              value={skillCert}
              onChange={setSkillCert}
            />

            <DocumentUploader 
              label="Experience Proof"
              required={false}
              value={expProof}
              onChange={setExpProof}
            />

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                type="submit" 
                disabled={submittingKYC}
                className="btn-primary" 
                style={{ padding: '10px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={16} /> {submittingKYC ? 'Submitting...' : 'Submit KYC for Verification'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer Reviews Section */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 4px 0' }}>Customer Reviews ({reviews.length})</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>Verified customer ratings and testimonials.</p>

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No reviews submitted for this worker yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map(r => (
              <div key={r._id} style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={r.customerId?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100'} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{r.customerId?.name || 'Customer'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(r.rating || 5)].map((_, i) => (
                      <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>"{r.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Service Modal for Customer */}
      {showBookingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '520px', borderRadius: '24px', padding: '32px', position: 'relative' }}>
            <button 
              onClick={() => setShowBookingModal(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 4px 0' }}>Book Service with {worker.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Select your service mode and preferred schedule details.
            </p>

            {/* Service Mode Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div
                onClick={() => setServiceMode('normal')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: serviceMode === 'normal' ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  background: serviceMode === 'normal' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <Calendar size={22} color={serviceMode === 'normal' ? 'var(--accent-primary)' : 'var(--text-secondary)'} style={{ marginBottom: '4px' }} />
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '700', color: serviceMode === 'normal' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>Normal Service</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Standard scheduled visit</span>
              </div>

              <div
                onClick={() => setServiceMode('emergency')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: serviceMode === 'emergency' ? '2px solid #ef4444' : '1px solid var(--border-glass)',
                  background: serviceMode === 'emergency' ? '#fef2f2' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <Zap size={22} color={serviceMode === 'emergency' ? '#ef4444' : 'var(--text-secondary)'} style={{ marginBottom: '4px' }} />
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '700', color: serviceMode === 'emergency' ? '#ef4444' : 'var(--text-primary)' }}>Emergency Service</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Priority urgent request (+₹150)</span>
              </div>
            </div>

            {/* Emergency Warning Banner */}
            {serviceMode === 'emergency' && (
              <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.82rem', color: '#dc2626', fontWeight: '600' }}>
                🚨 <strong>Emergency Notice:</strong> Emergency requests are subject to worker acceptance and carry a fixed ₹150 priority fee.
              </div>
            )}

            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Work Description</label>
                <textarea 
                  rows={3}
                  value={bookingDesc}
                  onChange={e => setBookingDesc(e.target.value)}
                  placeholder="Describe the issue or service required..."
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              {serviceMode === 'normal' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Preferred Date</label>
                    <input 
                      type="date" 
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', borderRadius: '10px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Preferred Time Slot</label>
                    <select 
                      value={bookingTime}
                      onChange={e => setBookingTime(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Service Location Address</label>
                <input 
                  type="text" 
                  value={bookingLocation}
                  onChange={e => setBookingLocation(e.target.value)}
                  placeholder="Enter your flat/house address..."
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                  required
                />
              </div>

              {/* Price Breakdown */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Standard Service Charge:</span>
                  <span style={{ fontWeight: '600' }}>₹{hourlyRate}</span>
                </div>
                {serviceMode === 'emergency' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#ef4444' }}>
                    <span>Emergency Priority Charge:</span>
                    <span style={{ fontWeight: '700' }}>+₹{emergencyFee}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  <span>Total Estimated Amount:</span>
                  <span style={{ color: serviceMode === 'emergency' ? '#ef4444' : 'var(--accent-primary)' }}>
                    ₹{serviceMode === 'emergency' ? totalEmergencyAmount : hourlyRate}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowBookingModal(false)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingBooking}
                  className="btn-primary"
                  style={{ 
                    padding: '10px 22px', 
                    fontSize: '0.95rem',
                    background: serviceMode === 'emergency' ? '#ef4444' : 'var(--accent-primary)' 
                  }}
                >
                  {submittingBooking ? 'Sending Request...' : (serviceMode === 'emergency' ? 'Send Emergency Request' : 'Confirm Booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Upload Modal */}
      {showPortfolioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ background: '#ffffff', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '28px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 6px 0' }}>Add Portfolio Showcase</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Upload a previous work photo to highlight your expertise.</p>

            <form onSubmit={handleAddPortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Project Title</label>
                <input 
                  type="text" 
                  placeholder="E.g., Bathroom Fitting Overhaul"
                  value={portfolioTitle}
                  onChange={e => setPortfolioTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Image URL</label>
                <input 
                  type="url" 
                  placeholder="https://images.unsplash.com/..."
                  value={portfolioImgUrl}
                  onChange={e => setPortfolioImgUrl(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea 
                  rows={3}
                  placeholder="Details of materials used or job scale..."
                  value={portfolioDesc}
                  onChange={e => setPortfolioDesc(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowPortfolioModal(false)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                  Upload Showcase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentUploader({ label, required, value, onChange, accept = "image/*,.pdf,.doc,.docx" }) {
  const fileInputRef = React.useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file) => {
    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit. Please select a smaller file.");
      return;
    }

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          onChange(compressedDataUrl);
        };
        img.onerror = () => {
          onChange(event.target.result);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const isUploaded = Boolean(value && value.trim());

  const getFileName = (val) => {
    if (!val) return '';
    if (val.startsWith('data:image')) return 'Uploaded_Image.png';
    if (val.startsWith('data:application/pdf')) return 'Verification_Doc.pdf';
    if (val.startsWith('data:')) return 'Uploaded_Document';
    if (val.startsWith('http')) {
      const parts = val.split('/');
      return parts[parts.length - 1] || 'Verification_Doc';
    }
    return val;
  };

  const openDocument = () => {
    if (!value) return;
    if (value.startsWith('data:') || value.startsWith('http')) {
      const newWin = window.open();
      if (newWin) {
        if (value.startsWith('data:image')) {
          newWin.document.write(`<title>Document Preview</title><body style="margin:0; background:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${value}" style="max-width:90%; max-height:90vh; border-radius:8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" /></body>`);
        } else {
          newWin.location.href = value;
        }
      }
    } else {
      alert(`Document Reference: ${value}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {label} {required ? <span style={{ color: 'var(--error)' }}>*</span> : <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.78rem' }}>(Optional)</span>}
        </label>
        {isUploaded && (
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={13} /> Attached
          </span>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept={accept}
        onChange={handleFileChange}
      />

      {!isUploaded ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: dragOver ? '2px dashed var(--accent-primary)' : '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '16px 12px',
            textAlign: 'center',
            background: dragOver ? 'var(--accent-glow)' : 'var(--bg-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '120px'
          }}
        >
          <Upload size={22} color="var(--accent-primary)" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            Upload Document
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Drag & drop or click to browse (PDF, PNG, JPG, DOC)
          </div>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '12px 14px',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            minHeight: '120px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'var(--accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {value.startsWith('data:image') ? (
                <ImageIcon size={20} color="var(--accent-primary)" />
              ) : (
                <FileText size={20} color="var(--accent-primary)" />
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ 
                fontSize: '0.82rem', 
                fontWeight: '700', 
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {getFileName(value)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {value.startsWith('data:') ? 'Ready to submit' : 'Document attached'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={openDocument}
                title="View Document"
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Eye size={12} /> View
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Replace File"
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Replace
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              title="Remove File"
              style={{ 
                padding: '2px 6px', 
                fontSize: '0.72rem', 
                border: 'none', 
                background: 'transparent',
                color: 'var(--error)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
