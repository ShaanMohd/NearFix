import React, { useState, useEffect } from 'react';
import WorkerCard from '../components/WorkerCard';
import MapComponent from '../components/MapComponent';
import { Map as MapIcon, List, Search, ShieldCheck, Loader2, Wrench, Zap, Paintbrush, Hammer, Sparkles, GraduationCap, Camera, Scissors, Laptop, Dumbbell, Palette } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const CATEGORIES = [
  { id: 'All', label: 'All Services', icon: Sparkles },
  { id: 'Plumber', label: 'Plumbing', icon: Wrench },
  { id: 'Electrician', label: 'Electrical', icon: Zap },
  { id: 'Painter', label: 'Painting', icon: Paintbrush },
  { id: 'Carpenter', label: 'Carpentry', icon: Hammer },
  { id: 'Tutor', label: 'Tutoring', icon: GraduationCap },
  { id: 'Photographer', label: 'Photography', icon: Camera },
  { id: 'Tailor', label: 'Tailoring', icon: Scissors },
  { id: 'Laptop Repair', label: 'Tech Repair', icon: Laptop },
  { id: 'Fitness Trainer', label: 'Fitness', icon: Dumbbell },
  { id: 'Graphic Designer', label: 'Design', icon: Palette }
];

export default function HomeView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const categoryParam = params.get('category');
    if (searchParam) setSearchQuery(searchParam);
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [location.search]);

  useEffect(() => {
    fetch('http://localhost:5000/api/users/workers')
      .then(res => res.json())
      .then(data => {
        setWorkers(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch workers', err);
        setLoading(false);
      });
  }, []);

  const filteredWorkers = workers.filter(worker => {
    // Category filter
    if (selectedCategory !== 'All') {
      const matchSkill = worker.skills && worker.skills.some(s => s.toLowerCase().includes(selectedCategory.toLowerCase()));
      const matchTitle = worker.title && worker.title.toLowerCase().includes(selectedCategory.toLowerCase());
      if (!matchSkill && !matchTitle) return false;
    }
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = worker.name && worker.name.toLowerCase().includes(q);
      const matchTitle = worker.title && worker.title.toLowerCase().includes(q);
      const matchLocation = (worker.address || (typeof worker.location === 'string' ? worker.location : ''))?.toLowerCase().includes(q);
      const matchSkill = worker.skills && worker.skills.some(s => s.toLowerCase().includes(q));
      return matchName || matchTitle || matchLocation || matchSkill;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Hero Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, #1e40af 100%)', 
          borderRadius: '24px', 
          padding: '36px 40px', 
          color: 'white', 
          position: 'relative', 
          overflow: 'hidden', 
          marginBottom: '32px',
          boxShadow: '0 12px 30px rgba(37,99,235,0.25)' 
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
            <ShieldCheck size={14} /> 100% KYC Verified Local Workers
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '800', lineHeight: '1.2', marginBottom: '14px', letterSpacing: '-0.5px' }}>
            Book Verified Nearby Professionals for <span style={{ color: '#4ade80' }}>Normal & Urgent Services</span>
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.92, lineHeight: '1.5', marginBottom: '24px' }}>
            Find trusted plumbers, electricians, painters & carpenters nearby. Book on your schedule or request priority emergency assistance.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/app/map')}
              style={{ background: '#ffffff', color: 'var(--accent-primary)', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
            >
              <MapIcon size={18} /> Open Interactive Map
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px' }}>Service Categories</h3>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                  background: isSelected ? 'var(--accent-light)' : '#ffffff',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Layout Control */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by worker name, skill, or location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '44px', height: '48px', fontSize: '0.95rem', borderRadius: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', background: '#ffffff', borderRadius: '14px', padding: '4px', border: '1px solid var(--border-glass)', height: '48px', alignItems: 'center' }}>
          <button 
            onClick={() => setViewMode('list')}
            style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'list' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: viewMode === 'list' ? '600' : '500', fontSize: '0.85rem' }}
          >
            <List size={16} /> List
          </button>
          <button 
            onClick={() => setViewMode('map')}
            style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: viewMode === 'map' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'map' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: viewMode === 'map' ? '600' : '500', fontSize: '0.85rem' }}
          >
            <MapIcon size={16} /> Map
          </button>
        </div>
      </div>

      {/* Main Content List / Map View */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--accent-primary)' }}>
          <Loader2 size={40} className="animate-spin" />
        </div>
      ) : viewMode === 'list' ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
              Verified Professionals ({filteredWorkers.length})
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filteredWorkers.map(worker => (
              <WorkerCard key={worker._id || worker.id} worker={worker} />
            ))}
            {filteredWorkers.length === 0 && (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)', gridColumn: '1 / -1', borderRadius: '16px' }}>
                <p style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 8px 0' }}>No verified workers found</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Try adjusting your search or category filter.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ height: '520px', padding: '0', overflow: 'hidden', border: '1px solid var(--border-glass)', borderRadius: '20px' }}>
          <MapComponent workers={filteredWorkers} containerStyle={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  );
}
