import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Star, ShieldCheck, Briefcase, Calendar, X, Zap, 
  Loader2, Plus, Image as ImageIcon, FileText, Upload, CheckCircle2, AlertOctagon, Eye, Trash2, Navigation,
  Play, Video, Film, Edit3, Check, CloudUpload, ArrowRight, Layers, Sparkles, SlidersHorizontal, AlertCircle,
  Lock, Info, Compass, DollarSign, Camera
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveAvatarUrl } from '../utils/avatar';
import Avatar from '../components/Avatar';
import { 
  getTodayLocalDateString, 
  getCurrentLocalTimeString, 
  getDefaultBookingTimeString, 
  getWorkerAvailability, 
  isDateTimeInPast, 
  combineLocalDateAndTimeToDate, 
  formatTime12h, 
  formatDateReadable 
} from '../utils/bookingDateUtils';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix standard Leaflet default icon paths in Vite
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

const defaultLocationIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom interactive Service Location marker pin - authentic map pin pointing directly to coordinates
const serviceLocationMarkerIcon = L.divIcon({
  className: 'service-location-pin',
  html: `
    <div style="
      position: relative;
      width: 36px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      user-select: none;
    ">
      <svg width="36" height="50" viewBox="0 0 36 50" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 10px rgba(79, 70, 229, 0.45));">
        <!-- Ground contact shadow -->
        <ellipse cx="18" cy="47.5" rx="7.5" ry="2.2" fill="rgba(15, 23, 42, 0.35)"/>
        <!-- Teardrop Pin Body -->
        <path d="M18 45.5C17.4 44.7 3 25.5 3 16A15 15 0 1 1 33 16C33 25.5 18.6 44.7 18 45.5Z" fill="#4f46e5" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
        <!-- Inner White Circle -->
        <circle cx="18" cy="16" r="6" fill="#ffffff"/>
        <!-- Center Accent Dot -->
        <circle cx="18" cy="16" r="3" fill="#4f46e5"/>
      </svg>
    </div>
  `,
  iconSize: [36, 50],
  iconAnchor: [18, 46],
  popupAnchor: [0, -46]
});

// Kozhikode regional presets for quick location picking
const KOZHIKODE_PRESETS = [
  { name: 'Mananchira', lat: 11.2588, lng: 75.7804 },
  { name: 'Mavoor Road', lat: 11.2595, lng: 75.7920 },
  { name: 'Nadakkavu', lat: 11.2720, lng: 75.7760 },
  { name: 'Palayam', lat: 11.2490, lng: 75.7850 },
  { name: 'West Hill', lat: 11.2950, lng: 75.7600 },
  { name: 'Calicut Beach', lat: 11.2610, lng: 75.7680 },
  { name: 'Medical College', lat: 11.2750, lng: 75.8350 },
  { name: 'Kallayi / Panniankara', lat: 11.2314, lng: 75.7925 },
  { name: 'Feroke', lat: 11.1960, lng: 75.8340 }
];

// Interactive map component that moves marker on click or drag without snapping back
function ServiceLocationPickerMap({ markerPos, onPositionChange }) {
  const map = useMap();
  const prevPosRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!map || !markerPos) return;
    const prev = prevPosRef.current;
    if (!prev || Math.abs(prev.lat - markerPos.lat) > 0.0001 || Math.abs(prev.lng - markerPos.lng) > 0.0001) {
      map.panTo([markerPos.lat, markerPos.lng], { animate: true, duration: 0.4 });
      prevPosRef.current = markerPos;
    }
  }, [map, markerPos]);

  useMapEvents({
    click(e) {
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  return markerPos ? (
    <Marker
      position={[markerPos.lat, markerPos.lng]}
      draggable={true}
      icon={serviceLocationMarkerIcon}
      eventHandlers={{
        dragend(e) {
          const latlng = e.target.getLatLng();
          onPositionChange({ lat: latlng.lat, lng: latlng.lng });
        }
      }}
    >
      <Popup>
        <div style={{ fontSize: '12px', fontWeight: '600' }}>
          📍 Normal Service Location<br />
          <span style={{ color: '#64748b', fontSize: '11px' }}>
            Lat: {markerPos.lat.toFixed(4)}, Lng: {markerPos.lng.toFixed(4)}
          </span>
        </div>
      </Popup>
    </Marker>
  ) : null;
}

// Relative time formatting helper for location updates
function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Not updated yet';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Not updated yet';
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 45) return 'Updated just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Updated ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `Updated ${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  return `Updated on ${date.toLocaleDateString()}`;
}

export const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `http://localhost:5000${cleanPath}`;
};

export default function WorkerProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('userProfile')) || {};
  const userRole = localStorage.getItem('userRole') || 'customer';

  const [worker, setWorker] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [serviceMode, setServiceMode] = useState('normal'); // 'normal' | 'emergency'
  const [bookingDate, setBookingDate] = useState(getTodayLocalDateString());
  const [bookingTime, setBookingTime] = useState(getDefaultBookingTimeString());
  const [estimatedDuration, setEstimatedDuration] = useState(60); // minutes
  const [bookingLocation, setBookingLocation] = useState('');
  const [customerCoordinates, setCustomerCoordinates] = useState(null); // [longitude, latitude] GeoJSON
  const [gpsStatus, setGpsStatus] = useState({ loading: false, error: null, success: false });
  const [bookingDesc, setBookingDesc] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // Portfolio Filtering & Viewing State
  const [portfolioFilter, setPortfolioFilter] = useState('all'); // 'all' | 'photos' | 'videos' | 'projects' | 'before_after'
  const [viewingItem, setViewingItem] = useState(null);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editProjectType, setEditProjectType] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);

  // Portfolio Upload Modal (for worker)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [uploadMediaType, setUploadMediaType] = useState('image'); // 'image' | 'video'
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioCategory, setPortfolioCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [portfolioProjectType, setPortfolioProjectType] = useState('Completed Work');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [beforeFile, setBeforeFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterFile, setAfterFile] = useState(null);
  const [afterPreview, setAfterPreview] = useState('');
  const [submittingPortfolio, setSubmittingPortfolio] = useState(false);
  const [portfolioError, setPortfolioError] = useState('');
  const [dragOverMedia, setDragOverMedia] = useState(false);

  const fileInputRef = useRef(null);
  const beforeInputRef = useRef(null);
  const afterInputRef = useRef(null);

  // KYC Upload State (for worker)
  const [identityProof, setIdentityProof] = useState('');
  const [addressProof, setAddressProof] = useState('');
  const [skillCert, setSkillCert] = useState('');
  const [expProof, setExpProof] = useState('');
  const [submittingKYC, setSubmittingKYC] = useState(false);

  // Worker Profile Editing & Location State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    title: '',
    phone: '',
    bio: '',
    skills: [],
    experienceYears: '',
    serviceRadius: '15 km',
    serviceMode: 'Home Service',
    pricingType: 'Custom',
    startingPrice: '',
    minimumCharge: '',
    businessName: '',
    address: '',
    locationCoords: { lat: 11.2588, lng: 75.7804 }
  });
  const [skillInput, setSkillInput] = useState('');
  const [showMapInModal, setShowMapInModal] = useState(false);
  const [detectingGpsInModal, setDetectingGpsInModal] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState('');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [searchingPlace, setSearchingPlace] = useState(false);

  // Current Location State
  const [updatingCurrentLoc, setUpdatingCurrentLoc] = useState(false);
  const [currentLocToast, setCurrentLocToast] = useState(null);

  // Worker Profile Picture Upload State
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef(null);

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
        setWorker(prev => ({ ...prev, avatar: data.avatar }));
        const stored = JSON.parse(localStorage.getItem('userProfile')) || {};
        localStorage.setItem('userProfile', JSON.stringify({ ...stored, avatar: data.avatar }));
        window.dispatchEvent(new Event('storage'));
        setShowAvatarModal(false);
        setAvatarFile(null);
        setAvatarPreview('');
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

  const handleOpenEditProfile = (focusSection = 'details') => {
    if (!worker) return;
    setEditError('');
    const coords = worker.location?.coordinates;
    const lat = (coords && typeof coords[1] === 'number') ? coords[1] : 11.2588;
    const lng = (coords && typeof coords[0] === 'number') ? coords[0] : 75.7804;

    const currentMin = (typeof worker.minimumCharge === 'number' && worker.minimumCharge > 0)
      ? worker.minimumCharge
      : (typeof worker.startingPrice === 'number' && worker.startingPrice > 0)
        ? worker.startingPrice
        : '';
    const currentExp = (typeof worker.experienceYears === 'number' && worker.experienceYears > 0)
      ? worker.experienceYears
      : '';

    setEditForm({
      name: worker.name || '',
      title: worker.title || worker.skills?.[0] || '',
      phone: worker.phone ? worker.phone.replace(/\D/g, '') : '',
      bio: worker.bio || '',
      skills: Array.isArray(worker.skills) ? [...worker.skills] : [],
      experienceYears: currentExp,
      serviceRadius: worker.serviceRadius || '15 km',
      serviceMode: worker.serviceMode || 'Home Service',
      pricingType: worker.pricingType || 'Custom',
      startingPrice: currentMin,
      minimumCharge: currentMin,
      businessName: worker.businessName || '',
      address: worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala'),
      locationCoords: { lat, lng }
    });
    setSkillInput('');
    setShowMapInModal(focusSection === 'location');
    setShowEditModal(true);
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!editForm.skills.includes(trimmed)) {
      setEditForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleUseCurrentLocationForService = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGpsInModal(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setEditForm(prev => ({
          ...prev,
          locationCoords: { lat: latitude, lng: longitude },
          address: prev.address ? prev.address : `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
        }));
        setShowMapInModal(true);
        setDetectingGpsInModal(false);
      },
      (err) => {
        alert('Could not access GPS location: ' + err.message + '. You can still select your location on the map manually.');
        setDetectingGpsInModal(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  const handleSelectPresetLocality = (loc) => {
    setEditForm(prev => ({
      ...prev,
      locationCoords: { lat: loc.lat, lng: loc.lng },
      address: `${loc.name}, Kozhikode, Kerala`
    }));
  };

  const handleSearchPlaceOnMap = async () => {
    const q = mapSearchQuery.trim();
    if (!q) return;

    // Check offline preset match first
    const matched = KOZHIKODE_PRESETS.find(p => p.name.toLowerCase().includes(q.toLowerCase()));
    if (matched) {
      setEditForm(prev => ({
        ...prev,
        locationCoords: { lat: matched.lat, lng: matched.lng },
        address: `${matched.name}, Kozhikode, Kerala`
      }));
      setMapSearchQuery('');
      return;
    }

    setSearchingPlace(true);
    try {
      const queryStr = encodeURIComponent(q + (q.toLowerCase().includes('kozhikode') || q.toLowerCase().includes('calicut') ? '' : ', Kozhikode, Kerala'));
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryStr}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const nameParts = data[0].display_name ? data[0].display_name.split(',').slice(0, 3).join(', ') : `${q}, Kozhikode`;
        setEditForm(prev => ({
          ...prev,
          locationCoords: { lat, lng },
          address: nameParts
        }));
        setMapSearchQuery('');
      } else {
        alert(`No location found for "${q}". You can select a quick locality chip below or click directly on the map.`);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Could not search location. Please select a quick locality below or click on the map.');
    } finally {
      setSearchingPlace(false);
    }
  };

  const handleMapPositionChange = async (newPos) => {
    setEditForm(prev => ({ ...prev, locationCoords: newPos }));
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos.lat}&lon=${newPos.lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        const shortAddr = data.display_name.split(',').slice(0, 3).join(', ');
        if (shortAddr) {
          setEditForm(prev => ({ ...prev, address: shortAddr }));
        }
      }
    } catch (e) {
      // Non-fatal fallback
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditError('');

    // Frontend validations
    const cleanName = (editForm.name || '').trim();
    if (cleanName.length < 2 || cleanName.length > 60) {
      setEditError('Full Name must be between 2 and 60 characters.');
      return;
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(cleanName) || /^\d+$/.test(cleanName)) {
      setEditError('Full Name contains invalid characters. Numbers-only are not allowed.');
      return;
    }

    const cleanPhone = (editForm.phone || '').replace(/\D/g, '');
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setEditError('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    const cleanTitle = (editForm.title || '').trim();
    if (cleanTitle.length > 0 && (cleanTitle.length < 2 || cleanTitle.length > 80)) {
      setEditError('Worker Title must be between 2 and 80 characters.');
      return;
    }

    if (editForm.bio && editForm.bio.length > 1000) {
      setEditError('Bio / About section cannot exceed 1000 characters.');
      return;
    }

    // Optional Years of Experience: 0/empty means hide from profile
    let exp = 0;
    if (editForm.experienceYears !== '' && editForm.experienceYears !== null && editForm.experienceYears !== undefined) {
      exp = Number(editForm.experienceYears);
      if (isNaN(exp) || exp < 0 || exp > 70) {
        setEditError('Years of experience must be a non-negative number between 0 and 70 (or leave empty).');
        return;
      }
    }

    // Optional Minimum Charge: 0/empty means hide from profile
    let minChargeVal = 0;
    const rawPrice = editForm.minimumCharge !== undefined && editForm.minimumCharge !== '' ? editForm.minimumCharge : editForm.startingPrice;
    if (rawPrice !== '' && rawPrice !== null && rawPrice !== undefined) {
      minChargeVal = Number(rawPrice);
      if (isNaN(minChargeVal) || minChargeVal < 0) {
        setEditError('Minimum charge must be a non-negative number (or leave empty).');
        return;
      }
    }

    const cleanAddress = (editForm.address || '').trim();
    if (cleanAddress.length > 200) {
      setEditError('Service Address cannot exceed 200 characters.');
      return;
    }

    setSavingProfile(true);
    const token = localStorage.getItem('token');

    try {
      const payload = {
        name: cleanName,
        phone: cleanPhone,
        title: cleanTitle,
        bio: (editForm.bio || '').trim(),
        skills: editForm.skills,
        experienceYears: exp,
        serviceRadius: editForm.serviceRadius,
        serviceMode: editForm.serviceMode,
        pricingType: editForm.pricingType,
        minimumCharge: minChargeVal,
        startingPrice: minChargeVal,
        hourlyRate: minChargeVal,
        businessName: (editForm.businessName || '').trim(),
        address: cleanAddress,
        location: editForm.locationCoords ? {
          type: 'Point',
          coordinates: [Number(editForm.locationCoords.lng), Number(editForm.locationCoords.lat)]
        } : undefined
      };

      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setWorker(prev => ({ ...prev, ...updatedUser }));
        const stored = JSON.parse(localStorage.getItem('userProfile')) || {};
        localStorage.setItem('userProfile', JSON.stringify({ ...stored, ...updatedUser }));
        window.dispatchEvent(new Event('storage'));
        setShowEditModal(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setEditError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setEditError('Network error updating profile: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setUpdatingCurrentLoc(true);
    setCurrentLocToast(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const token = localStorage.getItem('token');
        try {
          const res = await fetch('http://localhost:5000/api/users/current-location', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              coordinates: [longitude, latitude] // GeoJSON order: [longitude, latitude]
            })
          });

          if (res.ok) {
            const data = await res.json();
            setWorker(prev => ({
              ...prev,
              currentLocation: data.currentLocation
            }));
            setCurrentLocToast({
              type: 'success',
              message: 'Current location updated just now!'
            });
            const stored = JSON.parse(localStorage.getItem('userProfile')) || {};
            localStorage.setItem('userProfile', JSON.stringify({
              ...stored,
              currentLocation: data.currentLocation
            }));
            setTimeout(() => setCurrentLocToast(null), 5000);
          } else {
            const errData = await res.json().catch(() => ({}));
            setCurrentLocToast({
              type: 'error',
              message: errData.message || 'Failed to update current location on server.'
            });
          }
        } catch (err) {
          console.error('Error updating current location:', err);
          setCurrentLocToast({
            type: 'error',
            message: 'Network error updating current location: ' + err.message
          });
        } finally {
          setUpdatingCurrentLoc(false);
        }
      },
      (err) => {
        let msg = 'Could not access GPS location.';
        if (err.code === 1) msg = 'Location permission was denied by your browser.';
        else if (err.code === 2) msg = 'Location position unavailable. Check device GPS.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setCurrentLocToast({ type: 'error', message: msg });
        setUpdatingCurrentLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const targetWorkerId = id || currentUser.id || currentUser._id;

  const fetchProfileAndData = async () => {
    try {
      setLoading(true);
      // Fetch Worker Profile
      const profRes = await fetch(`http://localhost:5000/api/users/profile/${targetWorkerId}`);
      const profData = await profRes.json();
      setWorker(profData);
      if (profData?.skills?.[0]) {
        setPortfolioCategory(prev => prev || profData.skills[0]);
      } else if (profData?.title) {
        setPortfolioCategory(prev => prev || profData.title);
      } else {
        setPortfolioCategory(prev => prev || 'Plumber');
      }

      if (profData?.documents) {
        setIdentityProof(profData.documents.identityProof || '');
        setAddressProof(profData.documents.addressProof || '');
        setSkillCert(profData.documents.skillCertificate || '');
        setExpProof(profData.documents.experienceProof || '');
      }

      // Fetch Portfolio Projects
      const portRes = await fetch(`http://localhost:5000/api/projects/worker/${targetWorkerId}`);
      const portData = await portRes.json();
      setPortfolio(Array.isArray(portData) ? portData : []);

      // Fetch Reviews
      const revRes = await fetch(`http://localhost:5000/api/reviews/worker/${targetWorkerId}`);
      const revData = await revRes.json();
      setReviews(Array.isArray(revData) ? revData : []);

      setLoading(false);
    } catch (err) {
      console.error('Error loading worker profile:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetWorkerId) {
      fetchProfileAndData();
    }
  }, [targetWorkerId]);

  const handleDetectCustomerLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus({ loading: false, error: 'Geolocation is not supported by your browser.', success: false });
      return;
    }
    setGpsStatus({ loading: true, error: null, success: false });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // GeoJSON coordinate order MUST be: [longitude, latitude]
        setCustomerCoordinates([longitude, latitude]);
        setGpsStatus({ loading: false, error: null, success: true });
        if (!bookingLocation) {
          setBookingLocation(`Current GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        }
      },
      (error) => {
        let msg = 'Could not access GPS location.';
        if (error.code === 1) {
          msg = 'Location permission was denied. You can still enter your address manually.';
        } else if (error.code === 2) {
          msg = 'Location position unavailable. Please enter address manually.';
        } else if (error.code === 3) {
          msg = 'Location request timed out. Please enter address manually.';
        }
        setGpsStatus({ loading: false, error: msg, success: false });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!token || token === 'null' || token === 'undefined') {
      alert('Please sign in as a customer to book a service.');
      navigate(`/login/customer?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setSubmittingBooking(true);
    setBookingError('');
    const isEmergency = serviceMode === 'emergency';
    const rate = worker.hourlyRate || 500;
    const duration = Math.max(15, Number(estimatedDuration) || 60);
    const serviceCharge = Math.round(rate * (duration / 60));
    const emergencyCharge = isEmergency ? 150 : 0;

    let preferredDateTimeISO = null;
    if (!isEmergency) {
      if (!bookingDate || !bookingTime) {
        setBookingError('Please specify an appointment date and time.');
        setSubmittingBooking(false);
        return;
      }

      if (isDateTimeInPast(bookingDate, bookingTime)) {
        setBookingError('The selected appointment date and time is in the past. Please select a future time.');
        setSubmittingBooking(false);
        return;
      }

      const dt = combineLocalDateAndTimeToDate(bookingDate, bookingTime);
      if (worker.isAvailable === false && worker.unavailableUntil) {
        const uUntil = new Date(worker.unavailableUntil);
        if (dt < uUntil) {
          setBookingError(`The worker is currently unavailable until ${formatTime12h(uUntil)} on ${formatDateReadable(uUntil)}. Please choose a time after this period.`);
          setSubmittingBooking(false);
          return;
        }
      }
      preferredDateTimeISO = dt.toISOString();
    }

    const resolvedAddress = bookingLocation || (customerCoordinates ? `GPS Location (${customerCoordinates[1].toFixed(4)}, ${customerCoordinates[0].toFixed(4)})` : (currentUser.address || (typeof currentUser.location === 'string' ? currentUser.location : 'Customer Address')));

    let finalCustomerLocation = undefined;
    if (customerCoordinates && Array.isArray(customerCoordinates) && customerCoordinates.length === 2) {
      finalCustomerLocation = {
        type: 'Point',
        coordinates: [Number(customerCoordinates[0]), Number(customerCoordinates[1])]
      };
    } else if (currentUser?.location?.coordinates && Array.isArray(currentUser.location.coordinates)) {
      finalCustomerLocation = {
        type: 'Point',
        coordinates: [Number(currentUser.location.coordinates[0]), Number(currentUser.location.coordinates[1])]
      };
    }

    try {
      const payload = {
        serviceType: worker.skills?.[0] || worker.title || 'General Service',
        description: bookingDesc,
        date: isEmergency ? 'Today' : bookingDate,
        time: isEmergency ? 'ASAP' : formatTime12h(bookingTime),
        preferredDateTime: preferredDateTimeISO,
        estimatedDuration: duration,
        location: resolvedAddress,
        serviceAddress: resolvedAddress,
        ...(finalCustomerLocation ? { customerLocation: finalCustomerLocation } : {}),
        isEmergency,
        serviceCharge,
        emergencyCharge
      };

      if (!isEmergency) {
        payload.workerId = worker._id || worker.id;
      }

      const res = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const createdJob = await res.json().catch(() => ({}));
        setShowBookingModal(false);
        setCustomerCoordinates(null);
        setGpsStatus({ loading: false, error: null, success: false });
        if (isEmergency) {
          alert('🚨 Emergency request broadcast! Redirecting to live emergency radar tracking...');
          navigate('/app/emergency');
        } else {
          alert('✅ Booking request sent successfully! The worker has been notified.');
          navigate('/app/bookings');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          localStorage.removeItem('token');
          alert(data.message || 'Your session expired or token is invalid. Please sign in again.');
          navigate(`/login/customer?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else if (res.status === 409) {
          setBookingError(data.message || 'The worker is not available during this time slot. Please choose another time.');
        } else {
          setBookingError(data.message || 'Failed to submit booking request.');
        }
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setBookingError('Network or server error while submitting booking: ' + err.message);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const resetPortfolioModal = () => {
    setPortfolioTitle('');
    setPortfolioDesc('');
    setPortfolioProjectType('Completed Work');
    setUploadMediaType('image');
    setMediaFile(null);
    if (mediaPreview && mediaPreview.startsWith('blob:')) URL.revokeObjectURL(mediaPreview);
    setMediaPreview('');
    setVideoDuration('');
    setBeforeFile(null);
    if (beforePreview && beforePreview.startsWith('blob:')) URL.revokeObjectURL(beforePreview);
    setBeforePreview('');
    setAfterFile(null);
    if (afterPreview && afterPreview.startsWith('blob:')) URL.revokeObjectURL(afterPreview);
    setAfterPreview('');
    setPortfolioError('');
    setCustomCategory('');
    setDragOverMedia(false);
  };

  const handleSelectMedia = (file, forcedType) => {
    if (!file) return;
    setPortfolioError('');
    const isVideo = (file.type && file.type.startsWith('video/')) || forcedType === 'video';

    if (isVideo) {
      if (file.size > 25 * 1024 * 1024) {
        setPortfolioError('Video size exceeds 25 MB limit. Please select a shorter or compressed clip.');
        return;
      }
      setUploadMediaType('video');
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);

      // Auto-extract video duration
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.onloadedmetadata = () => {
        const totalSeconds = Math.round(tempVideo.duration) || 0;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        setVideoDuration(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      };
      tempVideo.src = url;
    } else {
      if (file.size > 5 * 1024 * 1024) {
        setPortfolioError('Photo size exceeds 5 MB limit. Please choose a file under 5 MB.');
        return;
      }
      setUploadMediaType('image');
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    }
  };

  const handleSelectBeforeFile = (file) => {
    if (!file) return;
    setPortfolioError('');
    if (file.size > 5 * 1024 * 1024) {
      setPortfolioError('Before image exceeds 5 MB limit.');
      return;
    }
    setBeforeFile(file);
    setBeforePreview(URL.createObjectURL(file));
  };

  const handleSelectAfterFile = (file) => {
    if (!file) return;
    setPortfolioError('');
    if (file.size > 5 * 1024 * 1024) {
      setPortfolioError('After image exceeds 5 MB limit.');
      return;
    }
    setAfterFile(file);
    setAfterPreview(URL.createObjectURL(file));
  };

  const handleAddPortfolio = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in as worker to upload portfolio items.');
      return;
    }

    if (!portfolioTitle.trim()) {
      setPortfolioError('Please enter a project title.');
      return;
    }

    if (portfolioProjectType === 'Before & After') {
      if (!beforeFile && !mediaFile) {
        setPortfolioError('Please select a Before photo.');
        return;
      }
      if (!afterFile) {
        setPortfolioError('Please select an After photo.');
        return;
      }
    } else {
      if (!mediaFile) {
        setPortfolioError(`Please select a ${uploadMediaType === 'video' ? 'video' : 'photo'} file.`);
        return;
      }
    }

    setSubmittingPortfolio(true);
    setPortfolioError('');

    try {
      const formData = new FormData();
      formData.append('title', portfolioTitle.trim());
      formData.append('description', portfolioDesc.trim());
      
      const resolvedCategory = (portfolioCategory === 'Other (Type Custom)' ? customCategory.trim() : portfolioCategory) || worker?.skills?.[0] || 'General';
      formData.append('category', resolvedCategory);
      formData.append('projectType', portfolioProjectType);
      formData.append('mediaType', uploadMediaType);

      if (uploadMediaType === 'video') {
        if (mediaFile) formData.append('media', mediaFile);
        if (videoDuration) formData.append('videoDuration', videoDuration);
      } else if (portfolioProjectType === 'Before & After') {
        if (beforeFile) formData.append('beforeImage', beforeFile);
        else if (mediaFile) formData.append('beforeImage', mediaFile);

        if (afterFile) formData.append('afterImage', afterFile);
      } else {
        if (mediaFile) formData.append('media', mediaFile);
      }

      const res = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setShowPortfolioModal(false);
        resetPortfolioModal();
        await fetchProfileAndData();
      } else {
        const data = await res.json().catch(() => ({}));
        setPortfolioError(data.message || 'Failed to upload portfolio item.');
      }
    } catch (err) {
      console.error('Portfolio upload error:', err);
      setPortfolioError('Network or server error during upload: ' + err.message);
    } finally {
      setSubmittingPortfolio(false);
    }
  };

  const handleOpenItem = (item) => {
    setViewingItem(item);
    setIsEditingItem(false);
    setEditTitle(item.title || '');
    setEditDesc(item.description || '');
    setEditCategory(item.category || '');
    setEditProjectType(item.projectType || 'Completed Work');
  };

  const handleUpdatePortfolio = async (e) => {
    e.preventDefault();
    if (!viewingItem) return;
    const token = localStorage.getItem('token');
    setSavingEdit(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${viewingItem._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
          category: editCategory.trim(),
          projectType: editProjectType
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setViewingItem(updated);
        setIsEditingItem(false);
        await fetchProfileAndData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to update portfolio project.');
      }
    } catch (err) {
      console.error('Portfolio update error:', err);
      alert('Error updating portfolio: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePortfolio = async (projectId) => {
    if (!window.confirm('Are you sure you want to permanently remove this portfolio item?')) return;
    const token = localStorage.getItem('token');
    setDeletingItem(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setViewingItem(null);
        await fetchProfileAndData();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Failed to delete portfolio item.');
      }
    } catch (err) {
      console.error('Portfolio delete error:', err);
      alert('Error deleting portfolio item: ' + err.message);
    } finally {
      setDeletingItem(false);
    }
  };

  const handleKYCSubmit = async (e) => {
    e.preventDefault();
    if (!identityProof || !addressProof) {
      alert('Please upload both mandatory Identity Proof and Address Proof documents before submitting.');
      return;
    }
    setSubmittingKYC(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documents: {
            identityProof,
            addressProof,
            skillCertificate: skillCert,
            experienceProof: expProof
          }
        })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setSubmittingKYC(false);
        // Sync updated user profile to localStorage
        const storedUser = JSON.parse(localStorage.getItem('userProfile')) || {};
        localStorage.setItem('userProfile', JSON.stringify({ ...storedUser, ...updatedUser }));
        alert('KYC Documents submitted successfully! Your application is now Pending Admin Verification.');
        fetchProfileAndData();
      } else {
        setSubmittingKYC(false);
        let errorMsg = `Server returned status ${res.status}`;
        try {
          const data = await res.json();
          if (data.message) errorMsg = data.message;
        } catch (_) {}
        alert(`Failed to submit KYC documents: ${errorMsg}`);
      }
    } catch (err) {
      console.error('KYC Submit error:', err);
      setSubmittingKYC(false);
      alert(`Network or Server error while submitting KYC: ${err.message}`);
    }
  };

  if (loading && !worker) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><Loader2 className="animate-spin" size={40} color="var(--accent-primary)" /></div>;
  }

  if (!worker) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><h2>Worker Profile Not Found</h2></div>;
  }

  const isOwnProfile = (!id || id === currentUser.id || id === currentUser._id) && userRole === 'worker';
  const isVerified = worker.verificationStatus === 'Verified';
  const hourlyRate = worker.hourlyRate || 500;
  const emergencyFee = 150;
  const totalEmergencyAmount = hourlyRate + emergencyFee;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Verification Warning for Worker Own Profile */}
      {isOwnProfile && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '16px 20px', 
            borderRadius: '16px', 
            marginBottom: '24px',
            background: worker.verificationStatus === 'Verified' ? '#ecfdf5' : (worker.verificationStatus === 'Pending' ? '#fffbebf0' : '#fef2f2'),
            border: worker.verificationStatus === 'Verified' ? '1px solid #6ee7b7' : (worker.verificationStatus === 'Pending' ? '1px solid #fcd34d' : '1px solid #fca5a5'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {worker.verificationStatus === 'Verified' ? (
              <CheckCircle2 size={24} color="#10b981" />
            ) : (
              <AlertOctagon size={24} color={worker.verificationStatus === 'Pending' ? '#d97706' : '#ef4444'} />
            )}
            <div>
              <h4 style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Verification Status: <span style={{ textTransform: 'uppercase' }}>{worker.verificationStatus || 'Pending'}</span>
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {worker.verificationStatus === 'Verified' && 'Your account is verified. You appear in public search and map discovery.'}
                {worker.verificationStatus === 'Pending' && 'Your KYC documents are under admin review. Once verified, you will appear on the map.'}
                {worker.verificationStatus === 'Rejected' && `Application Rejected: ${worker.rejectionReason || 'Please resubmit valid credentials.'}`}
                {worker.verificationStatus === 'Suspended' && 'Your account is currently suspended by administration.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="glass-panel" style={{ padding: 'clamp(20px, 4vw, 32px)', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <div style={{ position: 'relative', width: 'clamp(90px, 20vw, 130px)', height: 'clamp(90px, 20vw, 130px)', flexShrink: 0 }}>
            <img 
              src={resolveAvatarUrl(worker.avatar, worker.name)} 
              alt={worker.name}
              onClick={() => { if (isOwnProfile) setShowAvatarModal(true); }}
              title={isOwnProfile ? 'Click to change profile photo' : worker.name}
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover', 
                border: '3px solid var(--accent-light)', 
                cursor: isOwnProfile ? 'pointer' : 'default',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
              }}
            />
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                title="Change Profile Photo"
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: '3px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Camera size={17} />
              </button>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>{worker.name}</h1>
                  {isVerified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--accent-light)', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem' }}>
                      <ShieldCheck size={14} /> Verified Professional
                    </span>
                  )}
                  {(() => {
                    const avail = getWorkerAvailability(worker);
                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: avail.badgeBg, color: avail.badgeColor, padding: '4px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: avail.badgeColor }} />
                        {avail.statusText}
                      </span>
                    );
                  })()}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '4px 0 0 0', fontWeight: '600' }}>
                  {worker.title || worker.skills?.[0] || 'Service Specialist'}
                </p>
                {worker.businessName && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: 'var(--accent-primary)', fontWeight: '700' }}>
                    🏢 {worker.businessName}
                  </p>
                )}
              </div>

              {/* Edit Profile Button in Top-Right */}
              {isOwnProfile && (
                <button 
                  onClick={() => handleOpenEditProfile('details')}
                  className="btn-secondary" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '8px 16px', 
                    fontSize: '0.88rem', 
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: '1px solid var(--accent-primary)',
                    color: 'var(--accent-primary)',
                    background: 'var(--accent-light)'
                  }}
                >
                  <Edit3 size={15} /> Edit Profile
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.9rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                <MapPin size={16} color="var(--accent-primary)" /> {worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala')} ({worker.serviceRadius || '15 km'} radius)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontWeight: '700' }}>
                <Star size={16} fill="#f59e0b" /> {worker.rating || 4.8} ({worker.reviewsCount || reviews.length} reviews)
              </span>
              {/* Only show years of experience if worker decided to enter it via Edit Profile */}
              {Number(worker.experienceYears) > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                  <Briefcase size={16} color="var(--accent-primary)" /> {worker.experienceYears} {Number(worker.experienceYears) === 1 ? 'Year' : 'Years'} Experience
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.84rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', padding: '3px 10px', borderRadius: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                <Zap size={13} color="var(--accent-primary)" /> Service Mode: {worker.serviceMode || 'Home Service'}
              </span>
              {/* Only show minimum charge badge if worker explicitly set it via Edit Profile */}
              {(() => {
                const minCharge = (typeof worker.minimumCharge === 'number' && worker.minimumCharge > 0)
                  ? worker.minimumCharge
                  : (typeof worker.startingPrice === 'number' && worker.startingPrice > 0)
                    ? worker.startingPrice
                    : null;
                if (!minCharge) return null;
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-tertiary)', padding: '3px 10px', borderRadius: '8px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    <DollarSign size={13} color="#10b981" /> Minimum Charge: ₹{minCharge.toLocaleString('en-IN')}
                  </span>
                );
              })()}
            </div>

            {worker.bio && (
              <div style={{ background: 'rgba(241, 245, 249, 0.6)', padding: '10px 14px', borderRadius: '12px', borderLeft: '3px solid var(--accent-primary)' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {worker.bio}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(worker.skills || []).map(skill => (
                <span key={skill} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '8px', fontWeight: '500' }}>
                  {skill}
                </span>
              ))}
            </div>

            {/* Book Service Action Button for Customer */}
            {userRole !== 'worker' && (
              <div style={{ marginTop: '8px' }}>
                <button 
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    if (!token || token === 'null' || token === 'undefined') {
                      alert('Please sign in as a customer to book a service.');
                      navigate(`/login/customer?redirect=${encodeURIComponent(window.location.pathname)}`);
                      return;
                    }
                    setBookingDate(getTodayLocalDateString());
                    setBookingTime(getDefaultBookingTimeString());
                    setEstimatedDuration(60);
                    setBookingError('');
                    setShowBookingModal(true);
                  }}
                  className="btn-primary" 
                  style={{ padding: '12px 28px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Calendar size={18} /> Book Service{(() => {
                    const minCharge = (typeof worker.minimumCharge === 'number' && worker.minimumCharge > 0)
                      ? worker.minimumCharge
                      : (typeof worker.startingPrice === 'number' && worker.startingPrice > 0)
                        ? worker.startingPrice
                        : null;
                    return minCharge ? ` (Min. ₹${minCharge.toLocaleString('en-IN')})` : '';
                  })()}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Location Management Section (Service Base Location & Current Physical Location) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '16px', 
          paddingTop: '18px', 
          borderTop: '1px solid var(--border-color)',
          width: '100%'
        }}>
          {/* Base Service Location */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '14px 18px', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <MapPin size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Service Location (Base)
                </span>
              </div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                {worker.address || (typeof worker.location === 'string' ? worker.location : 'Kozhikode, Kerala')}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Base location visible to customers on NearFix discovery map ({worker.serviceRadius || '15 km'} radius).
                {worker.location?.coordinates && (
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '2px' }}>
                    GPS: [{worker.location.coordinates[1].toFixed(4)}, {worker.location.coordinates[0].toFixed(4)}]
                  </span>
                )}
              </p>
            </div>
            {isOwnProfile && (
              <div>
                <button 
                  onClick={() => handleOpenEditProfile('location')}
                  className="btn-secondary" 
                  style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                >
                  <Edit3 size={14} /> Edit Location
                </button>
              </div>
            )}
          </div>

          {/* Current Physical Location */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: '14px 18px', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Navigation size={16} color="#2563eb" />
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Current Physical Location
                </span>
              </div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                {formatRelativeTime(worker.currentLocation?.updatedAt)}
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {worker.currentLocation?.coordinates 
                  ? `Coordinates: (${worker.currentLocation.coordinates[1].toFixed(4)}, ${worker.currentLocation.coordinates[0].toFixed(4)}) • Used for active job dispatch & distance.`
                  : 'Manual update only. Used for accepted bookings & route distance. Not a permanent public marker.'
                }
              </p>
              {currentLocToast && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '6px 10px', 
                  borderRadius: '8px', 
                  fontSize: '0.78rem', 
                  fontWeight: '600',
                  background: currentLocToast.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: currentLocToast.type === 'success' ? '#059669' : '#dc2626',
                  border: currentLocToast.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca'
                }}>
                  {currentLocToast.message}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <div>
                <button 
                  onClick={handleUpdateCurrentLocation}
                  disabled={updatingCurrentLoc}
                  className="btn-primary" 
                  style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                >
                  {updatingCurrentLoc ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                  {updatingCurrentLoc ? 'Detecting GPS...' : 'Update Current Location'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Work Portfolio Section */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>Work Portfolio</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Showcase your best work. Photos and videos help customers trust your skills.
            </p>
          </div>

          {isOwnProfile && (
            <button 
              onClick={() => {
                resetPortfolioModal();
                setShowPortfolioModal(true);
              }}
              className="btn-primary" 
              style={{ padding: '9px 18px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: '700' }}
            >
              <Plus size={17} /> Add Photo / Video
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'photos', label: 'Photos', icon: ImageIcon },
            { id: 'videos', label: 'Videos', icon: Video },
            { id: 'projects', label: 'Projects', icon: Briefcase },
            { id: 'before_after', label: 'Before & After', icon: ArrowRight }
          ].map(filter => {
            const Icon = filter.icon;
            const isActive = portfolioFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setPortfolioFilter(filter.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? '700' : '600',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  background: isActive ? 'var(--accent-primary)' : '#f8fafc',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none'
                }}
              >
                {Icon && <Icon size={14} />}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Portfolio Media Grid */}
        {(() => {
          const filteredPortfolio = portfolio.filter(p => {
            if (portfolioFilter === 'all') return true;
            if (portfolioFilter === 'photos') return (p.mediaType === 'image' || !p.mediaType) && p.projectType !== 'Before & After';
            if (portfolioFilter === 'videos') return p.mediaType === 'video' || Boolean(p.videoUrl);
            if (portfolioFilter === 'projects') return ['Completed Work', 'New Installation', 'Installation', 'Repair', 'Maintenance', 'Other'].includes(p.projectType);
            if (portfolioFilter === 'before_after') return p.projectType === 'Before & After';
            return true;
          });

          if (filteredPortfolio.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '48px 16px', background: '#f8fafc', borderRadius: '18px', border: '1px dashed #cbd5e1' }}>
                <ImageIcon size={44} style={{ opacity: 0.35, marginBottom: '10px', color: 'var(--accent-primary)' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {portfolioFilter === 'all' ? 'No portfolio showcases yet' : `No ${portfolioFilter.replace('_', ' ')} found`}
                </h4>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  {isOwnProfile 
                    ? 'Upload photos or videos of previous jobs to demonstrate your work quality to potential clients.'
                    : 'This professional has not uploaded showcases in this category yet.'}
                </p>
                {isOwnProfile && (
                  <button 
                    onClick={() => {
                      resetPortfolioModal();
                      setShowPortfolioModal(true);
                    }}
                    className="btn-primary" 
                    style={{ marginTop: '16px', padding: '8px 18px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={16} /> Add Photo / Video
                  </button>
                )}
              </div>
            );
          }

          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))',
              gap: '16px'
            }}>
              {filteredPortfolio.map(p => {
                const isVideo = p.mediaType === 'video' || Boolean(p.videoUrl);
                const isBeforeAfter = p.projectType === 'Before & After' || (p.beforeImage && p.afterImage);
                const thumbImg = resolveMediaUrl(p.imageUrl || (p.images && p.images[0]) || p.beforeImage || p.afterImage || 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=600');
                const beforeThumb = resolveMediaUrl(p.beforeImage || (p.images && p.images[0]) || thumbImg);
                const afterThumb = resolveMediaUrl(p.afterImage || (p.images && p.images[1]) || thumbImg);

                return (
                  <div
                    key={p._id}
                    onClick={() => handleOpenItem(p)}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      background: '#0f172a',
                      cursor: 'pointer',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
                      transition: 'transform 0.22s ease, box-shadow 0.22s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 24px rgba(79, 70, 229, 0.16)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.05)';
                    }}
                  >
                    {isBeforeAfter ? (
                      /* Before & After Split Card */
                      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
                        <div style={{ width: '50%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                          <img 
                            src={beforeThumb} 
                            alt="Before" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            loading="lazy"
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            letterSpacing: '0.3px'
                          }}>
                            Before
                          </span>
                        </div>

                        <div style={{ width: '1.5px', height: '100%', background: 'rgba(255, 255, 255, 0.85)', zIndex: 2 }} />

                        <div style={{ width: '50%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                          <img 
                            src={afterThumb} 
                            alt="After" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            loading="lazy"
                          />
                          <span style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'var(--accent-primary)',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            letterSpacing: '0.3px',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                          }}>
                            After
                          </span>
                        </div>

                        {/* Top-right Before & After icon badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '6px',
                          padding: '4px',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 3
                        }}>
                          <ImageIcon size={13} />
                        </div>
                      </div>
                    ) : isVideo ? (
                      /* Video Media Card */
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        {p.imageUrl ? (
                          <img 
                            src={thumbImg} 
                            alt={p.title} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            loading="lazy"
                          />
                        ) : (
                          <video 
                            src={resolveMediaUrl(p.videoUrl)} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            muted 
                            preload="metadata"
                          />
                        )}

                        {/* Subtle dark tint */}
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.22)' }} />

                        {/* Centered circular play button */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.88)',
                          backdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#1e1b4b',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                          transition: 'transform 0.2s ease'
                        }}>
                          <Play size={20} fill="#1e1b4b" style={{ marginLeft: '2px' }} />
                        </div>

                        {/* Top-Right video badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '6px',
                          padding: '4px',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Video size={13} />
                        </div>

                        {/* Bottom-Right duration badge */}
                        {p.videoDuration && (
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            letterSpacing: '0.4px'
                          }}>
                            {p.videoDuration}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Standard Photo Card */
                      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <img 
                          src={thumbImg} 
                          alt={p.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          loading="lazy"
                        />

                        {/* Top-Right photo badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(15, 23, 42, 0.65)',
                          backdropFilter: 'blur(4px)',
                          borderRadius: '6px',
                          padding: '4px',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <ImageIcon size={13} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* KYC Documents Section for Worker Own Profile */}
      {isOwnProfile && (
        <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={22} color="var(--accent-primary)" /> Verification & KYC Documents
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            Upload mandatory identity & address proofs to get verified by NearFix admin.
          </p>

          <form onSubmit={handleKYCSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
            <DocumentUploader 
              label="Identity Proof (Aadhaar / Voter ID)"
              required={true}
              value={identityProof}
              onChange={setIdentityProof}
            />

            <DocumentUploader 
              label="Address Proof (Bill / Rent Deed)"
              required={true}
              value={addressProof}
              onChange={setAddressProof}
            />

            <DocumentUploader 
              label="Skill Certificate"
              required={false}
              value={skillCert}
              onChange={setSkillCert}
            />

            <DocumentUploader 
              label="Experience Proof"
              required={false}
              value={expProof}
              onChange={setExpProof}
            />

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                type="submit" 
                disabled={submittingKYC}
                className="btn-primary" 
                style={{ padding: '10px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={16} /> {submittingKYC ? 'Submitting...' : 'Submit KYC for Verification'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customer Reviews Section */}
      <div className="glass-panel" style={{ padding: '28px', borderRadius: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 4px 0' }}>Customer Reviews ({reviews.length})</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>Verified customer ratings and testimonials.</p>

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No reviews submitted for this worker yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map(r => (
              <div key={r._id} style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar src={r.customerId?.avatar} name={r.customerId?.name || 'Customer'} size={32} />
                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{r.customerId?.name || 'Customer'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[...Array(r.rating || 5)].map((_, i) => (
                      <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>"{r.comment}"</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Service Modal for Customer */}
      {showBookingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 'min(94vw, 520px)',
            maxHeight: '90vh',
            maxHeight: '90dvh',
            overflowY: 'auto',
            borderRadius: '24px',
            padding: 'clamp(20px, 4vw, 32px)',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowBookingModal(false)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 4px 0' }}>Book Service with {worker.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Select your service mode and preferred schedule details.
            </p>

            {/* Service Mode Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div
                onClick={() => setServiceMode('normal')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: serviceMode === 'normal' ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  background: serviceMode === 'normal' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <Calendar size={22} color={serviceMode === 'normal' ? 'var(--accent-primary)' : 'var(--text-secondary)'} style={{ marginBottom: '4px' }} />
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '700', color: serviceMode === 'normal' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>Normal Service</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Standard scheduled visit</span>
              </div>

              <div
                onClick={() => setServiceMode('emergency')}
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: serviceMode === 'emergency' ? '2px solid #ef4444' : '1px solid var(--border-glass)',
                  background: serviceMode === 'emergency' ? '#fef2f2' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <Zap size={22} color={serviceMode === 'emergency' ? '#ef4444' : 'var(--text-secondary)'} style={{ marginBottom: '4px' }} />
                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '700', color: serviceMode === 'emergency' ? '#ef4444' : 'var(--text-primary)' }}>Emergency Service</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Priority urgent request (+₹150)</span>
              </div>
            </div>

            {/* Emergency Warning Banner */}
            {serviceMode === 'emergency' && (
              <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', padding: '14px', borderRadius: '14px', marginBottom: '16px', fontSize: '0.86rem', color: '#dc2626', lineHeight: '1.4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', marginBottom: '6px' }}>
                  <Zap size={18} color="#ef4444" /> Public Emergency Dispatch
                </div>
                <p style={{ margin: '0 0 10px 0', color: '#7f1d1d', fontSize: '0.84rem' }}>
                  Emergency requests are broadcast publicly to <strong>all eligible verified professionals</strong> within expanding radius (2 km → 5 km → 10 km) for fastest response!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    navigate(`/app/emergency?category=${encodeURIComponent(worker.skills?.[0] || 'Plumber')}`);
                  }}
                  style={{
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🚀 Open Emergency Radar Dispatch
                </button>
              </div>
            )}

            {/* Worker Current Availability Notice */}
            {serviceMode === 'normal' && (() => {
              const avail = getWorkerAvailability(worker);
              if (avail.isBusy) {
                return (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.84rem', lineHeight: '1.4' }}>
                    🟡 <strong>Worker Notice:</strong> Worker is {avail.statusText}. Please select a time slot after this unavailable period, or switch to <strong>Emergency Service</strong> for an immediate request.
                  </div>
                );
              }
              return null;
            })()}

            {bookingError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem', fontWeight: '600' }}>
                ⚠️ {bookingError}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Work Description *</label>
                <textarea 
                  rows={3}
                  value={bookingDesc}
                  onChange={e => setBookingDesc(e.target.value)}
                  placeholder="Describe the issue or service required in detail..."
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                  required
                />
              </div>

              {serviceMode === 'normal' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Appointment Date *</label>
                      <input 
                        type="date" 
                        min={getTodayLocalDateString()}
                        value={bookingDate}
                        onChange={e => {
                          const val = e.target.value;
                          if (val >= getTodayLocalDateString()) {
                            setBookingDate(val);
                          } else {
                            setBookingDate(getTodayLocalDateString());
                          }
                          setBookingError('');
                        }}
                        className="input-field"
                        style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                        required
                      />
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Min date: Today</span>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Appointment Time *</label>
                      <input 
                        type="time" 
                        value={bookingTime}
                        onChange={e => {
                          setBookingTime(e.target.value);
                          setBookingError('');
                        }}
                        className="input-field"
                        style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                        required
                      />
                      {isDateTimeInPast(bookingDate, bookingTime) ? (
                        <span style={{ fontSize: '0.74rem', color: '#ef4444', fontWeight: '700', display: 'block' }}>⚠️ Past time today</span>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Any minute e.g. 09:35 AM</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>Estimated Service Duration</span>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>
                        {estimatedDuration >= 60 ? `${(estimatedDuration / 60).toFixed(estimatedDuration % 60 === 0 ? 0 : 1)} hr` : `${estimatedDuration} min`}
                      </span>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[30, 45, 60, 90, 120, 180].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setEstimatedDuration(mins)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            border: estimatedDuration === mins ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                            background: estimatedDuration === mins ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                            color: estimatedDuration === mins ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                        >
                          {mins >= 60 ? `${mins / 60} hr` : `${mins}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                    Service Location Address {customerCoordinates ? <span style={{ fontWeight: 'normal', color: 'var(--text-muted)' }}>(Optional with GPS)</span> : <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <button 
                    type="button"
                    onClick={handleDetectCustomerLocation}
                    disabled={gpsStatus.loading}
                    style={{
                      background: 'rgba(37,99,235,0.08)',
                      border: '1px solid rgba(37,99,235,0.2)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    <Navigation size={12} /> {gpsStatus.loading ? 'Detecting GPS...' : '📍 Use Current GPS'}
                  </button>
                </div>
                <input 
                  type="text" 
                  value={bookingLocation}
                  onChange={e => setBookingLocation(e.target.value)}
                  placeholder={customerCoordinates ? "Optional: Add flat number/landmark or leave blank (GPS attached)..." : "Enter your flat/house address..."}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                  required={!customerCoordinates}
                />
                {gpsStatus.success && customerCoordinates && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>✓ GPS attached: [{customerCoordinates[1].toFixed(4)}, {customerCoordinates[0].toFixed(4)}]</span>
                    <button
                      type="button"
                      onClick={() => { setCustomerCoordinates(null); setGpsStatus({ loading: false, error: null, success: false }); }}
                      style={{ background: 'none', border: 'none', color: '#059669', fontWeight: '700', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                    >
                      Clear
                    </button>
                  </div>
                )}
                {gpsStatus.error && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px' }}>
                    ⚠️ {gpsStatus.error}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', fontSize: '0.88rem' }}>
                {(() => {
                  const minCharge = (typeof worker.minimumCharge === 'number' && worker.minimumCharge > 0)
                    ? worker.minimumCharge
                    : (typeof worker.startingPrice === 'number' && worker.startingPrice > 0)
                      ? worker.startingPrice
                      : null;
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {minCharge ? 'Base Minimum Charge:' : 'Service Pricing:'}
                      </span>
                      <span style={{ fontWeight: '600' }}>
                        {minCharge ? `₹${minCharge.toLocaleString('en-IN')}` : 'Agreed after inspection'}
                      </span>
                    </div>
                  );
                })()}
                {serviceMode === 'emergency' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#ef4444' }}>
                    <span>Emergency Priority Surcharge:</span>
                    <span style={{ fontWeight: '700' }}>10% of agreed labor</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  <span>Estimated Total:</span>
                  <span style={{ color: serviceMode === 'emergency' ? '#ef4444' : 'var(--accent-primary)' }}>
                    {(() => {
                      const minCharge = (typeof worker.minimumCharge === 'number' && worker.minimumCharge > 0)
                        ? worker.minimumCharge
                        : (typeof worker.startingPrice === 'number' && worker.startingPrice > 0)
                          ? worker.startingPrice
                          : null;
                      if (!minCharge) return 'Confirmed on Quotation';
                      return `From ₹${minCharge.toLocaleString('en-IN')}`;
                    })()}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowBookingModal(false)}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingBooking || (serviceMode === 'normal' && isDateTimeInPast(bookingDate, bookingTime))}
                  className="btn-primary"
                  style={{ 
                    padding: '10px 24px', 
                    fontSize: '0.95rem',
                    background: serviceMode === 'emergency' ? '#ef4444' : 'var(--accent-primary)' 
                  }}
                >
                  {submittingBooking 
                    ? 'Submitting...' 
                    : (serviceMode === 'emergency' ? 'Send Emergency Offer' : 'Confirm & Request Booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Add to Portfolio Modal */}
      {showPortfolioModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 'min(94vw, 540px)',
            maxHeight: '90vh',
            maxHeight: '90dvh',
            overflowY: 'auto',
            borderRadius: '24px',
            padding: 'clamp(20px, 4vw, 30px)',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowPortfolioModal(false);
                resetPortfolioModal();
              }}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={22} />
            </button>

            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 6px 0', color: 'var(--text-primary)' }}>Add to Portfolio</h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Upload photos or videos of your completed work to build trust with customers.
            </p>

            {/* Error Message */}
            {portfolioError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '12px',
                marginBottom: '16px',
                fontSize: '0.84rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{portfolioError}</span>
              </div>
            )}

            {/* Top Media Type Switcher: [ Photo ] [ Video ] */}
            {portfolioProjectType !== 'Before & After' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMediaType('image');
                    setMediaFile(null);
                    setMediaPreview('');
                    setVideoDuration('');
                    setPortfolioError('');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    border: uploadMediaType === 'image' ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                    background: uploadMediaType === 'image' ? 'var(--accent-light)' : '#f8fafc',
                    color: uploadMediaType === 'image' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ImageIcon size={17} /> Photo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadMediaType('video');
                    setMediaFile(null);
                    setMediaPreview('');
                    setVideoDuration('');
                    setPortfolioError('');
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    border: uploadMediaType === 'video' ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                    background: uploadMediaType === 'video' ? 'var(--accent-light)' : '#f8fafc',
                    color: uploadMediaType === 'video' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Video size={17} /> Video
                </button>
              </div>
            )}

            {/* Dropzone & Media Selection */}
            {portfolioProjectType === 'Before & After' ? (
              /* Before & After Dual Upload */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                {/* Before Photo */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Before Photo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="file"
                    ref={beforeInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={e => e.target.files?.[0] && handleSelectBeforeFile(e.target.files[0])}
                  />

                  {beforePreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      <img src={beforePreview} alt="Before Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setBeforeFile(null);
                          setBeforePreview('');
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                      <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(15, 23, 42, 0.75)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        Before
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => beforeInputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '18px 8px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '140px'
                      }}
                    >
                      <CloudUpload size={24} color="var(--accent-primary)" style={{ marginBottom: '6px' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>Upload Before</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Max 5 MB</div>
                    </div>
                  )}
                </div>

                {/* After Photo */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    After Photo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="file"
                    ref={afterInputRef}
                    style={{ display: 'none' }}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={e => e.target.files?.[0] && handleSelectAfterFile(e.target.files[0])}
                  />

                  {afterPreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
                      <img src={afterPreview} alt="After Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setAfterFile(null);
                          setAfterPreview('');
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <X size={14} />
                      </button>
                      <span style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                        After
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => afterInputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '18px 8px',
                        textAlign: 'center',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '140px'
                      }}
                    >
                      <CloudUpload size={24} color="var(--accent-primary)" style={{ marginBottom: '6px' }} />
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>Upload After</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Max 5 MB</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single Photo / Video Dropzone */
              <div style={{ marginBottom: '18px' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept={uploadMediaType === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/jpg,image/png,image/webp'}
                  onChange={e => e.target.files?.[0] && handleSelectMedia(e.target.files[0], uploadMediaType)}
                />

                {!mediaPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOverMedia(true); }}
                    onDragLeave={() => setDragOverMedia(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDragOverMedia(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleSelectMedia(e.dataTransfer.files[0], uploadMediaType);
                      }
                    }}
                    style={{
                      border: dragOverMedia ? '2px dashed var(--accent-primary)' : '2px dashed #cbd5e1',
                      borderRadius: '16px',
                      padding: '28px 16px',
                      textAlign: 'center',
                      background: dragOverMedia ? 'var(--accent-glow)' : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--accent-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px'
                    }}>
                      <CloudUpload size={26} color="var(--accent-primary)" />
                    </div>

                    <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Click to upload {uploadMediaType === 'video' ? 'video' : 'photos'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      or drag and drop
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {uploadMediaType === 'video' ? 'MP4, WebM (Max 25 MB)' : 'JPG, PNG, WebP (Max 5 MB)'}
                    </div>
                  </div>
                ) : (
                  /* Media Preview with Remove Button */
                  <div style={{
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid var(--border-glass)',
                    background: '#0f172a',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
                  }}>
                    {uploadMediaType === 'video' ? (
                      <video
                        src={mediaPreview}
                        controls
                        style={{ width: '100%', maxHeight: '220px', display: 'block', background: '#000' }}
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Selected Preview"
                        style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview('');
                        setVideoDuration('');
                      }}
                      title="Remove media"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        zIndex: 5
                      }}
                    >
                      <X size={16} />
                    </button>

                    {videoDuration && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}>
                        Duration: {videoDuration}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleAddPortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Project Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="E.g., Bathroom Fitting Overhaul"
                  value={portfolioTitle}
                  onChange={e => setPortfolioTitle(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                  required
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>Description</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{portfolioDesc.length}/500</span>
                </div>
                <textarea 
                  rows={3}
                  placeholder="Details of materials used, job scale, location etc..."
                  maxLength={500}
                  value={portfolioDesc}
                  onChange={e => setPortfolioDesc(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                />
              </div>

              {/* Category / Service Selector */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Category / Service
                </label>
                <select
                  value={portfolioCategory}
                  onChange={e => setPortfolioCategory(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                >
                  {[
                    ...(worker?.skills || []),
                    'Plumbing',
                    'Electrical',
                    'Carpentry',
                    'Painting',
                    'Tutor',
                    'Photographer',
                    'Graphic Designer',
                    'Tailor',
                    'Fitness Trainer',
                    'Yoga Trainer',
                    'Makeup Artist',
                    'Laptop Technician',
                    'Mobile Technician',
                    'Accountant',
                    'Housekeeping & Cleaning',
                    'Other (Type Custom)'
                  ].filter((val, idx, arr) => arr.indexOf(val) === idx).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {portfolioCategory === 'Other (Type Custom)' && (
                  <input
                    type="text"
                    placeholder="Enter custom service (e.g. Solar Installer, Locksmith)..."
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', marginTop: '8px' }}
                    required
                  />
                )}
              </div>

              {/* Project Type (Optional) */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Project Type (Optional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    'Completed Work',
                    'Before & After',
                    'New Installation',
                    'Repair',
                    'Maintenance',
                    'Other'
                  ].map(type => {
                    const isSelected = portfolioProjectType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setPortfolioProjectType(type);
                          if (type === 'Before & After') {
                            setUploadMediaType('image');
                          }
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: isSelected ? '700' : '600',
                          border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                          background: isSelected ? 'var(--accent-primary)' : '#f8fafc',
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions: [Cancel] [Upload] */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPortfolioModal(false);
                    resetPortfolioModal();
                  }}
                  style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingPortfolio}
                  className="btn-primary" 
                  style={{ padding: '10px 24px', fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {submittingPortfolio ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Item Detail Viewer Modal */}
      {viewingItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: 'min(94vw, 760px)',
            maxHeight: '90vh',
            maxHeight: '90dvh',
            overflowY: 'auto',
            borderRadius: '24px',
            padding: 'clamp(20px, 4vw, 30px)',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => {
                setViewingItem(null);
                setIsEditingItem(false);
              }}
              style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: 'rgba(241, 245, 249, 0.8)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>

            {/* Media Presentation */}
            <div style={{ marginBottom: '20px' }}>
              {viewingItem.projectType === 'Before & After' || (viewingItem.beforeImage && viewingItem.afterImage) ? (
                /* Side by Side Comparison */
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                          Before Work
                        </span>
                      </div>
                      <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#0f172a', height: '280px' }}>
                        <img 
                          src={resolveMediaUrl(viewingItem.beforeImage || viewingItem.images?.[0] || viewingItem.imageUrl)} 
                          alt="Before" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', color: '#ffffff', background: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '4px' }}>
                          After Completion
                        </span>
                      </div>
                      <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#0f172a', height: '280px' }}>
                        <img 
                          src={resolveMediaUrl(viewingItem.afterImage || viewingItem.images?.[1] || viewingItem.imageUrl)} 
                          alt="After" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : viewingItem.mediaType === 'video' || Boolean(viewingItem.videoUrl) ? (
                /* Playable Video */
                <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', maxHeight: '420px', display: 'flex', justifyContent: 'center' }}>
                  <video 
                    src={resolveMediaUrl(viewingItem.videoUrl || viewingItem.imageUrl)} 
                    controls 
                    autoPlay 
                    style={{ width: '100%', maxHeight: '420px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                /* Full Image */
                <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#0f172a', maxHeight: '440px', display: 'flex', justifyContent: 'center' }}>
                  <img 
                    src={resolveMediaUrl(viewingItem.imageUrl || (viewingItem.images && viewingItem.images[0]))} 
                    alt={viewingItem.title} 
                    style={{ width: '100%', maxHeight: '440px', objectFit: 'contain' }} 
                  />
                </div>
              )}
            </div>

            {/* Content & Metadata */}
            {!isEditingItem ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{
                    background: 'var(--accent-light)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '8px'
                  }}>
                    {viewingItem.category || 'General'}
                  </span>

                  {viewingItem.projectType && (
                    <span style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '8px'
                    }}>
                      {viewingItem.projectType}
                    </span>
                  )}

                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Posted {viewingItem.createdAt ? new Date(viewingItem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                  {viewingItem.title}
                </h3>

                {viewingItem.description && (
                  <p style={{ margin: '0 0 20px 0', fontSize: '0.94rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {viewingItem.description}
                  </p>
                )}

                {/* Worker Controls (ONLY visible on own profile) */}
                {isOwnProfile && (
                  <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '16px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setIsEditingItem(true)}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit3 size={15} /> Edit Details
                    </button>
                    <button
                      onClick={() => handleDeletePortfolio(viewingItem._id)}
                      disabled={deletingItem}
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.86rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      <Trash2 size={15} /> {deletingItem ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Inline Edit Form for Worker */
              <form onSubmit={handleUpdatePortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Edit Showcase Details</h4>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Project Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Category</label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', borderRadius: '10px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Project Type</label>
                    <select
                      value={editProjectType}
                      onChange={e => setEditProjectType(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                    >
                      <option value="Completed Work">Completed Work</option>
                      <option value="Before & After">Before & After</option>
                      <option value="New Installation">New Installation</option>
                      <option value="Repair">Repair</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Description</label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setIsEditingItem(false)}
                    style={{ background: 'var(--bg-tertiary)', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Worker Profile Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div 
            className="glass-panel" 
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '24px',
              padding: 'clamp(20px, 3vw, 32px)',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Edit Worker Profile
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Update your professional details, services, and base service location.
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{
                  background: 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Banner */}
            {editError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '18px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={18} />
                <span>{editError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Identity Protection Notice */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)'
              }}>
                <Lock size={16} color="var(--accent-primary)" />
                <span>
                  <b>Protected Fields:</b> Account Role, Email, Rating, and KYC verification status are read-only and managed by administration.
                </span>
              </div>

              {/* Grid 1: Name & Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                    Full Name <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                    Phone Number (10 Digits) <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={editForm.phone}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setEditForm(prev => ({ ...prev, phone: val }));
                    }}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              {/* Grid 2: Title & Email (Read-only) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                    Worker Title / Headline
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={editForm.title}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                    placeholder="e.g. Master Electrician & Appliance Specialist"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                    Email Address (Verified)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={worker?.email || ''}
                      className="input-field"
                      style={{ width: '100%', borderRadius: '10px', height: '42px', background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                    />
                    <Lock size={14} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '14px' }} />
                  </div>
                </div>
              </div>

              {/* Grid 3: Business Name & Experience */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                    Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={editForm.businessName}
                    onChange={e => setEditForm(prev => ({ ...prev, businessName: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                    placeholder="e.g. Kumar Repairs & Co."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    placeholder="e.g. 5 (Optional - only shown if set)"
                    value={editForm.experienceYears}
                    onChange={e => setEditForm(prev => ({ ...prev, experienceYears: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Leave blank to hide from your profile card
                  </span>
                </div>
              </div>

              {/* Grid 4: Service Mode, Pricing Type, Minimum Charge, Radius */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
                    Service Mode
                  </label>
                  <select
                    value={editForm.serviceMode}
                    onChange={e => setEditForm(prev => ({ ...prev, serviceMode: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                  >
                    <option value="Home Service">Home Service</option>
                    <option value="Fixed Location">Fixed Location</option>
                    <option value="Both">Both</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
                    Pricing Structure
                  </label>
                  <select
                    value={editForm.pricingType}
                    onChange={e => setEditForm(prev => ({ ...prev, pricingType: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                  >
                    <option value="Custom">Inspection Based / Custom</option>
                    <option value="Fixed">Fixed Quote</option>
                    <option value="Per Visit">Per Visit</option>
                    <option value="Per Project">Per Project</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
                    Minimum Charge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 350 (Optional)"
                    value={editForm.startingPrice}
                    onChange={e => {
                      const val = e.target.value;
                      setEditForm(prev => ({ ...prev, startingPrice: val, minimumCharge: val }));
                    }}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Leave blank to hide charge from your profile card
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
                    Service Radius
                  </label>
                  <select
                    value={editForm.serviceRadius}
                    onChange={e => setEditForm(prev => ({ ...prev, serviceRadius: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                  >
                    <option value="5 km">5 km</option>
                    <option value="10 km">10 km</option>
                    <option value="15 km">15 km</option>
                    <option value="25 km">25 km</option>
                    <option value="50 km">50 km</option>
                    <option value="100 km">100 km</option>
                  </select>
                </div>
              </div>

              {/* Skills / Services Tag Manager */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px' }}>
                  Skills & Services
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add a skill or service (e.g. Wiring, Pipe Fitting)..."
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="input-field"
                    style={{ flex: 1, borderRadius: '10px', height: '38px' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="btn-secondary"
                    style={{ padding: '0 16px', height: '38px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '32px' }}>
                  {editForm.skills.map(skill => (
                    <span
                      key={skill}
                      style={{
                        background: 'var(--accent-light)',
                        color: 'var(--accent-primary)',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--accent-primary)' }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Bio / About */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                    Bio / About
                  </label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {editForm.bio.length} / 1000 characters
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={editForm.bio}
                  onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', fontSize: '0.88rem', lineHeight: '1.5' }}
                  placeholder="Introduce your experience, specialties, and service guarantee..."
                />
              </div>

              {/* SERVICE LOCATION SECTION */}
              <div style={{ 
                background: 'var(--bg-secondary)', 
                borderRadius: '16px', 
                padding: '16px', 
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <MapPin size={16} color="var(--accent-primary)" />
                    <label style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                      Service Location (Base / Discovery Map Marker)
                    </label>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    This is your base service center shown to customers on the NearFix discovery map.
                  </p>
                </div>

                {/* Address Text Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px' }}>
                    Human-Readable Address <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={editForm.address}
                    onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="input-field"
                    style={{ width: '100%', borderRadius: '10px', height: '40px' }}
                    placeholder="e.g. Mavoor Road, Near Bus Terminal, Kozhikode"
                  />
                </div>

                {/* Location Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocationForService}
                    disabled={detectingGpsInModal}
                    className="btn-secondary"
                    style={{ 
                      padding: '8px 14px', 
                      fontSize: '0.84rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      borderRadius: '8px'
                    }}
                  >
                    {detectingGpsInModal ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} color="#2563eb" />}
                    {detectingGpsInModal ? 'Detecting GPS...' : 'Use Current Location'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapInModal(!showMapInModal)}
                    className="btn-secondary"
                    style={{ 
                      padding: '8px 14px', 
                      fontSize: '0.84rem', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      borderRadius: '8px',
                      background: showMapInModal ? 'var(--accent-light)' : undefined,
                      borderColor: showMapInModal ? 'var(--accent-primary)' : undefined
                    }}
                  >
                    <Compass size={14} color="var(--accent-primary)" />
                    {showMapInModal ? 'Hide Map Picker' : 'Pick on Map'}
                  </button>
                </div>

                {/* Leaflet Interactive Map Picker */}
                {showMapInModal && (
                  <div style={{ marginTop: '10px' }}>
                    {/* Quick Search & Locality Jumper */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        placeholder="Search area/locality (e.g. Nadakkavu, Mavoor Road, Beach)..."
                        value={mapSearchQuery}
                        onChange={e => setMapSearchQuery(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchPlaceOnMap();
                          }
                        }}
                        className="input-field"
                        style={{ flex: 1, height: '36px', fontSize: '0.84rem', borderRadius: '8px' }}
                      />
                      <button
                        type="button"
                        onClick={handleSearchPlaceOnMap}
                        disabled={searchingPlace}
                        className="btn-primary"
                        style={{ height: '36px', padding: '0 14px', fontSize: '0.82rem', borderRadius: '8px', fontWeight: '700', whiteSpace: 'nowrap' }}
                      >
                        {searchingPlace ? 'Searching...' : 'Jump to Place'}
                      </button>
                    </div>

                    {/* Kozhikode Locality Quick Chips */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '6px', 
                      overflowX: 'auto', 
                      paddingBottom: '8px', 
                      marginBottom: '8px',
                      scrollbarWidth: 'thin'
                    }}>
                      {KOZHIKODE_PRESETS.map(loc => {
                        const isSelected = Math.abs(editForm.locationCoords.lat - loc.lat) < 0.003 && Math.abs(editForm.locationCoords.lng - loc.lng) < 0.003;
                        return (
                          <button
                            key={loc.name}
                            type="button"
                            onClick={() => handleSelectPresetLocality(loc)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '0.74rem',
                              fontWeight: isSelected ? '800' : '600',
                              whiteSpace: 'nowrap',
                              border: isSelected ? '1px solid var(--accent-primary)' : '1px solid #cbd5e1',
                              background: isSelected ? 'var(--accent-light)' : '#ffffff',
                              color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>📍</span> {loc.name}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ 
                      height: '250px', 
                      width: '100%', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      border: '2px solid var(--accent-light)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                    }}>
                      <MapContainer
                        center={[editForm.locationCoords.lat, editForm.locationCoords.lng]}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ServiceLocationPickerMap
                          markerPos={editForm.locationCoords}
                          onPositionChange={handleMapPositionChange}
                        />
                      </MapContainer>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginTop: '8px', 
                      fontSize: '0.78rem', 
                      color: 'var(--text-secondary)',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      <span>
                        💡 Click anywhere on the map or drag the <b>location pin</b> to pinpoint your service location.
                      </span>
                      <span style={{ fontFamily: 'monospace', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        GeoJSON: [{editForm.locationCoords.lng.toFixed(4)}, {editForm.locationCoords.lat.toFixed(4)}]
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 22px', fontSize: '0.9rem', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn-primary"
                  style={{ padding: '10px 26px', fontSize: '0.9rem', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {savingProfile && <Loader2 size={16} className="animate-spin" />}
                  {savingProfile ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Change Profile Photo Modal for Worker */}
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
                  src={avatarPreview || resolveAvatarUrl(worker.avatar, worker.name)} 
                  alt="Avatar Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <input 
                type="file" 
                ref={avatarInputRef} 
                onChange={handleSelectAvatar}
                accept="image/jpeg,image/png,image/webp" 
                style={{ display: 'none' }} 
              />

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
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

function DocumentUploader({ label, required, value, onChange, accept = "image/*,.pdf,.doc,.docx" }) {
  const fileInputRef = React.useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file) => {
    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit. Please select a smaller file.");
      return;
    }

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          onChange(compressedDataUrl);
        };
        img.onerror = () => {
          onChange(event.target.result);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const isUploaded = Boolean(value && value.trim());

  const getFileName = (val) => {
    if (!val) return '';
    if (val.startsWith('data:image')) return 'Uploaded_Image.png';
    if (val.startsWith('data:application/pdf')) return 'Verification_Doc.pdf';
    if (val.startsWith('data:')) return 'Uploaded_Document';
    if (val.startsWith('http')) {
      const parts = val.split('/');
      return parts[parts.length - 1] || 'Verification_Doc';
    }
    return val;
  };

  const openDocument = () => {
    if (!value) return;
    if (value.startsWith('data:') || value.startsWith('http')) {
      const newWin = window.open();
      if (newWin) {
        if (value.startsWith('data:image')) {
          newWin.document.write(`<title>Document Preview</title><body style="margin:0; background:#0f172a; display:flex; justify-content:center; align-items:center; min-height:100vh;"><img src="${value}" style="max-width:90%; max-height:90vh; border-radius:8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" /></body>`);
        } else {
          newWin.location.href = value;
        }
      }
    } else {
      alert(`Document Reference: ${value}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
          {label} {required ? <span style={{ color: 'var(--error)' }}>*</span> : <span style={{ color: 'var(--text-muted)', fontWeight: '400', fontSize: '0.78rem' }}>(Optional)</span>}
        </label>
        {isUploaded && (
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={13} /> Attached
          </span>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept={accept}
        onChange={handleFileChange}
      />

      {!isUploaded ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: dragOver ? '2px dashed var(--accent-primary)' : '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '16px 12px',
            textAlign: 'center',
            background: dragOver ? 'var(--accent-glow)' : 'var(--bg-primary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '120px'
          }}
        >
          <Upload size={22} color="var(--accent-primary)" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            Upload Document
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Drag & drop or click to browse (PDF, PNG, JPG, DOC)
          </div>
        </div>
      ) : (
        <div
          style={{
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '12px 14px',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            minHeight: '120px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            {value.startsWith('data:image') || /\.(jpe?g|png|webp|gif)($|\?)/i.test(value) ? (
              <div 
                onClick={openDocument}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-glass)',
                  flexShrink: 0,
                  cursor: 'pointer',
                  background: '#0f172a'
                }}
                title="Click to preview full photo"
              >
                <img src={value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={22} color="var(--accent-primary)" />
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ 
                fontSize: '0.82rem', 
                fontWeight: '700', 
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {getFileName(value)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {value.startsWith('data:') ? 'Ready to submit' : 'Document attached'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={openDocument}
                title="View Document"
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Eye size={12} /> View
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Replace File"
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Replace
              </button>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              title="Remove File"
              style={{ 
                padding: '2px 6px', 
                fontSize: '0.72rem', 
                border: 'none', 
                background: 'transparent',
                color: 'var(--error)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
