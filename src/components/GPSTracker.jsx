import { useState, useEffect, useMemo } from 'react';
import { 
  Navigation, MapPin, Truck, Phone, AlertCircle, 
  CheckCircle2, Clock, ShieldCheck, Compass, Radio, Maximize2, Loader
} from 'lucide-react';
import { getUserLiveGPSLocation } from '../utils/tnLocations';

// Default coordinates for Tamil Nadu / South India regional centers
const DEFAULT_COORDS = {
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  electronicCity: { lat: 12.8399, lng: 77.6770 }
};

export default function GPSTracker({
  pickupLocation = 'Green Park Colony, Main Road',
  destinationLocation = 'EcoRecycle Processing Hub #4',
  status = 'ON_THE_WAY',
  driverName = 'Rajesh Kumar (EV Fleet)',
  vehicleNumber = 'TN 37 EV 2026',
  phone = '+91 98765 12345',
  height = 360
}) {
  const [currentProgress, setCurrentProgress] = useState(35); // 0 to 100% along route
  const [speed, setSpeed] = useState(38);
  const [eta, setEta] = useState(14);
  const [distanceKm, setDistanceKm] = useState(4.2);
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsActive, setGpsActive] = useState(false);

  // Connect live browser GPS hardware position
  const handleConnectHardwareGPS = async () => {
    setLoadingGps(true);
    try {
      const loc = await getUserLiveGPSLocation();
      setDeviceCoords(loc);
      setGpsActive(true);
      if (loc.speed) setSpeed(loc.speed);
    } catch (e) {
      alert(`Device GPS Error: ${e.message}`);
    } finally {
      setLoadingGps(false);
    }
  };

  // Smooth live GPS movement simulation along the route
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentProgress(prev => {
        if (prev >= 95) return 95;
        return prev + 1.2;
      });
      if (!gpsActive) {
        setSpeed(Math.floor(32 + Math.random() * 12));
      }
      setDistanceKm(prev => Math.max(0.4, Number((prev - 0.08).toFixed(1))));
      setEta(prev => Math.max(2, Math.round((distanceKm / 35) * 60)));
    }, 3000);

    return () => clearInterval(timer);
  }, [distanceKm, gpsActive]);

  // Determine status color and status label
  const statusInfo = useMemo(() => {
    switch (status) {
      case 'ON_THE_WAY':
        return { label: 'En Route to Pickup Location', color: '#DDA15E', bg: '#FEF3C7', step: 'Heading to Generator' };
      case 'ARRIVED':
        return { label: 'Vehicle Arrived at Pickup Point', color: '#3A86FF', bg: '#DBEAFE', step: 'Vehicle at Location' };
      case 'COLLECTED':
      case 'IN_TRANSIT':
        return { label: 'In Transit to Recycling Hub', color: '#40916C', bg: '#D8F3DC', step: 'Transporting Waste' };
      case 'DELIVERED':
      case 'RECEIVED':
      case 'COMPLETED':
        return { label: 'Delivered to Manufacturing Hub', color: '#1B4332', bg: '#D8F3DC', step: 'Journey Complete' };
      case 'OUT_FOR_DELIVERY':
        return { label: 'Out for Product Delivery', color: '#8338EC', bg: '#F3E8FF', step: 'Final Delivery' };
      default:
        return { label: 'GPS Tracking Active', color: '#2D6A4F', bg: '#D8F3DC', step: 'Tracking Active' };
    }
  }, [status]);

  // Dynamic marker positions based on progress
  const startPoint = { x: 12, y: 75 };
  const endPoint = { x: 88, y: 25 };
  const currentX = startPoint.x + (endPoint.x - startPoint.x) * (currentProgress / 100);
  const currentY = startPoint.y + (endPoint.y - startPoint.y) * (currentProgress / 100);

  return (
    <div className="gps-tracker-card card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-gray-200)', boxShadow: '0 12px 24px rgba(0,0,0,0.06)' }}>
      {/* Header bar */}
      <div style={{ 
        padding: '0.85rem 1.25rem', 
        background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', 
        color: '#ffffff', 
        display: 'flex', 
        justify: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ 
            width: 10, height: 10, borderRadius: '50%', background: '#52B788',
            boxShadow: '0 0 10px #52B788', animation: 'pulse 1.5s infinite' 
          }} />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Compass size={18} color="#95D5B2" /> Live GPS Fleet Tracking
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', 
            padding: '3px 10px', borderRadius: '1rem', fontSize: '0.72rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4, color: '#D8F3DC'
          }}>
            <Radio size={12} className="animate-spin" /> {statusInfo.step}
          </span>
        </div>
      </div>

      {/* Interactive Map Visual Surface */}
      <div style={{ position: 'relative', width: '100%', height, background: '#e2e8f0', overflow: 'hidden' }}>
        {/* OpenStreetMap Tile Base Background Simulation */}
        <div style={{ 
          position: 'absolute', inset: 0, 
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px), radial-gradient(#cbd5e1 1.5px, #f1f5f9 1.5px)',
          backgroundSize: '30px 30px', backgroundPosition: '0 0, 15px 15px',
          opacity: 0.95
        }} />

        {/* Dynamic Route SVG Map Layer */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2D6A4F" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#52B788" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Planned GPS Road Route Path */}
          <path 
            d={`M ${startPoint.x}% ${startPoint.y}% Q 45% 65%, ${endPoint.x}% ${endPoint.y}%`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path 
            d={`M ${startPoint.x}% ${startPoint.y}% Q 45% 65%, ${endPoint.x}% ${endPoint.y}%`}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="4"
            strokeDasharray="6 4"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Origin / Generator Pickup Marker */}
          <g transform={`translate(${startPoint.x * 7.5}, ${startPoint.y * 3.2})`}>
            <circle cx="0" cy="0" r="14" fill="#2D6A4F" opacity="0.2" />
            <circle cx="0" cy="0" r="8" fill="#2D6A4F" />
          </g>

          {/* Destination / Manufacturer Hub Marker */}
          <g transform={`translate(${endPoint.x * 7.2}, ${endPoint.y * 3.2})`}>
            <circle cx="0" cy="0" r="14" fill="#DDA15E" opacity="0.2" />
            <circle cx="0" cy="0" r="8" fill="#B45309" />
          </g>
        </svg>

        {/* Start / Pickup Map Overlay Tag */}
        <div style={{ 
          position: 'absolute', left: `${startPoint.x}%`, top: `${startPoint.y - 12}%`,
          transform: 'translate(-50%, -100%)', zIndex: 10,
          background: '#ffffff', padding: '4px 10px', borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: '#1e293b'
        }}>
          <MapPin size={14} color="#2D6A4F" /> {pickupLocation}
        </div>

        {/* End / Destination Map Overlay Tag */}
        <div style={{ 
          position: 'absolute', left: `${endPoint.x}%`, top: `${endPoint.y - 12}%`,
          transform: 'translate(-50%, -100%)', zIndex: 10,
          background: '#ffffff', padding: '4px 10px', borderRadius: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: '1px solid #cbd5e1',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: '#1e293b'
        }}>
          <Navigation size={14} color="#b45309" /> {destinationLocation}
        </div>

        {/* LIVE Vehicle Pulse Pin Pinpoint */}
        <div style={{ 
          position: 'absolute', left: `${currentX}%`, top: `${currentY}%`,
          transform: 'translate(-50%, -50%)', zIndex: 20,
          transition: 'all 0.8s ease'
        }}>
          <div style={{ 
            position: 'relative', width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2D6A4F, #52B788)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff', boxShadow: '0 8px 20px rgba(45,106,79,0.4)',
            border: '2px solid #ffffff'
          }}>
            <Truck size={22} className="animate-bounce" />
            <div style={{ 
              position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid #52B788',
              animation: 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.7 
            }} />
          </div>
        </div>

        {/* Telemetry Overlay Card */}
        <div style={{ 
          position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 30,
          background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(10px)',
          padding: '0.85rem 1.15rem', borderRadius: '1rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.6)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ 
              width: 42, height: 42, borderRadius: '0.75rem', background: '#D8F3DC',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1B4332', fontWeight: 700
            }}>
              <Truck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{driverName}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, color: '#334155' }}>{vehicleNumber}</span>
                <span>• {speed} km/h</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Distance</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{distanceKm} km</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Est. Arrival</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={15} /> {eta} mins
              </div>
            </div>

            <a 
              href={`tel:${phone}`}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: '0.6rem' }}
            >
              <Phone size={14} /> Call Driver
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
