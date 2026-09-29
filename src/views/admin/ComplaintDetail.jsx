import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  UserX, 
  User, 
  Briefcase, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Loader2, 
  ShieldAlert, 
  X, 
  AlertCircle 
} from 'lucide-react';
import Avatar from '../../components/Avatar';

export default function ComplaintDetail() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [previousComplaintCount, setPreviousComplaintCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Resolution Notes Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Worker Suspension Modal State
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('Repeated customer safety and quality complaints');

  useEffect(() => {
    fetchComplaint();
  }, [complaintId]);

  const fetchComplaint = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/admin/complaints/${complaintId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Complaint not found');
      const data = await res.json();
      setComplaint(data.complaint);
      setPreviousComplaintCount(data.previousComplaintCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status, notes = '') => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/complaints/${complaintId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, resolutionNotes: notes })
      });

      if (!res.ok) throw new Error('Failed to update complaint status');

      const data = await res.json();
      setComplaint(data.complaint);
      setShowResolveModal(false);
      setToastMessage({ type: 'success', text: `Complaint status updated to '${status}'.` });
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendWorker = async (e) => {
    e.preventDefault();
    if (!complaint?.workerId?._id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/admin/workers/${complaint.workerId._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'suspend',
          reason: suspensionReason
        })
      });

      if (!res.ok) throw new Error('Failed to suspend worker');

      setShowSuspendModal(false);
      setToastMessage({ type: 'error', text: `${complaint.workerId.name} has been suspended.` });
      fetchComplaint();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !complaint) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', borderRadius: '20px' }}>
        <AlertCircle size={48} color="var(--error)" style={{ margin: '0 auto 16px auto' }} />
        <h2>Complaint Record Not Found</h2>
        <button onClick={() => navigate('/admin/complaints')} className="btn-primary" style={{ marginTop: '20px' }}>
          Back to Complaints
        </button>
      </div>
    );
  }

  const customer = complaint.customerId || {};
  const worker = complaint.workerId || {};
  const isWorkerSuspended = worker.accountStatus === 'Suspended' || worker.verificationStatus === 'Suspended';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Toast Notification */}
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

      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/admin/complaints')}
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
          <ArrowLeft size={18} /> Back to Complaints List
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Ticket Status:</span>
          <span style={{
            background: complaint.status === 'Open' ? 'var(--error-light)' : complaint.status === 'Under Review' ? 'var(--warning-light)' : 'var(--success-light)',
            color: complaint.status === 'Open' ? 'var(--error)' : complaint.status === 'Under Review' ? 'var(--warning)' : 'var(--success)',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '700'
          }}>
            {complaint.status}
          </span>
        </div>
      </div>

      {/* Main Header & ID */}
      <div className="glass-panel" style={{ padding: 'clamp(18px, 3.5vw, 28px)', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Incident Ticket #{complaint._id.toUpperCase()}
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
              {complaint.category}
            </h1>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Reported on {complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Service Reference</span>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {complaint.bookingReference || `BK-${complaint._id.slice(-6).toUpperCase()}`}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Customer Details & Worker Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px' }}>
        
        {/* Customer Box */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginBottom: '16px' }}>
            <User size={20} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Customer Details</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <Avatar 
              src={customer.avatar} 
              name={customer.name || 'Customer'} 
              size={48} 
            />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                {customer.name || 'Anjali Nair'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Registered Customer</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '14px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} /> {customer.email || 'customer@example.com'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> {customer.phone || '+91 9876543210'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} /> {customer.address || (typeof customer.location === 'string' ? customer.location : 'Kozhikode, Kerala')}</div>
          </div>
        </div>

        {/* Worker Box */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
              <Briefcase size={20} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Worker Details</h3>
            </div>
            {isWorkerSuspended && (
              <span style={{ background: 'var(--error-light)', color: 'var(--error)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '8px', fontWeight: '700' }}>
                Suspended
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <Avatar 
              src={worker.avatar} 
              name={worker.name || 'Worker'} 
              size={48} 
            />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                {worker.name || 'Worker'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {worker.title || worker.skills?.[0] || 'Technical Specialist'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '14px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Verification Status:</span>
              <strong style={{ color: worker.verificationStatus === 'Verified' ? 'var(--success)' : 'var(--warning)' }}>
                {worker.verificationStatus || 'Verified'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Previous Complaints:</span>
              <strong style={{ color: previousComplaintCount > 0 ? 'var(--error)' : 'var(--text-primary)' }}>
                {previousComplaintCount} Record{previousComplaintCount === 1 ? '' : 's'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Success Rating:</span>
              <strong>{worker.successRate ? `${(worker.successRate / 20).toFixed(1)} / 5.0` : '4.8 / 5.0'}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Incident Description & Evidence */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
          Customer Statement
        </h3>
        <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-glass)', fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
          "{complaint.description}"
        </div>

        {/* Evidence Photos */}
        {complaint.evidence && complaint.evidence.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>
              Uploaded Evidence
            </h4>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {complaint.evidence.map((img, i) => (
                <img 
                  key={i} 
                  src={img} 
                  alt="Complaint Evidence" 
                  style={{ width: '180px', height: '120px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-glass)' }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Resolution Notes if Resolved */}
        {complaint.resolutionNotes && (
          <div style={{ marginTop: '24px', background: 'var(--success-light)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ fontWeight: '700', color: 'var(--success)', fontSize: '0.9rem', marginBottom: '4px' }}>
              Resolution Notes
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              {complaint.resolutionNotes}
            </div>
          </div>
        )}
      </div>

      {/* Admin Action Toolbar */}
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
          gap: '16px'
        }}
      >
        <div>
          <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
            Complaint Actions
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Update dispute state or restrict worker platform access.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {complaint.status !== 'Under Review' && (
            <button 
              onClick={() => handleUpdateStatus('Under Review')} 
              className="btn-outline"
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Clock size={16} /> Mark Under Review
            </button>
          )}

          {complaint.status !== 'Resolved' && (
            <button 
              onClick={() => setShowResolveModal(true)} 
              className="btn-primary"
              disabled={actionLoading}
              style={{ background: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={16} /> Resolve Complaint
            </button>
          )}

          {!isWorkerSuspended && (
            <button 
              onClick={() => setShowSuspendModal(true)} 
              style={{
                background: '#ffffff',
                color: 'var(--error)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              disabled={actionLoading}
            >
              <UserX size={16} /> Suspend Worker
            </button>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: 'min(94vw, 480px)', maxHeight: '90vh', maxHeight: '90dvh', overflowY: 'auto', background: '#ffffff', borderRadius: '24px', padding: 'clamp(20px, 4vw, 32px)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>Resolve Complaint</h3>
              <button onClick={() => setShowResolveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Summarize how this dispute was settled with the customer.
            </p>
            <textarea 
              className="input-field" 
              rows={3} 
              placeholder="e.g., Customer accepted resolution; compensation or apology provided." 
              value={resolutionNotes} 
              onChange={e => setResolutionNotes(e.target.value)} 
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowResolveModal(false)} className="btn-outline" style={{ flex: 1, padding: '10px' }}>Cancel</button>
              <button onClick={() => handleUpdateStatus('Resolved', resolutionNotes)} className="btn-primary" style={{ flex: 1, padding: '10px', background: 'var(--success)' }}>
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Worker Modal */}
      {showSuspendModal && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: 'min(94vw, 500px)', maxHeight: '90vh', maxHeight: '90dvh', overflowY: 'auto', background: '#ffffff', borderRadius: '24px', padding: 'clamp(20px, 4vw, 32px)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <ShieldAlert size={32} color="var(--error)" />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center', marginBottom: '8px' }}>
              Suspend Worker Account?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
              Are you sure you want to suspend <strong>{worker.name}</strong>? This worker will be barred from receiving customer bookings on NearFix.
            </p>

            <form onSubmit={handleSuspendWorker} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Reason for Suspension</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={suspensionReason} 
                  onChange={e => setSuspensionReason(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowSuspendModal(false)} className="btn-outline" style={{ flex: 1, padding: '12px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px', background: 'var(--error)' }}>
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
