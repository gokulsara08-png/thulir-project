// Financial service - waste payments, payouts, transactions
import { db } from '../firebase';
import { 
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query, 
  where, serverTimestamp, onSnapshot 
} from 'firebase/firestore';

function generateId(prefix) {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}-${year}-${rand}`;
}

function sortByDateDesc(docs) {
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
    const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
    return tb - ta;
  });
}

// ============ WASTE PAYMENTS ============
export async function createWastePayment(data) {
  const paymentId = generateId('WPAY');
  const payment = {
    paymentId,
    type: 'WASTE_COLLECTION',
    wasteRequestId: data.wasteRequestId,
    wasteId: data.wasteId,
    generatorId: data.generatorId,
    manufacturerId: data.manufacturerId || null,
    transportPartnerId: data.transportPartnerId || null,
    // Pricing breakdown
    wasteType: data.wasteType,
    binSize: data.binSize,
    quantity: data.quantity,
    perBinRate: data.perBinRate,
    wasteCharge: data.wasteCharge,
    basePickup: data.basePickup,
    distanceKm: data.distanceKm || 0,
    distanceCharge: data.distanceCharge || 0,
    subtotal: data.subtotal,
    commissionPercent: data.commissionPercent,
    commission: data.commission,
    totalPayable: data.totalPayable,
    // Payouts
    transportPayout: data.transportPayout || 0,
    manufacturerPayout: data.manufacturerPayout || 0,
    platformCommission: data.platformCommission || 0,
    // Status - automatically earned & paid out without waiting for manual admin intervention
    paymentStatus: 'PAID',
    transportPayoutStatus: 'PAID',
    manufacturerPayoutStatus: 'PAID',
    // Snapshot of rates used
    pricingSnapshot: data.pricingSnapshot || {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'wastePayments'), payment);
  return { id: docRef.id, ...payment };
}

export async function updatePaymentStatus(paymentDocId, status) {
  await updateDoc(doc(db, 'wastePayments', paymentDocId), { 
    paymentStatus: status, updatedAt: serverTimestamp() 
  });
}

export async function updateWastePayment(paymentDocId, updates) {
  await updateDoc(doc(db, 'wastePayments', paymentDocId), { 
    ...updates, 
    updatedAt: serverTimestamp() 
  });
}

export async function updatePayoutStatus(paymentDocId, role, status) {
  const field = role === 'transport' ? 'transportPayoutStatus' : 'manufacturerPayoutStatus';
  await updateDoc(doc(db, 'wastePayments', paymentDocId), {
    [field]: status, updatedAt: serverTimestamp()
  });
}

export async function attachManufacturerToPayment(wasteRequestId, manufacturerId) {
  try {
    const q = query(collection(db, 'wastePayments'), where('wasteRequestId', '==', wasteRequestId));
    const snap = await getDocs(q);
    snap.docs.forEach(async (d) => {
      await updateDoc(doc(db, 'wastePayments', d.id), {
        manufacturerId,
        updatedAt: serverTimestamp()
      });
    });
  } catch (e) {
    console.warn('Failed to attach manufacturer to payment:', e.message);
  }
}

export async function attachTransportToPayment(wasteRequestId, transportPartnerId) {
  try {
    const q = query(collection(db, 'wastePayments'), where('wasteRequestId', '==', wasteRequestId));
    const snap = await getDocs(q);
    snap.docs.forEach(async (d) => {
      await updateDoc(doc(db, 'wastePayments', d.id), {
        transportPartnerId,
        updatedAt: serverTimestamp()
      });
    });
  } catch (e) {
    console.warn('Failed to attach transport to payment:', e.message);
  }
}

// Subscribe to payments for a generator
export function subscribeToGeneratorPayments(generatorId, callback) {
  const q = query(collection(db, 'wastePayments'), where('generatorId', '==', generatorId));
  return onSnapshot(q, (snap) => {
    callback(sortByDateDesc(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, () => callback([]));
}

// Subscribe to payments for a manufacturer (earnings)
export function subscribeToManufacturerPayments(manufacturerId, callback) {
  const q = query(collection(db, 'wastePayments'), where('manufacturerId', '==', manufacturerId));
  return onSnapshot(q, (snap) => {
    callback(sortByDateDesc(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, () => callback([]));
}

// Subscribe to payments for transport partner (earnings)
export function subscribeToTransportPayments(transportId, callback) {
  const q = query(collection(db, 'wastePayments'), where('transportPartnerId', '==', transportId));
  return onSnapshot(q, (snap) => {
    callback(sortByDateDesc(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, () => callback([]));
}

// Get all payments (admin)
export async function getAllWastePayments() {
  const snap = await getDocs(collection(db, 'wastePayments'));
  return sortByDateDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

// Get all product orders & delivery payments financial summary (admin)
export async function getFinancialSummary() {
  const [paymentsSnap, ordersSnap, deliverySnap] = await Promise.all([
    getDocs(collection(db, 'wastePayments')),
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'deliveryPayments'))
  ]);

  const payments = paymentsSnap.docs.map(d => d.data());
  const orders = ordersSnap.docs.map(d => d.data());
  const deliveryPayments = deliverySnap.docs.map(d => d.data());

  const wasteCommission = payments.reduce((s, p) => s + Number(p.platformCommission || 0), 0);
  const totalOrderRevenue = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const marketplaceCommission = orders.reduce((s, o) => s + Number(o.platformCommission || Math.round(Number(o.totalAmount || 0) * 0.10)), 0);
  const deliveryCommission = deliveryPayments.reduce((s, d) => s + Number(d.commission || Math.round(Number(d.totalDeliveryFee || 50) * 0.12)), 0);
  const totalAdminRevenue = wasteCommission + marketplaceCommission + deliveryCommission;

  return {
    // Waste collection revenue
    totalWastePayments: payments.length,
    totalWasteRevenue: payments.reduce((s, p) => s + Number(p.totalPayable || 0), 0),
    paidWastePayments: payments.filter(p => p.paymentStatus === 'PAID').length,
    pendingWastePayments: payments.filter(p => p.paymentStatus === 'PENDING').length,
    totalCommission: wasteCommission,
    totalTransportPayouts: payments.reduce((s, p) => s + Number(p.transportPayout || 0), 0),
    totalManufacturerPayouts: payments.reduce((s, p) => s + Number(p.manufacturerPayout || 0), 0),
    pendingTransportPayouts: payments.filter(p => p.transportPayoutStatus === 'PENDING').reduce((s, p) => s + Number(p.transportPayout || 0), 0),
    pendingManufacturerPayouts: payments.filter(p => p.manufacturerPayoutStatus === 'PENDING').reduce((s, p) => s + Number(p.manufacturerPayout || 0), 0),
    // Product order revenue & Marketplace Commission (Gross Order Sales)
    totalOrders: orders.length,
    totalOrderRevenue: totalOrderRevenue,
    totalMarketplaceCommission: marketplaceCommission,
    // Delivery logistics commission
    totalDeliveryPayments: deliveryPayments.length,
    totalDeliveryCommission: deliveryCommission,
    // Net Admin Revenue from all ecosystem connections
    totalAdminRevenue: totalAdminRevenue,
    completedOrders: orders.filter(o => o.status === 'DELIVERED').length,
  };
}

// Mark a payment as paid (admin action)
export async function markPaymentPaid(paymentDocId) {
  await updateDoc(doc(db, 'wastePayments', paymentDocId), {
    paymentStatus: 'PAID', updatedAt: serverTimestamp()
  });
}

// Mark payout as paid (admin action)
export async function markPayoutPaid(paymentDocId, role) {
  const field = role === 'transport' ? 'transportPayoutStatus' : 
                role === 'delivery' ? 'deliveryPayoutStatus' : 'manufacturerPayoutStatus';
  await updateDoc(doc(db, 'wastePayments', paymentDocId), {
    [field]: 'PAID', updatedAt: serverTimestamp()
  });
}

// ============ DELIVERY PAYMENTS ============

// Delivery pricing config
const DELIVERY_PRICING = {
  baseFee: 25,        // ₹25 base per delivery
  perKmRate: 6,       // ₹6 per km
  platformPercent: 12, // 12% platform commission
};

export function getDeliveryPricing() { return { ...DELIVERY_PRICING }; }

export function calculateDeliveryFee(distanceKm = 0) {
  const base = DELIVERY_PRICING.baseFee;
  const distanceCharge = Math.round(distanceKm * DELIVERY_PRICING.perKmRate);
  const subtotal = base + distanceCharge;
  const commission = Math.round(subtotal * DELIVERY_PRICING.platformPercent / 100);
  const deliveryPartnerEarning = subtotal - commission;
  return {
    baseFee: base,
    distanceKm,
    perKmRate: DELIVERY_PRICING.perKmRate,
    distanceCharge,
    subtotal,
    commissionPercent: DELIVERY_PRICING.platformPercent,
    commission,
    deliveryPartnerEarning,
    totalDeliveryFee: subtotal
  };
}

export async function createDeliveryPayment(data) {
  const paymentId = generateId('DPAY');
  const payment = {
    paymentId,
    type: 'PRODUCT_DELIVERY',
    deliveryJobId: data.deliveryJobId,
    deliveryId: data.deliveryId,
    orderId: data.orderId,
    deliveryPartnerId: data.deliveryPartnerId,
    consumerId: data.consumerId || null,
    // Pricing
    baseFee: data.baseFee || 0,
    distanceKm: data.distanceKm || 0,
    perKmRate: data.perKmRate || 0,
    distanceCharge: data.distanceCharge || 0,
    subtotal: data.subtotal || 0,
    commissionPercent: data.commissionPercent || 0,
    commission: data.commission || 0,
    deliveryPartnerEarning: data.deliveryPartnerEarning || 0,
    totalDeliveryFee: data.totalDeliveryFee || 0,
    // Status - automatically earned & paid out without waiting for manual admin intervention
    paymentStatus: 'PAID',
    deliveryPayoutStatus: 'PAID',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'deliveryPayments'), payment);
  return { id: docRef.id, ...payment };
}

export function subscribeToDeliveryPartnerPayments(deliveryPartnerId, callback) {
  const q = query(collection(db, 'deliveryPayments'), where('deliveryPartnerId', '==', deliveryPartnerId));
  return onSnapshot(q, (snap) => {
    callback(sortByDateDesc(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, () => callback([]));
}

export async function getAllDeliveryPayments() {
  const snap = await getDocs(collection(db, 'deliveryPayments'));
  return sortByDateDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function markDeliveryPayoutPaid(paymentDocId) {
  await updateDoc(doc(db, 'deliveryPayments', paymentDocId), {
    deliveryPayoutStatus: 'PAID', paymentStatus: 'PAID', updatedAt: serverTimestamp()
  });
}
