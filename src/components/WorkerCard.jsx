import React from 'react';
import { MapPin, Star, Briefcase, ShieldCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';

export default function WorkerCard({ worker }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/app/worker/${worker._id || worker.id}`);
  };

  return (
    <div 
      className="glass-panel" 
      onClick={handleCardClick}
      style={{ 
        padding: '20px', 
        cursor: 'pointer', 
        transition: 'all 0.25s ease', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '14px',
        borderRadius: '16px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border-glass)';
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Avatar 
          src={worker.avatar} 
          name={worker.name} 
          size={54}
          style={{ border: '2px solid var(--accent-light)' }}
        />
        <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</span>
            {worker.verificationStatus === 'Verified' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>
                <ShieldCheck size={12} /> Verified
              </span>
            )}
          </h3>
          <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.84rem', margin: '3px 0 0 0' }}>
            <Briefcase size={13} /> {worker.title || worker.skills?.[0] || 'Service Professional'}
          </p>
        </div>
        <div style={{ textAlign: 'right', marginLeft: 'auto', flexShrink: 0 }}>
          <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.05rem' }}>
            ₹{worker.hourlyRate || 500}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/hr</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.78rem', justifyContent: 'flex-end', marginTop: '2px' }}>
            <MapPin size={12} /> {worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala')}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {(worker.skills || []).slice(0, 3).map(skill => (
          <span key={skill} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '3px 10px', borderRadius: '8px', fontWeight: '500' }}>
            {skill}
          </span>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Star size={15} fill="#f59e0b" color="#f59e0b" />
          <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{worker.rating || 4.8}</span>
          <span style={{ color: 'var(--text-muted)' }}>({worker.reviewsCount || 12} reviews)</span>
        </div>
        
        <button 
          className="btn-primary" 
          style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '8px' }}
        >
          View & Book <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
