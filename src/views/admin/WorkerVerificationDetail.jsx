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
  Download
} from 'lucide-react';

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

  const documentsList = [
    {
      title: 'Identity Proof',
      type: 'National Identity / Aadhaar / Passport',
      fileName: worker.documents?.identityProof || 'Govt_ID_Proof.pdf',
      status: 'Uploaded',
      previewType: 'id'
    },
    {
      title: 'Address Proof',
      type: 'Utility Bill / Rental Deed / Bank Statement',
      fileName: worker.documents?.addressProof || 'Residential_Proof.pdf',
      status: 'Uploaded',
      previewType: 'address'
    },
    {
      title: 'Skill Certificate (Optional)',
      type: 'Trade License / Technical Diploma / ITI',
      fileName: worker.documents?.skillCertificate || 'Skill_Trade_Certificate.pdf',
      status: worker.documents?.skillCertificate ? 'Uploaded' : 'Provided on Request',
      previewType: 'cert'
    },
    {
      title: 'Experience Proof (Optional)',
      type: 'Prior Employment Letter / Client References',
      fileName: worker.documents?.experienceProof || 'Experience_Proof_Letter.pdf',
      status: worker.documents?.experienceProof ? 'Uploaded' : 'Provided on Request',
      previewType: 'exp'
    }
  ];

  const portfolioImages = worker.portfolio && worker.portfolio.length > 0 
    ? worker.portfolio 
    : [
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&h=450',
        'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=600&h=450',
        'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&h=450'
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
          <img 
            src={worker.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200'} 
            alt={worker.name} 
            style={{ width: '90px', height: '90px', borderRadius: '20px', objectFit: 'cover', border: '2px solid var(--border-glass)' }}
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
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{worker.experienceYears ? `${worker.experienceYears} Years` : '5 Years'}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Service Radius</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{worker.serviceRadius || '15 km'}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Rate</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>₹{worker.hourlyRate || 500}/hr</div>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {documentsList.map((doc, idx) => (
            <div 
              key={idx}
              style={{
                background: 'var(--bg-primary)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '8px' }}>
                  <FileText size={20} />
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{doc.title}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  {doc.type}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  {doc.fileName}
                </div>
              </div>

              <button 
                onClick={() => setActiveDoc(doc)}
                className="btn-outline"
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Eye size={16} /> View Document
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Preview Gallery */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Portfolio Preview
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Previous on-site work and project images submitted by {worker.name}.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {portfolioImages.map((imgUrl, i) => (
            <div 
              key={i} 
              style={{ 
                height: '160px', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                border: '1px solid var(--border-glass)',
                position: 'relative'
              }}
            >
              <img 
                src={imgUrl} 
                alt={`Work sample ${i+1}`} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Admin Decision Bar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px 32px', 
          borderRadius: '20px', 
          border: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', background: '#ffffff', borderRadius: '24px', padding: '28px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>{activeDoc.title}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activeDoc.fileName}</span>
              </div>
              <button onClick={() => setActiveDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={22} />
              </button>
            </div>

            {/* Mock Document Render */}
            <div style={{ height: '320px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '20px', borderRadius: '50%', marginBottom: '16px' }}>
                <FileText size={48} color="var(--accent-primary)" />
              </div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>Official Government Record / Certificate</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', marginTop: '6px' }}>
                Verified document submitted for {worker.name}. All signatures, official seals, and dates are valid for manual compliance.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setActiveDoc(null)} className="btn-outline" style={{ padding: '10px 20px' }}>
                Close Preview
              </button>
              <button onClick={() => { alert(`Simulating download of ${activeDoc.fileName}`); }} className="btn-primary" style={{ padding: '10px 20px' }}>
                <Download size={16} /> Download File
              </button>
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
