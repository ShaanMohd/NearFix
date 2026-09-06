import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserSearch, AlertCircle, Loader2 } from 'lucide-react';

export default function CustomerLoginView() {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 1200);
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering 
      ? { ...formData, role: 'customer' } 
      : { email: formData.email, password: formData.password };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // Success
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', 'customer');
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      navigate('/app');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <button
        onClick={() => navigate('/')}
        style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="glass-panel auth-card">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ background: 'rgba(99,102,241,0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <UserSearch size={32} color="var(--accent-primary)" />
          </div>
          <h2 className="heading-gradient" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            {isForgotPassword ? 'Reset Password' : isRegistering ? 'Create Customer Account' : 'Customer Sign In'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isForgotPassword ? 'Enter your email to receive a password reset link.' : isRegistering ? 'Join NearFix to find and book verified professionals near you.' : 'Sign in to connect with trusted local service professionals.'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {isForgotPassword ? (
          resetSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(16,185,129,0.2)' }}>
                Reset link sent! If an account exists for <b>{formData.email}</b>, you will receive an email shortly.
              </div>
              <button 
                onClick={() => { setIsForgotPassword(false); setResetSent(false); }} 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px' }}
              >
                Return to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="input-label">Account Email Address</label>
                <input 
                  type="email" 
                  placeholder="you@example.com" 
                  className="input-field" 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Send Reset Link'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsForgotPassword(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '12px', fontSize: '0.95rem' }}
              >
                Cancel and return to login
              </button>
            </form>
          )
        ) : (
          <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {isRegistering && (
                <div>
                  <label className="input-label">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="input-field" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              )}

              <div>
                <label className="input-label">Email Address</label>
                <input 
                  type="email" 
                  placeholder="you@example.com" 
                  className="input-field" 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                  {!isRegistering && (
                    <button 
                      type="button" 
                      onClick={() => { setIsForgotPassword(true); setError(null); setResetSent(false); }} 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="input-field" 
                  required 
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : (isRegistering ? 'Create Account' : 'Sign In')}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
              <span style={{ padding: '0 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => alert('OAuth Integration (Google) is visually mocked for this Hackathon demo.')} className="glass-panel" style={{ flex: 1, minWidth: '100px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', border: '1px solid var(--border-glass)', background: '#ffffff', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s', fontWeight: '600', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
              >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'conic-gradient(from 0deg, #ea4335, #4285f4, #34a853, #fbbc05, #ea4335)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '10px', height: '10px', background: '#ffffff', borderRadius: '50%' }}></div>
                </div> 
                Google
              </button>
              
              <button type="button" onClick={() => alert('OAuth Integration (Apple) is visually mocked for this Hackathon demo.')} className="glass-panel" style={{ flex: 1, minWidth: '100px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', border: '1px solid var(--border-glass)', background: '#ffffff', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s', fontWeight: '600', color: 'var(--text-primary)' }}
                 onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
              >
                <span style={{ fontSize: '1.2rem', lineHeight: 1 }}></span> Apple
              </button>
              
              <button type="button" onClick={() => alert('OAuth Integration (LinkedIn) is visually mocked for this Hackathon demo.')} className="glass-panel" style={{ flex: 1, minWidth: '100px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', border: '1px solid var(--border-glass)', background: '#ffffff', cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s', fontWeight: '600', color: '#0a66c2' }}
                 onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10,102,194,0.06)'; }}
                 onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
              >
                <span style={{ fontWeight: '800', fontFamily: 'sans-serif' }}>in</span> LinkedIn
              </button>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isRegistering ? "Already have an account? " : "Don't have an account? "}
              <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                {isRegistering ? 'Sign In Instead' : 'Sign up'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
