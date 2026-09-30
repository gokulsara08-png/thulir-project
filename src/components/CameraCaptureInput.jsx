import { useState, useRef } from 'react';
import { Camera, Upload, RefreshCw, Trash2, X, Check, AlertCircle } from 'lucide-react';

export default function CameraCaptureInput({ label = "Attach Photo", value, onChange, required = false }) {
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Start real device camera
  const startCamera = async () => {
    setCameraError('');
    setShowCameraModal(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err.message);
      setCameraError('Camera access unavailable or denied. Please upload a photo from your device file library below.');
      stopCamera();
    }
  };

  // Stop media tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCameraModal(false);
  };

  // Snap photo from live canvas video frame
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onChange(dataUrl);
    stopCamera();
  };

  // Handle file input upload (fallback)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="camera-capture-wrapper" style={{ marginBottom: '1rem' }}>
      {label && (
        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Camera size={16} color="var(--color-primary)" /> {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
      )}

      {value ? (
        /* Image Preview & Controls */
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.85rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '0.65rem', overflow: 'hidden', background: '#e2e8f0', border: '1px solid #cbd5e1', flexShrink: 0 }}>
            <img src={value} alt="Captured evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} color="#16a34a" /> Photo Attached
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 8px 0' }}>Real photo recorded for verification</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={startCamera}
                style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <RefreshCw size={12} /> Retake
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Upload size={12} /> Change
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => onChange('')}
                style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#FEE2E2', color: '#991B1B', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Action Buttons for Camera or File Upload */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={startCamera}
              style={{ padding: '10px 14px', borderRadius: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Camera size={18} color="var(--color-primary)" /> Take Photo
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '10px 14px', borderRadius: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Upload size={18} /> Upload Photo
            </button>
          </div>

          {cameraError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.78rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {cameraError}
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input Fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* LIVE CAMERA OVERLAY MODAL */}
      {showCameraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div style={{ maxWidth: 540, width: '100%', background: '#0F172A', borderRadius: '1.25rem', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid #334155' }}>
            <div style={{ padding: '1rem', background: '#1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F8FAFC', fontWeight: 700, fontSize: '0.95rem' }}>
                <Camera size={18} color="#52B788" /> Live Device Camera
              </div>
              <button onClick={stopCamera} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ padding: '1.25rem', background: '#1E293B', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={stopCamera}
                style={{ background: '#334155', color: '#F8FAFC', border: 'none' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={capturePhoto}
                style={{ background: '#52B788', color: '#1B4332', fontWeight: 800, border: 'none', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Camera size={20} /> Snap Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
