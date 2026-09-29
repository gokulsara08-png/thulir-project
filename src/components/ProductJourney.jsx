// Visual Product Journey / Traceability Timeline
import { useState, useEffect } from 'react';
import { getProductJourney } from '../services/firestoreService';
import { Package, Truck, Factory, ShoppingCart, CheckCircle, Leaf, MapPin, User, Clock } from 'lucide-react';

const JOURNEY_STEPS = [
  { key: 'wasteGenerated', icon: Leaf, label: 'Waste Generated', color: '#2D6A4F' },
  { key: 'requestCreated', icon: Package, label: 'Request Created', color: '#40916C' },
  { key: 'accepted', icon: CheckCircle, label: 'Manufacturer Accepted', color: '#52B788' },
  { key: 'transportAssigned', icon: Truck, label: 'Transport Assigned', color: '#74C69D' },
  { key: 'collected', icon: Truck, label: 'Picked Up', color: '#95D5B2' },
  { key: 'delivered', icon: MapPin, label: 'Delivered to Manufacturer', color: '#DDA15E' },
  { key: 'received', icon: Factory, label: 'Manufacturer Received', color: '#BC6C25' },
  { key: 'processing', icon: Factory, label: 'Processing', color: '#606C38' },
  { key: 'productCreated', icon: Package, label: 'Product Created', color: '#2D6A4F' },
  { key: 'productListed', icon: ShoppingCart, label: 'Listed on Marketplace', color: '#40916C' },
  { key: 'purchased', icon: User, label: 'Consumer Purchased', color: '#52B788' },
  { key: 'orderDelivered', icon: CheckCircle, label: 'Order Delivered', color: '#1B4332' },
];

function getCompletedSteps(journey) {
  const completed = [];
  if (journey.wasteRequest) {
    completed.push('wasteGenerated', 'requestCreated');
    const s = journey.wasteRequest.status;
    if (['ACCEPTED','TRANSPORT_ASSIGNED','ON_THE_WAY','COLLECTED','DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(s)) completed.push('accepted');
    if (['TRANSPORT_ASSIGNED','ON_THE_WAY','COLLECTED','DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(s)) completed.push('transportAssigned');
    if (['COLLECTED','DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(s)) completed.push('collected');
    if (['DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(s)) completed.push('delivered');
    if (['RECEIVED','PROCESSING','COMPLETED'].includes(s)) completed.push('received');
    if (['PROCESSING','COMPLETED'].includes(s)) completed.push('processing');
  }
  if (journey.product) {
    completed.push('productCreated');
    if (journey.product.published) completed.push('productListed');
  }
  if (journey.order) {
    completed.push('purchased');
    if (journey.order.status === 'DELIVERED') completed.push('orderDelivered');
  }
  return completed;
}

export default function ProductJourney({ productDocId, wasteRequestId, journey: providedJourney }) {
  const [journey, setJourney] = useState(providedJourney || null);
  const [loading, setLoading] = useState(!providedJourney);

  useEffect(() => {
    if (providedJourney) { setJourney(providedJourney); return; }
    if (!productDocId) { setLoading(false); return; }
    getProductJourney(productDocId).then(j => { setJourney(j); setLoading(false); }).catch(() => setLoading(false));
  }, [productDocId]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!journey) return <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>No journey data available</p>;

  const completed = getCompletedSteps(journey);

  return (
    <div style={{ padding: 'var(--space-4)' }}>
      <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Leaf size={20} color="#2D6A4F" /> Product Journey
      </h3>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        {journey.generator && (
          <div style={{ background: '#D8F3DC', borderRadius: 12, padding: '12px 16px', fontSize: 'var(--text-sm)' }}>
            <div style={{ fontWeight: 600, color: '#1B4332', marginBottom: 4 }}>Source</div>
            <div>{journey.generator.fullName}</div>
            {journey.generator.location && <div style={{ fontSize: 'var(--text-xs)', color: '#2D6A4F' }}>{journey.generator.location}</div>}
          </div>
        )}
        {journey.manufacturer && (
          <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '12px 16px', fontSize: 'var(--text-sm)' }}>
            <div style={{ fontWeight: 600, color: '#92400E', marginBottom: 4 }}>Manufacturer</div>
            <div>{journey.manufacturer.fullName}</div>
            {journey.manufacturer.location && <div style={{ fontSize: 'var(--text-xs)', color: '#B45309' }}>{journey.manufacturer.location}</div>}
          </div>
        )}
        {journey.transportPartner && (
          <div style={{ background: '#DBEAFE', borderRadius: 12, padding: '12px 16px', fontSize: 'var(--text-sm)' }}>
            <div style={{ fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>Transport</div>
            <div>{journey.transportPartner.fullName}</div>
          </div>
        )}
        {journey.wasteRequest && (
          <div style={{ background: '#F3F4F6', borderRadius: 12, padding: '12px 16px', fontSize: 'var(--text-sm)' }}>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Waste ID</div>
            <div>{journey.wasteRequest.wasteId}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: '#6B7280' }}>{journey.wasteRequest.wasteType}</div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: 32 }}>
        {JOURNEY_STEPS.map((step, i) => {
          const done = completed.includes(step.key);
          const Icon = step.icon;
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: i < JOURNEY_STEPS.length - 1 ? 0 : 0, position: 'relative', paddingBottom: 24 }}>
              {/* Vertical line */}
              {i < JOURNEY_STEPS.length - 1 && (
                <div style={{ position: 'absolute', left: -20, top: 24, bottom: 0, width: 2, background: done ? step.color : '#E5E7EB' }} />
              )}
              {/* Icon circle */}
              <div style={{
                position: 'absolute', left: -28, top: 0,
                width: 20, height: 20, borderRadius: '50%',
                background: done ? step.color : '#F3F4F6',
                border: `2px solid ${done ? step.color : '#D1D5DB'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {done && <CheckCircle size={10} color="white" />}
              </div>
              {/* Content */}
              <div style={{ marginLeft: 8 }}>
                <div style={{ fontWeight: done ? 600 : 400, fontSize: 'var(--text-sm)', color: done ? '#1F2937' : '#9CA3AF' }}>
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simpler version: just waste request journey (no product)
export function WasteJourney({ wasteRequest }) {
  if (!wasteRequest) return null;
  const steps = [
    { label: 'Request Created', done: true },
    { label: 'Accepted', done: ['ACCEPTED','TRANSPORT_ASSIGNED','ON_THE_WAY','COLLECTED','DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(wasteRequest.status) },
    { label: 'Rejected', done: wasteRequest.status === 'REJECTED', isError: true },
    { label: 'Transport Assigned', done: ['TRANSPORT_ASSIGNED','ON_THE_WAY','COLLECTED','DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(wasteRequest.status) },
    { label: 'Picked Up', done: ['COLLECTED','DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(wasteRequest.status) },
    { label: 'Delivered', done: ['DELIVERED','RECEIVED','PROCESSING','COMPLETED'].includes(wasteRequest.status) },
    { label: 'Received', done: ['RECEIVED','PROCESSING','COMPLETED'].includes(wasteRequest.status) },
    { label: 'Processing', done: ['PROCESSING','COMPLETED'].includes(wasteRequest.status) },
    { label: 'Completed', done: wasteRequest.status === 'COMPLETED' },
  ].filter(s => !(s.label === 'Rejected' && wasteRequest.status !== 'REJECTED'));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {steps.map((s, i) => (
        <span key={i}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
            background: s.isError ? '#FEE2E2' : s.done ? '#D8F3DC' : '#F3F4F6',
            color: s.isError ? '#991B1B' : s.done ? '#1B4332' : '#9CA3AF'
          }}>{s.label}</span>
          {i < steps.length - 1 && <span style={{ color: '#D1D5DB', margin: '0 2px' }}>→</span>}
        </span>
      ))}
    </div>
  );
}
