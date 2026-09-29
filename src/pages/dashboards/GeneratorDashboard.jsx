import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatusTracker from '../../components/StatusTracker';
import { LineChart, DoughnutChart, BarChart, groupByMonth, groupSpendingByMonth, countByField } from '../../components/Charts';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
import GPSTracker from '../../components/GPSTracker';
import { WasteJourney } from '../../components/ProductJourney';
import LocationPickerInput from '../../components/LocationPickerInput';
import { createWasteRequest, subscribeToUserWasteRequests } from '../../services/firestoreService';
import { getCurrentRates, calculateWastePrice } from '../../services/pricingService';
import { createWastePayment, subscribeToGeneratorPayments } from '../../services/financialService';
import { createSubscription, subscribeToUserSubscriptions, updateSubscriptionStatus, SUBSCRIPTION_PLANS, calculateSubscriptionPrice } from '../../services/subscriptionService';
import { 
  LayoutDashboard, Plus, ClipboardList, Truck, User, 
  Package, AlertCircle, CheckCircle, Info, CreditCard, IndianRupee, BarChart3,
  RefreshCw, CalendarClock, Pause, Play, XCircle, Zap
} from 'lucide-react';

const WASTE_TYPES = ['organic','foodWaste','plastic','paper','cardboard','glass','metal','eWaste','mixed','other'];
const BIN_SIZES = ['small','medium','large'];
const PICKUP_STATUSES = ['REQUESTED','ACCEPTED','TRANSPORT_ASSIGNED','ON_THE_WAY','COLLECTED','DELIVERED','RECEIVED','PROCESSING','COMPLETED'];

export default function GeneratorDashboard() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [pricePreview, setPricePreview] = useState(null);

  const [form, setForm] = useState({
    wasteType: '', binSize: 'medium', quantity: '1', numberOfBags: '1', weight: '',
    pickupLocation: userData?.location || '', pickupCoords: null, pickupDate: '', pickupTime: '', additionalNotes: ''
  });

  // Subscription form
  const [subForm, setSubForm] = useState({
    plan: '', wasteType: '', binSize: 'medium', quantity: '1', numberOfBags: '1',
    pickupLocation: userData?.location || '', pickupCoords: null, pickupTime: '', startDate: '', additionalNotes: ''
  });
  const [subPreview, setSubPreview] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      subscribeToUserWasteRequests(user.uid, (data) => { setRequests(data); setLoading(false); }),
      subscribeToGeneratorPayments(user.uid, setPayments),
      subscribeToUserSubscriptions(user.uid, setSubscriptions)
    ];
    getCurrentRates().then(setRates);
    return () => unsubs.forEach(u => u());
  }, [user]);

  // Live price preview for one-time request
  useEffect(() => {
    if (rates && form.wasteType && form.binSize && form.quantity) {
      const price = calculateWastePrice(rates, form.wasteType, form.binSize, Number(form.quantity) || 1, 0);
      setPricePreview(price);
    } else { setPricePreview(null); }
  }, [rates, form.wasteType, form.binSize, form.quantity]);

  // Live preview for subscription
  useEffect(() => {
    if (rates && subForm.wasteType && subForm.binSize && subForm.quantity && subForm.plan) {
      const perPickup = calculateWastePrice(rates, subForm.wasteType, subForm.binSize, Number(subForm.quantity) || 1, 0);
      const sub = calculateSubscriptionPrice(perPickup.totalPayable, subForm.plan);
      setSubPreview({ ...perPickup, ...sub });
    } else { setSubPreview(null); }
  }, [rates, subForm.wasteType, subForm.binSize, subForm.quantity, subForm.plan]);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const updateSub = (field) => (e) => setSubForm(prev => ({ ...prev, [field]: e.target.value }));

  // Create one-time request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.wasteType || !form.binSize || !form.pickupLocation || !form.pickupDate) return setError('Please fill all required fields');

    setFormLoading(true);
    try {
      let coords = form.pickupCoords;
      if (!coords) {
        try {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) };
        } catch (e) { /* optional */ }
      }

      const pricing = pricePreview;
      const result = await createWasteRequest(user.uid, {
        ...form, generatorType: userData?.role || 'household',
        pickupCoords: coords, pricing, pricingSnapshot: rates, requestType: 'ONE_TIME'
      });

      if (pricing) {
        await createWastePayment({
          wasteRequestId: result.id, wasteId: result.wasteId, generatorId: user.uid,
          ...pricing, pricingSnapshot: rates
        });
      }

      setSuccess(`Request ${result.wasteId} created! Estimated: ₹${pricing?.totalPayable || 0}`);
      setForm({ wasteType: '', binSize: 'medium', quantity: '1', numberOfBags: '1', weight: '', pickupLocation: userData?.location || '', pickupDate: '', pickupTime: '', additionalNotes: '' });
      setTab('requests');
    } catch (err) { setError(err.message); }
    finally { setFormLoading(false); }
  };

  // Quick Daily Collection — create today's request from existing subscription or with defaults
  const handleDailyCollection = async () => {
    setError(''); setSuccess('');
    const activeSub = subscriptions.find(s => s.status === 'ACTIVE');
    if (!activeSub) {
      setTab('subscribe');
      setError('Set up a subscription first for daily collection.');
      return;
    }

    setFormLoading(true);
    try {
      let coords = null;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) { /* optional */ }

      const pricing = calculateWastePrice(rates, activeSub.wasteType, activeSub.binSize, activeSub.quantity || 1, 0);
      const today = new Date().toISOString().split('T')[0];

      const result = await createWasteRequest(user.uid, {
        wasteType: activeSub.wasteType,
        binSize: activeSub.binSize,
        quantity: String(activeSub.quantity || 1),
        numberOfBags: String(activeSub.numberOfBags || 1),
        pickupLocation: activeSub.pickupLocation,
        pickupDate: today,
        pickupTime: activeSub.pickupTime || '',
        generatorType: userData?.role || 'household',
        pickupCoords: coords, pricing, pricingSnapshot: rates,
        requestType: 'SUBSCRIPTION', subscriptionId: activeSub.id
      });

      if (pricing) {
        await createWastePayment({
          wasteRequestId: result.id, wasteId: result.wasteId, generatorId: user.uid,
          ...pricing, pricingSnapshot: rates
        });
      }

      setSuccess(`Today's pickup ${result.wasteId} created from your subscription!`);
    } catch (err) { setError(err.message); }
    finally { setFormLoading(false); }
  };

  // Create subscription
  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!subForm.plan || !subForm.wasteType || !subForm.binSize || !subForm.pickupLocation) return setError('Fill all required fields');

    setFormLoading(true);
    try {
      const perPickup = calculateWastePrice(rates, subForm.wasteType, subForm.binSize, Number(subForm.quantity) || 1, 0);
      const sub = calculateSubscriptionPrice(perPickup.totalPayable, subForm.plan);

      const result = await createSubscription({
        generatorId: user.uid,
        generatorType: userData?.role || 'household',
        ...subForm,
        quantity: Number(subForm.quantity) || 1,
        numberOfBags: Number(subForm.numberOfBags) || 1,
        perPickupPrice: perPickup.totalPayable,
        discountPercent: sub.discountPercent,
        discountedPrice: sub.discountedPrice,
        monthlyEstimate: sub.monthlyEstimate,
        pricingSnapshot: rates
      });

      setSuccess(`Subscription ${result.subscriptionId} created! Monthly estimate: ₹${sub.monthlyEstimate}`);
      setSubForm({ plan: '', wasteType: '', binSize: 'medium', quantity: '1', numberOfBags: '1', pickupLocation: userData?.location || '', pickupTime: '', startDate: '', additionalNotes: '' });
      setTab('subscriptions');
    } catch (err) { setError(err.message); }
    finally { setFormLoading(false); }
  };

  const getRoleTitle = () => {
    if (userData?.role === 'hotel') return t('roles.hotel');
    if (userData?.role === 'office') return userData?.customRoleDetails ? `Office: ${userData.customRoleDetails}` : 'Commercial Office / IT Park';
    if (userData?.role === 'other') return userData?.customRoleDetails ? `Facility: ${userData.customRoleDetails}` : 'Other Establishment';
    return t('roles.household');
  };

  const activeRequests = requests.filter(r => !['COMPLETED', 'REJECTED'].includes(r.status));
  const completedRequests = requests.filter(r => r.status === 'COMPLETED');
  const totalSpent = payments.reduce((s, p) => s + (p.totalPayable || 0), 0);
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">{getRoleTitle()}</p>
      {[
        { key: 'overview', icon: <LayoutDashboard size={18} />, label: t('dashboard.overview') },
        { key: 'create', icon: <Plus size={18} />, label: t('waste.createRequest') },
        { key: 'subscribe', icon: <CalendarClock size={18} />, label: 'Subscription' },
        { key: 'subscriptions', icon: <RefreshCw size={18} />, label: 'My Plans' },
        { key: 'requests', icon: <ClipboardList size={18} />, label: t('waste.myRequests') },
        { key: 'active', icon: <Truck size={18} />, label: t('dashboard.activePickup') },
        { key: 'payments', icon: <CreditCard size={18} />, label: 'Payments' },
        { key: 'charts', icon: <BarChart3 size={18} />, label: 'Analytics' },
        { key: 'profile', icon: <User size={18} />, label: t('dashboard.profile') },
      ].map(item => (
        <div key={item.key} className={`sidebar-link ${tab === item.key ? 'active' : ''}`} onClick={() => { setTab(item.key); setSuccess(''); setError(''); }}>
          {item.icon} {item.label}
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="dashboard-header">
        <h1 className="dashboard-title">{tab === 'overview' ? `Welcome, ${userData?.fullName}` : tab === 'create' ? t('waste.createRequest') : tab === 'subscribe' ? 'New Subscription' : tab === 'subscriptions' ? 'My Subscription Plans' : tab === 'payments' ? 'Payment History' : tab === 'charts' ? 'Analytics' : tab === 'requests' ? t('waste.myRequests') : tab === 'active' ? t('dashboard.activePickup') : t('dashboard.profile')}</h1>
        <p className="dashboard-subtitle">{getRoleTitle()}</p>
      </div>

      {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}

      {/* ============ OVERVIEW ============ */}
      {tab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon green"><ClipboardList size={24} /></div><div><div className="stat-value">{requests.length}</div><div className="stat-label">Total Requests</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><Truck size={24} /></div><div><div className="stat-value">{activeRequests.length}</div><div className="stat-label">Active Pickups</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><CheckCircle size={24} /></div><div><div className="stat-value">{completedRequests.length}</div><div className="stat-label">Completed</div></div></div>
            <div className="stat-card"><div className="stat-icon rose"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalSpent}</div><div className="stat-label">Total Spent</div></div></div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setTab('create')} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <Plus size={20} /> One-Time Pickup
            </button>
            <button className="btn btn-lg" onClick={handleDailyCollection} disabled={formLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', background: '#FEF3C7', color: '#92400E', border: '2px solid #F59E0B', fontWeight: 600 }}>
              <Zap size={20} /> {formLoading ? 'Creating...' : 'Daily Collection'}
            </button>
            <button className="btn btn-lg" onClick={() => setTab('subscribe')} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', background: '#DBEAFE', color: '#1E40AF', border: '2px solid #3B82F6', fontWeight: 600 }}>
              <CalendarClock size={20} /> Subscribe
            </button>
          </div>

          {/* Active subscription banner */}
          {activeSubs.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-4)', background: 'linear-gradient(135deg, #D8F3DC 0%, #B7E4C7 100%)', border: '1px solid #95D5B2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontWeight: 700, color: '#1B4332', display: 'flex', alignItems: 'center', gap: 8 }}><RefreshCw size={18} /> Active Subscription</h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: '#2D6A4F', marginTop: 4 }}>
                    {SUBSCRIPTION_PLANS.find(p => p.id === activeSubs[0].plan)?.label} — {activeSubs[0].wasteType} • ₹{activeSubs[0].discountedPrice}/pickup
                  </p>
                </div>
                <button className="btn btn-sm" onClick={handleDailyCollection} disabled={formLoading} style={{ background: '#2D6A4F', color: '#fff', border: 'none' }}>
                  <Zap size={14} /> Request Today
                </button>
              </div>
            </div>
          )}

          {activeRequests.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Active Pickups</h3>
              {activeRequests.slice(0, 3).map(req => (
                <div key={req.id} style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-gray-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 600 }}>{req.wasteId}</span>
                    <span className={`badge ${req.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>{req.status}</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>{t(`waste.types.${req.wasteType}`) || req.wasteType} • {req.pickupLocation}</p>
                  <StatusTracker currentStatus={req.status} steps={PICKUP_STATUSES} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ============ CREATE ONE-TIME REQUEST ============ */}
      {tab === 'create' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}><Info size={16} /><span>{t('waste.weightMessage')}</span></div>
          <form onSubmit={handleCreateRequest}>
            <div className="form-group">
              <label className="form-label">{t('waste.wasteType')} *</label>
              <select className="form-select" value={form.wasteType} onChange={update('wasteType')} required>
                <option value="">Select waste type...</option>
                {WASTE_TYPES.map(wt => <option key={wt} value={wt}>{t(`waste.types.${wt}`)}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Bin Size *</label>
                <select className="form-select" value={form.binSize} onChange={update('binSize')} required>
                  {BIN_SIZES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} ({s === 'small' ? '20L' : s === 'medium' ? '40L' : '80L'})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">No. of Bins</label>
                <input type="number" className="form-input" value={form.quantity} onChange={update('quantity')} min="0" placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">No. of Bags</label>
                <input type="number" className="form-input" value={form.numberOfBags} onChange={update('numberOfBags')} min="0" placeholder="Additional bags" />
                <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', marginTop: 4 }}>Extra bags outside bins</p>
              </div>
              <div className="form-group">
                <label className="form-label">{t('waste.weight')}</label>
                <input type="number" className="form-input" value={form.weight} onChange={update('weight')} placeholder="Optional" min="0" step="0.1" />
                <p style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', marginTop: 4 }}>Transport will verify</p>
              </div>
            </div>
            <LocationPickerInput
              value={form.pickupLocation}
              onChange={(e) => setForm(prev => ({ ...prev, pickupLocation: e.target.value, pickupCoords: e.target.coords || prev.pickupCoords }))}
              label={t('waste.pickupLocation')}
              required
              autoDetectOnMount={true}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">{t('waste.pickupDate')} *</label>
                <input type="date" className="form-input" value={form.pickupDate} onChange={update('pickupDate')} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t('waste.pickupTime')}</label>
                <input type="time" className="form-input" value={form.pickupTime} onChange={update('pickupTime')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('waste.additionalNotes')}</label>
              <textarea className="form-input" value={form.additionalNotes} onChange={update('additionalNotes')} rows={2} />
            </div>

            {/* Price Preview */}
            {pricePreview && (
              <div style={{ background: '#D8F3DC', borderRadius: 12, padding: '16px', marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontWeight: 600, color: '#1B4332', marginBottom: 8 }}>💰 Estimated Price</h4>
                <div style={{ fontSize: 'var(--text-sm)', color: '#2D6A4F', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{pricePreview.quantity}× {pricePreview.binSize} bin ({pricePreview.wasteType})</span><span>₹{pricePreview.wasteCharge}</span></div>
                  {Number(form.numberOfBags) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280' }}><span>{form.numberOfBags} extra bag(s)</span><span>Included</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Base pickup charge</span><span>₹{pricePreview.basePickup}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6B7280', fontStyle: 'italic', fontSize: 'var(--text-xs)' }}><span>Distance charge</span><span>Added by transport</span></div>
                  <div style={{ borderTop: '1px solid #95D5B2', paddingTop: 6, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 'var(--text-base)' }}>
                    <span>Estimated Total</span><span>₹{pricePreview.totalPayable}+</span>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={formLoading}>
              {formLoading ? t('common.loading') : `Submit Request${pricePreview ? ` — ₹${pricePreview.totalPayable}` : ''}`}
            </button>
          </form>
        </div>
      )}

      {/* ============ NEW SUBSCRIPTION ============ */}
      {tab === 'subscribe' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><CalendarClock size={20} color="#2D6A4F" /> Set Up Recurring Pickup</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Subscribe and use the "Daily Collection" button to quickly create pickups with pre-filled details and discounted rates.</p>
          </div>

          <form onSubmit={handleCreateSubscription}>
            {/* Plan selection */}
            <div className="form-group">
              <label className="form-label">Collection Plan *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                {SUBSCRIPTION_PLANS.map(plan => (
                  <div key={plan.id} onClick={() => setSubForm(p => ({ ...p, plan: plan.id }))}
                    style={{ padding: '14px 16px', borderRadius: 12, border: `2px solid ${subForm.plan === plan.id ? '#2D6A4F' : '#E5E7EB'}`, cursor: 'pointer', background: subForm.plan === plan.id ? '#D8F3DC' : '#fff', transition: 'all 0.2s' }}>
                    <div style={{ fontWeight: 700, color: subForm.plan === plan.id ? '#1B4332' : '#374151', fontSize: 'var(--text-sm)' }}>{plan.label}</div>
                    <div style={{ fontSize: '0.7rem', color: subForm.plan === plan.id ? '#2D6A4F' : '#9CA3AF', marginTop: 2 }}>{plan.description}</div>
                    <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginTop: 4 }}>Save {plan.discount}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('waste.wasteType')} *</label>
              <select className="form-select" value={subForm.wasteType} onChange={updateSub('wasteType')} required>
                <option value="">Select waste type...</option>
                {WASTE_TYPES.map(wt => <option key={wt} value={wt}>{t(`waste.types.${wt}`)}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Bin Size *</label>
                <select className="form-select" value={subForm.binSize} onChange={updateSub('binSize')} required>
                  {BIN_SIZES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} ({s === 'small' ? '20L' : s === 'medium' ? '40L' : '80L'})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">No. of Bins</label>
                <input type="number" className="form-input" value={subForm.quantity} onChange={updateSub('quantity')} min="0" placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">No. of Bags</label>
                <input type="number" className="form-input" value={subForm.numberOfBags} onChange={updateSub('numberOfBags')} min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Time</label>
                <input type="time" className="form-input" value={subForm.pickupTime} onChange={updateSub('pickupTime')} />
              </div>
            </div>
            <LocationPickerInput
              value={subForm.pickupLocation}
              onChange={(e) => setSubForm(prev => ({ ...prev, pickupLocation: e.target.value }))}
              label="Pickup Location"
              required
            />
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={subForm.startDate} onChange={updateSub('startDate')} />
            </div>

            {/* Subscription Price Preview */}
            {subPreview && (
              <div style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #D8F3DC 100%)', borderRadius: 12, padding: '16px', marginBottom: 'var(--space-4)' }}>
                <h4 style={{ fontWeight: 600, color: '#1E40AF', marginBottom: 8 }}>📋 Subscription Summary</h4>
                <div style={{ fontSize: 'var(--text-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Per pickup (original)</span><span>₹{subPreview.totalPayable}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}><span>Discount ({subPreview.discountPercent}%)</span><span>-₹{subPreview.totalPayable - subPreview.discountedPrice}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Per pickup (discounted)</span><span>₹{subPreview.discountedPrice}</span></div>
                  <div style={{ borderTop: '1px solid #93C5FD', paddingTop: 6, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pickups/month</span><span>{subPreview.pickupsPerMonth}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 'var(--text-base)', color: '#1B4332' }}><span>Monthly estimate</span><span>₹{subPreview.monthlyEstimate}</span></div>
                    {subPreview.savings > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600, fontSize: 'var(--text-xs)' }}><span>Monthly savings</span><span>₹{subPreview.savings}</span></div>}
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={formLoading}>
              {formLoading ? 'Creating...' : `Start Subscription${subPreview ? ` — ₹${subPreview.monthlyEstimate}/mo` : ''}`}
            </button>
          </form>
        </div>
      )}

      {/* ============ MY SUBSCRIPTIONS ============ */}
      {tab === 'subscriptions' && (
        subscriptions.length === 0 ? (
          <div className="empty-state"><CalendarClock size={48} /><p className="empty-state-title">No subscriptions yet</p><button className="btn btn-primary mt-4" onClick={() => setTab('subscribe')}>Create Subscription</button></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {subscriptions.map(sub => {
              const plan = SUBSCRIPTION_PLANS.find(p => p.id === sub.plan);
              return (
                <div className="card" key={sub.id} style={{ border: sub.status === 'ACTIVE' ? '2px solid #52B788' : '1px solid var(--color-gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {sub.subscriptionId}
                        <span className={`badge ${sub.status === 'ACTIVE' ? 'badge-success' : sub.status === 'PAUSED' ? 'badge-warning' : 'badge-error'}`}>{sub.status}</span>
                      </h3>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginTop: 4 }}>
                        {plan?.label} • {sub.wasteType} • {sub.quantity} {sub.binSize} bin(s){sub.numberOfBags > 0 ? ` + ${sub.numberOfBags} bag(s)` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#1B4332' }}>₹{sub.discountedPrice}<span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', fontWeight: 400 }}>/pickup</span></div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>₹{sub.monthlyEstimate}/month</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>
                    📍 {sub.pickupLocation} {sub.pickupTime && `• ⏰ ${sub.pickupTime}`}
                    {sub.startDate && ` • Started: ${sub.startDate}`}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    {sub.status === 'ACTIVE' && (
                      <>
                        <button className="btn btn-sm" style={{ background: '#FEF3C7', color: '#92400E', border: 'none' }} onClick={() => updateSubscriptionStatus(sub.id, 'PAUSED')}><Pause size={14} /> Pause</button>
                        <button className="btn btn-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: 'none' }} onClick={() => updateSubscriptionStatus(sub.id, 'CANCELLED')}><XCircle size={14} /> Cancel</button>
                      </>
                    )}
                    {sub.status === 'PAUSED' && (
                      <button className="btn btn-sm" style={{ background: '#D8F3DC', color: '#1B4332', border: 'none' }} onClick={() => updateSubscriptionStatus(sub.id, 'ACTIVE')}><Play size={14} /> Resume</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ============ MY REQUESTS ============ */}
      {tab === 'requests' && (
        <div className="card">
          {loading ? <div className="loading-spinner"><div className="spinner" /></div> : requests.length === 0 ? (
            <div className="empty-state"><ClipboardList size={48} /><p className="empty-state-title">No requests yet</p><button className="btn btn-primary mt-4" onClick={() => setTab('create')}>Create First Request</button></div>
          ) : (
            <div style={{ overflowX: 'auto' }}><table className="data-table">
              <thead><tr><th>ID</th><th>Type</th><th>Bin</th><th>Bins</th><th>Bags</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.wasteId}</td>
                  <td>{t(`waste.types.${r.wasteType}`) || r.wasteType}</td>
                  <td>{r.binSize}</td>
                  <td>{r.quantity || 1}</td>
                  <td>{r.numberOfBags || 0}</td>
                  <td>₹{r.pricing?.totalPayable || '-'}</td>
                  <td>
                    <span className={`badge ${r.status === 'COMPLETED' ? 'badge-success' : r.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>{r.status}</span>
                    {r.requestType === 'SUBSCRIPTION' && <span style={{ fontSize: '0.6rem', display: 'block', color: '#6B7280' }}>via subscription</span>}
                    {r.status === 'REJECTED' && r.rejectionReason && <p style={{ fontSize: '0.65rem', color: '#991B1B', marginTop: 2 }}>{r.rejectionReason}</p>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {/* ============ ACTIVE PICKUP ============ */}
      {tab === 'active' && (
        activeRequests.length === 0 ? <div className="empty-state"><Truck size={48} /><p className="empty-state-title">No active pickups</p></div> :
        activeRequests.map(req => (
          <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <GPSTracker 
              pickupLocation={req.pickupLocation || 'Generator Location'}
              destinationLocation="EcoRecycle Regional Hub"
              status={req.status}
              height={340}
            />
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontWeight: 600 }}>{req.wasteId}</h3>
                <span className={`badge ${req.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>{req.status}</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>
                {t(`waste.types.${req.wasteType}`)} • {req.quantity} bin(s){req.numberOfBags > 0 ? ` + ${req.numberOfBags} bag(s)` : ''} • {req.pickupLocation} • ₹{req.pricing?.totalPayable || '-'}
              </p>
              <WasteJourney wasteRequest={req} />
            </div>
          </div>
        ))
      )}

      {/* ============ PAYMENTS ============ */}
      {tab === 'payments' && (
        payments.length === 0 ? <div className="empty-state"><CreditCard size={48} /><p className="empty-state-title">No payments yet</p></div> :
        <div className="card"><table className="data-table">
          <thead><tr><th>Payment ID</th><th>Waste ID</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>{payments.map(p => (
            <tr key={p.id}>
              <td style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{p.paymentId}</td>
              <td>{p.wasteId}</td>
              <td>₹{p.totalPayable}</td>
              <td><span className={`badge ${p.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.paymentStatus}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {/* ============ ANALYTICS ============ */}
      {tab === 'charts' && (
        <InteractiveAnalytics 
          role={userData?.role || 'generator'} 
          requests={requests} 
          payments={payments} 
          rates={rates} 
          title={`${getRoleTitle()} Waste Analytics & Price Trends`} 
        />
      )}

      {/* ============ PROFILE ============ */}
      {tab === 'profile' && userData && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', fontSize: 'var(--text-3xl)', color: 'var(--color-primary)' }}>{userData.fullName?.charAt(0)}</div>
            <h3>{userData.fullName}</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{getRoleTitle()}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Email:</span> {userData.email}</div>
            <div><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Phone:</span> {userData.phone}</div>
            <div><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Location:</span> {userData.location}</div>
            {userData.customRoleDetails && (
              <div><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Establishment / Place Type:</span> <strong style={{ color: 'var(--color-primary-dark)' }}>{userData.customRoleDetails}</strong></div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
