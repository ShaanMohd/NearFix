import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  XCircle, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Briefcase, 
  Award, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  X,
  ExternalLink,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import Avatar from '../../components/Avatar';

export default function WorkerVerificationDetail() {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Document Viewer Modal State
  const [activeDoc, setActiveDoc] = useState(null);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Invalid document');
  const [rejectionDetails, setRejectionDetails] = useState('');

  // Confirmation Modal State for Verify
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);

  useEffect(() => {
    fetchWorker();
  }, [workerId]);

  const fetchWorker = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/admin/verifications/${workerId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Worker not found');
      const data = await res.json();
      setWorker(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/verifications/${workerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'verify' })
      });

      if (!res.ok) throw new Error('Failed to verify worker');

      setShowVerifyConfirm(false);
      setToastMessage({ type: 'success', text: `${worker.name} has been verified successfully!` });
      setTimeout(() => {
        navigate('/admin/verification');
      }, 1500);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/verifications/${workerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'reject',
          reason: rejectionReason,
          details: rejectionDetails
        })
      });

      if (!res.ok) throw new Error('Failed to reject application');

      setShowRejectModal(false);
      setToastMessage({ type: 'error', text: `Application for ${worker.name} was rejected.` });
      setTimeout(() => {
        navigate('/admin/verification');
      }, 1500);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !worker) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '20px' }}>
        <AlertCircle size={48} color="var(--error)" style={{ margin: '0 auto 16px auto' }} />
        <h2>Application Not Found</h2>
        <button onClick={() => navigate('/admin/verification')} className="btn-primary" style={{ marginTop: '20px' }}>
          Return to Verification Queue
        </button>
      </div>
    );
  }

  const getDocMeta = (rawVal, defaultSampleTitle) => {
    if (!rawVal || !rawVal.trim()) {
      return { isUploaded: false, isImage: false, isPdf: false, isRealFile: false, url: null, label: 'Not Uploaded' };
    }
    const val = rawVal.trim();
    const isImage = val.startsWith('data:image') || /\.(jpe?g|png|webp|gif|svg)($|\?)/i.test(val);
    const isPdf = val.startsWith('data:application/pdf') || /\.pdf($|\?)/i.test(val);
    const isRealFile = val.startsWith('data:') || val.startsWith('http');
    let label = 'Attached Document';
    if (isImage) label = 'Document Photo (JPG/PNG)';
    else if (isPdf) label = 'PDF Document';
    else if (val.length < 55) label = val;
    else label = 'Document Uploaded';

    return {
      isUploaded: true,
      isImage,
      isPdf,
      isRealFile,
      url: val,
      label,
      fileName: isImage ? 'Document_Photo.jpg' : (isPdf ? 'Document.pdf' : (isRealFile ? 'Document' : val))
    };
  };

  const openInNewTab = (doc) => {
    if (!doc || !doc.url) return;
    if (doc.isImage) {
      const win = window.open();
      if (win) {
        win.document.write(`<title>${doc.title} - ${worker.name}</title><body style="margin:0; background:#0b0f19; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${doc.url}" style="max-width:95%; max-height:95vh; border-radius:8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" /></body>`);
      }
    } else {
      window.open(doc.url, '_blank');
    }
  };

  const documentsList = [
    {
      key: 'identityProof',
      title: 'Identity Proof',
      type: 'National Identity / Aadhaar / Voter ID / Passport',
      required: true,
      ...getDocMeta(worker.documents?.identityProof, 'Aadhaar_ID_Proof.pdf')
    },
    {
      key: 'addressProof',
      title: 'Address Proof',
      type: 'Utility Bill / Rental Deed / Bank Statement',
      required: true,
      ...getDocMeta(worker.documents?.addressProof, 'Address_Proof.pdf')
    },
    {
      key: 'skillCertificate',
      title: 'Skill Certificate',
      type: 'Trade License / Technical Diploma / ITI Certificate',
      required: false,
      ...getDocMeta(worker.documents?.skillCertificate, 'Skill_Certificate.pdf')
    },
    {
      key: 'experienceProof',
      title: 'Experience Proof',
      type: 'Prior Employment Letter / Client References',
      required: false,
      ...getDocMeta(worker.documents?.experienceProof, 'Experience_Letter.pdf')
    }
  ];


  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Toast message */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '14px 24px',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {toastMessage.text}
        </div>
      )}

      {/* Top back action & status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/admin/verification')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          <ArrowLeft size={18} /> Back to Worker Verification
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Application Status:</span>
          <span style={{
            background: worker.verificationStatus === 'Verified' ? 'var(--success-light)' : worker.verificationStatus === 'Rejected' ? 'var(--error-light)' : 'var(--warning-light)',
            color: worker.verificationStatus === 'Verified' ? 'var(--success)' : worker.verificationStatus === 'Rejected' ? 'var(--error)' : 'var(--warning)',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '0.82rem',
            fontWeight: '700'
          }}>
            {worker.verificationStatus || 'Pending'}
          </span>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        
        {/* Worker Header Details */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--border-glass)', paddingBottom: '28px' }}>
          <Avatar 
            src={worker.avatar} 
            name={worker.name} 
            size={90}
            style={{ borderRadius: '20px', border: '2px solid var(--border-glass)' }}
          />

          <div style={{ flex: 1, minWidth: '240px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {worker.name}
            </h2>
            <div style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', fontWeight: '600', marginBottom: '8px' }}>
              {worker.title || worker.skills?.[0] || 'Service Professional'}
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14} /> {worker.email}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {worker.phone || '+91 9446738290'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala')}</span>
            </div>
          </div>

          {/* Quick Stats Block */}
          <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-primary)', padding: '14px 20px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Experience</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{Number(worker.experienceYears) > 0 ? `${worker.experienceYears} Years` : 'Not specified'}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Service Radius</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{worker.serviceRadius || '15 km'}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Min. Charge</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{(worker.minimumCharge > 0 || worker.startingPrice > 0) ? `₹${worker.minimumCharge || worker.startingPrice}` : 'Not set'}</div>
            </div>
          </div>
        </div>

        {/* Worker Info Breakdown */}
        <div style={{ marginTop: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Service Category</span>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {worker.skills?.join(', ') || 'General Technical Services'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Daily Availability</span>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {worker.availabilityHours || '9:00 AM - 6:00 PM (Mon - Sat)'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Verification Method</span>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              Manual Document-Based Verification
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Application Submitted</span>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '4px' }}>
              {worker.createdAt ? new Date(worker.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}
            </div>
          </div>
        </div>

      </div>

      {/* KYC / Eligibility Documents Section */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              KYC / Eligibility Documents
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Inspect manual identity and skill credentials submitted by the worker.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '700', background: 'var(--accent-light)', padding: '4px 12px', borderRadius: '12px' }}>
            4 Documents Registered
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '18px' }}>
          {documentsList.map((doc, idx) => (
            <div 
              key={idx}
              style={{
                background: '#ffffff',
                padding: '20px',
                borderRadius: '18px',
                border: doc.isUploaded ? '1px solid var(--border-glass)' : '1px dashed #cbd5e1',
                boxShadow: doc.isUploaded ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                {/* Header with Title and Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: doc.isUploaded ? 'var(--accent-light)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {doc.isImage ? <ImageIcon size={18} color="var(--accent-primary)" /> : <FileText size={18} color={doc.isUploaded ? 'var(--accent-primary)' : '#94a3b8'} />}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {doc.title}
                      </h4>
                      <span style={{ fontSize: '0.72rem', color: doc.required ? '#ef4444' : 'var(--text-muted)', fontWeight: doc.required ? '700' : '500' }}>
                        {doc.required ? 'Mandatory Proof *' : 'Optional Document'}
                      </span>
                    </div>
                  </div>

                  {doc.isUploaded ? (
                    <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={12} /> Uploaded
                    </span>
                  ) : (
                    <span style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '600' }}>
                      Pending
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {doc.type}
                </div>

                {/* Preview Thumbnail / Graphic Area */}
                {doc.isUploaded && doc.isImage ? (
                  <div
                    onClick={() => setActiveDoc(doc)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '140px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid var(--border-glass)',
                      background: '#0f172a',
                      marginBottom: '10px'
                    }}
                  >
                    <img 
                      src={doc.url} 
                      alt={doc.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Eye size={13} /> View Photo
                    </div>
                  </div>
                ) : doc.isUploaded && doc.isPdf ? (
                  <div
                    onClick={() => setActiveDoc(doc)}
                    style={{
                      height: '140px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-glass)',
                      background: '#fff5f5',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      gap: '6px',
                      marginBottom: '10px'
                    }}
                  >
                    <FileText size={36} color="#ef4444" />
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#991b1b' }}>PDF Document Attached</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-primary)', textDecoration: 'underline' }}>Click to view document</span>
                  </div>
                ) : doc.isUploaded && !doc.isRealFile ? (
                  <div
                    onClick={() => setActiveDoc(doc)}
                    style={{
                      height: '140px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      gap: '6px',
                      padding: '12px',
                      textAlign: 'center',
                      marginBottom: '10px'
                    }}
                  >
                    <FileText size={32} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>{doc.label}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Registered Record</span>
                  </div>
                ) : (
                  <div
                    style={{
                      height: '140px',
                      borderRadius: '12px',
                      border: '1px dashed #cbd5e1',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      color: '#94a3b8',
                      marginBottom: '10px'
                    }}
                  >
                    <AlertCircle size={28} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>No document submitted</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setActiveDoc(doc)}
                  disabled={!doc.isUploaded}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    opacity: doc.isUploaded ? 1 : 0.4,
                    cursor: doc.isUploaded ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Eye size={15} /> {doc.isImage ? 'View Photo' : 'View Document'}
                </button>
                {doc.isUploaded && doc.isRealFile && (
                  <button
                    onClick={() => openInNewTab(doc)}
                    className="btn-outline"
                    title="Open Full Window"
                    style={{ padding: '8px 12px', borderRadius: '10px' }}
                  >
                    <ExternalLink size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Admin Decision Bar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: 'clamp(18px, 3vw, 24px)', 
          borderRadius: '20px', 
          border: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: '#ffffff',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div>
          <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Verification Decision
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Confirm manual document inspection and authorize this worker to receive local service bookings.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <button 
            onClick={() => setShowRejectModal(true)}
            style={{
              background: '#ffffff',
              color: 'var(--error)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <XCircle size={18} /> Reject Application
          </button>

          <button 
            onClick={() => setShowVerifyConfirm(true)}
            className="btn-primary"
            style={{
              background: 'var(--success)',
              padding: '12px 28px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '0.95rem',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={18} /> Verify Worker
          </button>
        </div>
      </div>

      {/* Document Preview Modal */}
      {activeDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 'min(94vw, 850px)', maxHeight: '92vh', maxHeight: '92dvh', overflowY: 'auto', background: '#ffffff', borderRadius: '24px', padding: 'clamp(16px, 3vw, 28px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                  {activeDoc.title}
                </h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Verification proof submitted for <strong>{worker.name}</strong> • {activeDoc.label}
                </span>
              </div>
              <button 
                onClick={() => setActiveDoc(null)} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Real Document Content Area */}
            <div style={{ flex: 1, minHeight: '360px', maxHeight: '68vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', background: activeDoc.isImage ? '#0b0f19' : 'var(--bg-primary)', border: '1px solid var(--border-glass)', padding: activeDoc.isImage ? '16px' : '0' }}>
              {activeDoc.isImage ? (
                <img 
                  src={activeDoc.url} 
                  alt={activeDoc.title} 
                  style={{ maxWidth: '100%', maxHeight: '64vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }} 
                />
              ) : activeDoc.isPdf ? (
                <iframe 
                  src={activeDoc.url} 
                  title={activeDoc.title} 
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '16px' }} 
                />
              ) : activeDoc.isRealFile ? (
                <iframe 
                  src={activeDoc.url} 
                  title={activeDoc.title} 
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: '16px' }} 
                />
              ) : (
                <div style={{ padding: '40px 24px', textAlign: 'center', maxWidth: '440px' }}>
                  <div style={{ background: 'rgba(79, 70, 229, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <FileText size={32} color="var(--accent-primary)" />
                  </div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{activeDoc.label || 'Reference Document'}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    This document was registered via reference record: "{activeDoc.url || activeDoc.fileName}". If a physical or scanned photo is required, you may request re-upload by rejecting with "Document unclear".
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeDoc.isImage ? '📸 Image Format (JPG/PNG)' : activeDoc.isPdf ? '📄 PDF Document' : '📋 Document Record'}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setActiveDoc(null)} className="btn-outline" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
                  Close
                </button>
                {activeDoc.isRealFile && (
                  <button 
                    onClick={() => openInNewTab(activeDoc)} 
                    className="btn-outline" 
                    style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={15} /> Open in New Tab
                  </button>
                )}
                {activeDoc.isRealFile && (
                  <a 
                    href={activeDoc.url} 
                    download={`${worker.name.replace(/\s+/g, '_')}_${activeDoc.title.replace(/\s+/g, '_')}.${activeDoc.isImage ? 'jpg' : 'pdf'}`}
                    className="btn-primary" 
                    style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    <Download size={15} /> Download Document
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Verify */}
      {showVerifyConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', background: '#ffffff', borderRadius: '24px', padding: '32px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <ShieldCheck size={36} color="var(--success)" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Confirm Worker Verification
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to approve <strong>{worker.name}</strong>? This will grant the worker a verified badge and allow them to take client bookings in Kochi.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowVerifyConfirm(false)} 
                className="btn-outline" 
                style={{ flex: 1, padding: '12px' }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleVerify} 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', background: 'var(--success)' }}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Rejection */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', background: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                Reject Application
              </h3>
              <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="input-label">Reason for Rejection</label>
                <select 
                  className="input-field"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                >
                  <option value="Invalid document">Invalid document</option>
                  <option value="Insufficient information">Insufficient information</option>
                  <option value="Document unclear">Document unclear</option>
                  <option value="Eligibility not confirmed">Eligibility not confirmed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="input-label">Additional Comments / Notes (Optional)</label>
                <textarea 
                  className="input-field" 
                  rows={3}
                  placeholder="Provide details on what document was missing or unclear..."
                  value={rejectionDetails}
                  onChange={(e) => setRejectionDetails(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowRejectModal(false)} 
                  className="btn-outline" 
                  style={{ flex: 1, padding: '12px' }}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '12px', background: 'var(--error)' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
