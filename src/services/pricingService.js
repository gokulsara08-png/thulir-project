// Pricing service for waste collection
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Default rate card
const DEFAULT_RATES = {
  wasteRates: {
    organic: { small: 30, medium: 50, large: 80 },
    mixedOrganic: { small: 40, medium: 65, large: 100 },
    foodWaste: { small: 35, medium: 55, large: 90 },
    plastic: { small: 25, medium: 45, large: 70 },
    paper: { small: 20, medium: 35, large: 55 },
    cardboard: { small: 20, medium: 35, large: 55 },
    glass: { small: 30, medium: 50, large: 80 },
    metal: { small: 35, medium: 60, large: 95 },
    eWaste: { small: 50, medium: 80, large: 120 },
    mixed: { small: 40, medium: 65, large: 100 },
    other: { small: 35, medium: 55, large: 85 }
  },
  basePickup: 30,
  distancePerKm: 8,
  commissionPercent: 10,
  binSizes: { small: 20, medium: 40, large: 80 }, // litres
  transportSharePercent: 40, // transport partner gets 40% of waste+pickup charges
  manufacturerSharePercent: 50 // manufacturer gets 50% of waste+pickup charges
};

// Fetch current rates from Firestore, or seed defaults
export async function getCurrentRates() {
  try {
    const snap = await getDoc(doc(db, 'config', 'pricing'));
    if (snap.exists()) return snap.data();
    // Seed defaults on first access
    await setDoc(doc(db, 'config', 'pricing'), { ...DEFAULT_RATES, updatedAt: serverTimestamp() });
    return DEFAULT_RATES;
  } catch (e) {
    console.warn('Using default rates:', e.message);
    return DEFAULT_RATES;
  }
}

// Admin updates rate card
export async function updateRateCard(newRates) {
  await setDoc(doc(db, 'config', 'pricing'), { ...newRates, updatedAt: serverTimestamp() });
}

// Calculate price for a waste request
export function calculateWastePrice(rates, wasteType, binSize, quantity, distanceKm = 0) {
  const typeRates = rates.wasteRates[wasteType] || rates.wasteRates.other;
  const perBinRate = typeRates[binSize] || typeRates.medium;
  
  const wasteCharge = perBinRate * quantity;
  const basePickup = rates.basePickup || 30;
  const distanceCharge = (rates.distancePerKm || 8) * distanceKm;
  const subtotal = wasteCharge + basePickup + distanceCharge;
  const commission = Math.round((subtotal * (rates.commissionPercent || 10)) / 100);
  const totalPayable = subtotal; // Customer pays subtotal (commission is deducted from payouts)
  
  // Payout splits (from the subtotal minus commission)
  const distributable = subtotal - commission;
  const transportShare = Math.round(distributable * ((rates.transportSharePercent || 40) / 100));
  const manufacturerShare = Math.round(distributable * ((rates.manufacturerSharePercent || 50) / 100));

  return {
    wasteType,
    binSize,
    quantity,
    perBinRate,
    wasteCharge,
    basePickup,
    distanceKm,
    distanceCharge,
    subtotal,
    commissionPercent: rates.commissionPercent || 10,
    commission,
    totalPayable,
    transportPayout: transportShare,
    manufacturerPayout: manufacturerShare,
    platformCommission: commission,
    binCapacityLitres: (rates.binSizes || DEFAULT_RATES.binSizes)[binSize] || 40
  };
}

export { DEFAULT_RATES };
