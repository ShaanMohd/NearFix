import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Power, CheckCircle2, MapPin, X, Plus, Loader2 } from 'lucide-react';

export default function WorkerScheduleView() {
  const currentUser = JSON.parse(localStorage.getItem('userProfile')) || {};
  const token = localStorage.getItem('token');

  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityHours, setAvailabilityHours] = useState('9:00 AM - 6:00 PM');
  const [serviceRadius, setServiceRadius] = useState('15 km');
  const [busySlots, setBusySlots] = useState([]);
  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newDate, setNewDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('Full Day');
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchSchedule = async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Fetch Profile
      const profRes = await fetch(`http://localhost:5000/api/users/profile/${currentUser.id || currentUser._id}`);
      const profData = await profRes.json();
      if (profData) {
        setIsAvailable(profData.isAvailable !== false);
        setAvailabilityHours(profData.availabilityHours || '9:00 AM - 6:00 PM');
        setServiceRadius(profData.serviceRadius || '15 km');
        setBusySlots(profData.busySlots || []);
      }

      // Fetch Accepted Bookings
      const jobsRes = await fetch('http://localhost:5000/api/jobs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const jobsData = await jobsRes.json();
      if (Array.isArray(jobsData)) {
        setAcceptedBookings(jobsData.filter(b => b.status === 'Accepted'));
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [token]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isAvailable,
          availabilityHours,
          serviceRadius
        })
      });
      setSavingSettings(false);
      alert('Working schedule settings updated successfully!');
    } catch (err) {
      console.error(err);
      setSavingSettings(false);
    }
  };

  const handleAddBusySlot = async () => {
    if (!newDate) return;
    const updated = [...busySlots, { date: newDate, time: newSlotTime }];
    setBusySlots(updated);
    setNewDate('');
    try {
      await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busySlots: updated })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveBusySlot = async (idx) => {
    const updated = busySlots.filter((_, i) => i !== idx);
    setBusySlots(updated);
    try {
      await fetch('http://localhost:5000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ busySlots: updated })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0' }}>My Schedule & Working Hours</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
          Manage your active service radius, daily operating hours, and unavailable dates.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--accent-primary)' }}>
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* General Operating Settings Form */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={22} color="var(--accent-primary)" /> Daily Availability & Radius
            </h2>

            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Availability Status</label>
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: isAvailable ? '1px solid #10b981' : '1px solid #ef4444',
                    background: isAvailable ? '#ecfdf5' : '#fef2f2',
                    color: isAvailable ? '#10b981' : '#ef4444',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Power size={18} /> {isAvailable ? 'ONLINE (Accepting Customer Requests)' : 'OFFLINE (Busy / Off-duty)'}
                </button>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Operating Hours</label>
                <input 
                  type="text" 
                  value={availabilityHours}
                  onChange={e => setAvailabilityHours(e.target.value)}
                  placeholder="e.g. 9:00 AM - 6:00 PM"
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', display: 'block', marginBottom: '6px' }}>Service Radius</label>
                <select 
                  value={serviceRadius}
                  onChange={e => setServiceRadius(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', borderRadius: '10px', height: '42px' }}
                >
                  <option value="5 km">5 km radius</option>
                  <option value="10 km">10 km radius</option>
                  <option value="15 km">15 km radius</option>
                  <option value="25 km">25 km radius</option>
                  <option value="50 km">50 km radius (Entire City)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="submit" disabled={savingSettings} className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Unavailable / Busy Dates Block */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={22} color="var(--accent-primary)" /> Mark Unavailable / Leave Dates
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Mark dates you are on leave or fully booked to prevent schedule overlap.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Date</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="input-field"
                  style={{ borderRadius: '10px', height: '40px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '4px' }}>Time Slot</label>
                <select 
                  value={newSlotTime}
                  onChange={e => setNewSlotTime(e.target.value)}
                  className="input-field"
                  style={{ borderRadius: '10px', height: '40px' }}
                >
                  <option value="Full Day">Full Day</option>
                  <option value="Morning Slot">Morning (9 AM - 1 PM)</option>
                  <option value="Afternoon Slot">Afternoon (1 PM - 5 PM)</option>
                </select>
              </div>

              <button 
                onClick={handleAddBusySlot}
                className="btn-primary"
                style={{ height: '40px', padding: '0 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={16} /> Mark Date
              </button>
            </div>

            {busySlots.length === 0 ? (
              <p style={{ color: 'var(--success)', fontSize: '0.88rem', margin: 0 }}>
                No unavailable dates marked. You are open for all standard slots.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {busySlots.map((slot, idx) => (
                  <div key={idx} style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{slot.date} ({slot.time})</span>
                    <button onClick={() => handleRemoveBusySlot(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agenda of Upcoming Bookings */}
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 16px 0' }}>Confirmed Service Agenda ({acceptedBookings.length})</h2>
            {acceptedBookings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>No confirmed upcoming appointments scheduled.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {acceptedBookings.map(b => (
                  <div key={b._id} style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.98rem', fontWeight: '700' }}>{b.serviceType}</h4>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Customer: <strong>{b.customerId?.name}</strong> • Location: {b.location}
                      </span>
                    </div>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--accent-primary)', background: '#ffffff', padding: '6px 12px', borderRadius: '8px' }}>
                      {b.isEmergency ? 'ASAP (Urgent)' : `${b.date} @ ${b.time}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
