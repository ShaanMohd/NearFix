import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, UserSearch, AlertCircle, Loader2, MapPin, Mail, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function CustomerLoginView() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || location.state?.from || '/app';
  const initialMode = searchParams.get('mode');

  const [isRegistering, setIsRegistering] = useState(initialMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification States
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Sync mode if query changes
  useEffect(() => {
    if (initialMode === 'signup') {
      setIsRegistering(true);
      setIsVerifyingOtp(false);
    }
  }, [initialMode]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Password Criteria Validation
  const passwordCriteria = {
    minLength: formData.password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSpecial: /[@$!%*?&#^()_\-+={}[\]|:;"'<>,.~`]/.test(formData.password)
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
  const isPasswordMatch = formData.password.length > 0 && formData.password === formData.confirmPassword;

  const handleResetPassword = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 1200);
  };

  // Step 1: Send OTP for Registration (Validating password and confirm password)
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validate Password Complexity
    if (formData.password.length < 8) {
      setError(`Password must be at least 8 characters long (currently ${formData.password.length} characters). Please add ${8 - formData.password.length} more character${8 - formData.password.length === 1 ? '' : 's'}.`);
      return;
    }
    if (!isPasswordValid) {
      setError('Password must contain at least one letter, one number, and one special character.');
      return;
    }

    // Validate Confirm Password Match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/send-register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }

      setIsVerifyingOtp(true);
      setCooldown(60);
      setSuccessMessage(`A 6-digit verification code has been sent to ${formData.email.toLowerCase()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/send-register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend verification code');
      }

      setCooldown(60);
      setOtp('');
      setSuccessMessage('A fresh verification code has been sent to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Complete Registration
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Verify OTP with backend
      const verifyRes = await fetch('http://localhost:5000/api/auth/verify-register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: otp.trim()
        })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.message || 'Invalid or expired verification code');
      }

      const emailVerificationToken = verifyData.emailVerificationToken;

      // 2. Finalize Registration with emailVerificationToken
      const regRes = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'customer',
          emailVerificationToken
        })
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        throw new Error(regData.message || 'Account registration failed');
      }

      // Success
      localStorage.setItem('token', regData.token);
      localStorage.setItem('userRole', 'customer');
      localStorage.setItem('userProfile', JSON.stringify(regData.user));
      navigate(redirectTarget);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', 'customer');
      localStorage.setItem('userProfile', JSON.stringify(data.user));
      navigate(redirectTarget);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchAuthMode = (registering) => {
    setIsRegistering(registering);
    setIsVerifyingOtp(false);
    setOtp('');
    setError(null);
    setSuccessMessage(null);
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
            {isVerifyingOtp ? <KeyRound size={32} color="var(--accent-primary)" /> : <UserSearch size={32} color="var(--accent-primary)" />}
          </div>
          <h2 className="heading-gradient" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            {isForgotPassword 
              ? 'Reset Password' 
              : isRegistering 
                ? (isVerifyingOtp ? 'Verify Your Email' : 'Create Customer Account')
                : 'Customer Sign In'}
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isForgotPassword 
              ? 'Enter your email to receive a password reset link.' 
              : isRegistering 
                ? (isVerifyingOtp 
                    ? 'Enter the 6-digit code sent to your email to verify your address.'
                    : 'Join NearFix to find and book verified professionals near you.')
                : 'Sign in to connect with trusted local service professionals.'}
          </p>
        </div>

        {redirectTarget.includes('/app/map') && (
          <div style={{
            background: 'rgba(79, 70, 229, 0.08)',
            border: '1px solid rgba(79, 70, 229, 0.2)',
            color: 'var(--accent-primary)',
            padding: '10px 14px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: '600'
          }}>
            <MapPin size={18} />
            <span>Sign in or create an account to view nearby verified professionals on the live map.</span>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle2 size={18} /> {successMessage}
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
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
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
        ) : isRegistering ? (
          isVerifyingOtp ? (
            /* Step 2: Email OTP Verification */
            <form onSubmit={handleVerifyOtpAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '14px', borderRadius: '12px', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  <Mail size={16} color="var(--accent-primary)" />
                  <span>{formData.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Wrong email address?</span>
                  <button
                    type="button"
                    onClick={() => { setIsVerifyingOtp(false); setError(null); setSuccessMessage(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', textDecoration: 'underline' }}
                  >
                    Edit details
                  </button>
                </div>
              </div>

              <div>
                <label className="input-label">Enter 6-digit verification code</label>
                <input
                  type="text"
                  placeholder="123456"
                  className="input-field"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  autoFocus
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 'bold' }}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Code expires in 5 minutes
                </span>
              </div>

              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Email & Create Account'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleResendOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cooldown > 0 ? 'var(--text-secondary)' : 'var(--accent-primary)',
                    cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => switchAuthMode(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.88rem' }}
                >
                  Already have an account? <span style={{ color: 'var(--accent-primary)', fontWeight: '500' }}>Sign in</span>
                </button>
              </div>
            </form>
          ) : (
            /* Step 1: Customer Account Details */
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label className="input-label">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="input-field"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input-field"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
                <span style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  A 6-digit verification code will be sent to this email.
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input-field"
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Requirements Checklist */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px 12px', marginTop: '8px', fontSize: '0.78rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '500' }}>Password requirements:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <span style={{ 
                      color: passwordCriteria.minLength ? 'var(--success)' : (formData.password ? '#f59e0b' : 'var(--text-secondary)'), 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontWeight: (formData.password && !passwordCriteria.minLength) ? '600' : 'normal'
                    }}>
                      {passwordCriteria.minLength ? '✓' : '•'} 8+ characters {formData.password.length > 0 ? `(${formData.password.length}/8 min)` : ''}
                    </span>
                    <span style={{ color: passwordCriteria.hasLetter ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordCriteria.hasLetter ? '✓' : '•'} At least 1 letter
                    </span>
                    <span style={{ color: passwordCriteria.hasNumber ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordCriteria.hasNumber ? '✓' : '•'} At least 1 number
                    </span>
                    <span style={{ color: passwordCriteria.hasSpecial ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordCriteria.hasSpecial ? '✓' : '•'} 1 special symbol
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Confirm Password</label>
                  {formData.confirmPassword && (
                    <span style={{ fontSize: '0.78rem', fontWeight: '500', color: isPasswordMatch ? 'var(--success)' : 'var(--error)' }}>
                      {isPasswordMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input-field"
                    required
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    style={{ 
                      paddingRight: '40px',
                      borderColor: formData.confirmPassword ? (isPasswordMatch ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)') : undefined 
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="btn-primary" 
                style={{ marginTop: '6px', width: '100%', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Continue to Email Verification'}
              </button>

              <div style={{ marginTop: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchAuthMode(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )
        ) : (
          /* Sign In Form */
          <>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input-field"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); setResetSent(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input-field"
                    required
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', width: '100%' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Don't have an account?{' '}
              <button
                onClick={() => switchAuthMode(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Sign up
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
