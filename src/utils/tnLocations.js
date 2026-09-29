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
 * HTML5 Live Device GPS Location Request Helper
 */
export function getUserLiveGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          speed: speed ? Math.round(speed * 3.6) : 0,
          formattedAddress: `Live GPS: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (±${Math.round(accuracy)}m)`
        });
      },
      (error) => {
        let msg = 'Unable to retrieve live location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
