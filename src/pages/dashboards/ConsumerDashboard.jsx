import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCart } from '../../contexts/CartContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatusTracker from '../../components/StatusTracker';
import GPSTracker from '../../components/GPSTracker';
import ProductJourney from '../../components/ProductJourney';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
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

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState('');

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Consumer Portal</p>
      {[
        { key: 'home', icon: <LayoutDashboard size={18} />, label: t('dashboard.home') },
        { key: 'marketplace', icon: <ShoppingBag size={18} />, label: t('marketplace.title') },
        { key: 'rewards', icon: <Leaf size={18} />, label: 'Eco Rewards & Coupons' },
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
        <h1 className="dashboard-title">{tab === 'home' ? `Welcome, ${userData?.fullName || 'Consumer'}` : tab === 'marketplace' ? t('marketplace.title') : tab === 'rewards' ? '🎁 Eco Rewards & Coupon Hub' : tab === 'orders' ? t('dashboard.myOrders') : tab === 'tracking' ? t('dashboard.trackDelivery') : tab === 'journey' ? t('dashboard.productJourney') : tab === 'cart' ? t('dashboard.cart') : t('dashboard.profile')}</h1>
        <p className="dashboard-subtitle">{t('roles.consumer')}</p>
      </div>

      {tab === 'home' && (
        <>
          {/* Eco Banner Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', color: '#ffffff', marginBottom: '1.5rem', borderRadius: '1.25rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge" style={{ background: '#52B788', color: '#1B4332', fontWeight: 700, marginBottom: '0.5rem', display: 'inline-block' }}>🏅 Gold Eco Citizen Status</span>
                <h2 style={{ margin: '0.25rem 0', color: '#ffffff', fontSize: '1.4rem', fontWeight: 800 }}>Circular Economy Impact Score: 350 Green Points</h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '0.88rem' }}>By purchasing upcycled goods, you've diverted 18.5 kg waste from landfills & saved 42 kg CO2 emissions.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn" style={{ background: '#ffffff', color: '#1B4332', fontWeight: 700 }} onClick={() => setShowCertificateModal(true)}>
                  📜 Eco Certificate
                </button>
                <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => setTab('rewards')}>
                  🎁 Redeem Rewards
                </button>
              </div>
            </div>
          </div>

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
              pickupLocation="Manufacturer Processing Hub"
              destinationLocation={userData?.location || 'Auto-Detected Delivery Address'}
              status={o.status}
              driverName="Eco logistics Delivery Partner"
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

      {tab === 'rewards' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--color-primary-dark)', fontSize: '1.2rem' }}>🎁 Green Eco-Rewards & Voucher Portal</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Earn 10 Green Eco Points for every ₹100 spent on upcycled products.</p>
            </div>
            <div style={{ background: '#D8F3DC', padding: '8px 16px', borderRadius: '1rem', border: '1px solid #52B788', textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: '#1B4332', fontWeight: 600 }}>AVAILABLE BALANCE</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1B4332' }}>350 ECO PTS</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {[
              { code: 'ECOGREEN10', disc: '10% OFF Marketplace Order', cost: '100 Pts', desc: 'Valid on all compost & upcycled goods.' },
              { code: 'RECYCLE50', disc: '₹50 Instant Discount', cost: '150 Pts', desc: 'Flat ₹50 off orders above ₹300.' },
              { code: 'FREESHIP', disc: 'Free Express Eco Delivery', cost: '200 Pts', desc: 'Zero delivery fee anywhere in Tamil Nadu.' }
            ].map((coupon, idx) => (
              <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="badge badge-success" style={{ background: '#2D6A4F', color: '#ffffff' }}>{coupon.code}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706' }}>🪙 {coupon.cost}</span>
                </div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{coupon.disc}</h4>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem' }}>{coupon.desc}</p>
                <button 
                  className="btn btn-primary btn-sm w-full"
                  onClick={() => {
                    setCopiedCoupon(coupon.code);
                    setTimeout(() => setCopiedCoupon(''), 2500);
                  }}
                >
                  {copiedCoupon === coupon.code ? '✓ Coupon Claimed & Copied!' : 'Redeem Coupon'}
                </button>
              </div>
            ))}
          </div>
        </div>
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

      {/* Eco Certificate Modal */}
      {showCertificateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 600, width: '100%', background: '#ffffff', borderRadius: '1.5rem', padding: '2rem', border: '4px double #2D6A4F', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
            <h2 style={{ margin: 0, color: '#1B4332', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Green Citizen Eco Certificate</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.5rem' }}>CERTIFICATE OF CIRCULAR ECONOMY CONTRIBUTION</p>
            
            <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}>
              This certifies that <strong>{userData?.fullName || 'Valued Eco Citizen'}</strong> has actively supported Tamil Nadu's circular economy by purchasing upcycled products and diverting municipal waste.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', margin: '1.5rem 0', background: '#F0FDF4', padding: '1rem', borderRadius: '1rem', border: '1px solid #BBF7D0' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>18.5 kg</div>
                <div style={{ fontSize: '0.7rem', color: '#15803D' }}>Waste Diverted</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>42.0 kg</div>
                <div style={{ fontSize: '0.7rem', color: '#15803D' }}>CO2e Saved</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>250 L</div>
                <div style={{ fontSize: '0.7rem', color: '#15803D' }}>Water Conserved</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowCertificateModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => alert('Certificate downloaded to your device as PDF!')}>📥 Download Certificate PDF</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
