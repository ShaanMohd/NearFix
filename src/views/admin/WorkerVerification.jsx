import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  Clock, 
  XCircle, 
  Eye, 
  Loader2, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Calendar 
} from 'lucide-react';

export default function WorkerVerification() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'Verified' | 'Rejected'
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    fetchVerifications();
  }, [activeTab]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/admin/verifications?status=${activeTab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setWorkers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter(w => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = w.name?.toLowerCase().includes(q);
      const matchEmail = w.email?.toLowerCase().includes(q);
      const matchPhone = w.phone?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone) return false;
    }
    if (categoryFilter !== 'all') {
      const matchCat = w.skills?.some(s => s.toLowerCase() === categoryFilter.toLowerCase());
      if (!matchCat) return false;
    }
    if (locationFilter !== 'all') {
      const locStr = w.address || (typeof w.location === 'string' ? w.location : '');
      if (!locStr.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    if (status === 'Verified') {
      return (
        <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={14} /> Verified
        </span>
      );
    }
    if (status === 'Rejected') {
      return (
        <span style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <XCircle size={14} /> Rejected
        </span>
      );
    }
    return (
      <span style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.78rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={14} /> Pending Review
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Title & Subtitle */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          Worker Verification
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Review worker documents and approve qualified professionals.
        </p>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', gap: '8px' }}>
        {['Pending', 'Verified', 'Rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab ? '3px solid var(--accent-primary)' : '3px solid transparent',
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab ? '700' : '500',
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab}
          </button>
        ))}
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
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search worker by name, email, phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '42px', height: '44px', fontSize: '0.9rem' }}
          />
        </div>

        {/* Category Filter */}
        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '160px', height: '44px', fontSize: '0.9rem' }}
        >
          <option value="all">All Categories</option>
          <option value="Electrician">Electrician</option>
          <option value="Plumber">Plumber</option>
          <option value="Painter">Painter</option>
          <option value="Carpenter">Carpenter</option>
          <option value="Interior Design">Interior Design</option>
        </select>

        {/* Location Filter */}
        <select 
          value={locationFilter} 
          onChange={(e) => setLocationFilter(e.target.value)}
          className="input-field"
          style={{ width: 'auto', minWidth: '150px', height: '44px', fontSize: '0.9rem' }}
        >
          <option value="all">All Locations</option>
          <option value="Kochi">Kochi</option>
          <option value="Edappally">Edappally</option>
          <option value="Kaloor">Kaloor</option>
          <option value="Kakkanad">Kakkanad</option>
          <option value="Fort Kochi">Fort Kochi</option>
          <option value="Marine Drive">Marine Drive</option>
        </select>
      </div>

      {/* Verification Cards List / Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={40} className="animate-spin" color="var(--accent-primary)" />
        </div>
      ) : filteredWorkers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '20px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
            No {activeTab.toLowerCase()} verification requests found
          </h3>
          <p style={{ fontSize: '0.9rem' }}>
            {searchQuery ? 'Try adjusting your search filters.' : `There are currently no worker profiles in '${activeTab}' status.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredWorkers.map(worker => (
            <div 
              key={worker._id}
              className="glass-panel"
              style={{
                padding: '20px 24px',
                borderRadius: '18px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px'
              }}
            >
              {/* Worker Info Block */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1 1 350px' }}>
                <img 
                  src={worker.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150'} 
                  alt={worker.name} 
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass)', flexShrink: 0 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                      {worker.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {getStatusBadge(worker.verificationStatus || 'Pending')}
                      {worker.documents && Object.values(worker.documents).some(d => Boolean(d && d.trim())) ? (
                        <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          📁 {Object.values(worker.documents).filter(d => Boolean(d && d.trim())).length} Docs Attached
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: 'var(--accent-primary)' }}>
                      <Briefcase size={14} /> {worker.skills?.[0] || worker.title || 'General Worker'}
                    </span>
                    <span>•</span>
                    <span>{worker.experienceYears ? `${worker.experienceYears} Years Exp` : '3 Years Exp'}</span>
                    <span>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} /> {worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {worker.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {worker.phone || '+91 9446000000'}</span>
                  </div>
                </div>
              </div>

              {/* Submission Date & Review Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div>Submitted Date</div>
                  <div style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                    {worker.createdAt ? new Date(worker.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/admin/verification/${worker._id}`)}
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '0.9rem', borderRadius: '12px' }}
                >
                  Review Application
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
