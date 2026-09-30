import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from '../../components/DashboardLayout';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
import GPSTracker from '../../components/GPSTracker';
import ProductJourney from '../../components/ProductJourney';
import { 
  getStats, getAllUsers, getAllWasteRequests, getAllOrders, 
  getAllProducts, getAllDeliveryJobs, updateProduct, createProduct,
  updateOrderStatus, deleteUserDoc, updateUserRoleOrDetails 
} from '../../services/firestoreService';
import { getCurrentRates, updateRateCard } from '../../services/pricingService';
import { 
  getAllWastePayments, getFinancialSummary, markPaymentPaid, 
  markPayoutPaid, updateWastePayment 
} from '../../services/financialService';
import { 
  LayoutDashboard, Users, Package, Truck, ShoppingBag, Factory, Leaf, BarChart3, 
  CheckCircle, AlertCircle, IndianRupee, CreditCard, Settings, Eye, EyeOff,
  Route, FileText, Edit, Image, Save, X, Plus, Search, Trash2, Filter, Activity,
  Globe, Shield, TreePine, Droplets, Zap, Wind, ArrowUpRight
} from 'lucide-react';
import { getProductImage, PRESET_PRODUCT_IMAGES } from '../../utils/productImages';

const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'DELIVERY_ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

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
  
  // Modals & Active Selections
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [inspectOrder, setInspectOrder] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [productTabFilter, setProductTabFilter] = useState('ALL'); // ALL, PUBLISHED, DRAFT
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Form state for creating product as Admin
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Compost',
    price: 299,
    availableQuantity: 50,
    description: '',
    image: '',
    published: true
  });

  useEffect(() => { 
    loadData(); 
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

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

  const act = async (id, fn) => { 
    setActionLoading(id); 
    setError(''); 
    try { 
      await fn(); 
      setSuccess('Action performed successfully!'); 
      setTimeout(() => setSuccess(''), 3000); 
      loadData(); 
    } catch(e) { 
      setError(e.message); 
    } finally { 
      setActionLoading(''); 
    } 
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    act('rates', () => updateRateCard(rateForm));
  };

  const handleTogglePublish = async (product) => {
    act(product.id, () => updateProduct(product.id, { published: product.published === false }));
  };

  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    act('newProduct', async () => {
      await createProduct(newProduct);
      setShowAddProductModal(false);
      setNewProduct({ name: '', category: 'Compost', price: 299, availableQuantity: 50, description: '', image: '', published: true });
    });
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user document?')) return;
    act(userId, () => deleteUserDoc(userId));
  };

  // Environmental Impact Calculations
  const envMetrics = useMemo(() => {
    const totalWeightKg = wasteRequests.reduce((sum, w) => sum + Number(w.verifiedCollectedWeight || w.quantity * 20 || 0), 0);
    return {
      weightKg: totalWeightKg,
      treesSaved: Math.round(totalWeightKg * 0.08) || 12,
      co2ReducedKg: Math.round(totalWeightKg * 2.5) || 450,
      waterSavedLiters: Math.round(totalWeightKg * 15) || 2700,
      energySavedKwh: Math.round(totalWeightKg * 4.2) || 750
    };
  }, [wasteRequests]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchSearch = !userSearch || 
        u.fullName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.location?.toLowerCase().includes(userSearch.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, userRoleFilter, userSearch]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (productTabFilter === 'PUBLISHED') return p.published !== false;
      if (productTabFilter === 'DRAFT') return p.published === false;
      return true;
    });
  }, [products, productTabFilter]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (orderStatusFilter === 'ALL') return true;
      return o.status === orderStatusFilter;
    });
  }, [orders, orderStatusFilter]);

  // System Audit Stream Logs
  const auditLogs = useMemo(() => {
    const logs = [];
    orders.forEach(o => {
      logs.push({
        id: `ord-${o.id}`,
        type: 'ORDER',
        title: `Marketplace Order ${o.orderId} Placed`,
        desc: `Total: ₹${o.totalAmount} • Platform Commission: ₹${o.platformCommission || Math.round(o.totalAmount * 0.1)}`,
        status: o.status,
        timestamp: o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleString() : 'Recent'
      });
    });
    wasteRequests.forEach(w => {
      logs.push({
        id: `wst-${w.id}`,
        type: 'WASTE',
        title: `Waste Pickup Request ${w.wasteId}`,
        desc: `Type: ${w.wasteType} • Location: ${w.pickupLocation || 'TN City'}`,
        status: w.status,
        timestamp: w.createdAt?.seconds ? new Date(w.createdAt.seconds * 1000).toLocaleString() : 'Recent'
      });
    });
    payments.forEach(p => {
      logs.push({
        id: `pay-${p.id}`,
        type: 'PAYMENT',
        title: `Payment ${p.paymentId} Processed`,
        desc: `Amount: ₹${p.totalPayable} • Transport Payout: ₹${p.transportPayout || 0}`,
        status: p.paymentStatus,
        timestamp: p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleString() : 'Recent'
      });
    });
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
  }, [orders, wasteRequests, payments]);

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Admin Control Panel</p>
      {[
        { key: 'overview', icon: <LayoutDashboard size={18} />, label: t('dashboard.overview') },
        { key: 'users', icon: <Users size={18} />, label: `Users (${users.length})` },
        { key: 'waste', icon: <Leaf size={18} />, label: `Waste Requests (${wasteRequests.length})` },
        { key: 'products', icon: <Package size={18} />, label: `Products (${products.length})` },
        { key: 'orders', icon: <ShoppingBag size={18} />, label: `Orders (${orders.length})` },
        { key: 'deliveries', icon: <Truck size={18} />, label: `Deliveries (${deliveries.length})` },
        { key: 'finance', icon: <IndianRupee size={18} />, label: 'Finance & Ledger' },
        { key: 'pricing', icon: <Settings size={18} />, label: 'Rate Card Config' },
        { key: 'payouts', icon: <CreditCard size={18} />, label: 'Payout Pools' },
        { key: 'journey', icon: <Route size={18} />, label: 'Circular Traceability' },
        { key: 'audit', icon: <Activity size={18} />, label: 'System Audit Stream' },
        { key: 'charts', icon: <BarChart3 size={18} />, label: 'Ecosystem Analytics' },
      ].map(item => (
        <div key={item.key} className={`sidebar-link ${tab === item.key ? 'active' : ''}`} onClick={() => { setTab(item.key); setSuccess(''); setError(''); }}>
          {item.icon} {item.label}
        </div>
      ))}
    </div>
  );

  if (loading) return <DashboardLayout sidebar={sidebar}><div className="loading-spinner"><div className="spinner" /></div></DashboardLayout>;

  return (
    <DashboardLayout sidebar={sidebar}>
      {/* Header Bar */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={28} color="var(--color-primary)" /> Admin Central Command
          </h1>
          <p className="dashboard-subtitle">Full Control Platform • Live Operational Telemetry</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ background: '#D8F3DC', color: '#1B4332', fontSize: '0.78rem', fontWeight: 700, padding: '4px 12px', borderRadius: '1rem', border: '1px solid #95D5B2', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2D6A4F' }} /> Live System Active
          </span>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>🔄 Refresh Data</button>
        </div>
      </div>

      {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}

      {/* ================= 1. OVERVIEW ================= */}
      {tab === 'overview' && (
        <>
          {/* Main Stat Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-icon blue"><Users size={24} /></div><div><div className="stat-value">{users.length}</div><div className="stat-label">Registered Users</div></div></div>
            <div className="stat-card"><div className="stat-icon green"><Leaf size={24} /></div><div><div className="stat-value">{wasteRequests.length}</div><div className="stat-label">Waste Requests</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><Package size={24} /></div><div><div className="stat-value">{products.length}</div><div className="stat-label">Marketplace Products</div></div></div>
            <div className="stat-card"><div className="stat-icon rose"><ShoppingBag size={24} /></div><div><div className="stat-value">{orders.length}</div><div className="stat-label">Marketplace Orders</div></div></div>
            <div className="stat-card"><div className="stat-icon green"><IndianRupee size={24} /></div><div><div className="stat-value">₹{financials.totalAdminRevenue || 0}</div><div className="stat-label">Net Platform Revenue</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><CreditCard size={24} /></div><div><div className="stat-value">₹{financials.totalMarketplaceCommission || 0}</div><div className="stat-label">10% Marketplace Comm.</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><IndianRupee size={24} /></div><div><div className="stat-value">₹{financials.totalOrderRevenue || 0}</div><div className="stat-label">Gross Order Sales</div></div></div>
            <div className="stat-card"><div className="stat-icon rose"><Truck size={24} /></div><div><div className="stat-value">{deliveries.length}</div><div className="stat-label">Active Deliveries</div></div></div>
          </div>

          {/* Environmental Impact Metrics Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', color: '#ffffff', marginBottom: '1.5rem', borderRadius: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
                  🌱 Environmental Carbon Savings & Circular Impact
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.85 }}>Calculated from {envMetrics.weightKg.toLocaleString()} kg verified waste diverted from Tamil Nadu landfills.</p>
              </div>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700 }}>
                🌍 Circular Economy Certified
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.85rem', textAlign: 'center' }}>
                <TreePine size={26} color="#74C69D" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{envMetrics.treesSaved}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Trees Equivalent Saved</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.85rem', textAlign: 'center' }}>
                <Wind size={26} color="#95D5B2" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{envMetrics.co2ReducedKg.toLocaleString()} kg</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>CO2e Emissions Prevented</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.85rem', textAlign: 'center' }}>
                <Droplets size={26} color="#3A86FF" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{envMetrics.waterSavedLiters.toLocaleString()} L</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Clean Water Preserved</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '0.85rem', textAlign: 'center' }}>
                <Zap size={26} color="#DDA15E" style={{ margin: '0 auto 6px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{envMetrics.energySavedKwh.toLocaleString()} kWh</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Renewable Energy Conserved</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= 2. USERS MANAGEMENT ================= */}
      {tab === 'users' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--color-primary-dark)' }}>👥 Platform User Management</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>View, search, edit roles, and inspect active platform user accounts.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="search-input-wrap" style={{ minWidth: 240 }}>
                <Search size={16} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: 38, fontSize: '0.85rem' }} 
                  placeholder="Search user name, email, location..." 
                  value={userSearch} 
                  onChange={e => setUserSearch(e.target.value)} 
                />
              </div>

              <select className="form-select" style={{ fontSize: '0.85rem', minWidth: 150 }} value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                <option value="ALL">All Roles ({users.length})</option>
                <option value="consumer">Consumer</option>
                <option value="household">Household</option>
                <option value="hotel">Hotel</option>
                <option value="office">Office</option>
                <option value="manufacturer">Manufacturer</option>
                <option value="transport_partner">Transport Partner</option>
                <option value="delivery_partner">Delivery Partner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>User Full Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Phone</th>
                <th>City / Location</th>
                <th>Account Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.fullName}</td>
                  <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-error' : u.role === 'manufacturer' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                      {u.role?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{u.phone || '-'}</td>
                  <td>{u.location || '-'}</td>
                  <td>
                    <span className="badge" style={{ background: u.isDemo ? '#FEF3C7' : '#E0F2FE', color: u.isDemo ? '#92400E' : '#0369A1' }}>
                      {u.isDemo ? 'Demo Account' : 'Verified User'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => setEditingUser(u)}>
                        <Edit size={12} /> Edit
                      </button>
                      <button className="btn btn-sm" style={{ fontSize: '0.7rem', padding: '3px 8px', background: '#FEE2E2', color: '#991B1B', border: 'none' }} onClick={() => handleDeleteUser(u.id)}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', background: '#ffffff', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>✏️ Edit User Account</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingUser(null)}><X size={20} /></button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              act(editingUser.id, async () => {
                await updateUserRoleOrDetails(editingUser.id, {
                  fullName: editingUser.fullName,
                  role: editingUser.role,
                  phone: editingUser.phone,
                  location: editingUser.location
                });
                setEditingUser(null);
              });
            }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={editingUser.fullName || ''} onChange={e => setEditingUser(u => ({ ...u, fullName: e.target.value }))} required />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Role</label>
                <select className="form-select" value={editingUser.role || 'consumer'} onChange={e => setEditingUser(u => ({ ...u, role: e.target.value }))}>
                  {['household', 'hotel', 'office', 'other', 'manufacturer', 'transport_partner', 'consumer', 'delivery_partner', 'admin'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="form-input" value={editingUser.phone || ''} onChange={e => setEditingUser(u => ({ ...u, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-input" value={editingUser.location || ''} onChange={e => setEditingUser(u => ({ ...u, location: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 3. WASTE REQUESTS ================= */}
      {tab === 'waste' && (
        <div className="card">
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>🌱 Waste Collection Requests</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Waste Type</th>
                <th>Bin Size</th>
                <th>Qty</th>
                <th>Pickup Address</th>
                <th>Geo Coordinates</th>
                <th>Amount (₹)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wasteRequests.map(w => (
                <tr key={w.id}>
                  <td style={{ fontWeight: 700 }}>{w.wasteId}</td>
                  <td>{w.wasteType}</td>
                  <td>{w.binSize}</td>
                  <td>{w.quantity}</td>
                  <td style={{ maxWidth: 180 }}>{w.pickupLocation}</td>
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
                    <span className={`badge ${w.status === 'COMPLETED' ? 'badge-success' : w.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}`}>
                      {w.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => setSelectedJourney(w)}>
                      <Route size={13} /> View Journey
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 4. PRODUCTS MANAGEMENT ================= */}
      {tab === 'products' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--color-primary-dark)' }}>📦 Marketplace Products Control</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Add new eco products, update pricing, change images, and toggle publish/unpublish visibility.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '0.5rem', padding: '3px' }}>
                {[
                  { id: 'ALL', label: `All (${products.length})` },
                  { id: 'PUBLISHED', label: 'Published Only' },
                  { id: 'DRAFT', label: 'Drafts / Unpublished' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProductTabFilter(p.id)}
                    style={{
                      border: 'none',
                      background: productTabFilter === p.id ? '#ffffff' : 'transparent',
                      color: productTabFilter === p.id ? 'var(--color-primary-dark)' : '#64748b',
                      fontWeight: productTabFilter === p.id ? 700 : 500,
                      padding: '4px 10px', borderRadius: '0.35rem', fontSize: '0.75rem', cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => setShowAddProductModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} /> Add New Product
              </button>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Picture</th>
                <th>Product ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                      <img src={getProductImage(p)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>{p.productId}</td>
                  <td style={{ fontWeight: 700 }}>{p.name}</td>
                  <td><span className="badge badge-info">{p.category}</span></td>
                  <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>₹{p.price}</td>
                  <td>{p.availableQuantity}</td>
                  <td>
                    <span className={`badge ${p.published !== false ? 'badge-success' : 'badge-error'}`}>
                      {p.published !== false ? 'Published' : 'Unpublished (Draft)'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        className="btn btn-sm" 
                        style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, background: '#E0F2FE', color: '#0369A1', border: 'none' }} 
                        onClick={() => setSelectedJourney({ product: p, productId: p.productId || p.id })}
                      >
                        <Route size={13} /> Journey
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }} 
                        onClick={() => setEditingProduct({ ...p })}
                      >
                        <Edit size={13} /> Edit
                      </button>
                      <button 
                        className="btn btn-sm" 
                        style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, background: p.published !== false ? '#FEE2E2' : '#D8F3DC', color: p.published !== false ? '#991B1B' : '#1B4332', border: 'none' }} 
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

      {/* Modal: Add New Product */}
      {showAddProductModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                ➕ Create & Publish New Product
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddProductModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateProductSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input type="text" className="form-input" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Organic Bio Fertilizer" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-select" value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}>
                    {['Compost', 'Fertilizer', 'Recycled Plastic', 'Recycled Paper', 'Recycled Glass', 'Recycled Metal', 'Bio Products', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input type="number" className="form-input" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} min="1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity *</label>
                  <input type="number" className="form-input" value={newProduct.availableQuantity} onChange={e => setNewProduct(p => ({ ...p, availableQuantity: e.target.value }))} min="1" required />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Image URL</label>
                <input type="url" className="form-input" value={newProduct.image} onChange={e => setNewProduct(p => ({ ...p, image: e.target.value }))} placeholder="Paste direct image link..." />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={newProduct.description} onChange={e => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Describe product eco benefits..." />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddProductModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Publish Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Product */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                  ✏️ Edit Product Details & Picture
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Product ID: {editingProduct.productId}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingProduct(null)}><X size={20} /></button>
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
              {/* Image Preview */}
              <div style={{ marginBottom: '1.25rem', textAlign: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px dashed #cbd5e1' }}>
                <div style={{ width: 140, height: 140, margin: '0 auto', borderRadius: '0.85rem', overflow: 'hidden', background: '#e2e8f0' }}>
                  <img src={editingProduct.image || getProductImage(editingProduct)} alt={editingProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Picture URL</label>
                <input type="url" className="form-input" value={editingProduct.image || ''} onChange={e => setEditingProduct(p => ({ ...p, image: e.target.value }))} />
              </div>

              {/* Presets */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>🌱 Eco Presets:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {PRESET_PRODUCT_IMAGES.map((preset, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setEditingProduct(p => ({ ...p, image: preset.url }))}
                      style={{ border: editingProduct.image === preset.url ? '2px solid #2D6A4F' : '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '4px', cursor: 'pointer', textAlign: 'center' }}
                    >
                      <img src={preset.url} alt={preset.label} style={{ width: '100%', height: 42, objectFit: 'cover', borderRadius: '4px' }} />
                      <span style={{ fontSize: '0.65rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preset.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input type="text" className="form-input" value={editingProduct.name || ''} onChange={e => setEditingProduct(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-select" value={editingProduct.category || ''} onChange={e => setEditingProduct(p => ({ ...p, category: e.target.value }))}>
                    {['Compost', 'Fertilizer', 'Recycled Plastic', 'Recycled Paper', 'Recycled Glass', 'Recycled Metal', 'Bio Products', 'Other'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input type="number" className="form-input" value={editingProduct.price || 0} onChange={e => setEditingProduct(p => ({ ...p, price: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock *</label>
                  <input type="number" className="form-input" value={editingProduct.availableQuantity || 0} onChange={e => setEditingProduct(p => ({ ...p, availableQuantity: e.target.value }))} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 5. ORDERS CONTROL ================= */}
      {tab === 'orders' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--color-primary-dark)' }}>🛒 Marketplace Orders Management</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>Inspect consumer orders, 10% platform commission breakdown, and update order statuses.</p>
            </div>

            <select className="form-select" style={{ fontSize: '0.85rem', minWidth: 160 }} value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses ({orders.length})</option>
              {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Consumer Name</th>
                <th>Items Count</th>
                <th>Grand Total (₹)</th>
                <th>10% Comm. (₹)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700 }}>{o.orderId}</td>
                  <td>{o.consumerName || 'Consumer'}</td>
                  <td>{o.items?.length || 1} items</td>
                  <td style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>₹{o.totalAmount}</td>
                  <td style={{ fontWeight: 700, color: '#0284C7' }}>₹{o.platformCommission || Math.round(o.totalAmount * 0.1)}</td>
                  <td>
                    <span className={`badge ${o.status === 'DELIVERED' ? 'badge-success' : 'badge-warning'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem' }} onClick={() => setInspectOrder(o)}>
                      Inspect & Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect Order Modal */}
      {inspectOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 600, width: '100%', background: '#ffffff', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>📋 Order {inspectOrder.orderId} Details</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Shipping: {inspectOrder.shippingAddress}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setInspectOrder(null)}><X size={20} /></button>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700 }}>Items Breakdown</h4>
              {inspectOrder.items?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid #e2e8f0', padding: '4px 0' }}>
                  <span>{item.name} (x{item.quantity})</span>
                  <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary-dark)' }}>
                <span>Grand Total</span>
                <span>₹{inspectOrder.totalAmount}</span>
              </div>
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Update Order Status</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {ORDER_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    act(inspectOrder.id, async () => {
                      await updateOrderStatus(inspectOrder.id, s);
                      setInspectOrder(prev => ({ ...prev, status: s }));
                    });
                  }}
                  className={`btn btn-sm ${inspectOrder.status === s ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.72rem' }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setInspectOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. DELIVERIES ================= */}
      {tab === 'deliveries' && (
        <div className="card">
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>🚚 Eco Product Deliveries</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Delivery ID</th>
                <th>Order ID</th>
                <th>Shipping Destination</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700 }}>{d.deliveryId}</td>
                  <td>{d.orderId}</td>
                  <td>{d.shippingAddress || 'Tamil Nadu'}</td>
                  <td>
                    <span className={`badge ${d.status === 'DELIVERED' ? 'badge-success' : 'badge-warning'}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 7. FINANCE & LEDGER ================= */}
      {tab === 'finance' && (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-icon green"><IndianRupee size={24} /></div><div><div className="stat-value">₹{financials.totalAdminRevenue || 0}</div><div className="stat-label">Net Platform Revenue</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><CreditCard size={24} /></div><div><div className="stat-value">₹{financials.totalMarketplaceCommission || 0}</div><div className="stat-label">Marketplace Commission (10%)</div></div></div>
            <div className="stat-card"><div className="stat-icon green"><Leaf size={24} /></div><div><div className="stat-value">₹{financials.totalCommission || 0}</div><div className="stat-label">Waste Pickup Commission</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><ShoppingBag size={24} /></div><div><div className="stat-value">₹{financials.totalOrderRevenue || 0}</div><div className="stat-label">Gross Order Sales</div></div></div>
          </div>

          <div className="card">
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>Transaction History & Ledger</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Payment ID</th>
                  <th>Waste / Ref ID</th>
                  <th>Amount (₹)</th>
                  <th>Admin Comm. (₹)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>{p.paymentId}</td>
                    <td>{p.wasteId || p.orderId || '-'}</td>
                    <td style={{ fontWeight: 800 }}>₹{p.totalPayable || p.amount || 0}</td>
                    <td style={{ fontWeight: 700, color: '#0284C7' }}>₹{p.platformCommission || 0}</td>
                    <td><span className={`badge ${p.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.paymentStatus}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => setEditingPayment(p)}>
                        <Edit size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 550, width: '100%', background: '#ffffff', borderRadius: '1.25rem', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>✏️ Edit Payment Record</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Payment ID: {editingPayment.paymentId}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPayment(null)}><X size={20} /></button>
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              act(editingPayment.id, async () => {
                await updateWastePayment(editingPayment.id, {
                  paymentStatus: editingPayment.paymentStatus || 'PAID',
                  totalPayable: Number(editingPayment.totalPayable || 0),
                  platformCommission: Number(editingPayment.platformCommission || 0),
                  transportPayout: Number(editingPayment.transportPayout || 0),
                  manufacturerPayout: Number(editingPayment.manufacturerPayout || 0),
                  transportPayoutStatus: editingPayment.transportPayoutStatus || 'PAID',
                  manufacturerPayoutStatus: editingPayment.manufacturerPayoutStatus || 'PAID'
                });
                setEditingPayment(null);
              });
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select className="form-select" value={editingPayment.paymentStatus || 'PAID'} onChange={e => setEditingPayment(p => ({ ...p, paymentStatus: e.target.value }))}>
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REFUNDED">REFUNDED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Amount (₹)</label>
                  <input type="number" className="form-input" value={editingPayment.totalPayable || 0} onChange={e => setEditingPayment(p => ({ ...p, totalPayable: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Admin Commission (₹)</label>
                  <input type="number" className="form-input" value={editingPayment.platformCommission || 0} onChange={e => setEditingPayment(p => ({ ...p, platformCommission: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Transport Payout (₹)</label>
                  <input type="number" className="form-input" value={editingPayment.transportPayout || 0} onChange={e => setEditingPayment(p => ({ ...p, transportPayout: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPayment(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><Save size={16} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 8. RATE CARD ================= */}
      {tab === 'pricing' && rateForm && (
        <div className="card" style={{ maxWidth: 700 }}>
          <h3 style={{ fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>⚙️ Waste Collection Rate Card Configurator</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>Configures automated pricing valuations for future waste requests.</p>
          <form onSubmit={handleSaveRates}>
            <table className="data-table" style={{ marginBottom: '1rem' }}>
              <thead><tr><th>Waste Type</th><th>Small Bin (₹)</th><th>Medium Bin (₹)</th><th>Large Bin (₹)</th></tr></thead>
              <tbody>{Object.entries(rateForm.wasteRates || {}).map(([type, sizes]) => (
                <tr key={type}>
                  <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{type}</td>
                  {['small','medium','large'].map(s => (
                    <td key={s}><input type="number" className="form-input" style={{ width: 80, padding: '4px 8px', fontSize: '0.85rem' }} value={sizes[s] || 0} onChange={e => setRateForm(prev => ({ ...prev, wasteRates: { ...prev.wasteRates, [type]: { ...prev.wasteRates[type], [s]: Number(e.target.value) } } }))} /></td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={actionLoading === 'rates'}>Save Rate Card Configuration</button>
          </form>
        </div>
      )}

      {/* ================= 9. PAYOUT POOLS ================= */}
      {tab === 'payouts' && (
        <div className="card">
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>💳 Manage Partner Payout Pools</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Waste ID</th>
                <th>Transport Payout</th>
                <th>T.Status</th>
                <th>Manufacturer Payout</th>
                <th>M.Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, fontSize: 'var(--text-xs)' }}>{p.paymentId}</td>
                  <td>{p.wasteId}</td>
                  <td style={{ fontWeight: 700 }}>₹{p.transportPayout || 0}</td>
                  <td><span className={`badge ${p.transportPayoutStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.transportPayoutStatus}</span></td>
                  <td style={{ fontWeight: 700 }}>₹{p.manufacturerPayout || 0}</td>
                  <td><span className={`badge ${p.manufacturerPayoutStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.manufacturerPayoutStatus}</span></td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    {p.transportPayoutStatus === 'PENDING' && <button className="btn btn-sm" style={{ fontSize: '0.65rem' }} onClick={() => act(p.id + 't', () => markPayoutPaid(p.id, 'transport'))}>Pay Transport</button>}
                    {p.manufacturerPayoutStatus === 'PENDING' && <button className="btn btn-sm" style={{ fontSize: '0.65rem' }} onClick={() => act(p.id + 'm', () => markPayoutPaid(p.id, 'manufacturer'))}>Pay Mfr</button>}
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.65rem' }} onClick={() => setEditingPayment(p)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= 10. CIRCULAR TRACEABILITY ================= */}
      {tab === 'journey' && (
        <>
          <div style={{ marginBottom: '1.25rem' }}>
            <GPSTracker 
              pickupLocation="Regional Waste Collection Hub Alpha"
              destinationLocation="Central Circular Eco Hub"
              status="IN_TRANSIT"
              driverName="Ecosystem Fleet Command Radar"
              vehicleNumber="SYSTEM-WIDE LIVE FLEET"
              height={320}
            />
          </div>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>🔄 End-to-End Circular Economy Traceability</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Click any recorded waste request to view its complete lifecycle from household pickup to marketplace sale.</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waste ID</th>
                  <th>Material Type</th>
                  <th>Status</th>
                  <th>Amount (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wasteRequests.map(w => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 700 }}>{w.wasteId}</td>
                    <td>{w.wasteType}</td>
                    <td><span className={`badge ${w.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>{w.status}</span></td>
                    <td>₹{w.pricing?.totalPayable || '-'}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '0.72rem' }} onClick={() => setSelectedJourney(w)}>
                        <Route size={14} /> View Circular Journey
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedJourney && (
            <div className="card">
              <ProductJourney journey={{ wasteRequest: selectedJourney }} />
            </div>
          )}
        </>
      )}

      {/* ================= 11. SYSTEM AUDIT STREAM ================= */}
      {tab === 'audit' && (
        <div className="card">
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={20} color="var(--color-primary)" /> Real-Time Platform Audit Log & Activity Stream
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {auditLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: log.type === 'ORDER' ? '#E0F2FE' : log.type === 'PAYMENT' ? '#D8F3DC' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: log.type === 'ORDER' ? '#0369A1' : log.type === 'PAYMENT' ? '#1B4332' : '#92400E', fontWeight: 700 }}>
                    {log.type === 'ORDER' ? '🛒' : log.type === 'PAYMENT' ? '💳' : '🌱'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{log.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{log.desc}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{log.status}</span>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{log.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 12. CHARTS ================= */}
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

      {/* Universal Circular Journey & Telemetry Modal Overlay */}
      {selectedJourney && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 850, width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', borderRadius: '1.25rem', padding: '1.75rem', border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Route size={22} color="var(--color-primary)" /> Circular Product Journey & Ecosystem Telemetry
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Item Ref: {selectedJourney.wasteId || selectedJourney.productId || selectedJourney.orderId || selectedJourney.name || 'Selected Resource'}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedJourney(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <GPSTracker 
                pickupLocation={selectedJourney.pickupLocation || selectedJourney.shippingAddress || "Regional Waste Collection Hub Alpha"}
                destinationLocation="Central Circular Eco Hub"
                status="IN_TRANSIT"
                driverName="Ecosystem Fleet Command Radar"
                vehicleNumber="SYSTEM-WIDE LIVE FLEET"
                height={260}
              />
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
              <ProductJourney 
                providedJourney={selectedJourney.wasteId ? { wasteRequest: selectedJourney } : selectedJourney.product ? { product: selectedJourney.product } : null}
                productDocId={selectedJourney.id || selectedJourney.productId}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedJourney(null)}>Close Journey Inspector</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
