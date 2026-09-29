import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCart } from '../../contexts/CartContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatusTracker from '../../components/StatusTracker';
import { LineChart, DoughnutChart, BarChart, groupByMonth, groupSpendingByMonth, countByField } from '../../components/Charts';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
import GPSTracker from '../../components/GPSTracker';
import ProductJourney from '../../components/ProductJourney';
import { subscribeToProducts, subscribeToConsumerOrders, getProductJourney } from '../../services/firestoreService';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Heart, Package, Truck, Search, User, CheckCircle, Leaf, Check, Scale, Factory, BarChart3, IndianRupee } from 'lucide-react';
import { getProductImage } from '../../utils/productImages';

const ORDER_STATUSES = ['PLACED','CONFIRMED','PROCESSING','READY_FOR_DELIVERY','DELIVERY_ASSIGNED','OUT_FOR_DELIVERY','DELIVERED'];

export default function ConsumerDashboard() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [tab, setTab] = useState('home');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsub1 = subscribeToProducts((data) => { setProducts(data); setLoading(false); });
    const unsub2 = subscribeToConsumerOrders(user.uid, setOrders);
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const loadJourney = async (productId) => {
    setJourneyLoading(true);
    try {
      const j = await getProductJourney(productId);
      setJourney(j);
      setTab('journey');
    } catch (e) { console.error(e); }
    finally { setJourneyLoading(false); }
  };

  const handleAdd = (product) => {
    addToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
  const activeOrders = orders.filter(o => o.status !== 'DELIVERED');
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Consumer</p>
      {[
        { key: 'home', icon: <LayoutDashboard size={18} />, label: t('dashboard.home') },
        { key: 'marketplace', icon: <ShoppingBag size={18} />, label: t('marketplace.title') },
        { key: 'orders', icon: <Package size={18} />, label: t('dashboard.myOrders') },
        { key: 'tracking', icon: <Truck size={18} />, label: t('dashboard.trackDelivery') },
        { key: 'charts', icon: <BarChart3 size={18} />, label: 'Analytics' },
        { key: 'cart', icon: <ShoppingCart size={18} />, label: t('dashboard.cart') },
        { key: 'profile', icon: <User size={18} />, label: t('dashboard.profile') },
      ].map(item => (
        <div key={item.key} className={`sidebar-link ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
          {item.icon} {item.label}
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="dashboard-header">
        <h1 className="dashboard-title">{tab === 'home' ? `Welcome, ${userData?.fullName || 'Consumer'}` : tab === 'marketplace' ? t('marketplace.title') : tab === 'orders' ? t('dashboard.myOrders') : tab === 'tracking' ? t('dashboard.trackDelivery') : tab === 'journey' ? t('dashboard.productJourney') : tab === 'cart' ? t('dashboard.cart') : t('dashboard.profile')}</h1>
        <p className="dashboard-subtitle">{t('roles.consumer')}</p>
      </div>

      {tab === 'home' && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon green"><ShoppingBag size={24} /></div><div><div className="stat-value">{orders.length}</div><div className="stat-label">Total Orders</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><Truck size={24} /></div><div><div className="stat-value">{activeOrders.length}</div><div className="stat-label">Active Orders</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><CheckCircle size={24} /></div><div><div className="stat-value">{completedOrders.length}</div><div className="stat-label">Delivered</div></div></div>
            <div className="stat-card"><div className="stat-icon rose"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalSpent}</div><div className="stat-label">Total Spent</div></div></div>
          </div>
          {activeOrders.length > 0 && (
            <div className="card"><h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Active Orders</h3>
              {activeOrders.slice(0, 3).map(o => (
                <div key={o.id} style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-gray-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{o.orderId}</span>
                    <span className="badge badge-warning">{o.status}</span>
                  </div>
                  <StatusTracker currentStatus={o.status} steps={ORDER_STATUSES} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'marketplace' && (
        <>
          <div className="search-input-wrap" style={{ marginBottom: 'var(--space-6)' }}>
            <Search size={18} />
            <input type="text" className="form-input" style={{ paddingLeft: 44 }} placeholder={t('marketplace.search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div className="loading-spinner"><div className="spinner" /></div> :
          filtered.length === 0 ? <div className="empty-state"><Package size={48} /><p className="empty-state-title">{t('marketplace.noProducts')}</p></div> :
          <div className="products-grid">
            {filtered.map(p => (
              <div className="product-card" key={p.id}>
                <div className="product-image">
                  <img src={getProductImage(p)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="product-info">
                  <span className="product-category">{p.category}</span>
                  <h3 className="product-name">{p.name}</h3>
                  <div className="product-meta">
                    <span className="product-price">₹{p.price}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>{p.availableQuantity} available</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleAdd(p)}>
                      {addedId === p.id ? '✓ Added!' : t('marketplace.addToCart')}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => loadJourney(p.id)} disabled={journeyLoading}>
                      <Leaf size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>}
        </>
      )}

      {tab === 'orders' && (
        orders.length === 0 ? <div className="empty-state"><Package size={48} /><p className="empty-state-title">No orders yet</p></div> :
        <div className="card"><table className="data-table">
          <thead><tr><th>Order ID</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>{orders.map(o => (
            <tr key={o.id}>
              <td style={{ fontWeight: 600 }}>{o.orderId}</td>
              <td>{o.items?.length} items</td>
              <td>₹{o.totalAmount}</td>
              <td><span className={`badge ${o.status === 'DELIVERED' ? 'badge-success' : 'badge-warning'}`}>{o.status}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      {tab === 'tracking' && (
        activeOrders.length === 0 ? <div className="empty-state"><Truck size={48} /><p className="empty-state-title">No active deliveries</p></div> :
        activeOrders.map(o => (
          <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <GPSTracker 
              pickupLocation="Manufacturer Warehouse #2"
              destinationLocation={userData?.location || 'Customer Delivery Address'}
              status={o.status}
              driverName="FastTrack Logistics Partner"
              height={320}
            />
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontWeight: 600 }}>{o.orderId}</h3>
                <span className="badge badge-warning">{o.status}</span>
              </div>
              <StatusTracker currentStatus={o.status} steps={ORDER_STATUSES} />
            </div>
          </div>
        ))
      )}

      {tab === 'journey' && journey && (
        <div className="card">
          <ProductJourney journey={journey} />
        </div>
      )}

      {tab === 'charts' && (
        <InteractiveAnalytics 
          role="consumer" 
          orders={orders} 
          payments={orders} 
          title="Eco Marketplace Shopping & Price Analytics" 
        />
      )}

      {tab === 'cart' && <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}><Link to="/marketplace/cart" className="btn btn-primary btn-lg">Go to Cart</Link></div>}

      {tab === 'profile' && userData && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', fontSize: 'var(--text-3xl)', color: '#BE185D' }}>{userData.fullName?.charAt(0)}</div>
            <h3>{userData.fullName}</h3>
            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>{t('roles.consumer')}</p>
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
