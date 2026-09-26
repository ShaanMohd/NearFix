import React, { useState, useRef } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save,
  Camera,
  Upload,
  X
} from 'lucide-react';
import { resolveAvatarUrl } from '../../utils/avatar';

export default function Settings() {
  const [adminProfile, setAdminProfile] = useState(() => {
    return JSON.parse(localStorage.getItem('adminProfile') || localStorage.getItem('userProfile') || '{}');
  });

  const [name, setName] = useState(adminProfile.name || 'Platform Admin');
  const [email] = useState(adminProfile.email || 'admin@nearfix.com');
  const [avatar, setAvatar] = useState(adminProfile.avatar || '');

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

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

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Avatar Selection & Validation
  const handleSelectAvatar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setAvatarError('');
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setAvatarError('Only JPG, PNG and WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Profile image must be smaller than 5 MB.');
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) {
      setAvatarError('Please choose a photo from your device first.');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError('');

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/users/me/avatar', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setAvatar(data.avatar);
        const updated = { ...adminProfile, avatar: data.avatar };
        setAdminProfile(updated);
        localStorage.setItem('adminProfile', JSON.stringify(updated));
        localStorage.setItem('userProfile', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));

        setShowAvatarModal(false);
        setAvatarFile(null);
        setAvatarPreview('');
        showToast('success', 'Admin profile photo updated successfully!');
      } else {
        setAvatarError(data.message || 'Failed to upload profile photo.');
      }
    } catch (err) {
      console.error(err);
      setAvatarError('Network error uploading photo: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2 || cleanName.length > 60) {
      showToast('error', 'Administrator Name must be between 2 and 60 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/admin/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: cleanName, avatar })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      const updated = { ...adminProfile, ...data.user };
      setAdminProfile(updated);
      localStorage.setItem('adminProfile', JSON.stringify(updated));
      localStorage.setItem('userProfile', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));

      showToast('success', 'Admin profile updated successfully!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('error', 'Please fill in both current and new passwords.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      showToast('error', 'Password must be between 8 and 72 characters long.');
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      showToast('error', 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password changed successfully!');
    } catch (err) {
      showToast('error', err.message);
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
          
          {/* Avatar Upload Container */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
              <img 
                src={resolveAvatarUrl(avatar, name)} 
                alt={name}
                onClick={() => setShowAvatarModal(true)}
                title="Click to change profile photo"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '3px solid var(--accent-light)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  cursor: 'pointer'
                }}
              />
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                title="Change Photo"
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: '2px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
              >
                <Camera size={14} />
              </button>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(true)}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    borderRadius: '10px'
                  }}
                >
                  <Camera size={15} /> Change Profile Photo
                </button>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                JPG, PNG or WebP up to 5 MB. Updates header and profile immediately.
              </p>
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
                minLength={2}
                maxLength={60}
                required 
              />
            </div>

            <div>
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Email Address</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>Read-only</span>
              </label>
              <input 
                type="email" 
                className="input-field" 
                value={email} 
                readOnly
                disabled
                style={{ 
                  background: 'var(--bg-tertiary)', 
                  cursor: 'not-allowed', 
                  color: 'var(--text-secondary)',
                  opacity: 0.85
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Primary administrator email address is fixed for security.
              </span>
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

      {/* Security & Authentication */}
      <div className="glass-panel" style={{ padding: 'clamp(16px, 3.5vw, 32px)', borderRadius: '24px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-primary)' }}>
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
                minLength={8}
                maxLength={72}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Min 8 chars with uppercase, lowercase, number & special symbol.
              </span>
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
                minLength={8}
                maxLength={72}
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
                showToast('success', 'Notification preference saved!');
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
                showToast('success', 'Notification preference saved!');
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

      {/* Change Profile Photo Modal */}
      {showAvatarModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !uploadingAvatar) {
              setShowAvatarModal(false);
              setAvatarFile(null);
              setAvatarPreview('');
            }
          }}
        >
          <div 
            className="glass-panel" 
            style={{ 
              maxWidth: '440px', 
              width: '100%', 
              borderRadius: '24px', 
              padding: '28px', 
              background: '#ffffff', 
              boxShadow: 'var(--shadow-xl)',
              animation: 'modalFadeIn 0.25s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Change Profile Photo</h3>
              <button 
                type="button"
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarFile(null);
                  setAvatarPreview('');
                }}
                disabled={uploadingAvatar}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {avatarError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#ef4444',
                padding: '10px 14px',
                borderRadius: '12px',
                marginBottom: '16px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{avatarError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ 
                width: '130px', 
                height: '130px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                border: '4px solid var(--accent-light)',
                boxShadow: 'var(--shadow-md)',
                background: 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={avatarPreview || resolveAvatarUrl(avatar, name)} 
                  alt="Avatar Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleSelectAvatar}
                accept="image/jpeg,image/png,image/webp" 
                style={{ display: 'none' }} 
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', fontSize: '0.9rem' }}
              >
                <Upload size={16} /> Choose Photo
              </button>
              
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Supported: JPG, PNG, WebP (Max 5 MB)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarFile(null);
                  setAvatarPreview('');
                }}
                disabled={uploadingAvatar}
                style={{ padding: '10px 18px', borderRadius: '12px' }}
              >
                Cancel
              </button>

              <button 
                type="button"
                className="btn-primary"
                onClick={handleSaveAvatar}
                disabled={uploadingAvatar || !avatarFile}
                style={{ padding: '10px 22px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {uploadingAvatar && <Loader2 size={16} className="animate-spin" />}
                {uploadingAvatar ? 'Uploading...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
