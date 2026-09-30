import { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, Check, Loader, Crosshair } from 'lucide-react';
import { TAMILNADU_CITIES, TN_TESTING_PRESETS, getUserLiveGPSLocation } from '../utils/tnLocations';

export default function LocationPickerInput({
  value = '',
  onChange,
  placeholder = 'Click 🎯 to auto-detect live location or type address...',
  label = 'Location',
  required = false,
  autoDetectOnMount = false
}) {
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const [askedPermission, setAskedPermission] = useState(false);

  const handleFetchGPS = async () => {
    setLoadingGps(true);
    setGpsError('');
    setAskedPermission(true);
    try {
      const loc = await getUserLiveGPSLocation();
      setGpsCoords(loc);
      onChange({ 
        target: { 
          value: loc.formattedAddress, 
          coords: { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, timestamp: new Date().toISOString() } 
        } 
      });
      setShowPresets(false);
    } catch (err) {
      setGpsError(err.message);
    } finally {
      setLoadingGps(false);
    }
  };

  // Auto-request location access on mount if value is empty and autoDetectOnMount is set
  useEffect(() => {
    if (autoDetectOnMount && !value && !askedPermission) {
      handleFetchGPS();
    }
  }, [autoDetectOnMount, value, askedPermission]);

  const handleSelectPreset = (preset) => {
    setGpsCoords({ lat: preset.lat, lng: preset.lng, accuracy: 5 });
    onChange({ 
      target: { 
        value: preset.address, 
        coords: { lat: preset.lat, lng: preset.lng, accuracy: 5, timestamp: new Date().toISOString() } 
      } 
    });
    setShowPresets(false);
  };

  const handleSelectCity = (cityName) => {
    onChange({ target: { value: `${cityName}, Tamil Nadu, India` } });
    setShowPresets(false);
  };

  return (
    <div className="location-picker-wrapper" style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
      {label && (
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{label} {required && '*'}</span>
          <span style={{ fontSize: '0.72rem', color: '#0284C7', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowPresets(!showPresets)}>
            🏛️ TN Cities & Testing Presets
          </span>
        </label>
      )}

      {/* In-field Location Input with Embedded GPS Button */}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          className="form-input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          style={{ paddingLeft: '2.4rem', paddingRight: '7.5rem', width: '100%' }}
        />
        <MapPin size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)' }} />

        {/* Embedded In-Field Click Button */}
        <button
          type="button"
          onClick={handleFetchGPS}
          disabled={loadingGps}
          title="Access My Live Device Location"
          style={{
            position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)',
            border: 'none', background: loadingGps ? '#e2e8f0' : 'linear-gradient(135deg, #2D6A4F, #52B788)',
            color: '#ffffff', fontWeight: 700, fontSize: '0.73rem',
            padding: '4px 10px', borderRadius: '0.5rem', cursor: loadingGps ? 'wait' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {loadingGps ? <Loader size={13} className="animate-spin" /> : <Crosshair size={13} />}
          {loadingGps ? 'Locating...' : '📍 Auto-Detect Location'}
        </button>
      </div>

      {/* Dynamic Location Access Badge */}
      {gpsCoords && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
          <Check size={14} color="#16a34a" /> Location Auto-Detected: {gpsCoords.formattedAddress || 'Area & City Verified'}
        </div>
      )}

      {gpsError && (
        <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 4, margin: '4px 0 0 0' }}>
          ⚠️ {gpsError}
        </p>
      )}

      {/* Tamil Nadu Cities & Presets Dropdown */}
      {showPresets && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
          background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)', marginTop: 4, padding: '1rem',
          maxHeight: 320, overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Compass size={16} /> Tamil Nadu Locations & Test Presets
            </h4>
            <button type="button" onClick={() => setShowPresets(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: '#64748b' }}>
              ✕ Close
            </button>
          </div>

          {/* Testing Presets */}
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: 0.5 }}>⚡ TN Testing Coordinates Presets</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', marginTop: '0.4rem' }}>
              {TN_TESTING_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  style={{
                    textAlign: 'left', padding: '6px 10px', borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer',
                    fontSize: '0.75rem', transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                >
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{preset.name}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preset.address}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TN Cities Quick Select */}
          <div>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: 0.5 }}>🌆 Major Tamil Nadu Cities</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
              {TAMILNADU_CITIES.map((city, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectCity(city)}
                  style={{
                    padding: '4px 10px', borderRadius: '1rem', border: '1px solid #cbd5e1',
                    background: '#ffffff', cursor: 'pointer', fontSize: '0.72rem', color: '#334155',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#2D6A4F'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#334155'; }}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
