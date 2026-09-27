import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Briefcase, UserPlus, AlertCircle, Loader2, Mail, KeyRound, CheckCircle2, ShieldCheck, Eye, EyeOff, Smartphone, Info } from 'lucide-react';

const WORK_CATEGORIES = {
  'Home Services': ['Plumber', 'Electrician', 'Painter', 'Carpenter', 'Deep Cleaner', 'Pest Control', 'Gardener', 'Other'],
  'Repair & Technical': ['AC & HVAC Technician', 'Appliance Repair', 'Laptop & Mobile Technician', 'CCTV & Security Tech', 'Vehicle Mechanic', 'Other'],
  'Education': ['Home Tutor (Math/Science)', 'Language Tutor', 'Music Teacher', 'Art & Craft Instructor', 'Other'],
  'Creative Services': ['Photographer', 'Videographer', 'Graphic Designer', 'Interior Decorator', 'Other'],
  'Fitness & Wellness': ['Personal Fitness Trainer', 'Yoga Instructor', 'Physiotherapist', 'Diet & Nutrition Coach', 'Other'],
  'Personal Care': ['Barber / Hair Stylist', 'Makeup Artist & Beautician', 'Tailor & Alterations', 'Other'],
  'Professional Services': ['Accountant / Tax Consultant', 'Legal Document Assistant', 'IT Support Specialist', 'Other'],
  'Other': ['Other']
};

export default function WorkerLoginView() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || location.state?.from || '/app/workerHome';
  const initialMode = searchParams.get('mode');

  const [isRegistering, setIsRegistering] = useState(initialMode === 'signup' || initialMode === 'register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Registration Multi-Step: 1: Details, 2: Aadhaar OTP, 3: Email OTP
  const [registrationStep, setRegistrationStep] = useState(1);

  // Aadhaar Verification State
  const [maskedPhone, setMaskedPhone] = useState('');
  const [aadhaarOtp, setAadhaarOtp] = useState('');
  const [demoAadhaarOtp, setDemoAadhaarOtp] = useState('');
  const [aadhaarCooldown, setAadhaarCooldown] = useState(0);
  const [aadhaarToken, setAadhaarToken] = useState(null);

  // Email OTP Verification State
  const [emailOtp, setEmailOtp] = useState('');
  const [emailCooldown, setEmailCooldown] = useState(0);

  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Cooldown timers
  useEffect(() => {
    let timer;
    if (aadhaarCooldown > 0) {
      timer = setTimeout(() => setAadhaarCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [aadhaarCooldown]);

  useEffect(() => {
    let timer;
    if (emailCooldown > 0) {
      timer = setTimeout(() => setEmailCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [emailCooldown]);

  useEffect(() => {
    if (initialMode === 'signup' || initialMode === 'register') {
      setIsRegistering(true);
      setRegistrationStep(1);
    }
  }, [initialMode]);

  const [formData, setFormData] = useState({
    name: '',
    aadhar: '',
    phone: '',
    location: '',
    category: 'Home Services',
    primarySkill: 'Plumber',
    customSkill: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Password Criteria Validation
  const passwordCriteria = {
    minLength: formData.password.length >= 8 && formData.password.length <= 72,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSpecial: /[@$!%*?&#^()_\-+={}[\]|:;"'<>,.~`]/.test(formData.password)
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
  const isPasswordMatch = formData.password.length > 0 && formData.password === formData.confirmPassword;

  // Phone Validation
  const cleanPhone = formData.phone.replace(/\D/g, '');
  const isPhoneValid = /^[6-9][0-9]{9}$/.test(cleanPhone);

  // Aadhaar Validation (12 digits)
  const cleanAadhaar = formData.aadhar.replace(/\s+/g, '');
  const isAadhaarValid = /^[0-9]{12}$/.test(cleanAadhaar);

  // Name Validation
  const isNameValid = /^[a-zA-Z\s.'-]+$/.test(formData.name.trim()) && formData.name.trim().length >= 2 && formData.name.trim().length <= 60;

  // Location Validation
  const isLocationValid = formData.location.trim().length >= 5 && formData.location.trim().length <= 200;

  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setFormData(prev => ({ ...prev, aadhar: formatted }));
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: digits }));
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResetSent(true);
    }, 1200);
  };

  // ==========================================
  // STEP 1 -> STEP 2: Validate and Send Aadhaar OTP
  // ==========================================
  const handleStartAadhaarVerification = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Strict Field Validations
    if (!isNameValid) {
      setError('Full Name must be between 2 and 60 characters with letters, spaces, and standard name punctuation.');
      return;
    }
    if (!isAadhaarValid) {
      setError('Aadhaar must be exactly 12 numeric digits (e.g., 1111 2222 3333).');
      return;
    }
    if (!isPhoneValid) {
      setError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }
    if (!isLocationValid) {
      setError('Location / Address must be between 5 and 200 characters.');
      return;
    }
    if (formData.primarySkill === 'Other' && (!formData.customSkill.trim() || formData.customSkill.trim().length < 2 || formData.customSkill.trim().length > 60)) {
      setError('Please specify your custom primary skill (2 to 60 characters).');
      return;
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (formData.password.length < 8) {
      setError(`Password must be at least 8 characters long (currently ${formData.password.length} characters). Please add ${8 - formData.password.length} more character${8 - formData.password.length === 1 ? '' : 's'}.`);
      return;
    }
    if (!isPasswordValid) {
      setError('Password must contain uppercase, lowercase, number, and special character (8-72 characters).');
      return;
    }
    if (!isPasswordMatch) {
      setError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/worker/aadhaar/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarNumber: cleanAadhaar })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to dispatch Aadhaar verification code.');
      }

      setMaskedPhone(data.maskedPhone || 'Aadhaar-linked mobile');
      if (data.demoOtp) {
        setDemoAadhaarOtp(data.demoOtp);
      }
      setAadhaarCooldown(45);
      setRegistrationStep(2);
      setSuccessMessage(`Mock Aadhaar verification code sent to registered number ending in ${data.maskedPhone?.slice(-4) || '3210'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend Aadhaar OTP
  const handleResendAadhaarOtp = async () => {
    if (aadhaarCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/worker/aadhaar/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaarNumber: cleanAadhaar })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend Aadhaar code.');
      }

      setAadhaarCooldown(45);
      setAadhaarOtp('');
      if (data.demoOtp) {
        setDemoAadhaarOtp(data.demoOtp);
      }
      setSuccessMessage('A fresh mock Aadhaar verification code has been dispatched.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2 -> STEP 3: Verify Aadhaar OTP & Send Email OTP
  // ==========================================
  const handleVerifyAadhaarOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Verify Aadhaar OTP
      const verifyRes = await fetch('http://localhost:5000/api/auth/worker/aadhaar/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaarNumber: cleanAadhaar,
          otp: aadhaarOtp.trim()
        })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.message || 'Invalid Aadhaar verification code.');
      }

      setAadhaarToken(verifyData.aadhaarVerificationToken);

      // 2. Automatically trigger Email OTP dispatch for Step 3
      const emailRes = await fetch('http://localhost:5000/api/auth/send-register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const emailData = await emailRes.json();

      if (!emailRes.ok) {
        throw new Error(emailData.message || 'Failed to dispatch email verification code.');
      }

      setEmailCooldown(60);
      setRegistrationStep(3);
      setSuccessMessage(`Aadhaar verified! Verification code sent to ${formData.email.toLowerCase()}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (emailCooldown > 0 || loading) return;
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
        throw new Error(data.message || 'Failed to resend email code.');
      }

      setEmailCooldown(60);
      setEmailOtp('');
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 3 -> STEP 4: Verify Email OTP & Create Worker Account
  // ==========================================
  const handleVerifyEmailAndRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Verify Email OTP
      const verifyRes = await fetch('http://localhost:5000/api/auth/verify-register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: emailOtp.trim()
        })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.message || 'Invalid or expired email verification code.');
      }

      const emailVerificationToken = verifyData.emailVerificationToken;

      const effectiveSkill = formData.primarySkill === 'Other' 
        ? (formData.customSkill.trim() || 'General Specialist') 
        : formData.primarySkill;

      // 2. Finalize Registration requiring BOTH tokens
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: 'worker',
        phone: cleanPhone,
        address: formData.location.trim(),
        location: formData.location.trim(),
        category: formData.category,
        skill: effectiveSkill,
        skills: [effectiveSkill, formData.category],
        aadhaarVerificationToken: aadhaarToken,
        emailVerificationToken
      };

      const regRes = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        throw new Error(regData.message || 'Service provider registration failed.');
      }

      // Success
      localStorage.setItem('token', regData.token);
      localStorage.setItem('userRole', 'worker');
      localStorage.setItem('userProfile', JSON.stringify(regData.user));
      navigate(redirectTarget);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Active session status check
  const activeToken = localStorage.getItem('token');
  const activeProfile = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('userProfile') || '{}');
    } catch {
      return {};
    }
  }, [activeToken]);
  const activeRole = activeProfile.role || localStorage.getItem('userRole');
  const isAlreadyLoggedInAsCustomer = Boolean(activeToken && activeRole === 'customer');

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password,
          role: 'worker'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials');
      }

      if (data.user && data.user.role !== 'worker') {
        throw new Error('Access denied: This account is registered as a Customer. Please sign in via the Customer login page.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.user.role);
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
    setRegistrationStep(1);
    setAadhaarOtp('');
    setEmailOtp('');
    setAadhaarToken(null);
    setError(null);
    setSuccessMessage(null);
  };

  // Available skills for selected category
  const currentSkills = WORK_CATEGORIES[formData.category] || WORK_CATEGORIES['Home Services'];

  return (
    <div className="page-container" style={{ background: 'radial-gradient(circle at top, #d1fae5 0%, var(--bg-primary) 40%)', padding: '100px 20px 40px', overflowY: 'auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="glass-panel auth-card" style={{ borderColor: 'rgba(16,185,129,0.2)', maxWidth: isRegistering && registrationStep === 1 ? '540px' : '420px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            {isRegistering ? (
              registrationStep === 2 ? <ShieldCheck size={32} color="var(--success)" /> :
              registrationStep === 3 ? <Mail size={32} color="var(--success)" /> :
              <UserPlus size={32} color="var(--success)" />
            ) : <Briefcase size={32} color="var(--success)" />}
          </div>
          <h2 className="heading-gradient" style={{ fontSize: '1.85rem', marginBottom: '8px' }}>
            {isForgotPassword 
              ? 'Reset Password' 
              : isRegistering 
                ? (registrationStep === 2 ? 'Verify Your Identity' : registrationStep === 3 ? 'Verify Your Email' : 'Service Provider Registration') 
                : 'Service Provider Login'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isForgotPassword 
              ? 'Enter your email to receive a password reset link.' 
              : isRegistering 
                ? (registrationStep === 2 
                    ? 'Enter the 6-digit mock code sent to your demo Aadhaar-linked mobile.' 
                    : registrationStep === 3 
                      ? 'Enter the 6-digit verification code sent to your email.'
                      : 'Join NearFix to showcase your skills and receive local client bookings.') 
                : 'Access your provider dashboard, manage bookings, and communicate with clients.'}
          </p>

          {/* Academic Prototype Subtle Note */}
          {isRegistering && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.74rem', color: 'var(--success)', marginTop: '6px' }}>
              <Info size={13} />
              <span>Identity verification is simulated for the academic prototype.</span>
            </div>
          )}

          {/* Registration Step Indicator */}
          {isRegistering && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <div style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: registrationStep === 1 ? 'var(--success)' : 'rgba(16,185,129,0.2)', color: registrationStep === 1 ? '#fff' : 'var(--text-secondary)' }}>
                1. Details
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>→</span>
              <div style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: registrationStep === 2 ? 'var(--success)' : 'rgba(16,185,129,0.2)', color: registrationStep === 2 ? '#fff' : 'var(--text-secondary)' }}>
                2. Aadhaar
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>→</span>
              <div style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: registrationStep === 3 ? 'var(--success)' : 'rgba(16,185,129,0.2)', color: registrationStep === 3 ? '#fff' : 'var(--text-secondary)' }}>
                3. Email
              </div>
            </div>
          )}
        </div>

        {isAlreadyLoggedInAsCustomer && !isRegistering && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.86rem',
            color: 'var(--text-secondary)'
          }}>
            <div>
              <span>You are currently signed in as a <strong>Customer</strong> ({activeProfile.name || activeProfile.email || 'Customer Account'}).</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app')}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: 'none',
                color: '#2563eb',
                fontWeight: '600',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                whiteSpace: 'nowrap'
              }}
            >
              Open Customer Portal →
            </button>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {successMessage && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
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
                style={{ width: '100%', padding: '12px', background: 'var(--success)' }}
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
              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', width: '100%', background: 'var(--success)' }}>
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
          registrationStep === 2 ? (
            /* STEP 2: Mock Aadhaar OTP Verification */
            <form onSubmit={handleVerifyAadhaarOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '14px', borderRadius: '12px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>
                  <Smartphone size={16} color="var(--success)" />
                  <span>Aadhaar: {formData.aadhar.slice(0, 4)} XXXX {formData.aadhar.slice(-4)}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Demo code dispatched to mobile ending in <b>{maskedPhone.slice(-4) || '3210'}</b>.
                </div>

                {demoAadhaarOtp && (
                  <div style={{ marginTop: '10px', background: 'rgba(16,185,129,0.1)', padding: '8px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--success)' }}>Simulated Demo OTP: <b>{demoAadhaarOtp}</b></span>
                    <button
                      type="button"
                      onClick={() => setAadhaarOtp(demoAadhaarOtp)}
                      style={{ background: 'var(--success)', border: 'none', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Fill Code
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">Enter 6-digit Aadhaar OTP</label>
                <input
                  type="text"
                  placeholder="123456"
                  className="input-field"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  inputMode="numeric"
                  autoFocus
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 'bold' }}
                  value={aadhaarOtp}
                  onChange={e => setAadhaarOtp(e.target.value.replace(/\D/g, ''))}
                />
                <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Valid for 5 minutes
                </span>
              </div>

              <button 
                type="submit" 
                disabled={loading || aadhaarOtp.length !== 6} 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', background: 'var(--success)', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Aadhaar & Continue'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setRegistrationStep(1); setError(null); setSuccessMessage(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ← Edit details
                </button>

                <button
                  type="button"
                  disabled={aadhaarCooldown > 0 || loading}
                  onClick={handleResendAadhaarOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: aadhaarCooldown > 0 ? 'var(--text-secondary)' : 'var(--success)',
                    cursor: aadhaarCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  {aadhaarCooldown > 0 ? `Resend code in ${aadhaarCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          ) : registrationStep === 3 ? (
            /* STEP 3: Email OTP Verification */
            <form onSubmit={handleVerifyEmailAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '14px', borderRadius: '12px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '4px' }}>
                  <Mail size={16} color="var(--success)" />
                  <span>{formData.email}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Enter the 6-digit code delivered to your email inbox.
                </div>
              </div>

              <div>
                <label className="input-label">Enter 6-digit Email Verification Code</label>
                <input
                  type="text"
                  placeholder="123456"
                  className="input-field"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  inputMode="numeric"
                  autoFocus
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '8px', fontWeight: 'bold' }}
                  value={emailOtp}
                  onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                />
                <span style={{ display: 'block', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Valid for 5 minutes
                </span>
              </div>

              <button 
                type="submit" 
                disabled={loading || emailOtp.length !== 6} 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', background: 'var(--success)', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Complete Registration & Sign In'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setRegistrationStep(2); setError(null); setSuccessMessage(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ← Back to Aadhaar
                </button>

                <button
                  type="button"
                  disabled={emailCooldown > 0 || loading}
                  onClick={handleResendEmailOtp}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: emailCooldown > 0 ? 'var(--text-secondary)' : 'var(--success)',
                    cursor: emailCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500'
                  }}
                >
                  {emailCooldown > 0 ? `Resend code in ${emailCooldown}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 1: Full Worker Registration Details Form */
            <form onSubmit={handleStartAadhaarVerification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="input-label">Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Rajesh Kumar" 
                  maxLength={60} 
                  className="input-field" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                />
                {formData.name && !isNameValid && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '2px', display: 'block' }}>
                    Name must be 2-60 characters and contain letters/standard punctuation only.
                  </span>
                )}
              </div>

              {/* Aadhaar Input with Demo Hint */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Aadhaar Number (12 Digits)</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Demo Prototype</span>
                </div>
                <input 
                  type="text" 
                  placeholder="1111 2222 3333" 
                  maxLength={14} 
                  inputMode="numeric" 
                  className="input-field" 
                  required 
                  value={formData.aadhar} 
                  onChange={handleAadhaarChange} 
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>Use demo: <b onClick={() => setFormData({...formData, aadhar: '1111 2222 3333'})} style={{ color: 'var(--success)', cursor: 'pointer', textDecoration: 'underline' }}>1111 2222 3333</b>, <b onClick={() => setFormData({...formData, aadhar: '9999 8888 7777'})} style={{ color: 'var(--success)', cursor: 'pointer', textDecoration: 'underline' }}>9999 8888 7777</b>, <b onClick={() => setFormData({...formData, aadhar: '1234 1234 1234'})} style={{ color: 'var(--success)', cursor: 'pointer', textDecoration: 'underline' }}>1234 1234 1234</b></span>
                  <span>{cleanAadhaar.length}/12 digits</span>
                </div>
              </div>

              {/* Phone & Location */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label className="input-label">Phone Number (10 Digits)</label>
                  <input 
                    type="tel" 
                    placeholder="9876543210" 
                    maxLength={10} 
                    inputMode="numeric" 
                    className="input-field" 
                    required 
                    value={formData.phone} 
                    onChange={handlePhoneChange} 
                  />
                  {formData.phone && !isPhoneValid && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '2px', display: 'block' }}>
                      Must start with 6-9 (10 digits).
                    </span>
                  )}
                </div>
                <div style={{ flex: '1 1 240px' }}>
                  <label className="input-label">Location / Address</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Kuttikkattoor, Calicut" 
                    maxLength={200} 
                    className="input-field" 
                    required 
                    value={formData.location} 
                    onChange={e => setFormData({ ...formData, location: e.target.value })} 
                  />
                </div>
              </div>

              {/* Broad Work Category & Specific Primary Skill */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Service Category</label>
                  <select 
                    className="input-field" 
                    required 
                    value={formData.category} 
                    onChange={e => {
                      const newCat = e.target.value;
                      const defaultSkill = (WORK_CATEGORIES[newCat] || ['Other'])[0];
                      setFormData(prev => ({ ...prev, category: newCat, primarySkill: defaultSkill }));
                    }} 
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-glass)' }}
                  >
                    {Object.keys(WORK_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Primary Skill / Service</label>
                  <select 
                    className="input-field" 
                    required 
                    value={formData.primarySkill} 
                    onChange={e => setFormData({ ...formData, primarySkill: e.target.value })} 
                    style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-glass)' }}
                  >
                    {currentSkills.map(sk => (
                      <option key={sk} value={sk}>{sk}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom skill field if 'Other' selected */}
              {(formData.primarySkill === 'Other' || formData.category === 'Other') && (
                <div>
                  <label className="input-label">Specify Your Custom Skill / Specialty</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CCTV Technician, Solar Panel Installer" 
                    maxLength={60} 
                    className="input-field" 
                    required 
                    value={formData.customSkill} 
                    onChange={e => setFormData({ ...formData, customSkill: e.target.value })} 
                  />
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="input-label">Email Address</label>
                <input 
                  type="email" 
                  placeholder="you@example.com" 
                  maxLength={254} 
                  className="input-field" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    maxLength={72} 
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

                {/* Password Strength Checklist */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '8px 12px', marginTop: '6px', fontSize: '0.76rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '500' }}>Password requirements:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                    <span style={{ 
                      color: passwordCriteria.minLength ? 'var(--success)' : (formData.password ? '#f59e0b' : 'var(--text-secondary)'), 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      fontWeight: (formData.password && !passwordCriteria.minLength) ? '600' : 'normal'
                    }}>
                      {passwordCriteria.minLength ? '✓' : '•'} 8-72 characters {formData.password.length > 0 ? `(${formData.password.length}/8 min)` : ''}
                    </span>
                    <span style={{ color: passwordCriteria.hasUpper ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordCriteria.hasUpper ? '✓' : '•'} 1 uppercase (A-Z)
                    </span>
                    <span style={{ color: passwordCriteria.hasLower ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordCriteria.hasLower ? '✓' : '•'} 1 lowercase (a-z)
                    </span>
                    <span style={{ color: passwordCriteria.hasNumber ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {passwordCriteria.hasNumber ? '✓' : '•'} 1 number (0-9)
                    </span>
                    <span style={{ color: passwordCriteria.hasSpecial ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', gridColumn: 'span 2' }}>
                      {passwordCriteria.hasSpecial ? '✓' : '•'} 1 special character (!@#$%^&*...)
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                    maxLength={72}
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
                style={{ marginTop: '8px', width: '100%', background: 'var(--success)', boxShadow: '0 4px 15px rgba(16,185,129,0.4)', opacity: loading ? 0.75 : 1 }}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Aadhaar & Continue'}
              </button>

              <div style={{ marginTop: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchAuthMode(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}
                >
                  Login
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
                <input type="email" placeholder="you@example.com" className="input-field" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotPassword(true); setError(null); setResetSent(false); }} 
                    style={{ background: 'none', border: 'none', color: 'var(--success)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}
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
                    onChange={e => setFormData({...formData, password: e.target.value})} 
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

              <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', width: '100%', background: 'var(--success)', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}>
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In as Service Provider'}
              </button>
            </form>

            <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Want to offer your skills?{' '}
              <button
                type="button"
                onClick={() => switchAuthMode(true)}
                style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}
              >
                Become a Service Provider
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
