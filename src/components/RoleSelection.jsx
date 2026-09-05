import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, UserSearch, ShieldCheck, ArrowRight } from 'lucide-react';

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '840px', width: '100%', textAlign: 'center' }}>
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem', marginBottom: '12px' }}>Welcome to NearFix</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '36px', fontSize: '1.1rem' }}>
          How would you like to use our platform today?
        </p>

        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {/* User Option */}
          <div 
            className="glass-panel" 
            style={{ padding: '28px 20px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={() => navigate('/login/customer')}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
          >
            <div style={{ background: 'rgba(99,102,241,0.1)', padding: '16px', borderRadius: '50%', marginBottom: '18px' }}>
              <UserSearch size={28} color="var(--accent-primary)" />
            </div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>I am a User</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Find trusted local professionals, recommended by your friends.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: '600', marginTop: 'auto', fontSize: '0.9rem' }}>
              User Profile <ArrowRight size={16} />
            </div>
          </div>

          {/* Worker Option */}
          <div 
            className="glass-panel" 
            style={{ padding: '28px 20px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={() => navigate('/login/worker')}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--success)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
          >
            <div style={{ background: 'rgba(16,185,129,0.1)', padding: '16px', borderRadius: '50%', marginBottom: '18px' }}>
              <Briefcase size={28} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>I want to Work</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Offer your skills, team up with others, and build a local reputation.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: '600', marginTop: 'auto', fontSize: '0.9rem' }}>
              Worker Profile <ArrowRight size={16} />
            </div>
          </div>

          {/* Admin Option */}
          <div 
            className="glass-panel" 
            style={{ padding: '28px 20px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onClick={() => navigate('/login/admin')}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
          >
            <div style={{ background: 'rgba(79,70,229,0.1)', padding: '16px', borderRadius: '50%', marginBottom: '18px' }}>
              <ShieldCheck size={28} color="var(--accent-primary)" />
            </div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Admin Panel</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Verify worker KYC, moderate reports, and manage platform safety.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontWeight: '600', marginTop: 'auto', fontSize: '0.9rem' }}>
              Admin Portal <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
