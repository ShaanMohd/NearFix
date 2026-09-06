import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save 
} from 'lucide-react';

export default function Settings() {
  const adminProfile = JSON.parse(localStorage.getItem('adminProfile') || localStorage.getItem('userProfile') || '{}');

  const [name, setName] = useState(adminProfile.name || 'Platform Admin');
  const [email, setEmail] = useState(adminProfile.email || 'admin@nearfix.com');
  const [avatar, setAvatar] = useState(adminProfile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Notifications state
  const [notifyVerification, setNotifyVerification] = useState(true);
  const [notifyComplaint, setNotifyComplaint] = useState(true);

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, email, avatar })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      localStorage.setItem('adminProfile', JSON.stringify(data.user));
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      setToastMessage({ type: 'success', text: 'Admin profile updated successfully!' });
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setToastMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setToastMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (err) {
      setToastMessage({ type: 'error', text: err.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
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
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Admin profile and platform notifications.
        </p>
      </div>

      {/* Admin Profile Section */}
      <div className="glass-panel" style={{ padding: 'clamp(16px, 3.5vw, 32px)', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--accent-primary)' }}>
          <User size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Admin Profile
          </h2>
        </div>

        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <img 
              src={avatar} 
              alt="Admin Avatar" 
              style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass)', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 'min(100%, 220px)' }}>
              <label className="input-label">Avatar Photo URL</label>
              <input 
                type="text" 
                className="input-field" 
                value={avatar} 
                onChange={e => setAvatar(e.target.value)} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label className="input-label">Administrator Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label className="input-label">Email Address</label>
              <input 
                type="email" 
                className="input-field" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={16} /> Save Profile Changes</>}
            </button>
          </div>
        </form>
      </div>

      {/* Security / Password Change */}
      <div className="glass-panel" style={{ padding: 'clamp(16px, 3.5vw, 32px)', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--accent-primary)' }}>
          <Lock size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Security & Authentication
          </h2>
        </div>

        <form onSubmit={handlePasswordSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label className="input-label">Current Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label className="input-label">New Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required 
                minLength={6}
              />
            </div>

            <div>
              <label className="input-label">Confirm New Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                minLength={6}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              type="submit" 
              className="btn-outline" 
              style={{ padding: '12px 24px', borderRadius: '12px' }}
              disabled={passwordLoading}
            >
              {passwordLoading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="glass-panel" style={{ padding: 'clamp(16px, 3.5vw, 32px)', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-primary)' }}>
          <Bell size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Notification Preferences
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '14px 18px', background: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <input 
              type="checkbox" 
              checked={notifyVerification} 
              onChange={e => {
                setNotifyVerification(e.target.checked);
                setToastMessage({ type: 'success', text: 'Notification preference saved!' });
              }}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>New worker verification requests</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Receive notification when skilled professionals upload KYC documents.</div>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', padding: '14px 18px', background: 'var(--bg-primary)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <input 
              type="checkbox" 
              checked={notifyComplaint} 
              onChange={e => {
                setNotifyComplaint(e.target.checked);
                setToastMessage({ type: 'success', text: 'Notification preference saved!' });
              }}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>New customer complaint ticket</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Receive real-time alerts when customer disputes or reports are filed.</div>
            </div>
          </label>
        </div>
      </div>

    </div>
  );
}
