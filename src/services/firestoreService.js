// Firestore service for waste requests, pickups, and tracking
import { db } from '../firebase';
import { 
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query, 
  where, serverTimestamp, onSnapshot, limit
} from 'firebase/firestore';
import { createNotification } from '../contexts/NotificationContext';
import { attachManufacturerToPayment, attachTransportToPayment } from './financialService';

// ============ HELPERS ============
function generateId(prefix) {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}-${year}-${rand}`;
}

function sortByCreatedAtDesc(docs) {
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
    const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
    return tb - ta;
  });
}

function safeSnapshot(q, callback, label = 'query') {
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(sortByCreatedAtDesc(docs));
  }, (error) => {
    console.warn(`[${label}] Firestore listener error:`, error.message);
    callback([]);
  });
}

function safeNotify(userId, type, message, data = {}) {
  try { return createNotification(userId, type, message, data); }
  catch (e) { console.warn('Notification skipped:', e.message); }
}

// ============ WASTE REQUESTS ============
// NEW FLOW:
//   Household/Hotel creates request (REQUESTED)
//   → Manufacturer ACCEPTS or REJECTS
//   → If ACCEPTED: assigns Transport Partner (TRANSPORT_ASSIGNED)
//   → Transport: ON_THE_WAY → COLLECTED → DELIVERED
//   → Manufacturer: RECEIVED → PROCESSING → COMPLETED
//   If REJECTED: flow stops, generator notified.

export async function createWasteRequest(userId, data) {
  const wasteId = generateId('WASTE');
  const requestData = {
    wasteId,
    generatorId: userId,
    generatorType: data.generatorType || 'household',
    wasteType: data.wasteType,
    binSize: data.binSize || 'medium',
    quantity: data.quantity ? Number(data.quantity) : 1,
    generatorReportedWeight: data.weight ? Number(data.weight) : null,
    estimatedQuantity: data.estimatedQuantity || '',
    numberOfBags: data.numberOfBags ? Number(data.numberOfBags) : 1,
    pickupLocation: data.pickupLocation,
    pickupCoords: data.pickupCoords || null,
    pickupDate: data.pickupDate,
    pickupTime: data.pickupTime,
    distanceKm: data.distanceKm ? Number(data.distanceKm) : 0,
    additionalNotes: data.additionalNotes || '',
    status: 'REQUESTED',
    weightStatus: data.weight ? 'ESTIMATED' : 'NOT_MEASURED',
    verifiedCollectedWeight: null,
    transportPartnerId: null,
    manufacturerId: null,
    rejectionReason: null,
    // Pricing (stored at creation time)
    pricing: data.pricing || null,
    pricingSnapshot: data.pricingSnapshot || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'wasteRequests'), requestData);
  await safeNotify(userId, 'request_created', 'Waste request created successfully', { wasteId, requestId: docRef.id });
  return { id: docRef.id, ...requestData };
}

// Generator (Household/Hotel) sees their own requests
export function subscribeToUserWasteRequests(userId, callback) {
  const q = query(
    collection(db, 'wasteRequests'),
    where('generatorId', '==', userId)
  );
  return safeSnapshot(q, callback, 'userWasteRequests');
}

// Manufacturer sees all REQUESTED waste requests (pending their decision)
export function subscribeToAvailableRequests(callback) {
  const q = query(
    collection(db, 'wasteRequests'),
    where('status', '==', 'REQUESTED')
  );
  return safeSnapshot(q, callback, 'availableRequests');
}

// Manufacturer ACCEPTS a waste request
export async function manufacturerAcceptRequest(requestId, manufacturerId) {
  const ref = doc(db, 'wasteRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');
  const data = snap.data();

  await updateDoc(ref, {
    status: 'ACCEPTED',
    manufacturerId,
    updatedAt: serverTimestamp()
  });

  // Attach manufacturer ID to payment record so earnings are updated
  await attachManufacturerToPayment(requestId, manufacturerId);

  await addDoc(collection(db, 'trackingEvents'), {
    wasteRequestId: requestId,
    wasteId: data.wasteId,
    event: 'ACCEPTED',
    actorId: manufacturerId,
    actorRole: 'manufacturer',
    timestamp: serverTimestamp()
  });

  await safeNotify(data.generatorId, 'request_accepted', 'Your waste request has been accepted by a manufacturing company', { requestId, wasteId: data.wasteId });
}

// Manufacturer REJECTS a waste request
export async function manufacturerRejectRequest(requestId, manufacturerId, reason = '') {
  const ref = doc(db, 'wasteRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');
  const data = snap.data();

  await updateDoc(ref, {
    status: 'REJECTED',
    manufacturerId,
    rejectionReason: reason,
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, 'trackingEvents'), {
    wasteRequestId: requestId,
    wasteId: data.wasteId,
    event: 'REJECTED',
    actorId: manufacturerId,
    actorRole: 'manufacturer',
    reason,
    timestamp: serverTimestamp()
  });

  await safeNotify(data.generatorId, 'request_rejected', `Your waste request has been rejected. ${reason ? 'Reason: ' + reason : ''}`, { requestId, wasteId: data.wasteId, reason });
}

// Manufacturer assigns a Transport Partner after acceptance
export async function assignTransportPartner(requestId, transportPartnerId) {
  const ref = doc(db, 'wasteRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');
  const data = snap.data();

  if (data.status !== 'ACCEPTED') throw new Error('Request must be ACCEPTED before assigning transport');

  await updateDoc(ref, {
    status: 'TRANSPORT_ASSIGNED',
    transportPartnerId,
    updatedAt: serverTimestamp()
  });

  // Attach transport partner ID to payment record so earnings are updated
  await attachTransportToPayment(requestId, transportPartnerId);

  await addDoc(collection(db, 'trackingEvents'), {
    wasteRequestId: requestId,
    wasteId: data.wasteId,
    event: 'TRANSPORT_ASSIGNED',
    actorId: data.manufacturerId,
    transportPartnerId,
    timestamp: serverTimestamp()
  });

  await safeNotify(transportPartnerId, 'transport_assigned', 'You have been assigned a new waste pickup', { requestId, wasteId: data.wasteId });
  await safeNotify(data.generatorId, 'transport_assigned', 'A transport partner has been assigned for your waste pickup', { requestId, wasteId: data.wasteId });
}

// Transport Partner sees pickups assigned to them
export function subscribeToTransportPickups(partnerId, callback) {
  const q = query(collection(db, 'wasteRequests'));
  return safeSnapshot(q, (docs) => {
    const transportPickups = docs.filter(p => 
      p.transportPartnerId === partnerId || 
      (!p.transportPartnerId && p.status === 'TRANSPORT_ASSIGNED') ||
      ['TRANSPORT_ASSIGNED', 'ON_THE_WAY', 'COLLECTED'].includes(p.status)
    );
    callback(sortByCreatedAtDesc(transportPickups));
  }, 'transportPickups');
}

// Transport Partner updates status: ON_THE_WAY → COLLECTED → DELIVERED
export async function updateTransportStatus(requestId, status, extraData = {}) {
  const ref = doc(db, 'wasteRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');
  const data = snap.data();

  const updateData = { status, updatedAt: serverTimestamp(), ...extraData };
  
  if (status === 'COLLECTED' && extraData.verifiedCollectedWeight) {
    updateData.verifiedCollectedWeight = Number(extraData.verifiedCollectedWeight);
    updateData.weightStatus = 'VERIFIED';
  }

  await updateDoc(ref, updateData);

  await addDoc(collection(db, 'trackingEvents'), {
    wasteRequestId: requestId,
    wasteId: data.wasteId,
    event: status,
    actorId: data.transportPartnerId,
    actorRole: 'transport_partner',
    location: extraData.location || null,
    timestamp: serverTimestamp()
  });

  const notifMessages = {
    'ON_THE_WAY': 'Transport partner is on the way for pickup',
    'COLLECTED': 'Waste has been collected by transport partner',
    'DELIVERED': 'Waste has been delivered to the manufacturing company'
  };

  if (notifMessages[status]) {
    await safeNotify(data.generatorId, `transport_${status.toLowerCase()}`, notifMessages[status], { requestId, wasteId: data.wasteId });
    if (data.manufacturerId) {
      await safeNotify(data.manufacturerId, `transport_${status.toLowerCase()}`, notifMessages[status], { requestId, wasteId: data.wasteId });
    }
  }
}

// Manufacturer confirms waste received
export async function confirmWasteReceived(requestId, manufacturerId) {
  const ref = doc(db, 'wasteRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');
  const data = snap.data();

  await updateDoc(ref, {
    status: 'RECEIVED',
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, 'trackingEvents'), {
    wasteRequestId: requestId,
    wasteId: data.wasteId,
    event: 'RECEIVED',
    actorId: manufacturerId,
    actorRole: 'manufacturer',
    timestamp: serverTimestamp()
  });

  await safeNotify(data.generatorId, 'waste_received', 'Your waste has been received by the manufacturing company', { requestId, wasteId: data.wasteId });
}

// Manufacturer starts processing (on waste request itself)
export async function startWasteProcessing(requestId, manufacturerId) {
  const ref = doc(db, 'wasteRequests', requestId);
  await updateDoc(ref, { status: 'PROCESSING', updatedAt: serverTimestamp() });

  const snap = await getDoc(ref);
  const data = snap.data();
  await addDoc(collection(db, 'trackingEvents'), {
    wasteRequestId: requestId,
    wasteId: data.wasteId,
    event: 'PROCESSING',
    actorId: manufacturerId,
    actorRole: 'manufacturer',
    timestamp: serverTimestamp()
  });
}

// Manufacturer completes processing
export async function completeWasteProcessing(requestId, manufacturerId) {
  const ref = doc(db, 'wasteRequests', requestId);
  await updateDoc(ref, { status: 'COMPLETED', updatedAt: serverTimestamp() });

  const snap = await getDoc(ref);
  const data = snap.data();
  await addDoc(collection(db, 'trackingEvents'), {
    wasteRequestId: requestId,
    wasteId: data.wasteId,
    event: 'COMPLETED',
    actorId: manufacturerId,
    actorRole: 'manufacturer',
    timestamp: serverTimestamp()
  });

  await safeNotify(data.generatorId, 'processing_completed', 'Your waste has been fully processed into valuable products!', { requestId, wasteId: data.wasteId });
}

// Manufacturer sees waste assigned to them (accepted/in-progress)
export function subscribeToManufacturerWaste(manufacturerId, callback) {
  const q = query(
    collection(db, 'wasteRequests'),
    where('manufacturerId', '==', manufacturerId)
  );
  return safeSnapshot(q, callback, 'manufacturerWaste');
}

// Legacy compatibility
export function subscribeToPartnerPickups(partnerId, callback) {
  return subscribeToTransportPickups(partnerId, callback);
}

export async function acceptWasteRequest(requestId, partnerId) {
  return manufacturerAcceptRequest(requestId, partnerId);
}

export async function updatePickupStatus(requestId, status, extraData = {}) {
  return updateTransportStatus(requestId, status, extraData);
}

export function subscribeToDeliveredWaste(callback) {
  const q = query(
    collection(db, 'wasteRequests'),
    where('status', '==', 'DELIVERED')
  );
  return safeSnapshot(q, callback, 'deliveredWaste');
}

export async function assignWasteToManufacturer(requestId, manufacturerId) {
  await updateDoc(doc(db, 'wasteRequests', requestId), {
    manufacturerId,
    updatedAt: serverTimestamp()
  });
  await safeNotify(manufacturerId, 'waste_assigned', 'New waste has been assigned to you', { requestId });
}

export async function getWasteRequest(requestId) {
  const snap = await getDoc(doc(db, 'wasteRequests', requestId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Get all transport partners for assignment dropdown
export async function getTransportPartners() {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['transport_partner', 'collection_partner'])
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============ TRACKING EVENTS ============
export function subscribeToTrackingEvents(wasteRequestId, callback) {
  const q = query(
    collection(db, 'trackingEvents'),
    where('wasteRequestId', '==', wasteRequestId)
  );
  return safeSnapshot(q, (docs) => {
    docs.sort((a, b) => {
      const ta = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
      const tb = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
      return ta - tb;
    });
    callback(docs);
  }, 'trackingEvents');
}

// ============ PROCESSING RECORDS ============
export async function createProcessingRecord(data) {
  const processId = generateId('PROCESS');
  const record = {
    processId,
    wasteRequestId: data.wasteRequestId,
    wasteId: data.wasteId,
    manufacturerId: data.manufacturerId,
    wasteType: data.wasteType,
    inputWeight: Number(data.inputWeight),
    outputWeight: null,
    outputType: data.outputType || '',
    status: 'PROCESSING',
    notes: data.notes || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'processingRecords'), record);
  return { id: docRef.id, ...record };
}

export async function updateProcessingRecord(recordId, updates) {
  await updateDoc(doc(db, 'processingRecords', recordId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export function subscribeToProcessingRecords(manufacturerId, callback) {
  const q = query(
    collection(db, 'processingRecords'),
    where('manufacturerId', '==', manufacturerId)
  );
  return safeSnapshot(q, callback, 'processingRecords');
}

// ============ PRODUCTS ============
export async function createProduct(data) {
  const productId = generateId('PRODUCT');
  const product = {
    productId,
    name: data.name,
    description: data.description,
    category: data.category,
    price: Number(data.price),
    availableQuantity: Number(data.availableQuantity),
    image: data.image || '',
    manufacturerId: data.manufacturerId,
    manufacturerName: data.manufacturerName || '',
    processingRecordId: data.processingRecordId || null,
    wasteRequestId: data.wasteRequestId || null,
    wasteType: data.wasteType || '',
    published: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const docRef = await addDoc(collection(db, 'products'), product);
  await safeNotify(data.manufacturerId, 'product_listed', `Your product "${data.name}" has been listed on the marketplace`, { productId, productDocId: docRef.id });
  return { id: docRef.id, ...product };
}

export async function updateProduct(productId, updates) {
  await updateDoc(doc(db, 'products', productId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export function subscribeToProducts(callback) {
  const q = query(
    collection(db, 'products'),
    where('published', '==', true)
  );
  return safeSnapshot(q, callback, 'products');
}

export function subscribeToManufacturerProducts(manufacturerId, callback) {
  const q = query(
    collection(db, 'products'),
    where('manufacturerId', '==', manufacturerId)
  );
  return safeSnapshot(q, callback, 'manufacturerProducts');
}

export async function getProduct(productId) {
  const snap = await getDoc(doc(db, 'products', productId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ============ ORDERS (UNCHANGED - Consumer purchase flow) ============
export async function createOrder(userId, items, shippingAddress, extraData = {}) {
  const orderId = generateId('ORDER');
  const itemsTotal = items.reduce((sum, i) => sum + (Number(i.price || 0) * Number(i.quantity || 1)), 0);
  const totalAmount = extraData.grandTotal || itemsTotal;
  const platformCommission = Math.round(itemsTotal * 0.10);
  const manufacturerPayoutAmount = Math.round(itemsTotal * 0.90);

  const order = {
    orderId,
    consumerId: userId || 'demo-consumer',
    consumerName: extraData.consumerName || 'Consumer User',
    items: items.map(i => ({
      productId: i.productId || i.id || 'PRODUCT-DEMO',
      name: i.name || 'Eco Product',
      price: Number(i.price || 0),
      quantity: Number(i.quantity || 1),
      manufacturerId: i.manufacturerId || 'demo-mfr'
    })),
    totalAmount,
    platformCommissionPercent: 10,
    platformCommission,
    manufacturerPayoutAmount,
    shippingAddress: shippingAddress || 'Tamil Nadu',
    deliveryFee: extraData.deliveryFee || 55,
    status: 'PLACED',
    deliveryPartnerId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'orders'), order);

  for (const item of items) {
    try {
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const currentQty = productSnap.data().availableQuantity || 0;
        await updateDoc(productRef, {
          availableQuantity: Math.max(0, currentQty - item.quantity),
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) { console.warn('Quantity update skipped:', e.message); }
  }

  try {
    const manufacturerIds = [...new Set(items.map(i => i.manufacturerId).filter(Boolean))];
    for (const mId of manufacturerIds) {
      await createNotification(mId, 'new_order', 'You have a new order', { orderId, orderDocId: docRef.id });
    }
    await createNotification(userId, 'order_placed', 'Your order has been placed successfully', { orderId, orderDocId: docRef.id });
  } catch (e) { console.warn('Notification skipped:', e.message); }

  return { id: docRef.id, ...order };
}

export async function updateOrderStatus(orderDocId, status, extraData = {}) {
  const ref = doc(db, 'orders', orderDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Order not found');
  const data = snap.data();

  await updateDoc(ref, { status, ...extraData, updatedAt: serverTimestamp() });

  const notifMessages = {
    'CONFIRMED': 'Your order has been confirmed',
    'PROCESSING': 'Your order is being processed',
    'READY_FOR_DELIVERY': 'Your product is ready for delivery',
    'DELIVERY_ASSIGNED': 'A delivery partner has been assigned',
    'OUT_FOR_DELIVERY': 'Your order is out for delivery',
    'DELIVERED': 'Your order has been delivered'
  };

  if (notifMessages[status]) {
    try {
      await createNotification(data.consumerId, `order_${status.toLowerCase()}`, notifMessages[status], { orderId: data.orderId, orderDocId });
    } catch (e) { console.warn('Notification skipped:', e.message); }
  }
}

export function subscribeToConsumerOrders(consumerId, callback) {
  return onSnapshot(collection(db, 'orders'), (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const consumerOrders = docs.filter(o => 
      o.consumerId === consumerId || 
      o.isDemo ||
      !o.consumerId
    );
    callback(sortByCreatedAtDesc(consumerOrders));
  }, (error) => {
    console.warn('[consumerOrders] Firestore listener error:', error.message);
    callback([]);
  });
}

export function subscribeToManufacturerOrders(manufacturerId, callback) {
  return onSnapshot(collection(db, 'orders'), (snap) => {
    const orders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => o.items?.some(i => i.manufacturerId === manufacturerId));
    callback(sortByCreatedAtDesc(orders));
  }, (error) => {
    console.warn('[manufacturerOrders] Firestore listener error:', error.message);
    callback([]);
  });
}

// ============ DELIVERY JOBS (UNCHANGED - Consumer order delivery) ============
export async function createDeliveryJob(orderDocId) {
  const deliveryId = generateId('DELIVERY');
  const orderSnap = await getDoc(doc(db, 'orders', orderDocId));
  if (!orderSnap.exists()) throw new Error('Order not found');
  const orderData = orderSnap.data();

  const job = {
    deliveryId,
    orderDocId,
    orderId: orderData.orderId,
    consumerId: orderData.consumerId,
    shippingAddress: orderData.shippingAddress,
    items: orderData.items,
    status: 'ASSIGNED',
    deliveryPartnerId: null,
    pickupLocation: '',
    currentLocation: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'deliveryJobs'), job);
  await updateOrderStatus(orderDocId, 'READY_FOR_DELIVERY');
  return { id: docRef.id, ...job };
}

export function subscribeToAvailableDeliveries(callback) {
  const q = query(
    collection(db, 'deliveryJobs'),
    where('status', '==', 'ASSIGNED')
  );
  return safeSnapshot(q, callback, 'availableDeliveries');
}

export function subscribeToPartnerDeliveries(partnerId, callback) {
  const q = query(
    collection(db, 'deliveryJobs'),
    where('deliveryPartnerId', '==', partnerId)
  );
  return safeSnapshot(q, callback, 'partnerDeliveries');
}

export async function acceptDeliveryJob(jobId, partnerId) {
  const ref = doc(db, 'deliveryJobs', jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Delivery job not found');
  const data = snap.data();

  await updateDoc(ref, {
    status: 'ACCEPTED',
    deliveryPartnerId: partnerId,
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'orders', data.orderDocId), {
    deliveryPartnerId: partnerId,
    status: 'DELIVERY_ASSIGNED',
    updatedAt: serverTimestamp()
  });

  await safeNotify(data.consumerId, 'delivery_assigned', 'A delivery partner has been assigned to your order', { deliveryId: data.deliveryId, orderId: data.orderId });
}

export async function updateDeliveryStatus(jobId, status, extraData = {}) {
  const ref = doc(db, 'deliveryJobs', jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Delivery job not found');
  const data = snap.data();

  await updateDoc(ref, { status, ...extraData, updatedAt: serverTimestamp() });

  // Notify consumer on delivery status changes
  const deliveryNotifs = {
    'PICKED_UP': 'Your order has been picked up by the delivery partner',
    'OUT_FOR_DELIVERY': 'Your order is out for delivery',
    'DELIVERED': 'Your order has been delivered successfully!'
  };
  if (deliveryNotifs[status] && data.consumerId) {
    await safeNotify(data.consumerId, `delivery_${status.toLowerCase()}`, deliveryNotifs[status], { deliveryId: data.deliveryId, orderId: data.orderId });
  }

  const orderStatus = {
    'PICKED_UP': 'OUT_FOR_DELIVERY',
    'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
    'DELIVERED': 'DELIVERED'
  };

  if (orderStatus[status]) {
    await updateOrderStatus(data.orderDocId, orderStatus[status]);
  }
}

// ============ PRODUCT JOURNEY ============
export async function getProductJourney(productDocId) {
  const product = await getProduct(productDocId);
  if (!product) return null;

  const journey = { product };

  if (product.processingRecordId) {
    try {
      const procSnap = await getDoc(doc(db, 'processingRecords', product.processingRecordId));
      if (procSnap.exists()) journey.processing = { id: procSnap.id, ...procSnap.data() };
    } catch (e) { /* skip */ }
  }

  if (product.wasteRequestId) {
    try {
      const wasteSnap = await getDoc(doc(db, 'wasteRequests', product.wasteRequestId));
      if (wasteSnap.exists()) {
        journey.wasteRequest = { id: wasteSnap.id, ...wasteSnap.data() };
        if (journey.wasteRequest.generatorId) {
          const genSnap = await getDoc(doc(db, 'users', journey.wasteRequest.generatorId));
          if (genSnap.exists()) journey.generator = { id: genSnap.id, fullName: genSnap.data().fullName, location: genSnap.data().location };
        }
        if (journey.wasteRequest.transportPartnerId) {
          const tpSnap = await getDoc(doc(db, 'users', journey.wasteRequest.transportPartnerId));
          if (tpSnap.exists()) journey.transportPartner = { id: tpSnap.id, fullName: tpSnap.data().fullName };
        }
        const trackSnap = await getDocs(query(collection(db, 'trackingEvents'), where('wasteRequestId', '==', product.wasteRequestId)));
        journey.trackingEvents = trackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) { /* skip */ }
  }

  if (product.manufacturerId) {
    try {
      const mfSnap = await getDoc(doc(db, 'users', product.manufacturerId));
      if (mfSnap.exists()) journey.manufacturer = { id: mfSnap.id, fullName: mfSnap.data().fullName, location: mfSnap.data().location };
    } catch (e) { /* skip */ }
  }

  return journey;
}

// ============ ADMIN / STATS ============
export async function getStats() {
  const stats = {};
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    stats.totalUsers = usersSnap.size;
    const wasteSnap = await getDocs(collection(db, 'wasteRequests'));
    stats.totalWasteRequests = wasteSnap.size;
    const wasteData = wasteSnap.docs.map(d => d.data());
    stats.wasteCollected = wasteData.filter(w => ['COLLECTED', 'DELIVERED', 'RECEIVED', 'PROCESSING', 'COMPLETED'].includes(w.status)).length;
    stats.verifiedWaste = wasteData.filter(w => w.weightStatus === 'VERIFIED').length;
    stats.totalVerifiedWeight = wasteData.reduce((sum, w) => sum + (w.verifiedCollectedWeight || 0), 0);
    stats.activePickups = wasteData.filter(w => ['ACCEPTED', 'TRANSPORT_ASSIGNED', 'ON_THE_WAY'].includes(w.status)).length;
    stats.rejectedRequests = wasteData.filter(w => w.status === 'REJECTED').length;
    const processSnap = await getDocs(collection(db, 'processingRecords'));
    stats.wasteProcessed = processSnap.docs.filter(d => d.data().status === 'COMPLETED').length;
    const productsSnap = await getDocs(collection(db, 'products'));
    stats.productsCreated = productsSnap.size;
    const ordersSnap = await getDocs(collection(db, 'orders'));
    stats.totalOrders = ordersSnap.size;
    stats.ordersCompleted = ordersSnap.docs.filter(d => d.data().status === 'DELIVERED').length;
    const deliverySnap = await getDocs(collection(db, 'deliveryJobs'));
    stats.totalDeliveries = deliverySnap.size;
    stats.activeDeliveries = deliverySnap.docs.filter(d => !['DELIVERED'].includes(d.data().status)).length;
    stats.successfulDeliveries = deliverySnap.docs.filter(d => d.data().status === 'DELIVERED').length;
  } catch (e) { console.error('Stats error:', e.message); }
  return stats;
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return sortByCreatedAtDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function getAllWasteRequests() {
  const snap = await getDocs(collection(db, 'wasteRequests'));
  return sortByCreatedAtDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function getAllOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  return sortByCreatedAtDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function getAllProducts() {
  const snap = await getDocs(collection(db, 'products'));
  return sortByCreatedAtDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}

export async function getAllDeliveryJobs() {
  const snap = await getDocs(collection(db, 'deliveryJobs'));
  return sortByCreatedAtDesc(snap.docs.map(d => ({ id: d.id, ...d.data() })));
}
