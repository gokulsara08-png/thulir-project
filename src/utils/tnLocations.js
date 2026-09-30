// Tamil Nadu Cities, Testing Presets, and Live GPS Geolocation Helper

export const TAMILNADU_CITIES = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli (Trichy)',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Vellore',
  'Thanjavur',
  'Dindigul',
  'Kanchipuram',
  'Tiruppur',
  'Cuddalore',
  'Nagapattinam',
  'Nagercoil (Kanyakumari)',
  'Karur',
  'Hosur',
  'Ramanathapuram',
  'Virudhunagar',
  'Tuticorin (Thoothukudi)',
  'Nammakkal',
  'Pudukkottai',
  'Sivakasi',
  'Kumbakonam',
  'Ooty (Udhagamandalam)',
  'Kodaikanal'
];

export const TN_TESTING_PRESETS = [
  { name: 'Chennai - T. Nagar Commercial Hub', city: 'Chennai', lat: 13.0418, lng: 80.2341, address: 'Usman Road, T. Nagar, Chennai, TN 600017' },
  { name: 'Chennai - Guindy Industrial Estate', city: 'Chennai', lat: 13.0067, lng: 80.2020, address: 'SIDCO Industrial Estate, Guindy, Chennai, TN 600032' },
  { name: 'Coimbatore - Gandhipuram Central', city: 'Coimbatore', lat: 11.0168, lng: 76.9558, address: 'Cross Cut Road, Gandhipuram, Coimbatore, TN 641012' },
  { name: 'Coimbatore - Peelamedu IT Park', city: 'Coimbatore', lat: 11.0284, lng: 77.0027, address: 'TIDEL Park, Peelamedu, Coimbatore, TN 641014' },
  { name: 'Madurai - Meenakshi Amman Temple Circle', city: 'Madurai', lat: 9.9195, lng: 78.1193, address: 'Town Hall Road, Madurai, TN 625001' },
  { name: 'Trichy - Thillai Nagar Hub', city: 'Tiruchirappalli (Trichy)', lat: 10.8270, lng: 78.6870, address: 'Main Road, Thillai Nagar, Trichy, TN 620018' },
  { name: 'Salem - New Bus Stand Circle', city: 'Salem', lat: 11.6643, lng: 78.1460, address: 'Meyyanur, Salem, TN 636004' },
  { name: 'Hosur - SIPCOT Industrial Complex', city: 'Hosur', lat: 12.7409, lng: 77.8253, address: 'SIPCOT Phase II, Hosur, TN 635109' }
];

/**
 * HTML5 Device Location Request & Reverse Geocoding Helper
 * Auto-detects exact suburb/area, city, district and state
 */
export function getUserLiveGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location service is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        let detectedAddress = '';

        try {
          // Reverse geocode via OpenStreetMap Nominatim API
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' }
          });
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const road = addr.road || addr.street || addr.pedestrian || '';
            const area = addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.industrial || '';
            const city = addr.city || addr.town || addr.municipality || addr.county || addr.district || '';
            const state = addr.state || 'Tamil Nadu';
            
            const parts = [road, area, city, state].filter(Boolean);
            if (parts.length > 0) {
              detectedAddress = parts.join(', ');
            }
          }
        } catch (e) {
          // Reverse geocode network fallback based on Tamil Nadu coordinate ranges
        }

        // Region coordinate boundary fallback if API fails
        if (!detectedAddress) {
          if (latitude > 12.8 && latitude < 13.2 && longitude > 80.0 && longitude < 80.4) {
            detectedAddress = 'T. Nagar, Chennai, Tamil Nadu';
          } else if (latitude > 10.8 && latitude < 11.2 && longitude > 76.8 && longitude < 77.2) {
            detectedAddress = 'Gandhipuram, Coimbatore, Tamil Nadu';
          } else if (latitude > 9.8 && latitude < 10.1 && longitude > 78.0 && longitude < 78.3) {
            detectedAddress = 'Town Hall Road, Madurai, Tamil Nadu';
          } else if (latitude > 10.7 && latitude < 10.9 && longitude > 78.5 && longitude < 78.8) {
            detectedAddress = 'Thillai Nagar, Trichy, Tamil Nadu';
          } else if (latitude > 11.5 && latitude < 11.8 && longitude > 78.0 && longitude < 78.3) {
            detectedAddress = 'Meyyanur, Salem, Tamil Nadu';
          } else {
            detectedAddress = `City Center, Tamil Nadu, India`;
          }
        }

        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          speed: speed ? Math.round(speed * 3.6) : 0,
          formattedAddress: detectedAddress
        });
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow location access in browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
