import React, { useState, useEffect, useRef } from 'react';
import { 
  User, MapPin, Phone, Mail, Save, CalendarCheck, ShieldCheck, 
  Camera, Lock, Navigation, CheckCircle2, AlertCircle, Loader2, X, Upload
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { resolveAvatarUrl } from '../utils/avatar';
export { resolveAvatarUrl };

export default function ProfileView() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [profile, setProfile] = useState(() => {
    return JSON.parse(localStorage.getItem('userProfile')) || {};
  });

  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(profile.phone ? profile.phone.replace(/\D/g, '') : '');
  const [address, setAddress] = useState(profile.address || (typeof profile.location === 'string' ? profile.location : 'Kozhikode, Kerala'));
  const [customerLocation, setCustomerLocation] = useState(profile.location || null);
  
  // Status and feedback
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [detectingGps, setDetectingGps] = useState(false);

  // Avatar Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  useEffect(() => {
    if (!token) return;
    // Fetch latest profile from backend to ensure data is fresh
    fetch(`http://localhost:5000/api/users/profile/${profile.id || profile._id}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.message) {
          setProfile(data);
          setName(data.name || '');
          setPhone(data.phone ? data.phone.replace(/\D/g, '') : '');
          setAddress(data.address || (typeof data.location === 'string' ? data.location : 'Kozhikode, Kerala'));
          setCustomerLocation(data.location || null);
          localStorage.setItem('userProfile', JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, [token]);

  // GPS Location Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // MongoDB GeoJSON order: [longitude, latitude]
        const loc = {
          type: 'Point',
          coordinates: [longitude, latitude]
        };
        setCustomerLocation(loc);
        setAddress(prev => prev || `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        setDetectingGps(false);
      },
      (err) => {
        alert('Could not access GPS location: ' + err.message + '. You can still enter your address manually.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Avatar Selection & Upload
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
      setAvatarError('Please select a photo first.');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError('');

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const res = await fetch('http://localhost:5000/api/users/me/avatar', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setProfile(prev => ({ ...prev, avatar: data.avatar }));
        const stored = JSON.parse(localStorage.getItem('userProfile')) || {};
        localStorage.setItem('userProfile', JSON.stringify({ ...stored, avatar: data.avatar }));
        // Dispatch storage event to notify other components
        window.dispatchEvent(new Event('storage'));
        setShowAvatarModal(false);
        setAvatarFile(null);
        setAvatarPreview('');
        setProfileMessage({ type: 'success', text: 'Profile photo updated successfully!' });
        setTimeout(() => setProfileMessage(null), 4000);
      } else {
        setAvatarError(data.message || 'Failed to upload profile photo.');
      }
    } catch (err) {
      console.error(err);
      setAvatarError('Network error uploading avatar: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Account Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMessage(null);

    // Validations
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2 || cleanName.length > 60) {
      setProfileMessage({ type: 'error', text: 'Full Name must be between 2 and 60 characters.' });
      return;
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(cleanName) || /^\d+$/.test(cleanName)) {
      setProfileMessage({ type: 'error', text: 'Full Name contains invalid characters.' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone && !/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setProfileMessage({ type: 'error', text: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' });
      return;
    }

    if (address && address.trim().length > 200) {
      setProfileMessage({ type: 'error', text: 'Address cannot exceed 200 characters.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: cleanName,
        phone: cleanPhone,
        address: address.trim(),
        ...(customerLocation ? { location: customerLocation } : {})
      };

      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        localStorage.setItem('userProfile', JSON.stringify(data));
        window.dispatchEvent(new Event('storage'));
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        setTimeout(() => setProfileMessage(null), 4000);
      } else {
        setProfileMessage({ type: 'error', text: data.message || 'Failed to update profile.' });
      }
    } catch (err) {
      console.error(err);
      setProfileMessage({ type: 'error', text: 'Network error: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword || !newPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter both current and new password.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordMessage({ type: 'error', text: 'Password must be between 8 and 72 characters.' });
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setPasswordMessage({ type: 'error', text: 'Password must contain uppercase, lowercase, number and a special character.' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('http://localhost:5000/api/users/me/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
        setTimeout(() => setPasswordMessage(null), 4000);
      } else {
        setPasswordMessage({ type: 'error', text: data.message || 'Failed to change password.' });
      }
    } catch (err) {
      console.error(err);
      setPasswordMessage({ type: 'error', text: 'Network error: ' + err.message });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '50px' }}>
      
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>Customer Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Manage your personal details, default service address, and account security.
        </p>
      </div>

      {/* Global Toast */}
      {profileMessage && (
        <div style={{
          background: profileMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: profileMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
          color: profileMessage.type === 'success' ? '#065f46' : '#991b1b',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          {profileMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {profileMessage.text}
        </div>
      )}

      {/* Profile Overview Card with Clickable Avatar */}
      <div className="glass-panel" style={{ padding: 'clamp(20px, 3.5vw, 32px)', borderRadius: '24px', display: 'flex', gap: '22px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
        
        {/* Avatar with Camera Icon Overlay */}
        <div 
          onClick={() => {
            setAvatarError('');
            setShowAvatarModal(true);
          }}
          style={{ position: 'relative', cursor: 'pointer', borderRadius: '50%' }}
          title="Click to change profile photo"
        >
          <img 
            src={resolveAvatarUrl(profile.avatar, name)} 
            alt={name} 
            style={{ width: '86px', height: '86px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-light)', display: 'block' }} 
          />
          <div style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            background: 'var(--accent-primary)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
          }}>
            <Camera size={14} />
          </div>
        </div>
        
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>
              {name || 'Customer User'}
            </h2>
            <span style={{ background: 'var(--accent-light)', color: 'var(--accent-primary)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
              Customer Account
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={15} color="var(--accent-primary)" /> {profile.email || 'customer@example.com'}
          </p>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={14} color="var(--accent-primary)" /> {address}
          </p>

          <button
            onClick={() => {
              setAvatarError('');
              setShowAvatarModal(true);
            }}
            style={{
              marginTop: '8px',
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Camera size={13} /> Change Profile Photo
          </button>
        </div>
      </div>

      {/* Account Settings Form Card */}
      <div className="glass-panel" style={{ padding: 'clamp(20px, 3.5vw, 30px)', borderRadius: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 18px 0', color: 'var(--text-primary)' }}>
          Account Settings
        </h3>

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Full Name */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
              Full Name <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="input-field" 
              style={{ width: '100%', borderRadius: '10px', height: '42px' }}
              placeholder="e.g. John Doe"
              required 
              maxLength={60}
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
              Email Address (Verified)
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                value={profile.email || ''} 
                readOnly
                disabled
                className="input-field" 
                style={{ width: '100%', borderRadius: '10px', height: '42px', background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }} 
              />
              <Lock size={14} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '14px' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              Email is verified with OTP and cannot be modified directly.
            </span>
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
              Phone Number (10 Digits)
            </label>
            <input 
              type="tel" 
              inputMode="numeric"
              maxLength={10}
              value={phone} 
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="input-field" 
              style={{ width: '100%', borderRadius: '10px', height: '42px' }} 
              placeholder="e.g. 9876543210"
            />
          </div>

          {/* Default Address & Location */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0 }}>
                Default Address / Location
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detectingGps}
                className="btn-secondary"
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '0.78rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '5px',
                  borderRadius: '6px' 
                }}
              >
                {detectingGps ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} color="#2563eb" />}
                {detectingGps ? 'Detecting...' : 'Use Current Location'}
              </button>
            </div>
            <input 
              type="text" 
              value={address} 
              onChange={e => setAddress(e.target.value)}
              maxLength={200}
              className="input-field" 
              style={{ width: '100%', borderRadius: '10px', height: '42px' }} 
              placeholder="e.g. Mavoor Road, Kozhikode, Kerala"
            />
            {customerLocation?.coordinates && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                GPS Coordinates: [{customerLocation.coordinates[1].toFixed(4)}, {customerLocation.coordinates[0].toFixed(4)}]
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary" 
              style={{ padding: '10px 26px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password Section */}
      <div className="glass-panel" style={{ padding: 'clamp(20px, 3.5vw, 30px)', borderRadius: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ShieldCheck size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
            Security & Password
          </h3>
        </div>

        {passwordMessage && (
          <div style={{
            background: passwordMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: passwordMessage.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
            color: passwordMessage.type === 'success' ? '#065f46' : '#991b1b',
            padding: '10px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            fontSize: '0.85rem'
          }}>
            {passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {passwordMessage.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
              Current Password
            </label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input-field" 
              style={{ width: '100%', borderRadius: '10px', height: '42px' }}
              placeholder="Enter current password"
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                New Password
              </label>
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input-field" 
                style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                placeholder="Minimum 8 characters"
                required 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input-field" 
                style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                placeholder="Re-enter new password"
                required 
              />
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Must contain 8–72 characters with at least one uppercase letter, one lowercase letter, one number, and one special character.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button 
              type="submit" 
              disabled={changingPassword}
              className="btn-secondary" 
              style={{ padding: '10px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {changingPassword && <Loader2 size={16} className="animate-spin" />}
              {changingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Profile Photo Modal */}
      {showAvatarModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '440px',
            borderRadius: '24px',
            padding: '24px',
            background: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Change Profile Photo</h3>
              <button 
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarFile(null);
                  setAvatarPreview('');
                }}
                style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {avatarError && (
              <div style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '14px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={15} /> {avatarError}
              </div>
            )}

            <form onSubmit={handleSaveAvatar} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              
              {/* Photo Preview Circle */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '130px',
                  height: '130px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px dashed var(--accent-primary)',
                  position: 'relative',
                  cursor: 'pointer',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img 
                    src={resolveAvatarUrl(profile.avatar, name)} 
                    alt="Current" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                )}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  borderRadius: '50%'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <Camera size={24} />
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', marginTop: '4px' }}>Choose</span>
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleSelectAvatar} 
                accept="image/jpeg,image/png,image/webp,image/jpg" 
                style={{ display: 'none' }} 
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} /> Choose Photo from Device
              </button>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Supports JPG, PNG, and WebP (Max 5 MB)
              </span>

              <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarModal(false);
                    setAvatarFile(null);
                    setAvatarPreview('');
                  }}
                  className="btn-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingAvatar || !avatarFile}
                  className="btn-primary"
                  style={{ padding: '9px 22px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {uploadingAvatar && <Loader2 size={14} className="animate-spin" />}
                  {uploadingAvatar ? 'Saving...' : 'Save Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
