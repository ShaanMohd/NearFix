import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Star, ShieldCheck, Briefcase, Calendar, X, Zap, 
  Loader2, Plus, Image as ImageIcon, FileText, Upload, CheckCircle2, AlertOctagon, Eye, Trash2, Navigation,
  Play, Video, Film, Edit3, Check, CloudUpload, ArrowRight, Layers, Sparkles, SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `http://localhost:5000${cleanPath}`;
};

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
  const [customerCoordinates, setCustomerCoordinates] = useState(null); // [longitude, latitude] GeoJSON
  const [gpsStatus, setGpsStatus] = useState({ loading: false, error: null, success: false });
  const [bookingDesc, setBookingDesc] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Portfolio Filtering & Viewing State
  const [portfolioFilter, setPortfolioFilter] = useState('all'); // 'all' | 'photos' | 'videos' | 'projects' | 'before_after'
  const [viewingItem, setViewingItem] = useState(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editProjectType, setEditProjectType] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  // Portfolio Upload Modal (for worker)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState('image'); // 'image' | 'video'
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioCategory, setPortfolioCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [portfolioProjectType, setPortfolioProjectType] = useState('Completed Work');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [beforeFile, setBeforeFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterFile, setAfterFile] = useState(null);
  const [afterPreview, setAfterPreview] = useState('');
  const [submittingPortfolio, setSubmittingPortfolio] = useState(false);
  const [portfolioError, setPortfolioError] = useState('');
  const [dragOverMedia, setDragOverMedia] = useState(false);

  const fileInputRef = useRef(null);
  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

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
      if (profData?.skills?.[0]) {
        setPortfolioCategory(prev => prev || profData.skills[0]);
      } else if (profData?.title) {
        setPortfolioCategory(prev => prev || profData.title);
      } else {
        setPortfolioCategory(prev => prev || 'Plumber');
      }

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

  const handleDetectCustomerLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus({ loading: false, error: 'Geolocation is not supported by your browser.', success: false });
      return;
    }
    setGpsStatus({ loading: true, error: null, success: false });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // GeoJSON coordinate order MUST be: [longitude, latitude]
        setCustomerCoordinates([longitude, latitude]);
        setGpsStatus({ loading: false, error: null, success: true });
        if (!bookingLocation) {
          setBookingLocation(`Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
      },
      (error) => {
        let msg = 'Could not access GPS location.';
        if (error.code === 1) {
          msg = 'Location permission was denied. You can still enter your address manually.';
        } else if (error.code === 2) {
          msg = 'Location position unavailable. Please enter address manually.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please enter address manually.';
        }
        setGpsStatus({ loading: false, error: msg, success: false });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!token || token === 'null' || token === 'undefined') {
      alert('Please sign in as a customer to book a service.');
      navigate(`/login/customer?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setSubmittingBooking(true);
    const isEmergency = serviceMode === 'emergency';
    const serviceCharge = worker.hourlyRate || 500;
    const emergencyCharge = isEmergency ? 150 : 0;

    const resolvedAddress = bookingLocation || (customerCoordinates ? `GPS Location (${customerCoordinates[1].toFixed(4)}, ${customerCoordinates[0].toFixed(4)})` : (currentUser.address || (typeof currentUser.location === 'string' ? currentUser.location : 'Customer Address')));

    let finalCustomerLocation = undefined;
    if (customerCoordinates && Array.isArray(customerCoordinates) && customerCoordinates.length === 2) {
      finalCustomerLocation = {
        type: 'Point',
        coordinates: [Number(customerCoordinates[0]), Number(customerCoordinates[1])]
      };
    } else if (currentUser?.location?.coordinates && Array.isArray(currentUser.location.coordinates)) {
      finalCustomerLocation = {
        type: 'Point',
        coordinates: [Number(currentUser.location.coordinates[0]), Number(currentUser.location.coordinates[1])]
      };
    }

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
          location: resolvedAddress,
          serviceAddress: resolvedAddress,
          ...(finalCustomerLocation ? { customerLocation: finalCustomerLocation } : {}),
          isEmergency,
          serviceCharge,
          emergencyCharge
        })
      });

      if (res.ok) {
        setShowBookingModal(false);
        setCustomerCoordinates(null);
        setGpsStatus({ loading: false, error: null, success: false });
        alert(isEmergency ? '🚨 Emergency request sent to worker with priority notification!' : '✅ Booking request sent successfully! The worker has been notified.');
        navigate('/app/bookings');
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          localStorage.removeItem('token');
          alert(data.message || 'Your session expired or token is invalid. Please sign in again.');
          navigate(`/login/customer?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else {
          alert(data.message || 'Failed to submit booking request.');
        }
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      alert('Network or server error while submitting booking: ' + err.message);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const resetPortfolioModal = () => {
    setPortfolioTitle('');
    setPortfolioDesc('');
    setPortfolioProjectType('Completed Work');
    setUploadMediaType('image');
    setMediaFile(null);
    if (mediaPreview && mediaPreview.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMediaPreview('');
    setVideoDuration('');
    setBeforeFile(null);
    if (beforePreview && beforePreview.startsWith('blob:')) URL.revokeObjectURL(beforePreview);
    setBeforePreview('');
    setAfterFile(null);
    if (afterPreview && afterPreview.startsWith('blob:')) URL.revokeObjectURL(afterPreview);
    setAfterPreview('');
    setPortfolioError('');
    setCustomCategory('');
    setDragOverMedia(false);
  };

  const handleSelectMedia = (file, forcedType) => {
    if (!file) return;
    setPortfolioError('');
    const isVideo = (file.type && file.type.startsWith('video/')) || forcedType === 'video';

    if (isVideo) {
      if (file.size > 25 * 1024 * 1024) {
        setPortfolioError('Video size exceeds 25 MB limit. Please select a shorter or compressed clip.');
        return;
      }
      setUploadMediaType('video');
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);

      // Auto-extract video duration
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        const totalSeconds = Math.round(tempVideo.duration) || 0;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        setVideoDuration(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      };
      tempVideo.src = url;
    } else {
      if (file.size > 5 * 1024 * 1024) {
        setPortfolioError('Photo size exceeds 5 MB limit. Please choose a file under 5 MB.');
        return;
      }
      setUploadMediaType('image');
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    }
  };

  const handleSelectBeforeFile = (file) => {
    if (!file) return;
    setPortfolioError('');
    if (file.size > 5 * 1024 * 1024) {
      setPortfolioError('Before image exceeds 5 MB limit.');
      return;
    }
    setBeforeFile(file);
    setBeforePreview(URL.createObjectURL(file));
  };

  const handleSelectAfterFile = (file) => {
    if (!file) return;
    setPortfolioError('');
    if (file.size > 5 * 1024 * 1024) {
      setPortfolioError('After image exceeds 5 MB limit.');
      return;
    }
    setAfterFile(file);
    setAfterPreview(URL.createObjectURL(file));
  };

  const handleAddPortfolio = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in as worker to upload portfolio items.');
      return;
    }

    if (!portfolioTitle.trim()) {
      setPortfolioError('Please enter a project title.');
      return;
    }

    if (portfolioProjectType === 'Before & After') {
      if (!beforeFile && !mediaFile) {
        setPortfolioError('Please select a Before photo.');
        return;
      }
      if (!afterFile) {
        setPortfolioError('Please select an After photo.');
        return;
      }
    } else {
      if (!mediaFile) {
        setPortfolioError(`Please select a ${uploadMediaType === 'video' ? 'video' : 'photo'} file.`);
        return;
      }
    }

    setSubmittingPortfolio(true);
    setPortfolioError('');

    try {
      const formData = new FormData();
      formData.append('title', portfolioTitle.trim());
      formData.append('description', portfolioDesc.trim());
      
      const resolvedCategory = (portfolioCategory === 'Other (Type Custom)' ? customCategory.trim() : portfolioCategory) || worker?.skills?.[0] || 'General';
      formData.append('category', resolvedCategory);
      formData.append('projectType', portfolioProjectType);
      formData.append('mediaType', uploadMediaType);

      if (uploadMediaType === 'video') {
        if (mediaFile) formData.append('media', mediaFile);
        if (videoDuration) formData.append('videoDuration', videoDuration);
      } else if (portfolioProjectType === 'Before & After') {
        if (beforeFile) formData.append('beforeImage', beforeFile);
        else if (mediaFile) formData.append('beforeImage', mediaFile);

        if (afterFile) formData.append('afterImage', afterFile);
      } else {
        if (mediaFile) formData.append('media', mediaFile);
      }

      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setShowPortfolioModal(false);
        resetPortfolioModal();
        await fetchProfileAndData();
      } else {
        const data = await res.json().catch(() => ({}));
        setPortfolioError(data.message || 'Failed to upload portfolio item.');
      }
    } catch (err) {
      console.error('Portfolio upload error:', err);
      setPortfolioError('Network or server error during upload: ' + err.message);
    } finally {
      setSubmittingPortfolio(false);
    }
  };

  const handleOpenItem = (item) => {
    setViewingItem(item);
    setIsEditingItem(false);
    setEditTitle(item.title || '');
    setEditDesc(item.description || '');
    setEditCategory(item.category || '');
    setEditProjectType(item.projectType || 'Completed Work');
  };

  const handleUpdatePortfolio = async (e) => {
    e.preventDefault();
    if (!viewingItem) return;
    const token = localStorage.getItem('token');
    setSavingEdit(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${viewingItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          category: editCategory.trim(),
          projectType: editProjectType
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setViewingItem(updated);
        setIsEditingItem(false);
        await fetchProfileAndData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to update portfolio project.');
      }
    } catch (err) {
      console.error('Portfolio update error:', err);
      alert('Error updating portfolio: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePortfolio = async (projectId) => {
    if (!window.confirm('Are you sure you want to permanently remove this portfolio item?')) return;
    const token = localStorage.getItem('token');
    setDeletingItem(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setViewingItem(null);
        await fetchProfileAndData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete portfolio item.');
      }
    } catch (err) {
      console.error('Portfolio delete error:', err);
      alert('Error deleting portfolio item: ' + err.message);
    } finally {
      setDeletingItem(false);
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
      <div className="glass-panel" style={{ padding: 'clamp(20px, 4vw, 32px)', borderRadius: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '28px' }}>
        <img 
          src={worker.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=300&h=300'} 
          alt={worker.name}
          style={{ width: 'clamp(90px, 20vw, 130px)', height: 'clamp(90px, 20vw, 130px)', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-light)', flexShrink: 0 }}
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
          {userRole !== 'worker' && (
            <div style={{ marginTop: '12px' }}>
              <button 
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (!token || token === 'null' || token === 'undefined') {
                    alert('Please sign in as a customer to book a service.');
                    navigate(`/login/customer?redirect=${encodeURIComponent(window.location.pathname)}`);
                    return;
                  }
                  setShowBookingModal(true);
                }}
                className="btn-primary" 
                style={{ padding: '12px 28px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Calendar size={18} /> Book Service Now (₹{worker.hourlyRate || 500}/hr)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Work Portfolio Section */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Work Portfolio</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Showcase your best work. Photos and videos help customers trust your skills.
            </p>
          </div>

          {isOwnProfile && (
            <button 
              onClick={() => {
                resetPortfolioModal();
                setShowPortfolioModal(true);
              }}
              className="btn-primary" 
              style={{ padding: '9px 18px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: '700' }}
            >
              <Plus size={17} /> Add Photo / Video
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'photos', label: 'Photos', icon: ImageIcon },
            { id: 'videos', label: 'Videos', icon: Video },
            { id: 'projects', label: 'Projects', icon: Briefcase },
            { id: 'before_after', label: 'Before & After', icon: ArrowRight }
          ].map(filter => {
            const Icon = filter.icon;
            const isActive = portfolioFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setPortfolioFilter(filter.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? '700' : '600',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  background: isActive ? 'var(--accent-primary)' : '#f8fafc',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none'
                }}
              >
                {Icon && <Icon size={14} />}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Portfolio Media Grid */}
        {(() => {
          const filteredPortfolio = portfolio.filter(p => {
            if (portfolioFilter === 'all') return true;
            if (portfolioFilter === 'photos') return (p.mediaType === 'image' || !p.mediaType) && p.projectType !== 'Before & After';
            if (portfolioFilter === 'videos') return p.mediaType === 'video' || Boolean(p.videoUrl);
            if (portfolioFilter === 'projects') return ['Completed Work', 'New Installation', 'Installation', 'Repair', 'Maintenance', 'Other'].includes(p.projectType);
            if (portfolioFilter === 'before_after') return p.projectType === 'Before & After';
            return true;
          });

          if (filteredPortfolio.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '48px 16px', background: '#f8fafc', borderRadius: '18px', border: '1px dashed #cbd5e1' }}>
                <ImageIcon size={44} style={{ opacity: 0.35, marginBottom: '10px', color: 'var(--accent-primary)' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {portfolioFilter === 'all' ? 'No portfolio showcases yet' : `No ${portfolioFilter.replace('_', ' ')} found`}
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  {isOwnProfile 
                    ? 'Upload photos or videos of previous jobs to demonstrate your work quality to potential clients.'
                    : 'This professional has not uploaded showcases in this category yet.'}
                </p>
                {isOwnProfile && (
                  <button 
                    onClick={() => {
                      resetPortfolioModal();
                      setShowPortfolioModal(true);
                    }}
                    className="btn-primary" 
                    style={{ marginTop: '16px', padding: '8px 18px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} /> Add Photo / Video
                  </button>
                )}
              </div>
            );
          }

          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))',
              gap: '16px'
            }}>
              {filteredPortfolio.map(p => {
                const isVideo = p.mediaType === 'video' || Boolean(p.videoUrl);
                const isBeforeAfter = p.projectType === 'Before & After' || (p.beforeImage && p.afterImage);
                const thumbImg = resolveMediaUrl(p.imageUrl || (p.images && p.images[0]) || p.beforeImage || p.afterImage || 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600');
                const beforeThumb = resolveMediaUrl(p.beforeImage || (p.images && p.images[0]) || thumbImg);
                const afterThumb = resolveMediaUrl(p.afterImage || (p.images && p.images[1]) || thumbImg);

                return (
                  <div
                    key={p._id}
                    onClick={() => handleOpenItem(p)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: '#0f172a',
                      cursor: 'pointer',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                      transition: 'transform 0.22s ease, box-shadow 0.22s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 24px rgba(79, 70, 229, 0.16)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.05)';
                    }}
                  >
                    {isBeforeAfter ? (
                      /* Before & After Split Card */
                      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
                        <div style={{ width: '50%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                          <img 
                            src={beforeThumb} 
                            alt="Before" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            loading="lazy"
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            letterSpacing: '0.3px'
                          }}>
                            Before
                          </span>
                        </div>

                        <div style={{ width: '1.5px', height: '100%', background: 'rgba(255, 255, 255, 0.85)', zIndex: 2 }} />

                        <div style={{ width: '50%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                          <img 
                            src={afterThumb} 
                            alt="After" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            loading="lazy"
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'var(--accent-primary)',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            letterSpacing: '0.3px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}>
                            After
                          </span>
                        </div>

                        {/* Top-right Before & After icon badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '6px',
                          padding: '4px',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 3
                        }}>
                          <ImageIcon size={13} />
                        </div>
                      </div>
                    ) : isVideo ? (
                      /* Video Media Card */
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        {p.imageUrl ? (
                          <img 
                            src={thumbImg} 
                            alt={p.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            loading="lazy"
                          />
                        ) : (
                          <video 
                            src={resolveMediaUrl(p.videoUrl)} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            muted 
                            preload="metadata"
                          />
                        )}

                        {/* Subtle dark tint */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.22)' }} />

                        {/* Centered circular play button */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.88)',
                          backdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1e1b4b',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                          transition: 'transform 0.2s ease'
                        }}>
                          <Play size={20} fill="#1e1b4b" style={{ marginLeft: '2px' }} />
                        </div>

                        {/* Top-Right video badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '6px',
                          padding: '4px',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Video size={13} />
                        </div>

                        {/* Bottom-Right duration badge */}
                        {p.videoDuration && (
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            letterSpacing: '0.4px'
                          }}>
                            {p.videoDuration}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Standard Photo Card */
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <img 
                          src={thumbImg} 
                          alt={p.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          loading="lazy"
                        />

                        {/* Top-Right photo badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '6px',
                          padding: '4px',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <ImageIcon size={13} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
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

          <form onSubmit={handleKYCSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 'min(94vw, 520px)',
            maxHeight: '90vh',
            maxHeight: '90dvh',
            overflowY: 'auto',
            borderRadius: '24px',
            padding: 'clamp(20px, 4vw, 32px)',
            position: 'relative'
          }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                    Service Location Address {customerCoordinates ? <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Optional with GPS)</span> : <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <button 
                    type="button"
                    onClick={handleDetectCustomerLocation}
                    disabled={gpsStatus.loading}
                    style={{
                      background: 'rgba(37,99,235,0.08)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    <Navigation size={12} /> {gpsStatus.loading ? 'Detecting GPS...' : '📍 Use Current GPS'}
                  </button>
                </div>
                <input 
                  type="text" 
                  value={bookingLocation}
                  onChange={e => setBookingLocation(e.target.value)}
                  placeholder={customerCoordinates ? "Optional: Add flat number/landmark or leave blank (GPS attached)..." : "Enter your flat/house address..."}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                  required={!customerCoordinates}
                />
                {gpsStatus.success && customerCoordinates && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✓ GPS attached: [{customerCoordinates[1].toFixed(4)}, {customerCoordinates[0].toFixed(4)}]</span>
                    <button
                      type="button"
                      onClick={() => { setCustomerCoordinates(null); setGpsStatus({ loading: false, error: null, success: false }); }}
                      style={{ background: 'none', border: 'none', color: '#059669', fontWeight: '700', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                    >
                      Clear
                    </button>
                  </div>
                )}
                {gpsStatus.error && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px' }}>
                    ⚠️ {gpsStatus.error}
                  </div>
                )}
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

      {/* Modern Add to Portfolio Modal */}
      {showPortfolioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 'min(94vw, 540px)',
            maxHeight: '90vh',
            maxHeight: '90dvh',
            overflowY: 'auto',
            borderRadius: '24px',
            padding: 'clamp(20px, 4vw, 30px)',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowPortfolioModal(false);
                resetPortfolioModal();
              }}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Add to Portfolio</h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Upload photos or videos of your completed work to build trust with customers.
            </p>

            {/* Error Message */}
            {portfolioError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '12px',
                marginBottom: '16px',
                fontSize: '0.84rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{portfolioError}</span>
              </div>
            )}

            {/* Top Media Type Switcher: [ Photo ] [ Video ] */}
            {portfolioProjectType !== 'Before & After' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMediaType('image');
                    setMediaFile(null);
                    setMediaPreview('');
                    setVideoDuration('');
                    setPortfolioError('');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    border: uploadMediaType === 'image' ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                    background: uploadMediaType === 'image' ? 'var(--accent-light)' : '#f8fafc',
                    color: uploadMediaType === 'image' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ImageIcon size={17} /> Photo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadMediaType('video');
                    setMediaFile(null);
                    setMediaPreview('');
                    setVideoDuration('');
                    setPortfolioError('');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    border: uploadMediaType === 'video' ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                    background: uploadMediaType === 'video' ? 'var(--accent-light)' : '#f8fafc',
                    color: uploadMediaType === 'video' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Video size={17} /> Video
                </button>
              </div>
            )}

            {/* Dropzone & Media Selection */}
            {portfolioProjectType === 'Before & After' ? (
              /* Before & After Dual Upload */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                {/* Before Photo */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Before Photo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="file"
                    ref={beforeInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={e => e.target.files?.[0] && handleSelectBeforeFile(e.target.files[0])}
                  />

                  {beforePreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      <img src={beforePreview} alt="Before Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setBeforeFile(null);
                          setBeforePreview('');
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                      <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(15, 23, 42, 0.75)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        Before
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => beforeInputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '18px 8px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '140px'
                      }}
                    >
                      <CloudUpload size={24} color="var(--accent-primary)" style={{ marginBottom: '6px' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>Upload Before</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Max 5 MB</div>
                    </div>
                  )}
                </div>

                {/* After Photo */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    After Photo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="file"
                    ref={afterInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={e => e.target.files?.[0] && handleSelectAfterFile(e.target.files[0])}
                  />

                  {afterPreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      <img src={afterPreview} alt="After Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setAfterFile(null);
                          setAfterPreview('');
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                      <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        After
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => afterInputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '18px 8px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '140px'
                      }}
                    >
                      <CloudUpload size={24} color="var(--accent-primary)" style={{ marginBottom: '6px' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>Upload After</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Max 5 MB</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single Photo / Video Dropzone */
              <div style={{ marginBottom: '18px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept={uploadMediaType === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/jpg,image/png,image/webp'}
                  onChange={e => e.target.files?.[0] && handleSelectMedia(e.target.files[0], uploadMediaType)}
                />

                {!mediaPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOverMedia(true); }}
                    onDragLeave={() => setDragOverMedia(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOverMedia(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleSelectMedia(e.dataTransfer.files[0], uploadMediaType);
                      }
                    }}
                    style={{
                      border: dragOverMedia ? '2px dashed var(--accent-primary)' : '2px dashed #cbd5e1',
                      borderRadius: '16px',
                      padding: '28px 16px',
                      textAlign: 'center',
                      background: dragOverMedia ? 'var(--accent-glow)' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--accent-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px'
                    }}>
                      <CloudUpload size={26} color="var(--accent-primary)" />
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Click to upload {uploadMediaType === 'video' ? 'video' : 'photos'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      or drag and drop
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {uploadMediaType === 'video' ? 'MP4, WebM (Max 25 MB)' : 'JPG, PNG, WebP (Max 5 MB)'}
                    </div>
                  </div>
                ) : (
                  /* Media Preview with Remove Button */
                  <div style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-glass)',
                    background: '#0f172a',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
                  }}>
                    {uploadMediaType === 'video' ? (
                      <video
                        src={mediaPreview}
                        controls
                        style={{ width: '100%', maxHeight: '220px', display: 'block', background: '#000' }}
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Selected Preview"
                        style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview('');
                        setVideoDuration('');
                      }}
                      title="Remove media"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        zIndex: 5
                      }}
                    >
                      <X size={16} />
                    </button>

                    {videoDuration && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        Duration: {videoDuration}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleAddPortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Project Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>Description</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{portfolioDesc.length}/500</span>
                </div>
                <textarea 
                  rows={3}
                  placeholder="Details of materials used, job scale, location etc..."
                  maxLength={500}
                  value={portfolioDesc}
                  onChange={e => setPortfolioDesc(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                />
              </div>

              {/* Category / Service Selector */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Category / Service
                </label>
                <select
                  value={portfolioCategory}
                  onChange={e => setPortfolioCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                >
                  {[
                    ...(worker?.skills || []),
                    'Plumbing',
                    'Electrical',
                    'Carpentry',
                    'Painting',
                    'Tutor',
                    'Photographer',
                    'Graphic Designer',
                    'Tailor',
                    'Fitness Trainer',
                    'Yoga Trainer',
                    'Makeup Artist',
                    'Laptop Technician',
                    'Mobile Technician',
                    'Accountant',
                    'Housekeeping & Cleaning',
                    'Other (Type Custom)'
                  ].filter((val, idx, arr) => arr.indexOf(val) === idx).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {portfolioCategory === 'Other (Type Custom)' && (
                  <input
                    type="text"
                    placeholder="Enter custom service (e.g. Solar Installer, Locksmith)..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', marginTop: '8px' }}
                    required
                  />
                )}
              </div>

              {/* Project Type (Optional) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Project Type (Optional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    'Completed Work',
                    'Before & After',
                    'New Installation',
                    'Repair',
                    'Maintenance',
                    'Other'
                  ].map(type => {
                    const isSelected = portfolioProjectType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setPortfolioProjectType(type);
                          if (type === 'Before & After') {
                            setUploadMediaType('image');
                          }
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? '700' : '600',
                          border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                          background: isSelected ? 'var(--accent-primary)' : '#f8fafc',
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions: [Cancel] [Upload] */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPortfolioModal(false);
                    resetPortfolioModal();
                  }}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingPortfolio}
                  className="btn-primary" 
                  style={{ padding: '10px 24px', fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {submittingPortfolio ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Item Detail Viewer Modal */}
      {viewingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 'min(94vw, 760px)',
            maxHeight: '90vh',
            maxHeight: '90dvh',
            overflowY: 'auto',
            borderRadius: '24px',
            padding: 'clamp(20px, 4vw, 30px)',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setViewingItem(null);
                setIsEditingItem(false);
              }}
              style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: 'rgba(241, 245, 249, 0.8)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>

            {/* Media Presentation */}
            <div style={{ marginBottom: '20px' }}>
              {viewingItem.projectType === 'Before & After' || (viewingItem.beforeImage && viewingItem.afterImage) ? (
                /* Side by Side Comparison */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                          Before Work
                        </span>
                      </div>
                      <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#0f172a', height: '280px' }}>
                        <img 
                          src={resolveMediaUrl(viewingItem.beforeImage || viewingItem.images?.[0] || viewingItem.imageUrl)} 
                          alt="Before" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', color: '#ffffff', background: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '4px' }}>
                          After Completion
                        </span>
                      </div>
                      <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#0f172a', height: '280px' }}>
                        <img 
                          src={resolveMediaUrl(viewingItem.afterImage || viewingItem.images?.[1] || viewingItem.imageUrl)} 
                          alt="After" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewingItem.mediaType === 'video' || Boolean(viewingItem.videoUrl) ? (
                /* Playable Video */
                <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', maxHeight: '420px', display: 'flex', justifyContent: 'center' }}>
                  <video 
                    src={resolveMediaUrl(viewingItem.videoUrl || viewingItem.imageUrl)} 
                    controls 
                    autoPlay 
                    style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                /* Full Image */
                <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#0f172a', maxHeight: '440px', display: 'flex', justifyContent: 'center' }}>
                  <img 
                    src={resolveMediaUrl(viewingItem.imageUrl || (viewingItem.images && viewingItem.images[0]))} 
                    alt={viewingItem.title} 
                    style={{ width: '100%', maxHeight: '440px', objectFit: 'contain' }} 
                  />
                </div>
              )}
            </div>

            {/* Content & Metadata */}
            {!isEditingItem ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{
                    background: 'var(--accent-light)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '8px'
                  }}>
                    {viewingItem.category || 'General'}
                  </span>

                  {viewingItem.projectType && (
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '8px'
                    }}>
                      {viewingItem.projectType}
                    </span>
                  )}

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Posted {viewingItem.createdAt ? new Date(viewingItem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                  {viewingItem.title}
                </h3>

                {viewingItem.description && (
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {viewingItem.description}
                  </p>
                )}

                {/* Worker Controls (ONLY visible on own profile) */}
                {isOwnProfile && (
                  <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '16px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setIsEditingItem(true)}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit3 size={15} /> Edit Details
                    </button>
                    <button
                      onClick={() => handleDeletePortfolio(viewingItem._id)}
                      disabled={deletingItem}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.86rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      <Trash2 size={15} /> {deletingItem ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Inline Edit Form for Worker */
              <form onSubmit={handleUpdatePortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Edit Showcase Details</h4>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Project Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Category</label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', borderRadius: '10px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Project Type</label>
                    <select
                      value={editProjectType}
                      onChange={e => setEditProjectType(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                    >
                      <option value="Completed Work">Completed Work</option>
                      <option value="Before & After">Before & After</option>
                      <option value="New Installation">New Installation</option>
                      <option value="Repair">Repair</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Description</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingItem(false)}
                    style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            {value.startsWith('data:image') || /\.(jpe?g|png|webp|gif)($|\?)/i.test(value) ? (
              <div 
                onClick={openDocument}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-glass)',
                  flexShrink: 0,
                  cursor: 'pointer',
                  background: '#0f172a'
                }}
                title="Click to preview full photo"
              >
                <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={22} color="var(--accent-primary)" />
              </div>
            )}
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
