import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Compass,
  ShieldCheck,
  Star,
  CheckCircle2,
  ArrowRight,
  Zap,
  Wrench,
  GraduationCap,
  Camera,
  Scissors,
  Laptop,
  Dumbbell,
  Palette,
  Clock,
  UserCheck,
  Briefcase,
  ChevronRight,
  Menu,
  X,
  Navigation,
  Sparkles,
  PhoneCall,
  Map as MapIcon
} from 'lucide-react';

const POPULAR_SERVICES = [
  {
    id: 'Electrician',
    name: 'Electrician',
    icon: Zap,
    description: 'Wiring, fixtures, fuse boards & emergency electrical repairs.',
    count: '24+ pros nearby',
    color: '#4f46e5',
    bg: 'rgba(79, 70, 229, 0.08)'
  },
  {
    id: 'Plumber',
    name: 'Plumber',
    icon: Wrench,
    description: 'Pipe leaks, taps, sanitary fittings & bathroom installations.',
    count: '31+ pros nearby',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.08)'
  },
  {
    id: 'Tutor',
    name: 'Tutor',
    icon: GraduationCap,
    description: 'Personalized home & online tutoring for school and college subjects.',
    count: '18+ pros nearby',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.08)'
  },
  {
    id: 'Photographer',
    name: 'Photographer',
    icon: Camera,
    description: 'Portraits, events, weddings, studio sessions & product shoots.',
    count: '15+ pros nearby',
    color: '#ea580c',
    bg: 'rgba(234, 88, 12, 0.08)'
  },
  {
    id: 'Tailor',
    name: 'Tailor',
    icon: Scissors,
    description: 'Custom stitching, dress alterations, designer suits & outfits.',
    count: '20+ pros nearby',
    color: '#db2777',
    bg: 'rgba(219, 39, 119, 0.08)'
  },
  {
    id: 'Laptop Repair',
    name: 'Laptop Repair',
    icon: Laptop,
    description: 'Hardware upgrades, screen fix, OS tune-up & chip-level servicing.',
    count: '19+ pros nearby',
    color: '#2563eb',
    bg: 'rgba(37, 99, 235, 0.08)'
  },
  {
    id: 'Fitness Trainer',
    name: 'Fitness Trainer',
    icon: Dumbbell,
    description: 'Personal workout routines, home strength coaching & dietary advice.',
    count: '12+ pros nearby',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.08)'
  },
  {
    id: 'Graphic Designer',
    name: 'Graphic Designer',
    icon: Palette,
    description: 'Brand identity, logos, promotional flyers, UI design & social media.',
    count: '16+ pros nearby',
    color: '#9333ea',
    bg: 'rgba(147, 51, 234, 0.08)'
  }
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Find nearby professionals',
    description: 'Search by skill, profession, or use instant GPS geolocation to pinpoint verified providers within your neighborhood.'
  },
  {
    step: '02',
    title: 'Compare profile, portfolio and ratings',
    description: 'Inspect authenticated government KYC badges, past customer reviews, photos of completed work, and upfront pricing.'
  },
  {
    step: '03',
    title: 'Request/book a service',
    description: 'Select your preferred time slot or request urgent on-demand assistance. Receive prompt confirmation directly from the pro.'
  },
  {
    step: '04',
    title: 'Review after completion',
    description: 'Verify job quality upon completion, settle payments securely, and leave verified ratings that strengthen community trust.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationStatus, setLocationStatus] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalPurpose, setAuthModalPurpose] = useState('general'); // 'general' | 'location_map'

  const getIsLoggedIn = () => {
    const token = localStorage.getItem('token');
    return Boolean(token && token !== 'null' && token !== 'undefined');
  };

  const userRole = localStorage.getItem('userRole') || 'customer';
  const isLoggedIn = getIsLoggedIn();

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/app?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/app');
    }
  };

  // Handle Geolocation
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    setLocationStatus('Pinpointing your location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingLocation(false);
        const { latitude, longitude } = pos.coords;
        setLocationStatus(`Location detected (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`);
        // Store for map view
        localStorage.setItem('userGeoCoords', JSON.stringify({ lat: latitude, lng: longitude }));

        if (getIsLoggedIn()) {
          // If already signed in, take to current redirection page
          setTimeout(() => {
            navigate('/app/map');
          }, 800);
        } else {
          // If not signed in, ask for sign in or sign up
          setTimeout(() => {
            setAuthModalPurpose('location_map');
            setShowAuthModal(true);
          }, 500);
        }
      },
      (err) => {
        setDetectingLocation(false);
        console.warn('Geolocation warning:', err);
        setLocationStatus('Using Kozhikode central region as default.');

        if (getIsLoggedIn()) {
          setTimeout(() => {
            navigate('/app/map');
          }, 1000);
        } else {
          setTimeout(() => {
            setAuthModalPurpose('location_map');
            setShowAuthModal(true);
          }, 500);
        }
      },
      { timeout: 7000 }
    );
  };

  const handleMapRadarClick = () => {
    if (getIsLoggedIn()) {
      navigate('/app/map');
    } else {
      setAuthModalPurpose('location_map');
      setShowAuthModal(true);
    }
  };

  const handleCategoryClick = (categoryName) => {
    navigate(`/app?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* NearFix Logo */}
          <div 
            onClick={() => navigate('/')} 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <MapPin size={22} strokeWidth={2.4} />
            </div>
            <div>
              <span className="heading-gradient" style={{ fontSize: '1.65rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
                NearFix
              </span>
              <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: '700', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '-4px' }}>
                Local Marketplace
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav style={{ alignItems: 'center', gap: '32px' }} className="desktop-header-nav">
            <a 
              href="#services" 
              style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.95rem', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Explore Services
            </a>
            <a 
              href="#how-it-works" 
              style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.95rem', transition: 'color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              How It Works
            </a>
          </nav>

          {/* Desktop Right Action Buttons */}
          <div style={{ alignItems: 'center', gap: '14px' }} className="desktop-header-actions">
            {isLoggedIn ? (
              <>
                <button
                  onClick={() => navigate(userRole === 'worker' ? '/app/workerHome' : '/app')}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                  }}
                >
                  Dashboard
                </button>

                <button
                  onClick={() => navigate('/app/map')}
                  className="btn-primary"
                  style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '0.92rem' }}
                >
                  Map View <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthModalPurpose('general');
                    setShowAuthModal(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    padding: '9px 18px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                  }}
                >
                  Sign In
                </button>

                <button
                  onClick={() => navigate('/login/customer')}
                  className="btn-primary"
                  style={{ padding: '9px 20px', borderRadius: '10px', fontSize: '0.92rem' }}
                >
                  Get Started <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'flex',
              background: 'none',
              border: 'none',
              padding: '8px',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
            className="mobile-header-menu-btn"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid var(--border-glass)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <a 
              href="#services" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.05rem', padding: '8px 0' }}
            >
              Explore Services
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: '600', fontSize: '1.05rem', padding: '8px 0' }}
            >
              How It Works
            </a>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(userRole === 'worker' ? '/app/workerHome' : '/app');
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '10px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/app/map');
                    }}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  >
                    Map View
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalPurpose('general');
                      setShowAuthModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '10px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login/customer');
                    }}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        padding: '64px 24px 80px',
        background: 'radial-gradient(circle at 50% 0%, #edf2ff 0%, #f8fafc 70%)',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border-glass)'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '40px',
          alignItems: 'center'
        }}>
          {/* Left Column: Heading, Subheading & Controls */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(79, 70, 229, 0.08)',
              color: 'var(--accent-primary)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '700',
              marginBottom: '20px',
              border: '1px solid rgba(79, 70, 229, 0.15)'
            }}>
              <ShieldCheck size={16} /> Verified Local Professionals Marketplace
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3.4rem)',
              fontWeight: '800',
              lineHeight: '1.15',
              letterSpacing: '-1px',
              marginBottom: '18px',
              color: 'var(--text-primary)'
            }}>
              Find trusted services <span className="heading-gradient">near you</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.12rem)',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: '28px',
              maxWidth: '540px'
            }}>
              Discover verified professionals based on your location, availability and the service you need.
            </p>

            {/* Service Search Input Form */}
            <form onSubmit={handleSearchSubmit} style={{
              background: '#ffffff',
              padding: '8px',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '560px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 220px', paddingLeft: '8px', gap: '10px', minHeight: '42px' }}>
                <Search size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search electrician, plumber, tutor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    background: 'transparent'
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '10px 22px', borderRadius: '12px', whiteSpace: 'nowrap', flex: '0 0 auto' }}
              >
                Search
              </button>
            </form>

            {/* Location & CTA Action Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={detectingLocation}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '1px solid var(--border-glass)',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
              >
                <Navigation size={16} color="var(--accent-primary)" />
                {detectingLocation ? 'Detecting GPS...' : 'Use my current location'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/app')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(79, 70, 229, 0.08)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)'}
              >
                <Compass size={16} /> Explore Nearby Professionals
              </button>
            </div>

            {locationStatus && (
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--accent-primary)',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px'
              }}>
                <CheckCircle2 size={14} /> {locationStatus}
              </div>
            )}

            {/* Live Trust Metrics */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid var(--border-glass)'
            }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>100%</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '500' }}>KYC Verified Pros</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>15 mins</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '500' }}>Avg. Response Time</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border-glass)' }}></div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>4.9 ★</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '500' }}>Community Rating</div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Interactive Map & Verified Service Visual */}
          <div style={{ position: 'relative' }}>
            {/* Background Decorative Glow */}
            <div style={{
              position: 'absolute',
              width: '360px',
              height: '360px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(255, 255, 255, 0) 70%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none'
            }}></div>

            {/* Stylized Local Map Visual Card */}
            <div className="glass-panel" style={{
              padding: '24px',
              background: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.1)',
              border: '1px solid var(--border-glass)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)' }}></div>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Live Hyperlocal Radar</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Kozhikode & Vicinity</span>
              </div>

              {/* Map Preview Canvas Graphic */}
              <div 
                onClick={handleMapRadarClick}
                style={{
                  height: '240px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid rgba(79, 70, 229, 0.15)'
                }}
              >
                {/* Simulated Street Grid */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.25,
                  backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px), linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)',
                  backgroundSize: '24px 24px, 48px 48px, 48px 48px'
                }}></div>

                {/* Radar Sweep Animation Ring */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '180px',
                  height: '180px',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  border: '1px dashed rgba(79, 70, 229, 0.4)',
                  background: 'rgba(79, 70, 229, 0.04)'
                }}></div>

                {/* Current User Pin */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 2
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#4f46e5',
                    border: '3px solid #ffffff',
                    boxShadow: '0 0 0 6px rgba(79, 70, 229, 0.25)'
                  }}></div>
                  <span style={{
                    background: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                    marginTop: '4px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    Your Location
                  </span>
                </div>

                {/* Simulated Verified Worker Pin 1: Electrician */}
                <div style={{
                  position: 'absolute',
                  top: '22%',
                  left: '26%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-glass)',
                  zIndex: 3
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Rahul V. (Electrician)</span>
                  <span style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: '700' }}>★ 4.9</span>
                </div>

                {/* Simulated Verified Worker Pin 2: Plumber */}
                <div style={{
                  position: 'absolute',
                  bottom: '24%',
                  right: '18%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-glass)',
                  zIndex: 3
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Ananth K. (Plumber)</span>
                  <span style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: '700' }}>★ 4.8</span>
                </div>

                {/* Simulated Verified Worker Pin 3: Laptop Repair */}
                <div style={{
                  position: 'absolute',
                  top: '26%',
                  right: '22%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-glass)',
                  zIndex: 3
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>Sujith M. (Tech Fix)</span>
                  <span style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: '700' }}>★ 5.0</span>
                </div>

                {/* Overlay Click Prompt */}
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '12px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <MapIcon size={13} /> Click to open live interactive map
                </div>
              </div>

              {/* Bottom Quick Feature Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ background: 'var(--accent-light)', padding: '6px', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>Government ID</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Aadhar Verified</div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{ background: 'var(--success-light)', padding: '6px', borderRadius: '8px', color: 'var(--success)' }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>Urgent & Normal</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Flexible Scheduling</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Services Section */}
      <section id="services" style={{ padding: '80px 24px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            <Sparkles size={14} /> Diverse Professional Skills
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '800', marginBottom: '14px', color: 'var(--text-primary)' }}>
            Popular Services in Your Area
          </h2>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            From home repairs and electrical troubleshooting to education, tailoring, and creative craft—discover verified specialists ready to assist.
          </p>
        </div>

        {/* 8 Diverse Service Categories Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
          gap: '20px'
        }}>
          {POPULAR_SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                onClick={() => handleCategoryClick(service.id)}
                className="glass-panel"
                style={{
                  padding: '24px',
                  cursor: 'pointer',
                  borderRadius: '20px',
                  background: '#ffffff',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = service.color;
                  e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(15, 23, 42, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                <div style={{
                  background: service.bg,
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: service.color
                }}>
                  <Icon size={26} strokeWidth={2.2} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {service.name}
                  </h3>
                </div>

                <p style={{
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.5',
                  marginBottom: '18px',
                  flex: 1
                }}>
                  {service.description}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-glass)'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                    {service.count}
                  </span>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: service.color,
                    fontWeight: '700',
                    fontSize: '0.85rem'
                  }}>
                    Browse <ChevronRight size={15} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flexible Category Banner */}
        <div style={{
          marginTop: '36px',
          background: 'var(--bg-tertiary)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          border: '1px dashed var(--border-subtle)'
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-primary)' }}>
              Looking for a custom service or unique trade?
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              NearFix providers offer a wide array of legitimate skills. Filter by distance, ratings, or keyword search.
            </div>
          </div>
          <button
            onClick={() => navigate('/app')}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-glass)',
              color: 'var(--accent-primary)',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            View All Services <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* How NearFix Works Section */}
      <section id="how-it-works" style={{
        padding: '80px 24px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid var(--border-glass)',
        borderBottom: '1px solid var(--border-glass)'
      }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 56px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--success)',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              <CheckCircle2 size={14} /> Seamless 4-Step Process
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: '800', marginBottom: '14px', color: 'var(--text-primary)' }}>
              How NearFix Works
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              We connect local homeowners and businesses with verified professionals through transparent ratings, fast communication, and secure booking.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
            gap: '20px'
          }}>
            {HOW_IT_WORKS_STEPS.map((step, idx) => (
              <div
                key={step.step}
                className="glass-panel"
                style={{
                  padding: '32px 24px',
                  borderRadius: '20px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-glass)',
                  position: 'relative'
                }}
              >
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '900',
                  color: 'rgba(79, 70, 229, 0.15)',
                  lineHeight: '1',
                  marginBottom: '16px',
                  fontFamily: 'sans-serif'
                }}>
                  {step.step}
                </div>
                <h3 style={{ fontSize: '1.18rem', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service-Provider CTA Section */}
      <section style={{
        padding: '80px 24px',
        maxWidth: '1240px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          borderRadius: '28px',
          padding: '48px 40px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -10px rgba(49, 46, 129, 0.3)'
        }}>
          {/* Subtle Ambient Decorative Circles */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%)',
            pointerEvents: 'none'
          }}></div>

          <div style={{ maxWidth: '680px', position: 'relative', zIndex: 2 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(8px)',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '16px'
            }}>
              <Briefcase size={14} /> Partner With NearFix
            </div>

            <h2 style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              fontWeight: '800',
              lineHeight: '1.2',
              marginBottom: '16px',
              color: '#ffffff'
            }}>
              Are you a service professional?
            </h2>

            <p style={{
              fontSize: '1.1rem',
              opacity: 0.92,
              lineHeight: '1.6',
              marginBottom: '32px'
            }}>
              Build your profile, showcase your work and receive service requests from nearby customers.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/login/worker')}
                style={{
                  background: '#ffffff',
                  color: 'var(--accent-primary)',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                }}
              >
                Become a Service Provider <ArrowRight size={18} />
              </button>

              <span style={{ fontSize: '0.88rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={16} color="#4ade80" /> Free registration & direct local inquiries
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer style={{
        marginTop: 'auto',
        background: '#ffffff',
        borderTop: '1px solid var(--border-glass)',
        padding: '48px 24px 32px'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <MapPin size={18} strokeWidth={2.4} />
              </div>
              <span className="heading-gradient" style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                NearFix
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px' }}>
              Hyperlocal service discovery connecting verified professionals with homeowners and businesses in real time.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              100% KYC Verified Providers • On-Demand & Scheduled
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Marketplace
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <a href="#services" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Explore Services</a>
              <a href="#how-it-works" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>How NearFix Works</a>
              <span onClick={handleMapRadarClick} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Browse Nearby Map</span>
              <span onClick={() => navigate('/login/customer')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Find a Professional</span>
            </div>
          </div>

          {/* Service Categories */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              Top Categories
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
              <span onClick={() => handleCategoryClick('Electrician')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Electricians</span>
              <span onClick={() => handleCategoryClick('Plumber')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Plumbers</span>
              <span onClick={() => handleCategoryClick('Tutor')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Home Tutors</span>
              <span onClick={() => handleCategoryClick('Laptop Repair')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Laptop & Tech Repair</span>
              <span onClick={() => handleCategoryClick('Photographer')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Photographers</span>
            </div>
          </div>

          {/* For Service Providers */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
              For Professionals
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '14px' }}>
              Showcase your skills, build local credibility, and get verified for bookings.
            </p>
            <button
              onClick={() => navigate('/login/worker')}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-glass)',
                color: 'var(--accent-primary)',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Become a Service Provider <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Bottom Copyright & Safety Notice */}
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            © {new Date().getFullYear()} NearFix Platform. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Verified Safety Standards</span>
            <span>Local Trust Guarantee</span>
          </div>
        </div>
      </footer>

      {/* Sign In Quick Selection Modal */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            maxWidth: 'min(94vw, 460px)',
            width: '100%',
            maxHeight: '90vh',
            maxHeight: '90dvh',
            overflowY: 'auto',
            padding: 'clamp(20px, 5vw, 32px)',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAuthModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {authModalPurpose === 'location_map' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(79, 70, 229, 0.1)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                  }}>
                    <MapPin size={26} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Sign In or Sign Up to View Map
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                    Your location has been detected! Sign in or create an account to view and connect with nearby verified professionals on the live map.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Option 1: Existing Customer Sign In */}
                  <div
                    onClick={() => {
                      setShowAuthModal(false);
                      navigate('/login/customer?redirect=/app/map');
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.background = 'var(--accent-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.background = 'var(--bg-primary)';
                    }}
                  >
                    <div style={{
                      background: 'rgba(79, 70, 229, 0.1)',
                      padding: '10px',
                      borderRadius: '12px',
                      color: 'var(--accent-primary)'
                    }}>
                      <UserCheck size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                        Customer Sign In
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Already have an account? Sign in and open map
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>

                  {/* Option 2: New Customer Sign Up */}
                  <div
                    onClick={() => {
                      setShowAuthModal(false);
                      navigate('/login/customer?mode=signup&redirect=/app/map');
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: '1.5px solid rgba(79, 70, 229, 0.35)',
                      background: 'rgba(79, 70, 229, 0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.background = 'rgba(79, 70, 229, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.35)';
                      e.currentTarget.style.background = 'rgba(79, 70, 229, 0.04)';
                    }}
                  >
                    <div style={{
                      background: 'var(--accent-primary)',
                      padding: '10px',
                      borderRadius: '12px',
                      color: '#ffffff'
                    }}>
                      <Sparkles size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.98rem', color: 'var(--accent-primary)' }}>
                        New Customer Sign Up
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Create a free account to book local experts
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--accent-primary)" />
                  </div>

                  {/* Option 3: Service Provider Login */}
                  <div
                    onClick={() => {
                      setShowAuthModal(false);
                      navigate('/login/worker?redirect=/app/map');
                    }}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--success)';
                      e.currentTarget.style.background = 'var(--success-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.background = 'var(--bg-primary)';
                    }}
                  >
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '10px',
                      borderRadius: '12px',
                      color: 'var(--success)'
                    }}>
                      <Briefcase size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                        Service Provider Login
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Sign in to accept bookings & manage jobs
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Sign In to NearFix
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                  Choose your profile type to continue.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Option 1: Customer */}
                  <div
                    onClick={() => {
                      setShowAuthModal(false);
                      navigate('/login/customer');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.background = 'var(--accent-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.background = 'var(--bg-primary)';
                    }}
                  >
                    <div style={{
                      background: 'rgba(79, 70, 229, 0.1)',
                      padding: '12px',
                      borderRadius: '12px',
                      color: 'var(--accent-primary)'
                    }}>
                      <UserCheck size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                        Find a Professional
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Hire trusted workers, track bookings & leave reviews
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>

                  {/* Option 2: Service Provider */}
                  <div
                    onClick={() => {
                      setShowAuthModal(false);
                      navigate('/login/worker');
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--success)';
                      e.currentTarget.style.background = 'var(--success-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.background = 'var(--bg-primary)';
                    }}
                  >
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '12px',
                      borderRadius: '12px',
                      color: 'var(--success)'
                    }}>
                      <Briefcase size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                        Become a Service Provider
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Manage client bookings, schedule & showcase work
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop Header Responsive Styles Inline helper */}
      <style>{`
        @media (min-width: 769px) {
          .desktop-header-nav {
            display: flex !important;
          }
          .desktop-header-actions {
            display: flex !important;
          }
          .mobile-header-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
