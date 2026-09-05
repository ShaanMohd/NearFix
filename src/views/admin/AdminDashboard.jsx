import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  ShieldAlert, 
  Clock, 
  UserX, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  Loader2,
  ChevronRight
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return (
          <span style={{ 
            background: 'var(--error-light)', 
            color: 'var(--error)', 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.78rem', 
            fontWeight: '700' 
          }}>
            Open
          </span>
        );
      case 'Under Review':
        return (
          <span style={{ 
            background: 'var(--warning-light)', 
            color: 'var(--warning)', 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.78rem', 
            fontWeight: '700' 
          }}>
            Under Review
          </span>
        );
      case 'Resolved':
        return (
          <span style={{ 
            background: 'var(--success-light)', 
            color: 'var(--success)', 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.78rem', 
            fontWeight: '700' 
          }}>
            Resolved
          </span>
        );
      default:
        return (
          <span style={{ 
            background: 'var(--bg-tertiary)', 
            color: 'var(--text-secondary)', 
            padding: '4px 10px', 
            borderRadius: '20px', 
            fontSize: '0.78rem', 
            fontWeight: '700' 
          }}>
            {status}
          </span>
        );
    }
  };

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
        <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
      </div>
    );
  }

  const metrics = data?.metrics || {
    pendingVerification: 12,
    verifiedWorkers: 86,
    openComplaints: 4,
    suspendedWorkers: 3
  };

  const pendingWorkers = data?.pendingWorkers || [];
  const recentComplaints = data?.recentComplaints || [];
  const activities = data?.activities || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Manage worker verification and platform safety.
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Pending Verification */}
        <div 
          className="glass-panel" 
          onClick={() => navigate('/admin/verification')}
          style={{ 
            padding: '24px', 
            borderRadius: '20px', 
            cursor: 'pointer',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
              <Clock size={24} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '4px 10px', borderRadius: '12px' }}>
              Requires Action
            </span>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {metrics.pendingVerification}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: '600', marginTop: '6px', fontSize: '0.95rem' }}>
              Pending Verification
            </div>
          </div>
        </div>

        {/* Card 2: Verified Workers */}
        <div 
          className="glass-panel" 
          onClick={() => navigate('/admin/workers?status=Verified')}
          style={{ 
            padding: '24px', 
            borderRadius: '20px', 
            cursor: 'pointer',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}>
              <UserCheck size={24} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--success)', background: 'var(--success-light)', padding: '4px 10px', borderRadius: '12px' }}>
              Active
            </span>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {metrics.verifiedWorkers}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: '600', marginTop: '6px', fontSize: '0.95rem' }}>
              Verified Workers
            </div>
          </div>
        </div>

        {/* Card 3: Open Complaints */}
        <div 
          className="glass-panel" 
          onClick={() => navigate('/admin/complaints')}
          style={{ 
            padding: '24px', 
            borderRadius: '20px', 
            cursor: 'pointer',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--error)' }}>
              <ShieldAlert size={24} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--error)', background: 'var(--error-light)', padding: '4px 10px', borderRadius: '12px' }}>
              Attention
            </span>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {metrics.openComplaints}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: '600', marginTop: '6px', fontSize: '0.95rem' }}>
              Open Complaints
            </div>
          </div>
        </div>

        {/* Card 4: Suspended Workers */}
        <div 
          className="glass-panel" 
          onClick={() => navigate('/admin/workers?status=Suspended')}
          style={{ 
            padding: '24px', 
            borderRadius: '20px', 
            cursor: 'pointer',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--error)' }}>
              <UserX size={24} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--error)', background: 'var(--error-light)', padding: '4px 10px', borderRadius: '12px' }}>
              Restricted
            </span>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {metrics.suspendedWorkers}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontWeight: '600', marginTop: '6px', fontSize: '0.95rem' }}>
              Suspended Workers
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Pending KYC + Recent Complaints & Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '28px' }}>
        
        {/* SECTION: Pending Worker Verification */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Pending Worker Verification
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review KYC docs and credentials</p>
            </div>
            <button 
              onClick={() => navigate('/admin/verification')} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-primary)', 
                fontWeight: '600', 
                fontSize: '0.9rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All <ArrowRight size={16} />
            </button>
          </div>

          {pendingWorkers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <CheckCircle size={36} color="var(--success)" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No pending verification requests</div>
              <div style={{ fontSize: '0.85rem' }}>All worker applications have been processed.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingWorkers.map((worker) => (
                <div 
                  key={worker._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-glass)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img 
                      src={worker.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100'} 
                      alt={worker.name} 
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {worker.name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{worker.skills?.[0] || 'Specialist'}</span>
                        <span>•</span>
                        <span>{worker.experienceYears ? `${worker.experienceYears} Years Exp` : '3 Years Exp'}</span>
                        <span>•</span>
                        <span>{worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala')}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      background: 'rgba(245, 158, 11, 0.12)', 
                      color: 'var(--warning)', 
                      padding: '4px 10px', 
                      borderRadius: '16px', 
                      fontSize: '0.75rem', 
                      fontWeight: '700' 
                    }}>
                      Pending
                    </span>
                    <button 
                      onClick={() => navigate(`/admin/verification/${worker._id}`)}
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '10px' }}
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION: Recent Complaints */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Recent Complaints
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Customer reports requiring safety review</p>
            </div>
            <button 
              onClick={() => navigate('/admin/complaints')} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-primary)', 
                fontWeight: '600', 
                fontSize: '0.9rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All <ArrowRight size={16} />
            </button>
          </div>

          {recentComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={36} color="var(--success)" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No open complaints</div>
              <div style={{ fontSize: '0.85rem' }}>All customer safety reports are cleared.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentComplaints.map((complaint) => (
                <div 
                  key={complaint._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-glass)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {complaint.category}
                      </span>
                      {getStatusBadge(complaint.status)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Customer: <strong>{complaint.customerId?.name || 'Customer'}</strong> • Worker: <strong>{complaint.workerId?.name || 'Worker'}</strong>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/admin/complaints/${complaint._id}`)}
                    className="btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '10px' }}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* SECTION: Recent Activity */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Recent Activity
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activities.map((act) => (
            <div 
              key={act.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '12px 16px', 
                background: 'var(--bg-primary)', 
                borderRadius: '12px',
                border: '1px solid var(--border-glass)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  background: 'rgba(79, 70, 229, 0.1)', 
                  padding: '8px', 
                  borderRadius: '10px', 
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {act.type === 'worker_verified' ? <CheckCircle size={18} color="var(--success)" /> : 
                   act.type === 'worker_suspended' ? <UserX size={18} color="var(--error)" /> :
                   act.type === 'complaint_resolved' ? <ShieldCheck size={18} color="var(--success)" /> :
                   <FileText size={18} color="var(--accent-primary)" />}
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>{act.title}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{act.detail}</div>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                {act.time}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
