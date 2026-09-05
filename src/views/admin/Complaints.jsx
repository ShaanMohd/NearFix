import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  User, 
  Briefcase, 
  FileText, 
  ExternalLink 
} from 'lucide-react';

export default function Complaints() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({ open: 0, underReview: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/admin/complaints?status=${statusFilter}&category=${categoryFilter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to load complaints');
      const data = await res.json();
      setComplaints(data.complaints || []);
      setCounts(data.counts || { open: 0, underReview: 0, resolved: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.customerId?.name && c.customerId.name.toLowerCase().includes(q)) ||
      (c.workerId?.name && c.workerId.name.toLowerCase().includes(q)) ||
      (c._id && c._id.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return (
          <span style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '700' }}>
            Open
          </span>
        );
      case 'Under Review':
        return (
          <span style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '700' }}>
            Under Review
          </span>
        );
      case 'Resolved':
        return (
          <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '700' }}>
            Resolved
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Complaints
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Review customer complaints and maintain platform safety.
        </p>
      </div>

      {/* Top 3 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        <div 
          className="glass-panel"
          onClick={() => setStatusFilter('Open')}
          style={{ 
            padding: '20px', 
            borderRadius: '18px', 
            cursor: 'pointer',
            border: statusFilter === 'Open' ? '2px solid var(--error)' : '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--error)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {counts.open}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Open Complaints
            </div>
          </div>
        </div>

        <div 
          className="glass-panel"
          onClick={() => setStatusFilter('Under Review')}
          style={{ 
            padding: '20px', 
            borderRadius: '18px', 
            cursor: 'pointer',
            border: statusFilter === 'Under Review' ? '2px solid var(--warning)' : '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {counts.underReview}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Under Review
            </div>
          </div>
        </div>

        <div 
          className="glass-panel"
          onClick={() => setStatusFilter('Resolved')}
          style={{ 
            padding: '20px', 
            borderRadius: '18px', 
            cursor: 'pointer',
            border: statusFilter === 'Resolved' ? '2px solid var(--success)' : '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {counts.resolved}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Resolved
            </div>
          </div>
        </div>

      </div>

      {/* Filter Toolbar */}
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
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search complaints by customer, worker, issue..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '42px', height: '44px', fontSize: '0.9rem' }}
          />
        </div>

        {/* Status Dropdown */}
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '150px', height: '44px', fontSize: '0.9rem' }}
        >
          <option value="all">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Under Review">Under Review</option>
          <option value="Resolved">Resolved</option>
        </select>

        {/* Category Dropdown */}
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '180px', height: '44px', fontSize: '0.9rem' }}
        >
          <option value="all">All Complaint Types</option>
          <option value="Worker did not arrive">Worker did not arrive</option>
          <option value="Poor service">Poor service</option>
          <option value="Misconduct">Misconduct</option>
          <option value="Inappropriate behaviour">Inappropriate behaviour</option>
          <option value="Overcharging">Overcharging</option>
          <option value="Property damage">Property damage</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Complaints Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '20px', color: 'var(--text-secondary)' }}>
          <CheckCircle2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No complaints found
          </h3>
          <p style={{ fontSize: '0.9rem' }}>
            {searchQuery ? 'Try modifying your search criteria.' : 'There are no active complaint reports for this selection.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '16px 20px' }}>Complaint ID</th>
                <th style={{ padding: '16px 20px' }}>Customer</th>
                <th style={{ padding: '16px 20px' }}>Worker</th>
                <th style={{ padding: '16px 20px' }}>Issue Category</th>
                <th style={{ padding: '16px 20px' }}>Booking Ref</th>
                <th style={{ padding: '16px 20px' }}>Date</th>
                <th style={{ padding: '16px 20px' }}>Status</th>
                <th style={{ padding: '16px 20px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((c) => (
                <tr 
                  key={c._id} 
                  style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent-primary)' }}>
                    #{c._id.slice(-6).toUpperCase()}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {c.customerId?.name || 'Customer'}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {c.workerId?.name || 'Worker'}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>
                    {c.category}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                    {c.bookingReference || `BK-${c._id.slice(-4)}`}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {getStatusBadge(c.status)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button 
                      onClick={() => navigate(`/admin/complaints/${c._id}`)}
                      className="btn-outline"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
