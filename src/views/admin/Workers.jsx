import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  RotateCcw, 
  XCircle, 
  Eye, 
  Star, 
  AlertTriangle, 
  Loader2, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Calendar,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Avatar from '../../components/Avatar';

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Selected Worker Modal State (View Profile)
  const [selectedWorker, setSelectedWorker] = useState(null);

  // Moderate Modal State (Suspend / Revoke)
  const [moderateAction, setModerateAction] = useState(null); // { worker, action: 'suspend' | 'reactivate' | 'revoke' }
  const [reasonInput, setReasonInput] = useState('');

  useEffect(() => {
    fetchWorkers();
  }, [statusFilter]);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/admin/workers?status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to load workers');
      const data = await res.json();
      setWorkers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerationSubmit = async (e) => {
    e.preventDefault();
    if (!moderateAction) return;
    setActionLoading(true);

    const { worker, action } = moderateAction;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/workers/${worker._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          reason: reasonInput
        })
      });

      if (!res.ok) throw new Error('Failed to update worker status');

      setModerateAction(null);
      setReasonInput('');
      setToastMessage({
        type: action === 'reactivate' ? 'success' : 'error',
        text: `Worker ${worker.name} status updated: ${action.toUpperCase()}`
      });
      fetchWorkers();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredWorkers = workers.filter(w => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.name?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      (w.address || (typeof w.location === 'string' ? w.location : ''))?.toLowerCase().includes(q) ||
      w.skills?.some(s => s.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (worker) => {
    if (worker.accountStatus === 'Suspended' || worker.verificationStatus === 'Suspended') {
      return (
        <span style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700' }}>
          Suspended
        </span>
      );
    }
    if (worker.verificationStatus === 'Verified') {
      return (
        <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700' }}>
          Verified
        </span>
      );
    }
    if (worker.verificationStatus === 'Rejected') {
      return (
        <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700' }}>
          Rejected
        </span>
      );
    }
    return (
      <span style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: '700' }}>
        Pending
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
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

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Workers Management
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Find workers and manage platform safety status and verification credentials.
        </p>
      </div>

      {/* Filters Bar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 20px', 
          borderRadius: '16px', 
          border: '1px solid var(--border-glass)',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search workers by name, skill, location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '42px', height: '44px', fontSize: '0.9rem' }}
          />
        </div>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '160px', height: '44px', fontSize: '0.9rem' }}
        >
          <option value="all">All Statuses</option>
          <option value="Verified">Verified</option>
          <option value="Pending">Pending</option>
          <option value="Rejected">Rejected</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Workers Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '20px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No worker accounts found
          </h3>
          <p style={{ fontSize: '0.9rem' }}>Try clearing or adjusting search filters.</p>
        </div>
      ) : (
        <div className="glass-panel table-responsive" style={{ borderRadius: '20px', overflowX: 'auto', border: '1px solid var(--border-glass)' }}>
          <table style={{ minWidth: '650px', width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 20px' }}>Worker</th>
                <th style={{ padding: '16px 20px' }}>Service Category</th>
                <th style={{ padding: '16px 20px' }}>Rating</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px' }}>Complaints</th>
                <th style={{ padding: '16px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map(w => {
                const isSuspended = w.accountStatus === 'Suspended' || w.verificationStatus === 'Suspended';
                const isVerified = w.verificationStatus === 'Verified' && !isSuspended;

                return (
                  <tr 
                    key={w._id}
                    style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar 
                          src={w.avatar} 
                          name={w.name} 
                          size={42} 
                        />
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{w.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{w.address || (typeof w.location === 'string' ? w.location : 'Kozhikode, Kerala')}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>
                        {w.skills?.[0] || w.title || 'Technical Specialist'}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        <Star size={14} color="#f59e0b" fill="#f59e0b" />
                        {w.successRate ? (w.successRate / 20).toFixed(1) : '5.0'}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                          ({w.reviewsCount || 0})
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      {getStatusBadge(w)}
                    </td>

                    <td style={{ padding: '16px 20px' }}>
                      {w.complaintCount > 0 ? (
                        <span style={{ color: 'var(--error)', fontWeight: '700', background: 'var(--error-light)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                          {w.complaintCount} Flagged
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                      )}
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button 
                          onClick={() => setSelectedWorker(w)}
                          className="btn-outline"
                          style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '8px' }}
                        >
                          View Profile
                        </button>

                        {isSuspended ? (
                          <button 
                            onClick={() => setModerateAction({ worker: w, action: 'reactivate' })}
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '8px', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.3)' }}
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button 
                            onClick={() => setModerateAction({ worker: w, action: 'suspend' })}
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '8px', color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}
                          >
                            Suspend
                          </button>
                        )}

                        {isVerified && (
                          <button 
                            onClick={() => setModerateAction({ worker: w, action: 'revoke' })}
                            className="btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '8px', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.3)' }}
                            title="Revoke Verification"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Worker Profile Detail Modal */}
      {selectedWorker && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)' }}>Worker Safety Profile</h3>
              <button onClick={() => setSelectedWorker(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Header info */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              <Avatar 
                src={selectedWorker.avatar} 
                name={selectedWorker.name} 
                size={70} 
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: '800' }}>{selectedWorker.name}</h4>
                  {getStatusBadge(selectedWorker)}
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--accent-primary)', fontWeight: '600' }}>
                  {selectedWorker.title || selectedWorker.skills?.[0] || 'Technical Specialist'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedWorker.email} • {selectedWorker.phone || '+91 9446738290'}
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Completed Jobs</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{selectedWorker.completedJobs || selectedWorker.reviewsCount || 12}</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Experience</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>{selectedWorker.experienceYears ? `${selectedWorker.experienceYears} Years` : '5 Years'}</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Complaints</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: selectedWorker.complaintCount > 0 ? 'var(--error)' : 'var(--success)', marginTop: '2px' }}>{selectedWorker.complaintCount || 0}</div>
              </div>
            </div>

            {/* Additional Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-glass)', marginBottom: '24px' }}>
              <div><strong>Location / Service Base:</strong> {selectedWorker.address || (typeof selectedWorker.location === 'string' ? selectedWorker.location : 'Kozhikode, Kerala')}</div>
              <div><strong>Service Radius:</strong> {selectedWorker.serviceRadius || '15 km'}</div>
              <div><strong>Working Hours:</strong> {selectedWorker.availabilityHours || '9:00 AM - 6:00 PM'}</div>
              <div><strong>Registered Skills:</strong> {selectedWorker.skills?.join(', ') || 'General Plumbing & Repair'}</div>
              {selectedWorker.rejectionReason && (
                <div style={{ color: 'var(--error)', marginTop: '4px' }}><strong>Moderation Note:</strong> {selectedWorker.rejectionReason}</div>
              )}
            </div>

            {/* Portfolio */}
            {selectedWorker.portfolio && selectedWorker.portfolio.length > 0 && (
              <div>
                <h5 style={{ fontWeight: '700', marginBottom: '10px' }}>Previous Work Gallery</h5>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {selectedWorker.portfolio.map((img, i) => (
                    <img key={i} src={img} alt="Work" style={{ width: '120px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-glass)' }} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setSelectedWorker(null)} className="btn-primary" style={{ padding: '10px 24px' }}>
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation Modal (Suspend, Reactivate, Revoke) */}
      {moderateAction && (
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
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', background: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Confirm {moderateAction.action === 'suspend' ? 'Worker Suspension' : moderateAction.action === 'reactivate' ? 'Account Reactivation' : 'Revoke Verification'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '18px' }}>
              {moderateAction.action === 'suspend' 
                ? `Are you sure you want to suspend ${moderateAction.worker.name}? They will not be visible on the discovery feed.` 
                : moderateAction.action === 'reactivate'
                ? `Reinstate ${moderateAction.worker.name} to active platform status?`
                : `Revoke the verified badge and verification credentials for ${moderateAction.worker.name}?`}
            </p>

            <form onSubmit={handleModerationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {moderateAction.action !== 'reactivate' && (
                <div>
                  <label className="input-label">Reason for Action (Optional)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Safety review or policy violation"
                    value={reasonInput}
                    onChange={e => setReasonInput(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setModerateAction(null)} className="btn-outline" style={{ flex: 1, padding: '12px' }}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    background: moderateAction.action === 'reactivate' ? 'var(--success)' : 'var(--error)' 
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
