import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatusTracker from '../../components/StatusTracker';
import { LineChart, BarChart, DoughnutChart, groupByMonth, groupSpendingByMonth, countByField } from '../../components/Charts';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
import GPSTracker from '../../components/GPSTracker';
import { subscribeToTransportPickups, updateTransportStatus } from '../../services/firestoreService';
import { subscribeToTransportPayments } from '../../services/financialService';
import { LayoutDashboard, Truck, Package, CheckCircle, History, User, MapPin, Scale, AlertCircle, IndianRupee, CreditCard, BarChart3 } from 'lucide-react';

const TRANSPORT_STATUSES = ['TRANSPORT_ASSIGNED', 'ON_THE_WAY', 'COLLECTED', 'DELIVERED'];

export default function TransportDashboard() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [pickups, setPickups] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [weightInput, setWeightInput] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      subscribeToTransportPickups(user.uid, (data) => { setPickups(data); setLoading(false); }),
      subscribeToTransportPayments(user.uid, setPayments)
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  const assignedPickups = pickups.filter(p => p.status === 'TRANSPORT_ASSIGNED');
  const activePickups = pickups.filter(p => ['ON_THE_WAY', 'COLLECTED'].includes(p.status));
  const completedPickups = pickups.filter(p => ['DELIVERED', 'RECEIVED', 'PROCESSING', 'COMPLETED'].includes(p.status));
  const totalEarnings = payments.reduce((s, p) => s + (p.transportPayout || 0), 0);
  const paidPayout = totalEarnings;
  const pendingPayout = 0;

  const act = async (id, fn) => { setActionLoading(id); setError(''); try { await fn(); setSuccess('Done!'); setTimeout(() => setSuccess(''), 3000); } catch(e) { setError(e.message); } finally { setActionLoading(''); } };

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Transport Partner</p>
      {[
        { key: 'overview', icon: <LayoutDashboard size={18} />, label: t('dashboard.overview') },
        { key: 'assigned', icon: <Package size={18} />, label: 'Assigned Pickups' },
        { key: 'active', icon: <Truck size={18} />, label: t('dashboard.activePickup') },
        { key: 'completed', icon: <History size={18} />, label: 'Completed' },
        { key: 'earnings', icon: <IndianRupee size={18} />, label: 'Earnings' },
        { key: 'charts', icon: <BarChart3 size={18} />, label: 'Analytics' },
        { key: 'profile', icon: <User size={18} />, label: t('dashboard.profile') },
      ].map(item => (
        <div key={item.key} className={`sidebar-link ${tab === item.key ? 'active' : ''}`} onClick={() => { setTab(item.key); setSuccess(''); setError(''); }}>{item.icon} {item.label}</div>
      ))}
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="dashboard-header">
        <h1 className="dashboard-title">{userData?.fullName || 'Transport Partner'}</h1>
        <p className="dashboard-subtitle">Transport Partner Dashboard</p>
      </div>
      {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}

      {tab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon amber"><Package size={24} /></div><div><div className="stat-value">{assignedPickups.length}</div><div className="stat-label">Assigned</div></div></div>
          <div className="stat-card"><div className="stat-icon blue"><Truck size={24} /></div><div><div className="stat-value">{activePickups.length}</div><div className="stat-label">In Progress</div></div></div>
          <div className="stat-card"><div className="stat-icon green"><CheckCircle size={24} /></div><div><div className="stat-value">{completedPickups.length}</div><div className="stat-label">Delivered</div></div></div>
          <div className="stat-card"><div className="stat-icon rose"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div></div>
        </div>
      )}

      {tab === 'assigned' && (
        loading ? <div className="loading-spinner"><div className="spinner" /></div> :
        assignedPickups.length === 0 ? <div className="empty-state"><Package size={48} /><p className="empty-state-title">No assigned pickups</p></div> :
        assignedPickups.map(p => (
          <div className="card" key={p.id} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}><h3 style={{ fontWeight: 600 }}>{p.wasteId}</h3><span className="badge badge-warning">ASSIGNED</span></div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Type:</strong> {p.wasteType} | <strong>Bin:</strong> {p.binSize || '-'} | <strong>Qty:</strong> {p.quantity || p.numberOfBags}</div>
              <div><MapPin size={14} style={{ display: 'inline' }} /> {p.pickupLocation}</div>
              <div><strong>Date:</strong> {p.pickupDate} | <strong>Time:</strong> {p.pickupTime}</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => act(p.id, () => updateTransportStatus(p.id, 'ON_THE_WAY'))} disabled={actionLoading === p.id}>🚛 Start Journey</button>
          </div>
        ))
      )}

      {tab === 'active' && (
        activePickups.length === 0 ? <div className="empty-state"><Truck size={48} /><p className="empty-state-title">No active pickups</p></div> :
        activePickups.map(p => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <GPSTracker 
              pickupLocation={p.pickupLocation || 'Auto-Detected Generator Location'}
              destinationLocation="EcoRecycle Manufacturing Hub"
              status={p.status}
              driverName={userData?.fullName || 'Transport Driver'}
              height={320}
            />
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}><h3 style={{ fontWeight: 600 }}>{p.wasteId}</h3><span className="badge badge-warning">{p.status}</span></div>
              <StatusTracker currentStatus={p.status} steps={TRANSPORT_STATUSES} />
              {p.status === 'ON_THE_WAY' && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label className="form-label">Verified Weight (kg) — optional</label>
                  <input type="number" className="form-input" placeholder="Weight after collection" value={weightInput} onChange={e => setWeightInput(e.target.value)} style={{ marginBottom: 'var(--space-3)' }} />
                  <button className="btn btn-primary btn-sm" onClick={() => { act(p.id, () => updateTransportStatus(p.id, 'COLLECTED', weightInput ? { verifiedCollectedWeight: weightInput } : {})); setWeightInput(''); }} disabled={actionLoading === p.id}>✓ Mark Collected</button>
                </div>
              )}
              {p.status === 'COLLECTED' && <button className="btn btn-primary btn-sm mt-4" onClick={() => act(p.id, () => updateTransportStatus(p.id, 'DELIVERED'))} disabled={actionLoading === p.id}>📦 Mark Delivered</button>}
            </div>
          </div>
        ))
      )}

      {tab === 'completed' && (
        completedPickups.length === 0 ? <div className="empty-state"><History size={48} /><p className="empty-state-title">No completed pickups</p></div> :
        <div className="card"><table className="data-table">
          <thead><tr><th>Waste ID</th><th>Type</th><th>Weight</th><th>Status</th></tr></thead>
          <tbody>{completedPickups.map(p => <tr key={p.id}><td style={{fontWeight:600}}>{p.wasteId}</td><td>{p.wasteType}</td><td>{p.verifiedCollectedWeight ? `${p.verifiedCollectedWeight} kg ✓` : '-'}</td><td><span className="badge badge-success">{p.status}</span></td></tr>)}</tbody>
        </table></div>
      )}

      {tab === 'earnings' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="stat-card"><div className="stat-icon green"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><CreditCard size={24} /></div><div><div className="stat-value">₹{pendingPayout}</div><div className="stat-label">Pending</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><CheckCircle size={24} /></div><div><div className="stat-value">₹{paidPayout}</div><div className="stat-label">Paid Out</div></div></div>
          </div>
          {payments.length > 0 && <div className="card"><table className="data-table"><thead><tr><th>Payment</th><th>Waste</th><th>Payout</th><th>Status</th></tr></thead>
            <tbody>{payments.map(p => <tr key={p.id}><td style={{fontWeight:600,fontSize:'var(--text-xs)'}}>{p.paymentId}</td><td>{p.wasteId}</td><td>₹{p.transportPayout}</td><td><span className={`badge ${p.transportPayoutStatus==='PAID'?'badge-success':'badge-warning'}`}>{p.transportPayoutStatus}</span></td></tr>)}</tbody>
          </table></div>}
        </>
      )}

      {tab === 'charts' && (
        <InteractiveAnalytics 
          role="transport_partner" 
          requests={pickups} 
          payments={payments} 
          title="Transport Logistics & Earnings Analytics" 
        />
      )}

      {tab === 'profile' && userData && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', fontSize: 'var(--text-3xl)', color: '#1D4ED8' }}>{userData.fullName?.charAt(0)}</div>
            <h3>{userData.fullName}</h3><p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>Transport Partner</p>
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
