import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, AlertCircle, Loader2, Lock, Mail } from 'lucide-react';

export default function AdminLoginView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('admin@nearfix.com');
  const [password, setPassword] = useState('password123');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'admin' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      if (data.user && data.user.role !== 'admin') {
        throw new Error('Access denied: Account is not an administrator.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      localStorage.setItem('adminProfile', JSON.stringify(data.user));
      navigate('/admin/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('admin@nearfix.com');
    setPassword('password123');
  };

  return (
    <div className="page-container" style={{ background: 'radial-gradient(circle at top, #e0e7ff 0%, #f8fafc 60%)' }}>
      <button
        onClick={() => navigate('/')}
        style={{ 
          position: 'absolute', 
          top: '24px', 
          left: '24px', 
          background: 'none', 
          border: 'none', 
          color: 'var(--text-secondary)', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '1rem',
          fontWeight: '500'
        }}
      >
        <ArrowLeft size={20} /> Back to NearFix
      </button>

      <div className="glass-panel auth-card" style={{ maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            background: 'rgba(79, 70, 229, 0.1)', 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px auto',
            border: '1px solid rgba(79, 70, 229, 0.2)'
          }}>
            <ShieldCheck size={32} color="var(--accent-primary)" />
          </div>
          <h2 className="heading-gradient" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Admin Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Sign in to manage worker verification, complaints, and safety.
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: 'var(--error)', 
            padding: '12px 16px', 
            borderRadius: '12px', 
            marginBottom: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            fontSize: '0.9rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="input-label">Admin Email Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                placeholder="admin@nearfix.com" 
                className="input-field" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: '16px' }}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="input-field" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ paddingLeft: '16px' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary" 
            style={{ marginTop: '12px', width: '100%', height: '48px' }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In as Administrator'}
          </button>
        </form>

        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Demo Admin Credentials:</span>
            <button 
              type="button" 
              onClick={handleDemoLogin} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
            >
              Fill Credentials
            </button>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <div><strong>Email:</strong> admin@nearfix.com</div>
            <div><strong>Password:</strong> password123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
