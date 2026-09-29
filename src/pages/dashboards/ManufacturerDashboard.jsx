import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import DashboardLayout from '../../components/DashboardLayout';
import StatusTracker from '../../components/StatusTracker';
import { LineChart, BarChart, DoughnutChart, groupByMonth, groupSpendingByMonth, countByField } from '../../components/Charts';
import InteractiveAnalytics from '../../components/InteractiveAnalytics';
import { 
  subscribeToAvailableRequests, subscribeToManufacturerWaste, 
  subscribeToManufacturerProducts, subscribeToManufacturerOrders,
  manufacturerAcceptRequest, manufacturerRejectRequest, assignTransportPartner,
  confirmWasteReceived, startWasteProcessing, completeWasteProcessing,
  getTransportPartners, createProduct, updateProduct, updateOrderStatus, createDeliveryJob
} from '../../services/firestoreService';
import { subscribeToManufacturerPayments } from '../../services/financialService';
import { 
  LayoutDashboard, Package, Factory, Truck, ShoppingBag, ClipboardList, 
  Plus, CheckCircle, AlertCircle, User, XCircle, UserPlus, Scale,
  IndianRupee, BarChart3, CreditCard, Edit, Image, Save, X
} from 'lucide-react';
import { getProductImage, PRESET_PRODUCT_IMAGES } from '../../utils/productImages';

const PRODUCT_CATEGORIES = ['Compost', 'Fertilizer', 'Recycled Plastic', 'Recycled Paper', 'Recycled Glass', 'Recycled Metal', 'Bio Products', 'Other'];
const WASTE_STATUSES = ['REQUESTED', 'ACCEPTED', 'TRANSPORT_ASSIGNED', 'ON_THE_WAY', 'COLLECTED', 'DELIVERED', 'RECEIVED', 'PROCESSING', 'COMPLETED'];

export default function ManufacturerDashboard() {
  const { user, userData } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState('overview');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myWaste, setMyWaste] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [wastePayments, setWastePayments] = useState([]);
  const [transportPartners, setTransportPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [selectedTransport, setSelectedTransport] = useState('');
  const [productForm, setProductForm] = useState({ name: '', description: '', category: '', price: '', availableQuantity: '', wasteType: '', image: '' });
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (!user) return;
    const unsubs = [
      subscribeToAvailableRequests((data) => { setPendingRequests(data); setLoading(false); }),
      subscribeToManufacturerWaste(user.uid, setMyWaste),
      subscribeToManufacturerProducts(user.uid, setProducts),
      subscribeToManufacturerOrders(user.uid, setOrders),
      subscribeToManufacturerPayments(user.uid, setWastePayments),
    ];
    getTransportPartners().then(setTransportPartners).catch(console.warn);
    return () => unsubs.forEach(u => u());
  }, [user]);

  const act = async (id, fn) => { setActionLoading(id); setError(''); try { await fn(); setSuccess('Done!'); setTimeout(() => setSuccess(''), 3000); } catch(e) { setError(e.message); } finally { setActionLoading(''); } };

  const acceptedWaste = myWaste.filter(w => w.status === 'ACCEPTED');
  const inTransitWaste = myWaste.filter(w => ['TRANSPORT_ASSIGNED', 'ON_THE_WAY', 'COLLECTED'].includes(w.status));
  const deliveredWaste = myWaste.filter(w => w.status === 'DELIVERED');
  const receivedWaste = myWaste.filter(w => w.status === 'RECEIVED');
  const processingWaste = myWaste.filter(w => w.status === 'PROCESSING');
  const completedWaste = myWaste.filter(w => w.status === 'COMPLETED');
  const totalEarnings = wastePayments.reduce((s, p) => s + (p.manufacturerPayout || 0), 0);
  const pendingPayout = wastePayments.filter(p => p.manufacturerPayoutStatus === 'PENDING').reduce((s, p) => s + (p.manufacturerPayout || 0), 0);
  const paidPayout = wastePayments.filter(p => p.manufacturerPayoutStatus === 'PAID').reduce((s, p) => s + (p.manufacturerPayout || 0), 0);

  const sidebar = (
    <div className="sidebar-section">
      <p className="sidebar-label">Manufacturing Co.</p>
      {[
        { key: 'overview', icon: <LayoutDashboard size={18} />, label: t('dashboard.overview') },
        { key: 'incoming', icon: <ClipboardList size={18} />, label: 'Incoming Requests' },
        { key: 'accepted', icon: <CheckCircle size={18} />, label: 'Assign Transport' },
        { key: 'tracking', icon: <Truck size={18} />, label: 'Transport Tracking' },
        { key: 'receiving', icon: <Scale size={18} />, label: 'Receive & Process' },
        { key: 'products', icon: <Package size={18} />, label: t('dashboard.products') },
        { key: 'createProduct', icon: <Plus size={18} />, label: 'Create Product' },
        { key: 'orders', icon: <ShoppingBag size={18} />, label: t('dashboard.orders') },
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
        <h1 className="dashboard-title">{tab === 'overview' ? `Welcome, ${userData?.fullName}` : tab}</h1>
        <p className="dashboard-subtitle">{t('roles.manufacturer')}</p>
      </div>
      {success && <div className="alert alert-success"><CheckCircle size={18} />{success}</div>}
      {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}

      {tab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-icon amber"><ClipboardList size={24} /></div><div><div className="stat-value">{pendingRequests.length}</div><div className="stat-label">Pending</div></div></div>
          <div className="stat-card"><div className="stat-icon blue"><Truck size={24} /></div><div><div className="stat-value">{inTransitWaste.length}</div><div className="stat-label">In Transit</div></div></div>
          <div className="stat-card"><div className="stat-icon green"><Factory size={24} /></div><div><div className="stat-value">{deliveredWaste.length + receivedWaste.length + processingWaste.length}</div><div className="stat-label">To Process</div></div></div>
          <div className="stat-card"><div className="stat-icon rose"><Package size={24} /></div><div><div className="stat-value">{products.length}</div><div className="stat-label">Products</div></div></div>
          <div className="stat-card"><div className="stat-icon green"><ShoppingBag size={24} /></div><div><div className="stat-value">{orders.length}</div><div className="stat-label">Orders</div></div></div>
          <div className="stat-card"><div className="stat-icon amber"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div></div>
        </div>
      )}

      {tab === 'incoming' && (
        loading ? <div className="loading-spinner"><div className="spinner" /></div> :
        pendingRequests.length === 0 ? <div className="empty-state"><ClipboardList size={48} /><p className="empty-state-title">No pending requests</p></div> :
        pendingRequests.map(req => (
          <div className="card" key={req.id} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}><h3 style={{ fontWeight: 600 }}>{req.wasteId}</h3><span className="badge badge-warning">PENDING</span></div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><strong>Type:</strong> {req.wasteType} | <strong>Bin:</strong> {req.binSize || '-'} | <strong>Qty:</strong> {req.quantity || req.numberOfBags}</div>
              <div><strong>Location:</strong> {req.pickupLocation}</div>
              <div><strong>Date:</strong> {req.pickupDate} {req.pickupTime && `at ${req.pickupTime}`}</div>
              {req.pricing && <div><strong>Amount:</strong> ₹{req.pricing.totalPayable}</div>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => act(req.id, () => manufacturerAcceptRequest(req.id, user.uid))} disabled={actionLoading === req.id}><CheckCircle size={14} /> Accept</button>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <input type="text" className="form-input" style={{ fontSize: 'var(--text-sm)', padding: '6px 10px', width: 200 }} placeholder="Reason (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                <button className="btn btn-sm" style={{ background: '#FEE2E2', color: '#991B1B', border: 'none' }} onClick={() => act(req.id, () => manufacturerRejectRequest(req.id, user.uid, rejectReason))} disabled={actionLoading === req.id}><XCircle size={14} /> Reject</button>
              </div>
            </div>
          </div>
        ))
      )}

      {tab === 'accepted' && (
        acceptedWaste.length === 0 ? <div className="empty-state"><CheckCircle size={48} /><p className="empty-state-title">No accepted waste awaiting transport</p></div> :
        acceptedWaste.map(w => (
          <div className="card" key={w.id} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}><h3 style={{ fontWeight: 600 }}>{w.wasteId}</h3><span className="badge badge-info">ACCEPTED</span></div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>{w.wasteType} | {w.pickupLocation}</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="form-select" style={{ maxWidth: 250, fontSize: 'var(--text-sm)', padding: '6px 10px' }} value={selectedTransport} onChange={e => setSelectedTransport(e.target.value)}>
                <option value="">Select Transport Partner...</option>
                {transportPartners.map(tp => <option key={tp.id} value={tp.id}>{tp.fullName} — {tp.location}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={() => { if(!selectedTransport) return setError('Select a transport partner'); act(w.id, () => assignTransportPartner(w.id, selectedTransport)); }} disabled={actionLoading === w.id}><UserPlus size={14} /> Assign</button>
            </div>
          </div>
        ))
      )}

      {tab === 'tracking' && (
        inTransitWaste.length === 0 ? <div className="empty-state"><Truck size={48} /><p className="empty-state-title">No pickups in transit</p></div> :
        inTransitWaste.map(w => (
          <div className="card" key={w.id} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}><h3 style={{ fontWeight: 600 }}>{w.wasteId}</h3><span className="badge badge-warning">{w.status}</span></div>
            <StatusTracker currentStatus={w.status} steps={WASTE_STATUSES} />
          </div>
        ))
      )}

      {tab === 'receiving' && (
        <>
          {deliveredWaste.length > 0 && <div style={{ marginBottom: 'var(--space-6)' }}><h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Delivered — Confirm Receipt</h3>
            {deliveredWaste.map(w => <div className="card" key={w.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{w.wasteId}</strong> — {w.wasteType} {w.verifiedCollectedWeight && `(${w.verifiedCollectedWeight} kg)`}</div><button className="btn btn-primary btn-sm" onClick={() => act(w.id, () => confirmWasteReceived(w.id, user.uid))} disabled={actionLoading === w.id}>✓ Received</button></div>)}
          </div>}
          {receivedWaste.length > 0 && <div style={{ marginBottom: 'var(--space-6)' }}><h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Received — Start Processing</h3>
            {receivedWaste.map(w => <div className="card" key={w.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{w.wasteId}</strong> — {w.wasteType}</div><button className="btn btn-primary btn-sm" onClick={() => act(w.id, () => startWasteProcessing(w.id, user.uid))} disabled={actionLoading === w.id}>🏭 Process</button></div>)}
          </div>}
          {processingWaste.length > 0 && <div style={{ marginBottom: 'var(--space-6)' }}><h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Processing — Mark Complete</h3>
            {processingWaste.map(w => <div className="card" key={w.id} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>{w.wasteId}</strong> — {w.wasteType}</div><button className="btn btn-primary btn-sm" onClick={() => act(w.id, () => completeWasteProcessing(w.id, user.uid))} disabled={actionLoading === w.id}>✅ Complete</button></div>)}
          </div>}
          {deliveredWaste.length === 0 && receivedWaste.length === 0 && processingWaste.length === 0 && <div className="empty-state"><Factory size={48} /><p className="empty-state-title">No waste to process</p></div>}
        </>
      )}

      {tab === 'products' && (
        products.length === 0 ? <div className="empty-state"><Package size={48} /><p className="empty-state-title">No products</p><button className="btn btn-primary mt-4" onClick={() => setTab('createProduct')}>Create Product</button></div> :
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontWeight: 700, margin: 0 }}>My Listed Products</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setTab('createProduct')}>+ Add New Product</button>
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
                <th>Action</th>
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
                    <button 
                      className="btn btn-sm btn-secondary" 
                      style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setEditingProduct({ ...p })}
                    >
                      <Edit size={13} /> Edit Picture & Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'createProduct' && (
        <div className="card" style={{ maxWidth: 650 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-primary-dark)' }}>Create New Eco Product</h3>
          <form onSubmit={async (e) => { 
            e.preventDefault(); 
            if(!productForm.name||!productForm.price||!productForm.category) return setError('Fill required fields'); 
            act('product', () => createProduct({
              ...productForm, 
              image: productForm.image || '',
              manufacturerId: user.uid, 
              manufacturerName: userData?.fullName
            }).then(() => {
              setProductForm({name:'',description:'',category:'',price:'',availableQuantity:'',wasteType:'',image:''});
              setTab('products');
            })); 
          }}>
            {/* Live Picture Preview & Selection */}
            <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px dashed #cbd5e1' }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <Image size={16} /> Product Image URL & Preview
              </label>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ width: 80, height: 80, borderRadius: '0.5rem', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0, border: '1px solid #cbd5e1' }}>
                  <img 
                    src={productForm.image && productForm.image.trim() !== '' ? productForm.image : getProductImage(productForm)} 
                    alt="Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="Paste direct image link (e.g. https://images.unsplash.com/...)" 
                    value={productForm.image} 
                    onChange={e => setProductForm(p=>({...p,image:e.target.value}))} 
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, display: 'block' }}>Optional custom URL, or pick from presets below.</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {PRESET_PRODUCT_IMAGES.map((preset, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setProductForm(p => ({ ...p, image: preset.url }))}
                    style={{
                      border: productForm.image === preset.url ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                      borderRadius: '0.4rem',
                      padding: '3px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: productForm.image === preset.url ? '#e6f4ea' : '#fff',
                    }}
                  >
                    <img src={preset.url} alt={preset.label} style={{ width: '100%', height: 38, objectFit: 'cover', borderRadius: '3px' }} />
                    <span style={{ fontSize: '0.62rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preset.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group"><label className="form-label">Product Name *</label><input type="text" className="form-input" value={productForm.name} onChange={e => setProductForm(p=>({...p,name:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={productForm.description} onChange={e => setProductForm(p=>({...p,description:e.target.value}))} rows={3} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">Category *</label><select className="form-select" value={productForm.category} onChange={e => setProductForm(p=>({...p,category:e.target.value}))} required><option value="">Select...</option>{PRODUCT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Waste Type</label><input type="text" className="form-input" value={productForm.wasteType} onChange={e => setProductForm(p=>({...p,wasteType:e.target.value}))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="form-group"><label className="form-label">Price (₹) *</label><input type="number" className="form-input" value={productForm.price} onChange={e => setProductForm(p=>({...p,price:e.target.value}))} required min="1" /></div>
              <div className="form-group"><label className="form-label">Stock *</label><input type="number" className="form-input" value={productForm.availableQuantity} onChange={e => setProductForm(p=>({...p,availableQuantity:e.target.value}))} required min="1" /></div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={actionLoading === 'product'}>Create Product</button>
          </form>
        </div>
      )}

      {/* Edit Product & Picture Modal for Manufacturer */}
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
                  image: editingProduct.image || ''
                });
                setEditingProduct(null);
              });
            }}>
              {/* Image Preview */}
              <div style={{ marginBottom: '1.25rem', textAlign: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '0.85rem', border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>Live Product Image Preview</p>
                <div style={{ width: 140, height: 140, margin: '0 auto', borderRadius: '0.85rem', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: '#e2e8f0' }}>
                  <img 
                    src={editingProduct.image && editingProduct.image.trim() !== '' ? editingProduct.image : getProductImage(editingProduct)} 
                    alt={editingProduct.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
              </div>

              {/* Preset Eco Images */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.5rem', display: 'block' }}>
                  🌱 Quick Eco Picture Presets:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {PRESET_PRODUCT_IMAGES.map((preset, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setEditingProduct(p => ({ ...p, image: preset.url }))}
                      style={{
                        border: editingProduct.image === preset.url ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        padding: '4px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        background: editingProduct.image === preset.url ? '#e6f4ea' : '#fff',
                      }}
                    >
                      <img src={preset.url} alt={preset.label} style={{ width: '100%', height: 44, objectFit: 'cover', borderRadius: '4px' }} />
                      <span style={{ fontSize: '0.65rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                        {preset.label}
                      </span>
                    </div>
                  ))}
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
                    {PRODUCT_CATEGORIES.map(c => (
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

      {tab === 'orders' && (
        orders.length === 0 ? <div className="empty-state"><ShoppingBag size={48} /><p className="empty-state-title">No orders</p></div> :
        orders.map(o => {
          const next = { 'PLACED':'CONFIRMED', 'CONFIRMED':'PROCESSING', 'PROCESSING':'CREATE_DELIVERY' };
          const action = next[o.status];
          return <div className="card" key={o.id} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><h3 style={{ fontWeight: 600 }}>{o.orderId}</h3><span className={`badge ${o.status==='DELIVERED'?'badge-success':'badge-warning'}`}>{o.status}</span></div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>{o.items?.length} items • ₹{o.totalAmount}</p>
            {action && <button className="btn btn-primary btn-sm mt-3" onClick={() => act(o.id, () => action==='CREATE_DELIVERY' ? createDeliveryJob(o.id) : updateOrderStatus(o.id, action))} disabled={actionLoading===o.id}>{action==='CONFIRMED'?'Confirm':action==='PROCESSING'?'Start Processing':'Ready for Delivery'}</button>}
          </div>;
        })
      )}

      {tab === 'earnings' && (
        <>
          <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="stat-card"><div className="stat-icon green"><IndianRupee size={24} /></div><div><div className="stat-value">₹{totalEarnings}</div><div className="stat-label">Total Earnings</div></div></div>
            <div className="stat-card"><div className="stat-icon amber"><CreditCard size={24} /></div><div><div className="stat-value">₹{pendingPayout}</div><div className="stat-label">Pending Payout</div></div></div>
            <div className="stat-card"><div className="stat-icon blue"><CheckCircle size={24} /></div><div><div className="stat-value">₹{paidPayout}</div><div className="stat-label">Paid Out</div></div></div>
          </div>
          {wastePayments.length > 0 && <div className="card"><table className="data-table"><thead><tr><th>Payment</th><th>Waste</th><th>Payout</th><th>Status</th></tr></thead>
            <tbody>{wastePayments.map(p => <tr key={p.id}><td style={{fontWeight:600,fontSize:'var(--text-xs)'}}>{p.paymentId}</td><td>{p.wasteId}</td><td>₹{p.manufacturerPayout}</td><td><span className={`badge ${p.manufacturerPayoutStatus==='PAID'?'badge-success':'badge-warning'}`}>{p.manufacturerPayoutStatus}</span></td></tr>)}</tbody>
          </table></div>}
        </>
      )}

      {tab === 'charts' && (
        <InteractiveAnalytics 
          role="manufacturer" 
          requests={myWaste} 
          orders={orders} 
          payments={wastePayments} 
          title="Manufacturer Waste Processing & Eco Sales Analytics" 
        />
      )}

      {tab === 'profile' && userData && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', fontSize: 'var(--text-3xl)', color: '#B45309' }}>{userData.fullName?.charAt(0)}</div>
            <h3>{userData.fullName}</h3><p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>{t('roles.manufacturer')}</p>
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
