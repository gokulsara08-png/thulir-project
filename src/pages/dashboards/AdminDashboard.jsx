import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from '../../components/DashboardLayout';
import { LineChart, BarChart, DoughnutChart, groupByMonth, groupSpendingByMonth, countByField } from '../../components/Charts';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
import GPSTracker from '../../components/GPSTracker';
import ProductJourney from '../../components/ProductJourney';
import { getStats, getAllUsers, getAllWasteRequests, getAllOrders, getAllProducts, getAllDeliveryJobs, updateProduct } from '../../services/firestoreService';
import { getCurrentRates, updateRateCard, DEFAULT_RATES } from '../../services/pricingService';
import { getAllWastePayments, getFinancialSummary, markPaymentPaid, markPayoutPaid } from '../../services/financialService';
import { 
  LayoutDashboard, Users, Package, Truck, ShoppingBag, Factory, Leaf, BarChart3, 
  CheckCircle, AlertCircle, IndianRupee, CreditCard, Settings, Eye, EyeOff,
  Route, FileText, Edit, Image, Save, X, Plus
} from 'lucide-react';
import { getProductImage, PRESET_PRODUCT_IMAGES } from '../../utils/productImages';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [wasteRequests, setWasteRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [financials, setFinancials] = useState({});
  const [rates, setRates] = useState(null);
  const [rateForm, setRateForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u, w, o, p, d, pay, fin, r] = await Promise.all([
        getStats(), getAllUsers(), getAllWasteRequests(), getAllOrders(), getAllProducts(), getAllDeliveryJobs(),
        getAllWastePayments(), getFinancialSummary(), getCurrentRates()
      ]);
      setStats(s); setUsers(u); setWasteRequests(w); setOrders(o); setProducts(p); setDeliveries(d);
      setPayments(pay); setFinancials(fin); setRates(r); setRateForm(JSON.parse(JSON.stringify(r)));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const act = async (id, fn) => { setActionLoading(id); setError(''); try { await fn(); setSuccess('Done!'); setTimeout(() => setSuccess(''), 3000); loadData(); } catch(e) { setError(e.message); } finally { setActionLoading(''); } };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    act('rates', () => updateRateCard(rateForm));
  };

  const handleTogglePublish = async (product) => {
    act(product.id, () => updateProduct(product.id, { published: !product.published }));
  };

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Admin</p>
      {[
        { key: 'overview', icon: <LayoutDashboard size={18} />, label: t('dashboard.overview') },
        { key: 'users', icon: <Users size={18} />, label: t('dashboard.users') },
        { key: 'waste', icon: <Leaf size={18} />, label: t('dashboard.wasteRequests') },
        { key: 'products', icon: <Package size={18} />, label: t('dashboard.products') },
        { key: 'orders', icon: <ShoppingBag size={18} />, label: t('dashboard.orders') },
        { key: 'deliveries', icon: <Truck size={18} />, label: t('dashboard.deliveries') },
        { key: 'finance', icon: <IndianRupee size={18} />, label: 'Finance' },
        { key: 'pricing', icon: <Settings size={18} />, label: 'Rate Card' },
        { key: 'payouts', icon: <CreditCard size={18} />, label: 'Payouts' },
        { key: 'journey', icon: <Route size={18} />, label: 'Product Journey' },
        { key: 'charts', icon: <BarChart3 size={18} />, label: 'Analytics' },
      ].map(item => (
        <div key={item.key} className={`sidebar-link ${tab === item.key ? 'active' : ''}`} onClick={() => { setTab(item.key); setSuccess(''); setError(''); }}>{item.icon} {item.label}</div>
      ))}
    </div>
  );

  if (loading) return <DashboardLayout sidebar={sidebar}><div className="loading-spinner"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout sidebar={sidebar}>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <p className="dashboard-subtitle">Platform Management</p>
      </div>
      {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}

      {/* Overview */}
      {tab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><Users size={24} /></div><div><div className="stat-value">{users.length}</div><div className="stat-label">Users</div></div></div>
          <div className="stat-card"><div className="stat-icon green"><Leaf size={24} /></div><div><div className="stat-value">{wasteRequests.length}</div><div className="stat-label">Waste Requests</div></div></div>
          <div className="stat-card"><div className="stat-icon amber"><Package size={24} /></div><div><div className="stat-value">{products.length}</div><div className="stat-label">Products</div></div></div>
          <div className="stat-card"><div className="stat-icon rose"><ShoppingBag size={24} /></div><div><div className="stat-value">{orders.length}</div><div className="stat-label">Orders</div></div></div>
          <div className="stat-card"><div className="stat-icon blue"><IndianRupee size={24} /></div><div><div className="stat-value">₹{financials.totalWasteRevenue || 0}</div><div className="stat-label">Waste Revenue</div></div></div>
          <div className="stat-card"><div className="stat-icon green"><IndianRupee size={24} /></div><div><div className="stat-value">₹{financials.totalOrderRevenue || 0}</div><div className="stat-label">Product Revenue</div></div></div>
          <div className="stat-card"><div className="stat-icon amber"><CreditCard size={24} /></div><div><div className="stat-value">₹{financials.totalCommission || 0}</div><div className="stat-label">Commission</div></div></div>
          <div className="stat-card"><div className="stat-icon rose"><Truck size={24} /></div><div><div className="stat-value">{deliveries.length}</div><div className="stat-label">Deliveries</div></div></div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="card"><table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Phone</th></tr></thead>
          <tbody>{users.map(u => <tr key={u.id}><td style={{fontWeight:600}}>{u.fullName}</td><td>{u.email}</td><td><span className="badge badge-info">{u.role}</span></td><td>{u.location}</td><td>{u.phone}</td></tr>)}</tbody>
        </table></div>
      )}

      {/* Waste Requests */}
      {tab === 'waste' && (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Bin</th>
                <th>Qty</th>
                <th>Pickup Location</th>
                <th>Recorded GPS Coords</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {wasteRequests.map(w => (
                <tr key={w.id}>
                  <td style={{fontWeight:600}}>{w.wasteId}</td>
                  <td>{w.wasteType}</td>
                  <td>{w.binSize}</td>
                  <td>{w.quantity}</td>
                  <td style={{maxWidth:180}}>{w.pickupLocation}</td>
                  <td>
                    {w.pickupCoords ? (
                      <span className="badge badge-success" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#D8F3DC', color: '#1B4332' }}>
                        📍 {Number(w.pickupCoords.lat).toFixed(4)}°N, {Number(w.pickupCoords.lng).toFixed(4)}°E {w.pickupCoords.accuracy ? `(±${w.pickupCoords.accuracy}m)` : ''}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>City Address Only</span>
                    )}
                  </td>
                  <td>₹{w.pricing?.totalPayable || '-'}</td>
                  <td>
                    <span className={`badge ${w.status==='COMPLETED'?'badge-success':w.status==='REJECTED'?'badge-error':'badge-warning'}`}>
                      {w.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Products — Admin can view, edit pictures & publish/unpublish */}
      {tab === 'products' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Marketplace Products</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', margin: 0 }}>Manage product listings, update eco pictures, prices, and visibility.</p>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Picture</th>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                      <img src={getProductImage(p)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{p.productId}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="badge badge-info">{p.category}</span></td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>₹{p.price}</td>
                  <td>{p.availableQuantity}</td>
                  <td>
                    <span className={`badge ${p.published !== false ? 'badge-success' : 'badge-error'}`}>
                      {p.published !== false ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }} 
                        onClick={() => setEditingProduct({ ...p })}
                      >
                        <Edit size={13} /> Edit Picture & Details
                      </button>
                      <button 
                        className="btn btn-sm" 
                        style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }} 
                        onClick={() => handleTogglePublish(p)} 
                        disabled={actionLoading === p.id}
                      >
                        {p.published !== false ? <><EyeOff size={13}/> Unpublish</> : <><Eye size={13}/> Publish</>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Product & Picture Modal for Admin */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: '1.25rem', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Image size={22} style={{ color: 'var(--color-primary)' }} /> Edit Product Picture & Details
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Product ID: {editingProduct.productId}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingProduct(null)} style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              act(editingProduct.id, async () => {
                await updateProduct(editingProduct.id, {
                  name: editingProduct.name,
                  category: editingProduct.category,
                  price: Number(editingProduct.price),
                  availableQuantity: Number(editingProduct.availableQuantity),
                  description: editingProduct.description || '',
                  image: editingProduct.image || '',
                  published: editingProduct.published !== false
                });
                setEditingProduct(null);
              });
            }}>
              {/* Image Live Preview */}
              <div style={{ marginBottom: '1.25rem', textAlign: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Live Product Image Preview</p>
                <div style={{ width: 150, height: 150, margin: '0 auto', borderRadius: '0.85rem', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: '#e2e8f0' }}>
                  <img 
                    src={editingProduct.image && editingProduct.image.trim() !== '' ? editingProduct.image : getProductImage(editingProduct)} 
                    alt={editingProduct.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = getProductImage(editingProduct); }}
                  />
                </div>
              </div>

              {/* Picture URL */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Image size={16} /> Picture URL
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="Paste direct image link (e.g. https://images.unsplash.com/...)" 
                  value={editingProduct.image || ''} 
                  onChange={(e) => setEditingProduct(p => ({ ...p, image: e.target.value }))} 
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Enter a custom image link or select one of the high-res eco presets below.</span>
              </div>

              {/* Preset Eco Images */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.5rem', display: 'block' }}>
                  🌱 Quick Eco Picture Presets:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {PRESET_PRODUCT_IMAGES.map((preset, idx) => {
                    const isSelected = editingProduct.image === preset.url;
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setEditingProduct(p => ({ ...p, image: preset.url }))}
                        style={{
                          border: isSelected ? '2px solid var(--color-primary)' : '1fr solid #e2e8f0',
                          borderRadius: '0.5rem',
                          padding: '4px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          background: isSelected ? '#e6f4ea' : '#fff',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 0 0 2px rgba(45,106,79,0.3)' : 'none'
                        }}
                      >
                        <img src={preset.url} alt={preset.label} style={{ width: '100%', height: 48, objectFit: 'cover', borderRadius: '4px' }} />
                        <span style={{ fontSize: '0.65rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--color-primary-dark)' : '#475569' }}>
                          {preset.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Name & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input type="text" className="form-input" value={editingProduct.name || ''} onChange={e => setEditingProduct(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-select" value={editingProduct.category || ''} onChange={e => setEditingProduct(p => ({ ...p, category: e.target.value }))} required>
                    {['Compost', 'Fertilizer', 'Recycled Plastic', 'Recycled Paper', 'Recycled Glass', 'Recycled Metal', 'Bio Products', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price & Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input type="number" className="form-input" value={editingProduct.price || 0} onChange={e => setEditingProduct(p => ({ ...p, price: e.target.value }))} min="1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity *</label>
                  <input type="number" className="form-input" value={editingProduct.availableQuantity || 0} onChange={e => setEditingProduct(p => ({ ...p, availableQuantity: e.target.value }))} min="0" required />
                </div>
              </div>

              {/* Description */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={editingProduct.description || ''} onChange={e => setEditingProduct(p => ({ ...p, description: e.target.value }))} />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading === editingProduct.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} /> Save Product & Picture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="card"><table className="data-table">
          <thead><tr><th>Order ID</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>{orders.map(o => <tr key={o.id}><td style={{fontWeight:600}}>{o.orderId}</td><td>{o.items?.length} items</td><td>₹{o.totalAmount}</td><td><span className={`badge ${o.status==='DELIVERED'?'badge-success':'badge-warning'}`}>{o.status}</span></td></tr>)}</tbody>
        </table></div>
      )}

      {/* Deliveries */}
      {tab === 'deliveries' && (
        <div className="card"><table className="data-table">
          <thead><tr><th>Delivery ID</th><th>Order</th><th>Status</th></tr></thead>
          <tbody>{deliveries.map(d => <tr key={d.id}><td style={{fontWeight:600}}>{d.deliveryId}</td><td>{d.orderId}</td><td><span className={`badge ${d.status==='DELIVERED'?'badge-success':'badge-warning'}`}>{d.status}</span></td></tr>)}</tbody>
        </table></div>
      )}

      {/* Finance */}
      {tab === 'finance' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="stat-card"><div className="stat-icon green"><IndianRupee size={24} /></div><div><div className="stat-value">₹{financials.totalWasteRevenue || 0}</div><div className="stat-label">Waste Payments</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><IndianRupee size={24} /></div><div><div className="stat-value">₹{financials.totalOrderRevenue || 0}</div><div className="stat-label">Product Sales</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><CreditCard size={24} /></div><div><div className="stat-value">₹{financials.totalCommission || 0}</div><div className="stat-label">Platform Commission</div></div></div>
            <div className="stat-card"><div className="stat-icon rose"><Truck size={24} /></div><div><div className="stat-value">₹{financials.totalTransportPayouts || 0}</div><div className="stat-label">Transport Payouts</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><Factory size={24} /></div><div><div className="stat-value">₹{financials.totalManufacturerPayouts || 0}</div><div className="stat-label">Manufacturer Payouts</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><AlertCircle size={24} /></div><div><div className="stat-value">₹{financials.pendingTransportPayouts || 0}</div><div className="stat-label">Pending Transport</div></div></div>
          </div>
          <div className="card"><h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>Transaction History</h3>
            <table className="data-table"><thead><tr><th>Payment ID</th><th>Waste ID</th><th>Amount</th><th>Commission</th><th>Status</th></tr></thead>
              <tbody>{payments.map(p => <tr key={p.id}><td style={{fontWeight:600,fontSize:'var(--text-xs)'}}>{p.paymentId}</td><td>{p.wasteId}</td><td>₹{p.totalPayable}</td><td>₹{p.platformCommission}</td><td><span className={`badge ${p.paymentStatus==='PAID'?'badge-success':'badge-warning'}`}>{p.paymentStatus}</span></td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}

      {/* Rate Card */}
      {tab === 'pricing' && rateForm && (
        <div className="card" style={{ maxWidth: 700 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>⚙️ Waste Collection Rate Card</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>Changes apply only to future requests. Existing transactions are unaffected.</p>
          <form onSubmit={handleSaveRates}>
            {/* Waste rates table */}
            <table className="data-table" style={{ marginBottom: 'var(--space-4)' }}>
              <thead><tr><th>Waste Type</th><th>Small (₹)</th><th>Medium (₹)</th><th>Large (₹)</th></tr></thead>
              <tbody>{Object.entries(rateForm.wasteRates || {}).map(([type, sizes]) => (
                <tr key={type}>
                  <td style={{fontWeight:600, textTransform:'capitalize'}}>{type}</td>
                  {['small','medium','large'].map(s => (
                    <td key={s}><input type="number" className="form-input" style={{width:80,padding:'4px 8px',fontSize:'var(--text-sm)'}} value={sizes[s] || 0} onChange={e => setRateForm(prev => ({...prev, wasteRates: {...prev.wasteRates, [type]: {...prev.wasteRates[type], [s]: Number(e.target.value)}}}))} /></td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">Base Pickup (₹)</label><input type="number" className="form-input" value={rateForm.basePickup || 30} onChange={e => setRateForm(prev => ({...prev, basePickup: Number(e.target.value)}))} /></div>
              <div className="form-group"><label className="form-label">Per Km (₹)</label><input type="number" className="form-input" value={rateForm.distancePerKm || 8} onChange={e => setRateForm(prev => ({...prev, distancePerKm: Number(e.target.value)}))} /></div>
              <div className="form-group"><label className="form-label">Commission (%)</label><input type="number" className="form-input" value={rateForm.commissionPercent || 10} onChange={e => setRateForm(prev => ({...prev, commissionPercent: Number(e.target.value)}))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">Transport Share (%)</label><input type="number" className="form-input" value={rateForm.transportSharePercent || 40} onChange={e => setRateForm(prev => ({...prev, transportSharePercent: Number(e.target.value)}))} /></div>
              <div className="form-group"><label className="form-label">Manufacturer Share (%)</label><input type="number" className="form-input" value={rateForm.manufacturerSharePercent || 50} onChange={e => setRateForm(prev => ({...prev, manufacturerSharePercent: Number(e.target.value)}))} /></div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={actionLoading === 'rates'}>Save Rate Card</button>
          </form>
        </div>
      )}

      {/* Payouts */}
      {tab === 'payouts' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="stat-card"><div className="stat-icon amber"><Truck size={24} /></div><div><div className="stat-value">₹{financials.pendingTransportPayouts || 0}</div><div className="stat-label">Pending Transport</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><Factory size={24} /></div><div><div className="stat-value">₹{financials.pendingManufacturerPayouts || 0}</div><div className="stat-label">Pending Manufacturer</div></div></div>
          </div>
          <div className="card"><h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>Manage Payouts</h3>
            <table className="data-table"><thead><tr><th>Payment</th><th>Waste</th><th>Transport</th><th>T.Status</th><th>Manufacturer</th><th>M.Status</th><th>Actions</th></tr></thead>
              <tbody>{payments.map(p => <tr key={p.id}>
                <td style={{fontWeight:600,fontSize:'var(--text-xs)'}}>{p.paymentId}</td><td>{p.wasteId}</td>
                <td>₹{p.transportPayout}</td><td><span className={`badge ${p.transportPayoutStatus==='PAID'?'badge-success':'badge-warning'}`}>{p.transportPayoutStatus}</span></td>
                <td>₹{p.manufacturerPayout}</td><td><span className={`badge ${p.manufacturerPayoutStatus==='PAID'?'badge-success':'badge-warning'}`}>{p.manufacturerPayoutStatus}</span></td>
                <td style={{display:'flex',gap:4}}>
                  {p.transportPayoutStatus==='PENDING' && <button className="btn btn-sm" style={{fontSize:'0.65rem'}} onClick={() => act(p.id+'t', () => markPayoutPaid(p.id, 'transport'))}>Pay T</button>}
                  {p.manufacturerPayoutStatus==='PENDING' && <button className="btn btn-sm" style={{fontSize:'0.65rem'}} onClick={() => act(p.id+'m', () => markPayoutPaid(p.id, 'manufacturer'))}>Pay M</button>}
                  {p.paymentStatus==='PENDING' && <button className="btn btn-sm" style={{fontSize:'0.65rem',background:'#D8F3DC',color:'#1B4332',border:'none'}} onClick={() => act(p.id+'p', () => markPaymentPaid(p.id))}>Confirm</button>}
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        </>
      )}

      {/* Product Journey & Live GPS Radar */}
      {tab === 'journey' && (
        <>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <GPSTracker 
              pickupLocation="Region Fleet Hub Alpha"
              destinationLocation="Central Recycling Hub"
              status="IN_TRANSIT"
              driverName="Ecosystem Fleet Command Radar"
              vehicleNumber="SYSTEM-WIDE GPS"
              height={340}
            />
          </div>
          <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>Waste Request Traceability</h3>
            <table className="data-table"><thead><tr><th>Waste ID</th><th>Type</th><th>Status</th><th>Amount</th><th>View</th></tr></thead>
              <tbody>{wasteRequests.map(w => <tr key={w.id}>
                <td style={{fontWeight:600}}>{w.wasteId}</td><td>{w.wasteType}</td>
                <td><span className={`badge ${w.status==='COMPLETED'?'badge-success':w.status==='REJECTED'?'badge-error':'badge-warning'}`}>{w.status}</span></td>
                <td>₹{w.pricing?.totalPayable || '-'}</td>
                <td><button className="btn btn-sm" style={{fontSize:'0.65rem'}} onClick={() => setSelectedJourney(w)}>View Journey</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          {selectedJourney && (
            <div className="card">
              <ProductJourney journey={{ wasteRequest: selectedJourney }} />
            </div>
          )}
        </>
      )}

      {/* Charts */}
      {tab === 'charts' && (
        <InteractiveAnalytics 
          role="admin" 
          requests={wasteRequests} 
          orders={orders} 
          payments={payments} 
          deliveries={deliveries} 
          users={users}
          products={products}
          rates={rates} 
          title="Platform Ecosystem & Price Analytics" 
        />
      )}
    </DashboardLayout>
  );
}
