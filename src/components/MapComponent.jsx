import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Avatar from './Avatar';
import { getWorkerAvailability } from '../utils/bookingDateUtils';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const KOZHIKODE_CENTER = [11.2588, 75.7804];

const workerIcon = L.icon({
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div class="user-location-dot">
      <div class="user-location-inner"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

function RecenterMap({ location, zoom = 14 }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.flyTo(location, zoom, {
        duration: 0.8
      });
    }
  }, [location, map, zoom]);

  return null;
}

export default function MapComponent({
  workers = [],
  containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '12px'
  }
}) {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('userGeoCoords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return [parsed.lat, parsed.lng];
        }
      }
    } catch (e) {
      console.warn('Error reading userGeoCoords:', e);
    }
    return null;
  });
  const [locationError, setLocationError] = useState('');
  const [radius, setRadius] = useState(5);
  const [category, setCategory] = useState('All');
  const [availableOnly, setAvailableOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  useEffect(() => {
    console.log('Workers passed to map:', workers);
  }, [workers]);

  useEffect(() => {
    console.log('Current user location:', userLocation);
  }, [userLocation]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLoadingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = [
          position.coords.latitude,
          position.coords.longitude
        ];

        setUserLocation(location);
        setLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLoadingLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied.');
        } else {
          setLocationError('Unable to detect your current location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const earthRadius = 6371;

    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const lat =
        worker.lat ??
        worker.location?.coordinates?.[1];

      const lng =
        worker.lng ??
        worker.location?.coordinates?.[0];

      if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        isNaN(lat) ||
        isNaN(lng)
      ) {
        return false;
      }

      // Verification & Active status check
      const isVerified =
        worker.verificationStatus === 'Verified' || worker.verified === true;
      const isActive =
        worker.accountStatus === 'Active' || !worker.accountStatus;

      if (!isVerified || !isActive) {
        return false;
      }

      // Category filter matching skills / title / serviceCategory
      const matchesCategory =
        category === 'All' ||
        (() => {
          const cat = category.toLowerCase();
          const catRoot = cat.replace(/(ing|er|ian)$/, '');

          if (Array.isArray(worker.skills)) {
            if (
              worker.skills.some((s) => {
                const skillLower = s.toLowerCase();
                return (
                  skillLower.includes(cat) ||
                  cat.includes(skillLower) ||
                  (catRoot.length >= 4 && skillLower.includes(catRoot))
                );
              })
            ) {
              return true;
            }
          }

          if (worker.title) {
            const titleLower = worker.title.toLowerCase();
            if (
              titleLower.includes(cat) ||
              (catRoot.length >= 4 && titleLower.includes(catRoot))
            ) {
              return true;
            }
          }

          if (worker.serviceCategory) {
            const scLower = worker.serviceCategory.toLowerCase();
            if (
              scLower.includes(cat) ||
              (catRoot.length >= 4 && scLower.includes(catRoot))
            ) {
              return true;
            }
          }

          if (worker.category) {
            const cLower = worker.category.toLowerCase();
            if (
              cLower.includes(cat) ||
              (catRoot.length >= 4 && cLower.includes(catRoot))
            ) {
              return true;
            }
          }

          return false;
        })();

      // Availability filter
      const avail = getWorkerAvailability(worker);
      const matchesAvailability =
        !availableOnly || avail.isAvailable;

      // Search filter
      const searchText = search.trim().toLowerCase();
      const matchesSearch =
        !searchText ||
        worker.name?.toLowerCase().includes(searchText) ||
        worker.title?.toLowerCase().includes(searchText) ||
        (worker.address || '')?.toLowerCase().includes(searchText) ||
        (Array.isArray(worker.skills) &&
          worker.skills.some((s) => s.toLowerCase().includes(searchText)));

      // Radius filter (only apply if userLocation is available)
      let matchesRadius = true;
      if (
        userLocation &&
        Array.isArray(userLocation) &&
        typeof userLocation[0] === 'number'
      ) {
        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          lat,
          lng
        );
        matchesRadius = distance <= radius;
      }

      return (
        matchesCategory &&
        matchesAvailability &&
        matchesSearch &&
        matchesRadius
      );
    });
  }, [
    workers,
    userLocation,
    radius,
    category,
    availableOnly,
    search
  ]);

  useEffect(() => {
    console.log('Visible workers after filters:', filteredWorkers);
  }, [filteredWorkers]);

  const mapCenter = userLocation || KOZHIKODE_CENTER;

  return (
    <div
      style={{
        ...containerStyle,
        position: 'relative',
        zIndex: 1,
        borderRadius: '24px',
        overflow: 'hidden'
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        <RecenterMap location={userLocation} zoom={14} />

        {userLocation && (
          <>
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>
                <strong>You are here</strong>
              </Popup>
            </Marker>

            <Circle
              center={userLocation}
              radius={radius * 1000}
              pathOptions={{
                fillColor: '#2563eb',
                fillOpacity: 0.06,
                color: '#2563eb',
                opacity: 0.3
              }}
            />
          </>
        )}

        {filteredWorkers.map((worker) => {
          const lat =
            worker.lat ?? worker.location?.coordinates?.[1];
          const lng =
            worker.lng ?? worker.location?.coordinates?.[0];

          const distance =
            userLocation &&
            calculateDistance(
              userLocation[0],
              userLocation[1],
              lat,
              lng
            );

          return (
            <Marker
              key={worker.id || worker._id}
              position={[lat, lng]}
              icon={workerIcon}
            >
              <Popup>
                <div
                  style={{
                    padding: '6px',
                    minWidth: '170px',
                    textAlign: 'center'
                  }}
                >
                  <Avatar
                    src={worker.avatar || worker.img}
                    name={worker.name}
                    size={52}
                    style={{
                      marginBottom: '8px',
                      display: 'inline-block'
                    }}
                  />

                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '1.05rem',
                      color: '#1e1b4b'
                    }}
                  >
                    {worker.name}
                  </h4>

                  <p
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '0.85rem',
                      color: '#475569',
                      fontWeight: '500'
                    }}
                  >
                    {worker.title || worker.skills?.[0] || 'Service Professional'}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      color: '#d97706',
                      marginBottom: '6px'
                    }}
                  >
                    <span>★</span>
                    <span>{worker.rating || 4.8}</span>
                    <span
                      style={{
                        color: '#94a3b8',
                        fontWeight: 'normal',
                        fontSize: '0.78rem'
                      }}
                    >
                      ({worker.reviewsCount || 12})
                    </span>
                  </div>

                  {(() => {
                    const minCharge = (typeof worker.minimumCharge === 'number' && worker.minimumCharge > 0)
                      ? worker.minimumCharge
                      : (typeof worker.startingPrice === 'number' && worker.startingPrice > 0)
                        ? worker.startingPrice
                        : null;
                    if (!minCharge) return null;
                    return (
                      <p
                        style={{
                          margin: '4px 0',
                          fontWeight: '800',
                          color: '#16a34a',
                          fontSize: '0.95rem'
                        }}
                      >
                        Min. ₹{minCharge.toLocaleString('en-IN')}
                      </p>
                    );
                  })()}

                  {distance != null && (
                    <p
                      style={{
                        margin: '4px 0',
                        fontSize: '0.8rem',
                        color: '#2563eb',
                        fontWeight: '600'
                      }}
                    >
                      {distance.toFixed(1)} km away
                    </p>
                  )}

                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {(() => {
                      const avail = getWorkerAvailability(worker);
                      return (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            background: avail.badgeBg,
                            color: avail.badgeColor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: avail.badgeColor }} />
                          {avail.statusText}
                        </span>
                      );
                    })()}
                  </div>

                  <button
                    onClick={() => navigate(`/app/worker/${worker._id || worker.id}`)}
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      padding: '6px 12px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    View & Book
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="map-controls-panel">
        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: '#1e293b' }}>
          Find Services Near You
        </h3>

        <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>
          Discover verified professionals around your current location.
        </p>

        <button
          onClick={getCurrentLocation}
          disabled={loadingLocation}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '9px',
            border: 'none',
            background: '#4f46e5',
            color: '#ffffff',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '10px'
          }}
        >
          {loadingLocation
            ? 'Updating location...'
            : userLocation
              ? 'Refresh Location'
              : 'Use My Location'}
        </button>

        {locationError && (
          <p className="location-error" style={{ marginBottom: '8px' }}>
            {locationError}
          </p>
        )}

        <input
          type="text"
          placeholder="Search worker or service"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ marginBottom: '12px' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
            Search Radius
          </p>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[2, 5, 10].map((value) => (
              <button
                key={value}
                onClick={() => setRadius(value)}
                className={radius === value ? 'active' : ''}
              >
                {value} km
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>
            Service Category
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {[
              'All',
              'Plumber',
              'Electrician',
              'Painter',
              'Carpenter'
            ].map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={category === item ? 'active' : ''}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
          />
          Available Now
        </label>

        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
          <strong>{filteredWorkers.length}</strong> verified professionals found
        </p>
      </div>

      <style>{`
        .user-location-marker {
          background: transparent;
          border: none;
        }

        .user-location-dot {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-location-inner {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #2563eb;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(37,99,235,0.4);
        }

        .map-controls-panel {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 999;
          width: 290px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
        }

        .map-controls-panel input[type="text"] {
          width: 100%;
          padding: 10px 12px;
          margin: 6px 0 12px 0;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.85rem;
          box-sizing: border-box;
        }

        .map-controls-panel button {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #334155;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .map-controls-panel button.active {
          background: #4f46e5;
          color: #ffffff;
          border-color: #4f46e5;
          font-weight: 600;
        }

        .location-error {
          color: #dc2626;
          font-size: 0.8rem;
        }

        .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}