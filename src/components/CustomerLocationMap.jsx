import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Standard worker marker icon (normal pin showing worker's base or live position)
const workerPinIcon = L.icon({
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Distinct requested work site marker icon (spanner/wrench badge where worker has to go)
const workSiteIcon = L.divIcon({
  className: 'worksite-leaflet-marker',
  html: `
    <div style="
      background: #2563eb;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 14px rgba(37,99,235,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 16px;
    ">
      🛠️
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18]
});

// Helper component to auto-fit map bounds and invalidate size
function FitBounds({ workerPos, customerPos }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    if (workerPos && customerPos) {
      const bounds = L.latLngBounds([workerPos, customerPos]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (customerPos) {
      map.setView(customerPos, 14);
    } else if (workerPos) {
      map.setView(workerPos, 14);
    }

    return () => clearTimeout(timer);
  }, [map, workerPos, customerPos]);

  return null;
}

// Calculate approximate straight-line distance using the Haversine formula
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CustomerLocationMap({
  customerLocation,
  serviceAddress,
  customerName = 'Customer',
  workerLocation
}) {
  // Extract stored worker base/service location from props or localStorage
  const getStoredWorkerLocation = () => {
    if (workerLocation?.coordinates && Array.isArray(workerLocation.coordinates) && workerLocation.coordinates.length === 2) {
      const lng = Number(workerLocation.coordinates[0]);
      const lat = Number(workerLocation.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    try {
      const stored = JSON.parse(localStorage.getItem('userProfile')) || {};
      const baseCoords = stored.location?.coordinates;
      if (baseCoords && Array.isArray(baseCoords) && baseCoords.length === 2) {
        const lng = Number(baseCoords[0]);
        const lat = Number(baseCoords[1]);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
      }
      const currCoords = stored.currentLocation?.coordinates;
      if (currCoords && Array.isArray(currCoords) && currCoords.length === 2) {
        const lng = Number(currCoords[0]);
        const lat = Number(currCoords[1]);
        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
      }
    } catch (e) {
      console.error('Error reading worker profile location:', e);
    }
    return null;
  };

  const initialStoredPos = getStoredWorkerLocation();
  const [workerPos, setWorkerPos] = useState(initialStoredPos); // [lat, lng]
  const [locatingWorker, setLocatingWorker] = useState(!initialStoredPos);
  const [workerError, setWorkerError] = useState(null);
  const [originType, setOriginType] = useState(initialStoredPos ? 'base' : 'gps'); // 'base' | 'gps'

  // Extract customer coordinates from GeoJSON: [longitude, latitude]
  let customerPos = null; // Leaflet uses [latitude, longitude]
  if (
    customerLocation &&
    Array.isArray(customerLocation.coordinates) &&
    customerLocation.coordinates.length === 2
  ) {
    const lng = Number(customerLocation.coordinates[0]);
    const lat = Number(customerLocation.coordinates[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      customerPos = [lat, lng];
    }
  }

  // Fallback: parse coordinates from serviceAddress text
  if (!customerPos && serviceAddress) {
    const match = serviceAddress.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (match) {
      const v1 = Number(match[1]);
      const v2 = Number(match[2]);
      let lat = v1;
      let lng = v2;
      if (v1 > 50 && v2 < 50) {
        lng = v1;
        lat = v2;
      }
      if (!isNaN(lat) && !isNaN(lng)) {
        customerPos = [lat, lng];
      }
    }
  }

  // Fetch live browser GPS on demand
  const handleFetchLiveGps = () => {
    if (!navigator.geolocation) {
      alert('Browser does not support geolocation.');
      return;
    }
    setLocatingWorker(true);
    setWorkerError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setWorkerPos([latitude, longitude]);
        setOriginType('gps');
        setLocatingWorker(false);
      },
      (error) => {
        let msg = 'Worker live position unavailable.';
        if (error.code === 1) msg = 'Location permission denied by browser.';
        else if (error.code === 2) msg = 'GPS position unavailable.';
        else if (error.code === 3) msg = 'Location request timed out.';
        setWorkerError(msg);
        setLocatingWorker(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleUseBaseLocation = () => {
    const base = getStoredWorkerLocation();
    if (base) {
      setWorkerPos(base);
      setOriginType('base');
      setWorkerError(null);
    } else {
      alert('No base service location saved in profile yet. Please set your location in Profile.');
    }
  };

  // If no stored profile location, query browser GPS as fallback
  useEffect(() => {
    if (!initialStoredPos) {
      handleFetchLiveGps();
    }
  }, []);

  // Compute straight-line distance if both coordinates are available
  let distanceKm = null;
  if (workerPos && customerPos) {
    distanceKm = calculateHaversineDistance(
      workerPos[0],
      workerPos[1],
      customerPos[0],
      customerPos[1]
    );
  }

  // Google Maps directions URL
  let googleMapsUrl = '#';
  if (customerPos) {
    if (workerPos) {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${workerPos[0]},${workerPos[1]}&destination=${customerPos[0]},${customerPos[1]}`;
    } else {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${customerPos[0]},${customerPos[1]}`;
    }
  } else if (serviceAddress) {
    googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(serviceAddress)}`;
  }

  // If customer coordinates are missing
  if (!customerPos) {
    return (
      <div
        style={{
          marginTop: '12px',
          padding: '16px',
          borderRadius: '14px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.88rem' }}>
          <AlertCircle size={18} color="#d97706" />
          <span>Customer GPS coordinates are not attached to this request.</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Requested Address:</strong> {serviceAddress || 'Customer Address'}
        </div>
        {serviceAddress && (
          <div style={{ marginTop: '4px' }}>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                color: 'var(--accent-primary)',
                fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              <ExternalLink size={14} /> Search Address in Google Maps
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '14px',
        borderRadius: '14px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {/* Top Header: Distance & External Google Maps link */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <MapPin size={16} color="var(--accent-primary)" />
          {distanceKm !== null ? (
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: '800',
                color: 'var(--text-primary)',
                background: 'rgba(37,99,235,0.08)',
                padding: '3px 8px',
                borderRadius: '6px'
              }}
            >
              Approx. distance: {distanceKm.toFixed(1)} km
            </span>
          ) : locatingWorker ? (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Loader2 size={12} className="animate-spin" /> Calculating distance...
            </span>
          ) : (
            <span style={{ fontSize: '0.82rem', color: '#d97706' }}>
              Approx. distance: (Worker location unavailable)
            </span>
          )}

          {/* Origin selector toggle */}
          <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px', gap: '2px' }}>
            <button
              type="button"
              onClick={handleUseBaseLocation}
              style={{
                background: originType === 'base' ? '#ffffff' : 'transparent',
                color: originType === 'base' ? 'var(--accent-primary)' : '#64748b',
                border: 'none',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: originType === 'base' ? '800' : '600',
                cursor: 'pointer',
                boxShadow: originType === 'base' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
              title="Use configured base service location from profile"
            >
              📍 Base Location
            </button>
            <button
              type="button"
              onClick={handleFetchLiveGps}
              style={{
                background: originType === 'gps' ? '#ffffff' : 'transparent',
                color: originType === 'gps' ? '#059669' : '#64748b',
                border: 'none',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: originType === 'gps' ? '800' : '600',
                cursor: 'pointer',
                boxShadow: originType === 'gps' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
              title="Detect live browser GPS"
            >
              🧭 Live GPS
            </button>
          </div>
        </div>

        {/* Optional "Open in Google Maps" Button */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: '700',
            color: 'var(--text-primary)',
            textDecoration: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.color = 'var(--accent-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
        >
          <ExternalLink size={13} /> Open in Google Maps
        </a>
      </div>

      {/* Fallback notification if worker location is unavailable */}
      {workerError && (
        <div
          style={{
            fontSize: '0.78rem',
            color: '#b45309',
            background: '#fef3c7',
            padding: '6px 10px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <AlertCircle size={14} />
          <span>{workerError} Only customer location is displayed on map.</span>
        </div>
      )}

      {/* Leaflet Map Display */}
      <div
        style={{
          width: '100%',
          height: '240px',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
          position: 'relative'
        }}
      >
        <MapContainer
          center={customerPos}
          zoom={13}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto bounds fitter */}
          <FitBounds workerPos={workerPos} customerPos={customerPos} />

          {/* Requested Work Destination Marker (Spanner Icon - Where worker has to go) */}
          <Marker position={customerPos} icon={workSiteIcon}>
            <Popup>
              <div style={{ fontSize: '0.85rem', padding: '2px' }}>
                <strong style={{ display: 'block', marginBottom: '2px', color: '#2563eb' }}>
                  🛠️ Requested Work Site
                </strong>
                <span style={{ color: '#475569', fontSize: '0.8rem' }}>
                  {customerName}: {serviceAddress || 'Customer Address'}
                </span>
              </div>
            </Popup>
          </Marker>

          {/* Worker Location Marker (Normal Pin Icon - Shows worker's current/base location) */}
          {workerPos && (
            <Marker position={workerPos} icon={workerPinIcon}>
              <Popup>
                <div style={{ fontSize: '0.85rem', padding: '2px' }}>
                  <strong style={{ display: 'block', color: '#1e293b' }}>
                    📍 {originType === 'base' ? 'Your Base Service Location' : 'Your Live GPS Location'}
                  </strong>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    [{workerPos[0].toFixed(4)}, {workerPos[1].toFixed(4)}]
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <span>🛠️ <strong>Work Destination:</strong> {serviceAddress || 'Customer Address'}</span>
        {customerPos && (
          <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '0.78rem' }}>
            GPS: {customerPos[0].toFixed(4)}° N, {customerPos[1].toFixed(4)}° E
          </span>
        )}
        {workerPos && (
          <span style={{ color: originType === 'base' ? 'var(--accent-primary)' : '#059669', fontWeight: '600' }}>
            📍 <strong>Worker Origin:</strong> {originType === 'base' ? 'Service Base' : 'Live GPS'} ({workerPos[0].toFixed(4)}° N, {workerPos[1].toFixed(4)}° E)
          </span>
        )}
      </div>
    </div>
  );
}
