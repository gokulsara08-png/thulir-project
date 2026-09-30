import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatusTracker from '../../components/StatusTracker';
import { LineChart, DoughnutChart, BarChart, groupByMonth, groupSpendingByMonth, countByField } from '../../components/Charts';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
import { subscribeToAvailableDeliveries, subscribeToPartnerDeliveries, acceptDeliveryJob, updateDeliveryStatus } from '../../services/firestoreService';
import { subscribeToDeliveryPartnerPayments, createDeliveryPayment, calculateDeliveryFee } from '../../services/financialService';
import {
  LayoutDashboard, Package, Truck, CheckCircle, History, User, MapPin,
  AlertCircle, IndianRupee, CreditCard, BarChart3, Navigation
} from 'lucide-react';

const DELIVERY_STATUSES = ['ASSIGNED','ACCEPTED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED'];

export default function DeliveryDashboard() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [available, setAvailable] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [distanceInputs, setDistanceInputs] = useState({});

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToAvailableDeliveries((data) => { setAvailable(data); setLoading(false); });
    const unsub2 = subscribeToPartnerDeliveries(user.uid, setMyDeliveries);
    const unsub3 = subscribeToDeliveryPartnerPayments(user.uid, setPayments);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user]);

  const handleAccept = async (jobId) => {
    setActionLoading(jobId);
    try {
      await acceptDeliveryJob(jobId, user.uid);
      setSuccess('Delivery accepted!');
      setTab('active');
    } catch (e) { setError(e.message); }
    finally { setActionLoading(''); }
  };

  const handleStatusUpdate = async (job, nextStatus) => {
    setActionLoading(job.id);
    try {
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) { /* optional */ }
      }

      await updateDeliveryStatus(job.id, nextStatus, { currentLocation: location });

      // When marked as DELIVERED, create the delivery payment with distance
      if (nextStatus === 'DELIVERED') {
        const distKm = Number(distanceInputs[job.id]) || 0;
        const fee = calculateDeliveryFee(distKm);
        await createDeliveryPayment({
          deliveryJobId: job.id,
          deliveryId: job.deliveryId,
          orderId: job.orderId,
          deliveryPartnerId: user.uid,
          consumerId: job.consumerId || null,
          ...fee
        });
        setSuccess(`Delivered! Earned ₹${fee.deliveryPartnerEarning} (${distKm} km)`);
      } else {
        setSuccess(`Status updated to ${nextStatus}`);
      }
    } catch (e) { setError(e.message); }
    finally { setActionLoading(''); }
  };

  const activeDeliveries = myDeliveries.filter(d => d.status !== 'DELIVERED');
  const completed = myDeliveries.filter(d => d.status === 'DELIVERED');
  const totalEarnings = payments.reduce((s, p) => s + (p.deliveryPartnerEarning || 0), 0);
  const paidPayout = totalEarnings;
  const pendingPayout = 0;

  const getNextAction = (d) => {
    const actions = {
      'ACCEPTED': { label: 'Pick Up Package', status: 'PICKED_UP' },
      'PICKED_UP': { label: 'Start Delivery', status: 'OUT_FOR_DELIVERY' },
      'OUT_FOR_DELIVERY': { label: 'Mark Delivered', status: 'DELIVERED' },
    };
    return actions[d.status] || null;
  };

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Delivery Partner</p>
      {[
        { key: 'overview', icon: <LayoutDashboard size={18} />, label: t('dashboard.overview') },
        { key: 'new', icon: <Package size={18} />, label: t('dashboard.newDeliveries') },
        { key: 'active', icon: <Truck size={18} />, label: t('dashboard.activeDelivery') },
        { key: 'completed', icon: <History size={18} />, label: t('dashboard.completedDeliveries') },
        { key: 'earnings', icon: <IndianRupee size={18} />, label: 'Earnings' },
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
        <h1 className="dashboard-title">{userData?.fullName || 'Delivery Partner'}</h1>
        <p className="dashboard-subtitle">{t('roles.deliveryPartner')}</p>
      </div>

      {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}

      {/* ============ OVERVIEW ============ */}
      {tab === 'overview' && (
        <>
          {/* Driver Rating & Daily Quota Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#ffffff', marginBottom: '1.5rem', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge" style={{ background: '#38BDF8', color: '#0F172A', fontWeight: 700, marginBottom: '0.5rem', display: 'inline-block' }}>⭐ 4.9 / 5.0 Top Delivery Courier</span>
                <h2 style={{ margin: '0.25rem 0', color: '#ffffff', fontSize: '1.35rem', fontWeight: 800 }}>Daily Target: 8 / 10 Deliveries Completed</h2>
                <p style={{ margin: 0, opacity: 0.85, fontSize: '0.88rem' }}>99.2% On-Time Delivery Record • Zero Customer Complaints</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>TODAY'S BONUS GOAL</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ADE80' }}>+₹150 Target Bonus</div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.9, marginBottom: 4 }}>
                <span>Daily Target Progress</span>
                <span>80% Completed</span>
              </div>
              <div style={{ width: '100%', height: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: '80%', height: '100%', background: 'linear-gradient(90deg, #38BDF8, #4ADE80)', borderRadius: 5 }} />
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon green"><Package size={24} /></div><div><div className="stat-value">{available.length}</div><div className="stat-label">Available</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><Truck size={24} /></div><div><div className="stat-value">{activeDeliveries.length}</div><div className="stat-label">Active</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><CheckCircle size={24} /></div><div><div className="stat-value">{completed.length}</div><div className="stat-label">Completed</div></div></div>
            <div className="stat-card"><div className="stat-icon rose"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div></div>
          </div>

          {/* Quick earnings summary */}
          <div className="card" style={{ marginTop: 'var(--space-4)', background: 'linear-gradient(135deg, #DBEAFE 0%, #E0E7FF 100%)', border: '1px solid #93C5FD' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#1E40AF' }}>₹{totalEarnings}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: '#3B82F6' }}>Total Earned</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#F59E0B' }}>₹{pendingPayout}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: '#D97706' }}>Pending Payout</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: '#059669' }}>₹{paidPayout}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: '#10B981' }}>Paid Out</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============ NEW DELIVERIES ============ */}
      {tab === 'new' && (
        loading ? <div className="loading-spinner"><div className="spinner" /></div> :
        available.length === 0 ? <div className="empty-state"><Package size={48} /><p className="empty-state-title">No available deliveries</p></div> :
        available.map(job => (
          <div className="card" key={job.id} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontWeight: 600 }}>{job.deliveryId}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  Order: {job.orderId} • {job.items?.length || '?'} items
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  <MapPin size={14} style={{ display: 'inline' }} /> {job.shippingAddress?.slice(0, 60)}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleAccept(job.id)} disabled={actionLoading === job.id}>
                {actionLoading === job.id ? '...' : t('common.accept')}
              </button>
            </div>
          </div>
        ))
      )}

      {/* ============ ACTIVE DELIVERIES ============ */}
      {tab === 'active' && (
        activeDeliveries.length === 0 ? <div className="empty-state"><Truck size={48} /><p className="empty-state-title">No active deliveries</p></div> :
        activeDeliveries.map(d => {
          const action = getNextAction(d);
          const showDistance = d.status === 'OUT_FOR_DELIVERY'; // ask for distance before marking delivered
          return (
            <div className="card" key={d.id} style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontWeight: 600 }}>{d.deliveryId}</h3>
                <span className="badge badge-warning">{d.status}</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>
                <MapPin size={14} style={{ display: 'inline' }} /> {d.shippingAddress}
              </p>
              <StatusTracker currentStatus={d.status} steps={DELIVERY_STATUSES} />

              {/* Distance input before completing delivery */}
              {showDistance && (
                <div style={{ marginTop: 'var(--space-4)', padding: '12px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FCD34D' }}>
                  <label style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: '#92400E', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Navigation size={14} /> Enter delivery distance (km)
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Distance in km"
                      value={distanceInputs[d.id] || ''}
                      onChange={(e) => setDistanceInputs(prev => ({ ...prev, [d.id]: e.target.value }))}
                      min="0"
                      step="0.5"
                      style={{ maxWidth: 150 }}
                    />
                    <span style={{ fontSize: 'var(--text-sm)', color: '#92400E' }}>km</span>
                    {distanceInputs[d.id] > 0 && (() => {
                      const fee = calculateDeliveryFee(Number(distanceInputs[d.id]) || 0);
                      return (
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#059669' }}>
                          You earn: ₹{fee.deliveryPartnerEarning}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}

              {action && (
                <button className="btn btn-primary btn-sm mt-4" onClick={() => handleStatusUpdate(d, action.status)} disabled={actionLoading === d.id}>
                  {actionLoading === d.id ? '...' : action.label}
                </button>
              )}
            </div>
          );
        })
      )}

      {/* ============ COMPLETED ============ */}
      {tab === 'completed' && (
        completed.length === 0 ? <div className="empty-state"><History size={48} /><p className="empty-state-title">No completed deliveries</p></div> :
        <div className="card"><table className="data-table">
          <thead><tr><th>Delivery ID</th><th>Order</th><th>Distance</th><th>Earned</th><th>Status</th></tr></thead>
          <tbody>{completed.map(d => {
            const payment = payments.find(p => p.deliveryJobId === d.id);
            return (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.deliveryId}</td>
                <td>{d.orderId}</td>
                <td>{payment?.distanceKm || '—'} km</td>
                <td style={{ fontWeight: 600, color: '#059669' }}>₹{payment?.deliveryPartnerEarning || '—'}</td>
                <td><span className="badge badge-success">Delivered</span></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      )}

      {/* ============ EARNINGS ============ */}
      {tab === 'earnings' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stat-card"><div className="stat-icon green"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><CreditCard size={24} /></div><div><div className="stat-value">₹{pendingPayout}</div><div className="stat-label">Pending Payout</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><CheckCircle size={24} /></div><div><div className="stat-value">₹{paidPayout}</div><div className="stat-label">Paid Out</div></div></div>
            <div className="stat-card"><div className="stat-icon rose"><Package size={24} /></div><div><div className="stat-value">{payments.length}</div><div className="stat-label">Total Deliveries</div></div></div>
          </div>

          {payments.length > 0 && (
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>Earnings History</h3>
              <table className="data-table">
                <thead><tr><th>Payment ID</th><th>Delivery</th><th>Distance</th><th>Fee</th><th>Your Earning</th><th>Payout</th></tr></thead>
                <tbody>{payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{p.paymentId}</td>
                    <td>{p.deliveryId}</td>
                    <td>{p.distanceKm} km</td>
                    <td>₹{p.totalDeliveryFee}</td>
                    <td style={{ fontWeight: 600, color: '#059669' }}>₹{p.deliveryPartnerEarning}</td>
                    <td><span className={`badge ${p.deliveryPayoutStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.deliveryPayoutStatus}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ PAYMENTS ============ */}
      {tab === 'payments' && (
        payments.length === 0 ? <div className="empty-state"><CreditCard size={48} /><p className="empty-state-title">No payment records yet</p><p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>Complete deliveries to see your payment history</p></div> :
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>Payment Details</h3>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Order</th><th>Base</th><th>Distance</th><th>Dist. Fee</th><th>Total Fee</th><th>Commission</th><th>Your Earning</th><th>Status</th></tr></thead>
            <tbody>{payments.map(p => (
              <tr key={p.id}>
                <td style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{p.paymentId}</td>
                <td>{p.orderId}</td>
                <td>₹{p.baseFee}</td>
                <td>{p.distanceKm} km</td>
                <td>₹{p.distanceCharge}</td>
                <td>₹{p.totalDeliveryFee}</td>
                <td style={{ color: '#DC2626' }}>₹{p.commission}</td>
                <td style={{ fontWeight: 700, color: '#059669' }}>₹{p.deliveryPartnerEarning}</td>
                <td><span className={`badge ${p.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.paymentStatus}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* ============ ANALYTICS ============ */}
      {tab === 'charts' && (
        <InteractiveAnalytics 
          role="delivery_partner" 
          deliveries={myDeliveries} 
          payments={payments} 
          title="Product Delivery & Earnings Analytics" 
        />
      )}

      {/* ============ PROFILE ============ */}
      {tab === 'profile' && userData && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', fontSize: 'var(--text-3xl)', color: '#4338CA' }}>{userData.fullName?.charAt(0)}</div>
            <h3>{userData.fullName}</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>{t('roles.deliveryPartner')}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Email:</span> {userData.email}</div>
            <div><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Phone:</span> {userData.phone}</div>
            <div><span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Location:</span> {userData.location}</div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
