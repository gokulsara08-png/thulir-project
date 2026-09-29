// Subscription service for recurring waste pickups
import { db } from '../firebase';
import { collection, doc, addDoc, getDocs, updateDoc, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';

function generateId(prefix) {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}-${year}-${rand}`;
}

const SUBSCRIPTION_PLANS = [
  { id: 'daily', label: 'Daily Collection', frequency: 'daily', discount: 20, description: 'Pickup every day' },
  { id: 'alternate', label: 'Alternate Days', frequency: 'alternate', discount: 15, description: 'Pickup every 2 days' },
  { id: 'weekly', label: 'Weekly', frequency: 'weekly', discount: 10, description: 'Pickup once a week' },
  { id: 'biweekly', label: 'Bi-Weekly', frequency: 'biweekly', discount: 5, description: 'Pickup every 2 weeks' },
];

export { SUBSCRIPTION_PLANS };

// Create a new subscription
export async function createSubscription(data) {
  const subscriptionId = generateId('SUB');
  const subscription = {
    subscriptionId,
    generatorId: data.generatorId,
    generatorType: data.generatorType || 'household',
    plan: data.plan, // daily, alternate, weekly, biweekly
    wasteType: data.wasteType,
    binSize: data.binSize,
    quantity: data.quantity || 1,
    numberOfBags: data.numberOfBags || 1,
    pickupLocation: data.pickupLocation,
    pickupTime: data.pickupTime || '',
    // Pricing per pickup
    perPickupPrice: data.perPickupPrice || 0,
    discountPercent: data.discountPercent || 0,
    discountedPrice: data.discountedPrice || 0,
    // Monthly estimate
    monthlyEstimate: data.monthlyEstimate || 0,
    pricingSnapshot: data.pricingSnapshot || null,
    status: 'ACTIVE', // ACTIVE, PAUSED, CANCELLED
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate || null,
    additionalNotes: data.additionalNotes || '',
    lastPickupDate: null,
    totalPickups: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'subscriptions'), subscription);
  return { id: docRef.id, ...subscription };
}

// Subscribe to user's subscriptions
export function subscribeToUserSubscriptions(userId, callback) {
  const q = query(collection(db, 'subscriptions'), where('generatorId', '==', userId));
  return onSnapshot(q, (snap) => {
    const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    subs.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return tb - ta;
    });
    callback(subs);
  }, () => callback([]));
}

// Pause/resume/cancel subscription
export async function updateSubscriptionStatus(subDocId, status) {
  await updateDoc(doc(db, 'subscriptions', subDocId), { status, updatedAt: serverTimestamp() });
}

// Get all subscriptions (admin)
export async function getAllSubscriptions() {
  const snap = await getDocs(collection(db, 'subscriptions'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Calculate monthly estimate for a subscription plan
export function calculateSubscriptionPrice(perPickupPrice, plan) {
  const planInfo = SUBSCRIPTION_PLANS.find(p => p.id === plan);
  if (!planInfo) return { discountPercent: 0, discountedPrice: perPickupPrice, monthlyEstimate: perPickupPrice * 30 };
  
  const discountPercent = planInfo.discount;
  const discountedPrice = Math.round(perPickupPrice * (100 - discountPercent) / 100);
  
  let pickupsPerMonth;
  switch (plan) {
    case 'daily': pickupsPerMonth = 30; break;
    case 'alternate': pickupsPerMonth = 15; break;
    case 'weekly': pickupsPerMonth = 4; break;
    case 'biweekly': pickupsPerMonth = 2; break;
    default: pickupsPerMonth = 4;
  }
  
  return {
    discountPercent,
    discountedPrice,
    pickupsPerMonth,
    monthlyEstimate: discountedPrice * pickupsPerMonth,
    savings: (perPickupPrice - discountedPrice) * pickupsPerMonth
  };
}
