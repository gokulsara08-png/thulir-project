// Demo Data Seeder for THULIR
// Creates demo accounts and sample products for testing.

import { db } from '../firebase';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';

const DEMO_USERS = [
  { email: 'household@thulir.demo', password: 'demo123456', fullName: 'Green Home Family', phone: '+91 98765 43210', location: 'Residential Colony, City Center', role: 'household' },
  { email: 'hotel@thulir.demo', password: 'demo123456', fullName: 'Hotel Green Leaf', phone: '+91 98765 43215', location: 'Downtown, MG Road', role: 'hotel' },
  { email: 'office@thulir.demo', password: 'demo123456', fullName: 'TechPark Commercial Complex', phone: '+91 98765 43216', location: 'IT Corridor, Electronic City', role: 'office', customRoleDetails: 'IT Park / Corporate Office' },
  { email: 'other@thulir.demo', password: 'demo123456', fullName: 'St. Marys Campus', phone: '+91 98765 43217', location: 'Main Campus Road', role: 'other', customRoleDetails: 'Educational Institution' },
  { email: 'manufacturer@thulir.demo', password: 'demo123456', fullName: 'GreenCycle Industries', phone: '+91 98765 43212', location: 'Eco Industrial Park', role: 'manufacturer' },
  { email: 'transport@thulir.demo', password: 'demo123456', fullName: 'EcoMove Logistics', phone: '+91 98765 43211', location: 'Transport Hub, Industrial Area', role: 'transport_partner' },
  { email: 'consumer@thulir.demo', password: 'demo123456', fullName: 'Sample Consumer', phone: '+91 98765 43213', location: 'Residential Area', role: 'consumer' },
  { email: 'delivery@thulir.demo', password: 'demo123456', fullName: 'EcoDeliver', phone: '+91 98765 43214', location: 'Logistics Hub', role: 'delivery_partner' },
  { email: 'admin@thulir.demo', password: 'adminThulir2026!', fullName: 'Thulir Admin', phone: '+91 98765 43200', location: 'HQ', role: 'admin' },
];

export async function seedDemoData() {
  const seedAuth = getAuth();
  const results = { users: [], errors: [] };

  console.log('🌱 Starting THULIR demo data seeding...');

  for (const userData of DEMO_USERS) {
    try {
      // Try to create the auth account
      let uid;
      try {
        const cred = await createUserWithEmailAndPassword(seedAuth, userData.email, userData.password);
        uid = cred.user.uid;
        console.log(`✅ Auth created: ${userData.fullName} (${userData.role})`);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Account exists - sign in to get UID, then ensure Firestore doc exists
          try {
            const cred = await signInWithEmailAndPassword(seedAuth, userData.email, userData.password);
            uid = cred.user.uid;
            console.log(`⚠️ Auth exists: ${userData.email}, checking Firestore doc...`);
          } catch (loginErr) {
            console.error(`❌ Cannot access existing account ${userData.email}:`, loginErr.message);
            results.errors.push({ email: userData.email, error: loginErr.message });
            continue;
          }
        } else {
          throw authErr;
        }
      }

      // Always create/update the Firestore user document
      const userDocRef = doc(db, 'users', uid);
      const existing = await getDoc(userDocRef);
      if (!existing.exists()) {
        await setDoc(userDocRef, {
          uid,
          email: userData.email,
          fullName: userData.fullName,
          phone: userData.phone,
          location: userData.location,
          role: userData.role,
          customRoleDetails: userData.customRoleDetails || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isDemo: true
        });
        console.log(`📝 Firestore doc created for ${userData.fullName}`);
      } else {
        // Update role in case it was set to default 'consumer'
        await setDoc(userDocRef, {
          fullName: userData.fullName,
          phone: userData.phone,
          location: userData.location,
          role: userData.role,
          customRoleDetails: userData.customRoleDetails || '',
          updatedAt: serverTimestamp(),
          isDemo: true
        }, { merge: true });
        console.log(`📝 Firestore doc updated for ${userData.fullName}`);
      }

      if (userData.role === 'consumer') {
        try {
          await seedSampleOrders(uid, userData.fullName);
        } catch (oErr) {
          console.warn('Order seed skipped:', oErr.message);
        }
      }

      results.users.push({ email: userData.email, uid, role: userData.role });
    } catch (err) {
      console.error(`❌ Error with ${userData.email}:`, err.message);
      results.errors.push({ email: userData.email, error: err.message });
    }
  }

  // Sign out so it doesn't interfere with the app's auth state
  try {
    await signOut(seedAuth);
    console.log('🔓 Signed out after seeding');
  } catch (e) { /* ok */ }

  console.log('');
  console.log('🌱 Demo seeding complete!');
  console.log('');
  console.log('📋 Demo Accounts:');
  console.log('================================');
  DEMO_USERS.forEach(u => {
    console.log(`${u.role.padEnd(20)} | ${u.email.padEnd(30)} | ${u.password}`);
  });
  console.log('================================');

  return results;
}

// Sample products to add when logged in as manufacturer
export async function seedSampleProducts(manufacturerId, manufacturerName) {
  const products = [
    { name: 'Organic Compost Premium', description: 'Rich organic compost made from food waste. Perfect for home gardens and farming.', category: 'Compost', price: 299, availableQuantity: 50, wasteType: 'organic', image: 'https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?auto=format&fit=crop&w=600&q=80' },
    { name: 'Bio Fertilizer Gold', description: 'High-quality bio fertilizer processed from organic waste.', category: 'Fertilizer', price: 449, availableQuantity: 30, wasteType: 'foodWaste', image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80' },
    { name: 'Recycled Plastic Planters', description: 'Beautiful planters made from 100% recycled plastic.', category: 'Recycled Plastic', price: 199, availableQuantity: 100, wasteType: 'plastic', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80' },
    { name: 'Eco Paper Notebooks', description: 'Handcrafted notebooks made from recycled paper.', category: 'Recycled Paper', price: 149, availableQuantity: 200, wasteType: 'paper', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80' },
    { name: 'Recycled Glass Vase', description: 'Elegant decorative vase crafted from recycled glass.', category: 'Recycled Glass', price: 599, availableQuantity: 25, wasteType: 'glass', image: 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80' },
    { name: 'Upcycled Metal Art', description: 'Stunning metal wall art created from recycled scrap metal.', category: 'Recycled Metal', price: 1299, availableQuantity: 10, wasteType: 'metal', image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80' },
  ];

  for (const p of products) {
    const year = new Date().getFullYear();
    const rand = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    await addDoc(collection(db, 'products'), {
      productId: `PRODUCT-${year}-${rand}`,
      ...p,
      manufacturerId,
      manufacturerName,
      published: true,
      processingRecordId: null,
      wasteRequestId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isDemo: true
    });
    console.log(`📦 Created product: ${p.name}`);
  }

  console.log('✅ Sample products created!');
}

// Sample orders to add for demo consumer
export async function seedSampleOrders(consumerId, consumerName) {
  const year = new Date().getFullYear();
  const sampleOrders = [
    {
      orderId: `ORDER-${year}-0101`,
      consumerId,
      consumerName: consumerName || 'Sample Consumer',
      items: [
        { productId: 'P-DEMO-1', name: 'Organic Compost Premium', price: 299, quantity: 2, manufacturerId: 'demo-mfr' },
        { productId: 'P-DEMO-2', name: 'Recycled Plastic Planters', price: 199, quantity: 1, manufacturerId: 'demo-mfr' }
      ],
      totalAmount: 797,
      platformCommissionPercent: 10,
      platformCommission: 80,
      manufacturerPayoutAmount: 717,
      shippingAddress: 'Gandhipuram, Coimbatore, Tamil Nadu',
      status: 'DELIVERED',
      isDemo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      orderId: `ORDER-${year}-0102`,
      consumerId,
      consumerName: consumerName || 'Sample Consumer',
      items: [
        { productId: 'P-DEMO-3', name: 'Eco Paper Notebooks', price: 149, quantity: 3, manufacturerId: 'demo-mfr' }
      ],
      totalAmount: 447,
      platformCommissionPercent: 10,
      platformCommission: 45,
      manufacturerPayoutAmount: 402,
      shippingAddress: 'T. Nagar, Chennai, Tamil Nadu',
      status: 'OUT_FOR_DELIVERY',
      isDemo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ];

  for (const o of sampleOrders) {
    await addDoc(collection(db, 'orders'), o);
    console.log(`🛒 Created demo order: ${o.orderId}`);
  }

  console.log('✅ Sample demo consumer orders created!');
}
