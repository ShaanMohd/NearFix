import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { Loader2 } from 'lucide-react';

export default function MapView() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/users/workers')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch workers');
        }

        return res.json();
      })
      .then(data => {
        console.log('Workers received from API:', data);

        setWorkers(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(
          'Error fetching workers for map:',
          err
        );

        setLoading(false);
      });
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(100vh - 110px)',
        position: 'relative'
      }}
    >
      {loading ? (
        <div
          style={{
            display: 'flex',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}
        >
          <Loader2
            size={40}
            className="animate-spin"
          />
        </div>
      ) : (
        <MapComponent
          workers={workers}
          containerStyle={{
            width: '100%',
            height: '100%',
            borderRadius: '16px'
          }}
        />
      )}
    </div>
  );
}