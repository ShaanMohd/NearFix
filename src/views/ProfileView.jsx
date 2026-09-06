import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Save, CalendarCheck, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileView() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const storedProfile = JSON.parse(localStorage.getItem('userProfile')) || {};

  const [name, setName] = useState(storedProfile.name || '');
  const [phone, setPhone] = useState(storedProfile.phone || '');
  const [address, setAddress] = useState(storedProfile.address || (typeof storedProfile.location === 'string' ? storedProfile.location : 'Kozhikode, Kerala'));
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone, address })
      });

      if (res.ok) {
        const updated = await res.json();
        localStorage.setItem('userProfile', JSON.stringify(updated));
        setSaving(false);
        alert('Profile updated successfully!');
      } else {
        setSaving(false);
      }
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>Customer Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Manage your personal details and contact information.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 'clamp(18px, 3.5vw, 32px)', borderRadius: '24px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
        <img 
          src={storedProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Customer')}`} 
          alt={name} 
          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-light)', flexShrink: 0 }} 
        />
        
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {name || 'Customer User'}
            <span style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
              Customer Account
            </span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={15} color="var(--accent-primary)" /> {storedProfile.email || 'customer@example.com'}
          </p>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <MapPin size={14} style={{ display: 'inline' }} /> {address}
          </span>
        </div>
      </div>

      {/* Edit Form */}
      <div className="glass-panel" style={{ padding: 'clamp(18px, 3.5vw, 28px)', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 16px 0' }}>Account Settings</h3>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="input-field" 
              style={{ width: '100%', borderRadius: '10px' }}
              required 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Phone Number</label>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              className="input-field" 
              style={{ width: '100%', borderRadius: '10px' }} 
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Default Location</label>
            <input 
              type="text" 
              value={address} 
              onChange={e => setAddress(e.target.value)}
              className="input-field" 
              style={{ width: '100%', borderRadius: '10px' }} 
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary" 
              style={{ padding: '10px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
