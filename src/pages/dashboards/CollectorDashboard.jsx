import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatusTracker from '../../components/StatusTracker';
import { subscribeToAvailableRequests, subscribeToPartnerPickups, acceptWasteRequest, updatePickupStatus } from '../../services/firestoreService';
import { LayoutDashboard, ClipboardList, Truck, CheckCircle, History, User, MapPin, Scale, AlertCircle, Navigation } from 'lucide-react';

const PICKUP_STATUSES = ['REQUESTED','ACCEPTED','ON_THE_WAY','ARRIVED','COLLECTED','IN_TRANSIT','DELIVERED'];

export default function CollectorDashboard() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [available, setAvailable] = useState([]);
  const [myPickups, setMyPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [verifyWeight, setVerifyWeight] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToAvailableRequests((data) => { setAvailable(data); setLoading(false); });
    const unsub2 = subscribeToPartnerPickups(user.uid, (data) => { setMyPickups(data); });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const handleAccept = async (requestId) => {
    setActionLoading(requestId);
    try {
      await acceptWasteRequest(requestId, user.uid);
      setSuccess('Pickup accepted!');
      setTab('accepted');
    } catch (err) { setError(err.message); }
    finally { setActionLoading(''); }
  };

  const handleStatusUpdate = async (requestId, status, extraData = {}) => {
    setActionLoading(requestId);
    try {
      let location = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
          location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) { /* optional */ }
      }
      await updatePickupStatus(requestId, status, { ...extraData, location });
      setSuccess(`Status updated to ${status}`);
    } catch (err) { setError(err.message); }
    finally { setActionLoading(''); }
  };

  const handleCollect = async (requestId) => {
    const weight = verifyWeight[requestId];
    if (!weight || isNaN(weight) || Number(weight) <= 0) {
      setError('Please enter a valid verified weight');
      return;
    }
    await handleStatusUpdate(requestId, 'COLLECTED', { verifiedCollectedWeight: Number(weight) });
  };

  const activePickups = myPickups.filter(p => !['DELIVERED'].includes(p.status));
  const completed = myPickups.filter(p => p.status === 'DELIVERED');

  const getNextAction = (pickup) => {
    const actions = {
      'ACCEPTED': { label: 'Start Journey', status: 'ON_THE_WAY', icon: <Navigation size={14} /> },
      'ON_THE_WAY': { label: 'Mark Arrived', status: 'ARRIVED', icon: <MapPin size={14} /> },
      'ARRIVED': { label: 'Collect & Verify', status: 'COLLECT', icon: <Scale size={14} /> },
      'COLLECTED': { label: 'Start Transit', status: 'IN_TRANSIT', icon: <Truck size={14} /> },
      'IN_TRANSIT': { label: 'Mark Delivered', status: 'DELIVERED', icon: <CheckCircle size={14} /> },
    };
    return actions[pickup.status] || null;
  };

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Collection Partner</p>
      {[
        { key: 'overview', icon: <LayoutDashboard size={18} />, label: t('dashboard.overview') },
        { key: 'available', icon: <ClipboardList size={18} />, label: t('dashboard.availableRequests') },
        { key: 'accepted', icon: <Truck size={18} />, label: t('dashboard.acceptedPickups') },
        { key: 'completed', icon: <History size={18} />, label: t('dashboard.completedPickups') },
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
        <h1 className="dashboard-title">{userData?.fullName || t('roles.collectionPartner')}</h1>
        <p className="dashboard-subtitle">{t('roles.collectionPartner')}</p>
      </div>

      {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}

      {tab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon green"><ClipboardList size={24} /></div><div><div className="stat-value">{available.length}</div><div className="stat-label">Available Requests</div></div></div>
          <div className="stat-card"><div className="stat-icon amber"><Truck size={24} /></div><div><div className="stat-value">{activePickups.length}</div><div className="stat-label">Active Pickups</div></div></div>
          <div className="stat-card"><div className="stat-icon blue"><CheckCircle size={24} /></div><div><div className="stat-value">{completed.length}</div><div className="stat-label">Completed</div></div></div>
        </div>
      )}

      {tab === 'available' && (
        loading ? <div className="loading-spinner"><div className="spinner" /></div> :
        available.length === 0 ? <div className="empty-state"><ClipboardList size={48} /><p className="empty-state-title">No available requests</p></div> :
        available.map(req => (
          <div className="card" key={req.id} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{req.wasteId}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                  {t(`waste.types.${req.wasteType}`)} • {req.numberOfBags} bags • {req.pickupLocation}
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>Date: {req.pickupDate} {req.pickupTime && `at ${req.pickupTime}`}</p>
                {req.generatorReportedWeight && <p style={{ fontSize: 'var(--text-sm)' }}>Est. weight: {req.generatorReportedWeight} kg</p>}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => handleAccept(req.id)} disabled={actionLoading === req.id}>
                {actionLoading === req.id ? '...' : t('common.accept')}
              </button>
            </div>
          </div>
        ))
      )}

      {tab === 'accepted' && (
        activePickups.length === 0 ? <div className="empty-state"><Truck size={48} /><p className="empty-state-title">No active pickups</p></div> :
        activePickups.map(pickup => {
          const action = getNextAction(pickup);
          return (
            <div className="card" key={pickup.id} style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontWeight: 600 }}>{pickup.wasteId}</h3>
                <span className="badge badge-warning">{pickup.status}</span>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>
                {t(`waste.types.${pickup.wasteType}`)} • {pickup.pickupLocation}
              </p>
              <StatusTracker currentStatus={pickup.status} steps={PICKUP_STATUSES} />
              
              {pickup.status === 'ARRIVED' && (
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)' }}>
                  <label className="form-label">{t('weight.enterVerifiedWeight')}</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <input type="number" className="form-input" placeholder="Enter weight in kg" min="0.1" step="0.1"
                      value={verifyWeight[pickup.id] || ''} onChange={(e) => setVerifyWeight(prev => ({ ...prev, [pickup.id]: e.target.value }))} />
                    <button className="btn btn-primary" onClick={() => handleCollect(pickup.id)} disabled={actionLoading === pickup.id}>
                      {actionLoading === pickup.id ? '...' : 'Verify & Collect'}
                    </button>
                  </div>
                </div>
              )}

              {action && pickup.status !== 'ARRIVED' && (
                <button className="btn btn-primary btn-sm mt-4" onClick={() => handleStatusUpdate(pickup.id, action.status)} disabled={actionLoading === pickup.id}>
                  {action.icon} {actionLoading === pickup.id ? '...' : action.label}
                </button>
              )}
            </div>
          );
        })
      )}

      {tab === 'completed' && (
        completed.length === 0 ? <div className="empty-state"><History size={48} /><p className="empty-state-title">No completed pickups</p></div> :
        <div className="card"><table className="data-table">
          <thead><tr><th>ID</th><th>Type</th><th>Verified Weight</th><th>Status</th></tr></thead>
          <tbody>{completed.map(r => (
            <tr key={r.id}><td style={{ fontWeight: 600 }}>{r.wasteId}</td><td>{r.wasteType}</td>
            <td>{r.verifiedCollectedWeight ? `${r.verifiedCollectedWeight} kg` : '-'}</td><td><span className="badge badge-success">Delivered</span></td></tr>
          ))}</tbody>
        </table></div>
      )}

      {tab === 'profile' && userData && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', fontSize: 'var(--text-3xl)', color: '#B45309' }}>{userData.fullName?.charAt(0)}</div>
            <h3>{userData.fullName}</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>{t('roles.collectionPartner')}</p>
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
