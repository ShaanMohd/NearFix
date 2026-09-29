import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  MapPin, 
  Clock, 
  Radio, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Navigation, 
  Zap, 
  Check, 
  X, 
  ArrowRight,
  User,
  Star,
  Phone
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Avatar from '../components/Avatar';

// Distinct emergency pin icon for Leaflet
const emergencyPinIcon = L.divIcon({
  className: 'emergency-leaflet-marker',
  html: `
    <div style="
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ef4444;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #ffffff;
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.45);
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 15px;
        color: #ffffff;
      ">🚨</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Helper component to smoothly center Leaflet map on position change
function RecenterMap({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && Array.isArray(position) && position.length === 2 && !isNaN(position[0])) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

// Quick locality presets across Kozhikode
const KOZHIKODE_PRESETS = [
  { name: 'Mavoor Road', coords: [75.7804, 11.2588], address: 'Mavoor Road, Kozhikode, Kerala' },
  { name: 'Palayam', coords: [75.7905, 11.2670], address: 'Palayam, Kozhikode, Kerala' },
  { name: 'Mananchira', coords: [75.7766, 11.2543], address: 'Mananchira Square, Kozhikode, Kerala' },
  { name: 'Beach Road', coords: [75.7700, 11.2500], address: 'Beach Road, Kozhikode, Kerala' },
  { name: 'Medical College', coords: [75.8010, 11.2550], address: 'Medical College, Kozhikode, Kerala' },
  { name: 'Feroke', coords: [75.8200, 11.1700], address: 'Feroke, Kozhikode, Kerala' }
];

const EMERGENCY_CATEGORIES = [
  { id: 'Plumbing', label: 'Plumbing', icon: '🔧', desc: 'Burst pipes, major leaks, blocked drains', availableText: 'Active Plumbers Available' },
  { id: 'Electrical', label: 'Electrical', icon: '⚡', desc: 'Short circuits, sparking switches, breaker trips', availableText: 'Active Electricians Available' },
  { id: 'Carpentry', label: 'Carpentry / Locks', icon: '🚪', desc: 'Jammed locks, broken hinges, door lockout', availableText: 'Verified Carpenters Available' },
  { id: 'Appliance Repair', label: 'Appliance Repair', icon: '❄️', desc: 'Fridge breakdown, water heater burst', availableText: 'Appliance Technicians Available' },
  { id: 'Painting', label: 'Painting / Wall', icon: '🎨', desc: 'Emergency ceiling seepage, water leakage stains', availableText: 'Painters Available' },
  { id: 'Cleaning', label: 'Sanitization', icon: '🧹', desc: 'Hazardous spill, deep sewage overflow cleanup', availableText: 'Sanitation Crew Available' }
];

const QUICK_TAGS = [
  'Burst pipe flooding floor',
  'Electrical switchboard sparking',
  'Front door lock jammed / lockout',
  'Water heater leaking scalding water',
  'Main power trip won’t reset',
  'Kitchen drain backing up into sink'
];

/**
 * Reverse geocodes [lat, lon] using OpenStreetMap Nominatim with graceful fallback
 */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
      headers: { 'Accept-Language': 'en' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.county || 'Kozhikode';
        return road ? `${road}, ${city}` : data.display_name.split(',').slice(0, 3).join(', ');
      }
    }
  } catch (err) {
    console.warn('Reverse geocode fallback:', err.message);
  }
  return null;
}

export default function EmergencyDispatchView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem('token');

  // Form State
  const initialCategory = searchParams.get('category') || 'Plumbing';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Mavoor Road, Kozhikode, Kerala');
  // GeoJSON [longitude, latitude] - default Kozhikode Center
  const [coordinates, setCoordinates] = useState([75.7804, 11.2588]);
  const [locationConfirmed, setLocationConfirmed] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [acceptSurchargeTerms, setAcceptSurchargeTerms] = useState(false);

  // Active Job State
  const [activeJobId, setActiveJobId] = useState(localStorage.getItem('activeEmergencyJobId') || null);
  const [jobStatus, setJobStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Live timer tick
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize from user profile (strictly validating region to prevent silent Kochi fallbacks)
  useEffect(() => {
    const profileStr = localStorage.getItem('userProfile');
    if (profileStr) {
      try {
        const p = JSON.parse(profileStr);
        if (p.address && typeof p.address === 'string' && p.address.trim()) {
          setAddress(p.address.trim());
        }
        if (p.location?.coordinates && Array.isArray(p.location.coordinates) && p.location.coordinates.length === 2) {
          const [lng, lat] = p.location.coordinates;
          // Ensure coordinates are roughly in Malabar / Kozhikode region (lat 10.8 to 11.8, lng 75.2 to 76.2)
          // If stored coords were from Kochi (lat ~9.9) or invalid, do not silently combine them with Kozhikode address!
          if (lat >= 10.8 && lat <= 11.8 && lng >= 75.2 && lng <= 76.2) {
            setCoordinates([lng, lat]);
          } else {
            console.log('Stored profile coordinates were outside Kozhikode. Resetting to Kozhikode Center coordinates.');
            setCoordinates([75.7804, 11.2588]);
          }
        }
      } catch (e) {}
    }
  }, []);

  // Poll active emergency job
  useEffect(() => {
    if (!activeJobId || !token) return;

    let isMounted = true;
    const fetchEmergencyStatus = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/jobs/${activeJobId}/emergency-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setJobStatus(data);
            if (data.status === 'Completed' || data.status === 'Cancelled' || data.status === 'Expired') {
              localStorage.removeItem('activeEmergencyJobId');
            }
          }
        } else if (res.status === 404) {
          if (isMounted) {
            setActiveJobId(null);
            setJobStatus(null);
            localStorage.removeItem('activeEmergencyJobId');
          }
        }
      } catch (err) {
        console.error('Error polling emergency status:', err);
      }
    };

    fetchEmergencyStatus();
    const interval = setInterval(fetchEmergencyStatus, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeJobId, token]);

  // Fetch Live Device GPS with explicit permission check & error handling
  const handleFetchGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please drag the pin on the map to set your location.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude);
        const lng = Number(pos.coords.longitude);
        setCoordinates([lng, lat]);
        setLocationConfirmed(true);
        setGpsLoading(false);

        // Keep address synchronized with the actual acquired GPS coordinates
        const resolved = await reverseGeocode(lat, lng);
        if (resolved) {
          setAddress(resolved);
        } else {
          setAddress(`Current GPS (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
        }
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsLoading(false);
        if (err.code === 1) { // PERMISSION_DENIED
          setGpsError('GPS permission was denied by your device/browser. Please drag the map pin or pick a Kozhikode neighborhood below.');
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          setGpsError('Device location is unavailable. Please adjust the location pin manually on the interactive map.');
        } else {
          setGpsError('GPS request timed out. Please drag the pin on the map to set your emergency location.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Drag Leaflet marker to manually adjust exact location
  const handleMarkerDragEnd = async (e) => {
    const lat = e.target.getLatLng().lat;
    const lng = e.target.getLatLng().lng;
    setCoordinates([lng, lat]);
    setLocationConfirmed(true);
    setGpsError('');

    // Keep address synchronized
    const resolved = await reverseGeocode(lat, lng);
    if (resolved) {
      setAddress(resolved);
    } else {
      setAddress(`Emergency Site (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
    }
  };

  // Quick preset selector
  const handleSelectPreset = (preset) => {
    setCoordinates(preset.coords);
    setAddress(preset.address);
    setLocationConfirmed(true);
    setGpsError('');
  };

  // Submit Public Emergency Broadcast
  const handleSubmitEmergency = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please sign in as a customer to dispatch an emergency service.');
      navigate('/login/customer?redirect=/app/emergency');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please describe the urgent emergency problem.');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Please specify your current service address.');
      return;
    }

    if (!coordinates || coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
      setErrorMsg('Valid GPS coordinates are required. Please adjust or confirm the map pin.');
      return;
    }

    const [lng, lat] = coordinates;
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      setErrorMsg('Invalid coordinates: out of range.');
      return;
    }

    if (!acceptSurchargeTerms) {
      setErrorMsg('Please acknowledge and accept that a 10% emergency surcharge applies to the agreed labor charge.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceType: selectedCategory,
          description: description.trim(),
          serviceAddress: address.trim(),
          customerLocation: {
            type: 'Point',
            coordinates: [lng, lat] // GeoJSON [longitude, latitude]
          },
          isEmergency: true,
          bookingType: 'emergency',
          customerAcceptedSurcharge: true
        })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveJobId(data._id);
        localStorage.setItem('activeEmergencyJobId', data._id);
        setJobStatus(data);
      } else {
        setErrorMsg(data.message || 'Failed to broadcast emergency request.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error broadcasting emergency request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Customer Confirms Dispatch
  const handleConfirmDispatch = async () => {
    if (!activeJobId || !token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${activeJobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Accepted' })
      });
      if (res.ok) {
        const data = await res.json();
        setJobStatus(data);
        alert('🎉 Emergency Dispatch Confirmed! The professional is now en route to your location.');
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to confirm dispatch.');
      }
    } catch (err) {
      alert('Error confirming dispatch: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Customer Declines Claimed Worker
  const handleDeclineWorker = async () => {
    if (!activeJobId || !token) return;
    if (!window.confirm('Are you sure you want to decline this worker? The search will continue for other nearby professionals.')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${activeJobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'DeclineWorker' })
      });
      if (res.ok) {
        const data = await res.json();
        setJobStatus(data);
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to decline worker.');
      }
    } catch (err) {
      alert('Error declining worker: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Emergency Request
  const handleCancelRequest = async () => {
    if (!activeJobId || !token) return;
    if (!window.confirm('Are you sure you want to cancel this emergency request?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/jobs/${activeJobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      if (res.ok) {
        const data = await res.json();
        setJobStatus(data);
      }
    } catch (err) {
      alert('Error cancelling request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Clear and Start New Request
  const handleStartNewRequest = () => {
    setActiveJobId(null);
    setJobStatus(null);
    localStorage.removeItem('activeEmergencyJobId');
  };

  // Format seconds to mm:ss
  const formatSeconds = (sec) => {
    if (!sec || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  // ==========================================
  // VIEW RENDER: ACTIVE EMERGENCY RADAR / CONFIRMATION
  // ==========================================
  if (activeJobId && jobStatus) {
    const isSearchOpen = jobStatus.status === 'Open';
    const isPendingConfirmation = jobStatus.status === 'EmergencyAcceptedPendingCustomer';
    const isAccepted = ['Accepted', 'On The Way', 'Arrived', 'In Progress'].includes(jobStatus.status);
    const isCompleted = jobStatus.status === 'Completed';
    const isExpired = jobStatus.status === 'Expired';
    const isCancelled = ['Cancelled', 'Rejected'].includes(jobStatus.status);

    const radiusKm = jobStatus.radiusKm || ((jobStatus.broadcastRadius || 2000) / 1000);
    const searchRoundLabel = jobStatus.searchRoundLabel || `Round ${radiusKm <= 2 ? 1 : (radiusKm <= 5 ? 2 : 3)} (${radiusKm} km)`;
    const siteCoords = jobStatus.customerLocation?.coordinates?.length === 2
      ? [jobStatus.customerLocation.coordinates[1], jobStatus.customerLocation.coordinates[0]] // Leaflet [lat, lng]
      : [coordinates[1], coordinates[0]];

    const headerTitle = isCompleted
      ? '🎉 Emergency Service Completed'
      : (isAccepted
          ? (jobStatus.status === 'In Progress'
              ? '🛠️ Emergency Repair In Progress'
              : (jobStatus.status === 'On The Way'
                  ? '🚗 Professional On The Way'
                  : (jobStatus.status === 'Arrived'
                      ? '📍 Professional Arrived at Location'
                      : '✅ Emergency Dispatch Confirmed')))
          : (isPendingConfirmation
              ? '🚨 Professional Found — Confirm Dispatch'
              : (isExpired
                  ? '⏱️ Emergency Request Expired'
                  : (isCancelled
                      ? '❌ Emergency Request Cancelled'
                      : 'Searching for Nearby Professionals'))));

    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: isCompleted ? '#ecfdf5' : '#fef2f2', border: `1px solid ${isCompleted ? '#a7f3d0' : '#fca5a5'}`, padding: '4px 12px', borderRadius: '10px', color: isCompleted ? '#059669' : '#ef4444', fontWeight: '800', fontSize: '0.8rem', marginBottom: '6px' }}>
              <Radio size={14} className={isCompleted ? '' : 'animate-pulse'} /> {isCompleted ? 'DISPATCH COMPLETED' : 'LIVE EMERGENCY DISPATCH'}
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>
              {headerTitle}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Category: <strong>{jobStatus.serviceType}</strong> • Service Location: <strong>{jobStatus.serviceAddress || jobStatus.location}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleStartNewRequest}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.88rem' }}
            >
              + Create New Request
            </button>
          </div>
        </div>

        {/* 1. SEARCHING RADAR SCREEN (Status: Open) */}
        {isSearchOpen && (
          <div className="glass-panel" style={{ padding: '32px 24px', borderRadius: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            
            {/* Radar Animation Graphic */}
            <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid rgba(239, 68, 68, 0.4)',
                animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
              }} />
              <div style={{
                position: 'absolute',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid rgba(239, 68, 68, 0.6)'
              }} />
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(239,68,68,0.7)',
                zIndex: 2
              }}>
                <Radio size={26} />
              </div>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>
              Broadcasting Emergency Alert
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto 20px auto' }}>
              Your emergency request is being broadcast across verified professionals with progressive radius expansion.
            </p>

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', maxWidth: '640px', margin: '0 auto 20px auto', textAlign: 'left' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px 18px', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>SEARCH RADIUS</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ef4444', marginTop: '2px' }}>
                  {searchRoundLabel}
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '14px 18px', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>SEARCH TIME REMAINING</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                  ⏱️ {formatSeconds(jobStatus.searchSecondsRemaining)}
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: '14px 18px', borderRadius: '14px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>WORKERS NOTIFIED</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--accent-primary)', marginTop: '2px' }}>
                  {jobStatus.notifiedWorkersCount || 0} professionals
                </div>
              </div>
            </div>

            {/* Progressive Radius Indicator */}
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0', maxWidth: '640px', margin: '0 auto 20px auto', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ fontWeight: radiusKm <= 2 ? '800' : '600', color: radiusKm <= 2 ? '#ef4444' : '#64748b' }}>
                📍 0–60s: 2 km
              </div>
              <div>→</div>
              <div style={{ fontWeight: (radiusKm > 2 && radiusKm <= 5) ? '800' : '600', color: (radiusKm > 2 && radiusKm <= 5) ? '#ef4444' : '#64748b' }}>
                📡 60–120s: 5 km
              </div>
              <div>→</div>
              <div style={{ fontWeight: radiusKm > 5 ? '800' : '600', color: radiusKm > 5 ? '#ef4444' : '#64748b' }}>
                🌐 120–300s: 10 km
              </div>
            </div>

            {/* Compact Search Radius Map */}
            <div style={{ maxWidth: '640px', margin: '0 auto 24px auto', borderRadius: '14px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <MapContainer center={siteCoords} zoom={13} scrollWheelZoom={false} style={{ width: '100%', height: '180px' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={siteCoords} icon={emergencyPinIcon}>
                  <Popup>Emergency Site: {jobStatus.serviceAddress || 'Customer Location'}</Popup>
                </Marker>
                <Circle 
                  center={siteCoords} 
                  radius={jobStatus.broadcastRadius || 2000} 
                  pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12 }} 
                />
              </MapContainer>
            </div>

            <button
              onClick={handleCancelRequest}
              disabled={actionLoading}
              style={{
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '8px 24px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Cancel Emergency Request
            </button>
          </div>
        )}

        {/* 2. CONFIRMATION SCREEN (Status: EmergencyAcceptedPendingCustomer) */}
        {isPendingConfirmation && (
          <div className="glass-panel" style={{ padding: '32px 24px', borderRadius: '24px', border: '2px solid #f59e0b', background: '#fffbeb' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.6rem' }}>🚨</span>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: '#92400e' }}>
                  Professional Found! Immediate Response Offered
                </h2>
                <p style={{ margin: 0, color: '#b45309', fontSize: '0.88rem' }}>
                  Please review arrival time and confirm dispatch within <strong>{formatSeconds(jobStatus.confirmationSecondsRemaining)}</strong>.
                </p>
              </div>
            </div>

            {/* Claimed Worker Card */}
            <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #fde68a', marginBottom: '20px', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <Avatar 
                  src={jobStatus.worker?.avatar} 
                  name={jobStatus.worker?.name || 'Worker'} 
                  size={64} 
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                      {jobStatus.worker?.name}
                    </h3>
                    <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' }}>
                      ✓ Verified Pro
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                    {jobStatus.worker?.title || jobStatus.serviceType}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.82rem' }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <strong>{jobStatus.worker?.rating || 4.9}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>({jobStatus.worker?.reviewsCount || 10}+ reviews)</span>
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 18px', borderRadius: '14px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#b91c1c', display: 'block' }}>ESTIMATED ARRIVAL (ETA)</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#dc2626' }}>
                    ⚡ {jobStatus.estimatedArrivalTime || 'Immediate'}
                  </div>
                </div>
              </div>
            </div>

            {/* Fee & Terms Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.7)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                {jobStatus.emergencySurchargePercent ? (
                  <span>Agreed Labor + <strong>10% Emergency Surcharge</strong> (Quoted after inspection)</span>
                ) : (
                  <span>Total Service & Emergency Surcharge: <strong>₹{jobStatus.totalAmount || 650}</strong></span>
                )}
              </span>
              <span style={{ color: '#b45309', fontWeight: '600' }}>
                Payment upon quotation approval & completion
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDeclineWorker}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  minWidth: '160px',
                  background: 'transparent',
                  border: '1px solid #dc2626',
                  color: '#dc2626',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  cursor: 'pointer'
                }}
              >
                Decline (Too Far / Late)
              </button>

              <button
                onClick={handleConfirmDispatch}
                disabled={actionLoading}
                className="btn-primary"
                style={{
                  flex: 2,
                  minWidth: '220px',
                  background: '#dc2626',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  fontWeight: '800',
                  fontSize: '0.98rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                Confirm Dispatch (Immediate Response)
              </button>
            </div>
          </div>
        )}

        {/* 3. CONFIRMED SCREEN (Status: Accepted, On The Way, Arrived, In Progress) */}
        {isAccepted && (
          <div className="glass-panel" style={{ padding: '36px 24px', borderRadius: '24px', textAlign: 'center', border: '2px solid #10b981', background: '#f0fdf4' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#065f46', marginBottom: '8px' }}>
              {jobStatus.status === 'In Progress'
                ? 'Emergency Repair In Progress'
                : (jobStatus.status === 'On The Way'
                    ? 'Professional On The Way!'
                    : (jobStatus.status === 'Arrived'
                        ? 'Professional Has Arrived!'
                        : 'Emergency Service Confirmed!'))}
            </h2>
            <p style={{ color: '#047857', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 20px auto' }}>
              <strong>{jobStatus.worker?.name || 'The professional'}</strong> {jobStatus.status === 'In Progress' ? 'is currently performing the urgent repair at your location.' : 'has been dispatched and is attending to your emergency.'}
            </p>

            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', maxWidth: '480px', margin: '0 auto 24px auto', textAlign: 'left', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Worker Name:</span>
                <strong>{jobStatus.worker?.name || 'Professional'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Contact Phone:</span>
                <strong>📞 {jobStatus.worker?.phone || '+91 8888888881'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <strong style={{ color: '#059669' }}>{jobStatus.status}</strong>
              </div>
              {jobStatus.estimatedArrivalTime && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Arrival ETA:</span>
                  <strong style={{ color: '#ef4444' }}>{jobStatus.estimatedArrivalTime}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/app/bookings')}
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                View in My Bookings →
              </button>
              <button
                onClick={handleStartNewRequest}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', padding: '12px 22px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                + Start Another Request
              </button>
            </div>
          </div>
        )}

        {/* 4. COMPLETED SCREEN (Status: Completed) */}
        {isCompleted && (
          <div className="glass-panel" style={{ padding: '36px 24px', borderRadius: '24px', textAlign: 'center', border: '2px solid #10b981', background: '#f0fdf4' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#065f46', marginBottom: '8px' }}>
              Emergency Service Completed!
            </h2>
            <p style={{ color: '#047857', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 20px auto' }}>
              The emergency repair has been completed by <strong>{jobStatus.worker?.name || 'the professional'}</strong>.
            </p>

            <div style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 22px', maxWidth: '480px', margin: '0 auto 24px auto', textAlign: 'left', border: '1px solid #a7f3d0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Service Type:</span>
                <strong>{jobStatus.serviceType}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Professional:</span>
                <strong>{jobStatus.worker?.name || 'Verified Professional'}</strong>
              </div>
              {jobStatus.laborCharge != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Labor Charge:</span>
                  <strong>₹{jobStatus.laborCharge}</strong>
                </div>
              )}
              {jobStatus.emergencyCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#ef4444' }}>
                  <span>Emergency Surcharge (10%):</span>
                  <strong>+₹{jobStatus.emergencyCharge}</strong>
                </div>
              )}
              {jobStatus.materialCost > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Material / Parts:</span>
                  <strong>₹{jobStatus.materialCost}</strong>
                </div>
              )}
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem' }}>
                <strong>Total Amount:</strong>
                <strong style={{ color: '#065f46' }}>₹{jobStatus.totalAmount || 0}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleStartNewRequest}
                className="btn-primary"
                style={{ padding: '12px 26px', fontSize: '0.95rem' }}
              >
                + Create New Emergency Request
              </button>
              <button
                onClick={() => navigate('/app/bookings')}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', padding: '12px 22px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                View in My Bookings →
              </button>
            </div>
          </div>
        )}

        {/* 5. EXPIRED / CANCELLED SCREEN */}
        {(isExpired || isCancelled) && (
          <div className="glass-panel" style={{ padding: '36px 24px', borderRadius: '24px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <XCircle size={32} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px' }}>
              {isExpired ? 'Emergency Request Expired' : 'Emergency Request Cancelled'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px auto' }}>
              {isExpired
                ? 'No nearby verified professionals were able to claim your request within the 5-minute search window. You can restart a new request or browse available workers directly on the map.'
                : 'This emergency dispatch request was cancelled or declined.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleStartNewRequest}
                className="btn-primary"
                style={{ padding: '10px 24px', background: '#ef4444' }}
              >
                Create New Emergency Request
              </button>
              <button
                onClick={() => navigate('/app/map')}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Browse Map View
              </button>
            </div>
          </div>
        )}

        {/* 6. FALLBACK FOR UNEXPECTED STATUS */}
        {!isSearchOpen && !isPendingConfirmation && !isAccepted && !isCompleted && !isExpired && !isCancelled && (
          <div className="glass-panel" style={{ padding: '36px 24px', borderRadius: '24px', textAlign: 'center', border: '1px solid var(--border-glass)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '8px' }}>
              Request Status: {jobStatus.status}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              This request is in status "{jobStatus.status}". You can return to the emergency request form or check your bookings.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleStartNewRequest}
                className="btn-primary"
                style={{ padding: '10px 24px' }}
              >
                + Create New Emergency Request
              </button>
              <button
                onClick={() => navigate('/app/bookings')}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-glass)', padding: '10px 20px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                View in My Bookings
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Current Leaflet position [lat, lng]
  const leafletPosition = [coordinates[1], coordinates[0]];

  // ==========================================
  // VIEW RENDER: EMERGENCY REQUEST CREATION FORM
  // ==========================================
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: '#ffffff', borderRadius: '24px', padding: '28px 24px', marginBottom: '28px', boxShadow: '0 8px 30px rgba(239, 68, 68, 0.25)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', marginBottom: '10px' }}>
          <Radio size={14} className="animate-pulse" /> PUBLIC EMERGENCY DISPATCH
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: '900', margin: '0 0 8px 0' }}>
          Immediate Emergency Service Request
        </h1>
        <p style={{ margin: 0, opacity: 0.95, fontSize: '0.95rem', lineHeight: '1.5', maxWidth: '650px' }}>
          Broadcast your urgent repair across nearby verified professionals with progressive radius expansion (2 km → 5 km → 10 km). First qualified responder claims the dispatch!
        </p>
      </div>

      <form onSubmit={handleSubmitEmergency} className="glass-panel" style={{ padding: 'clamp(20px, 4vw, 32px)', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Error Alert */}
        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Category Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px' }}>
            1. Select Emergency Service Category: <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            {EMERGENCY_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid #ef4444' : '1px solid var(--border-glass)',
                    background: isSelected ? '#fff5f5' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 2px 12px rgba(239,68,68,0.15)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                    <strong style={{ fontSize: '0.95rem', color: isSelected ? '#ef4444' : 'var(--text-primary)' }}>{cat.label}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.3', marginBottom: '6px' }}>
                    {cat.desc}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isSelected ? '#ef4444' : '#059669', fontWeight: '700' }}>
                    ⚡ {cat.availableText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Problem Description & Quick Tags */}
        <div>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: '700', marginBottom: '8px' }}>
            2. Describe the Emergency Issue: <span style={{ color: '#ef4444' }}>*</span>
          </label>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            {QUICK_TAGS.map(tag => (
              <button
                type="button"
                key={tag}
                onClick={() => setDescription(tag)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-glass)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                + {tag}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Master bathroom pipe broke under sink and water is flooding fast. Need urgent assistance!"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              fontSize: '0.92rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* 3. Address & Interactive Location Confirmation Map */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ fontSize: '0.95rem', fontWeight: '700', margin: 0 }}>
              3. Service Location & Interactive Map Confirmation: <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleFetchGPS}
                disabled={gpsLoading}
                style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#059669',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Detect device GPS coordinates"
              >
                {gpsLoading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                Use Device GPS
              </button>
            </div>
          </div>

          {/* GPS Error Notification if permission denied */}
          {gpsError && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309', padding: '8px 12px', borderRadius: '10px', fontSize: '0.82rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertOctagon size={16} />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Service Address Text Input */}
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter flat / house number, street, landmark, Kozhikode"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              fontSize: '0.92rem',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              marginBottom: '10px'
            }}
          />

          {/* Quick Locality Presets (Kozhikode) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '0.78rem' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Kozhikode Presets:</span>
            {KOZHIKODE_PRESETS.map(preset => (
              <button
                type="button"
                key={preset.name}
                onClick={() => handleSelectPreset(preset)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                📍 {preset.name}
              </button>
            ))}
          </div>

          {/* Compact Interactive Leaflet Confirmation Map */}
          <div style={{ borderRadius: '14px', overflow: 'hidden', border: '2px solid #cbd5e1', position: 'relative' }}>
            <MapContainer 
              center={leafletPosition} 
              zoom={14} 
              scrollWheelZoom={false} 
              style={{ width: '100%', height: '230px' }}
            >
              <TileLayer 
                attribution='&copy; OpenStreetMap' 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              />
              <RecenterMap position={leafletPosition} />
              <Marker 
                position={leafletPosition} 
                draggable={true} 
                eventHandlers={{ dragend: handleMarkerDragEnd }}
                icon={emergencyPinIcon}
              >
                <Popup>
                  <div style={{ fontSize: '0.82rem', padding: '2px' }}>
                    <strong>🚨 Emergency Service Site</strong>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>Drag to adjust exact location</div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Selected GPS Coordinates & Confirmation Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '2px 10px', borderRadius: '6px', fontWeight: '700' }}>
              ✓ Selected GPS: {coordinates[1].toFixed(4)}° N, {coordinates[0].toFixed(4)}° E
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              (Drag the pin anytime to adjust search center)
            </span>
          </div>
        </div>

        {/* 4. Transparent Emergency Pricing System */}
        <div style={{ background: '#f8fafc', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Service Charge:</span>
            <strong>Determined after inspection</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#dc2626' }}>
            <span>Emergency Priority Surcharge:</span>
            <strong>10% of agreed labor charge</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Material Charges:</span>
            <span>Additional, if required</span>
          </div>
          <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            <span>Final Amount:</span>
            <span style={{ color: 'var(--accent-primary)' }}>Confirmed after worker quotation & customer approval</span>
          </div>

          {/* Required Acknowledgment Checkbox */}
          <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={acceptSurchargeTerms}
                onChange={(e) => setAcceptSurchargeTerms(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#dc2626', cursor: 'pointer' }}
                required
              />
              <span style={{ lineHeight: '1.4' }}>
                I understand that a <strong>10% emergency surcharge</strong> applies to the agreed labor charge, excluding materials.
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{
            background: '#ef4444',
            padding: '14px 24px',
            fontSize: '1.05rem',
            fontWeight: '800',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)'
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Broadcasting Request...
            </>
          ) : (
            <>
              <Radio size={20} /> Broadcast Emergency Request
            </>
          )}
        </button>

      </form>
    </div>
  );
}
