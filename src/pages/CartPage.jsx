import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../services/firestoreService';
import { calculateDeliveryFee, createDeliveryPayment } from '../services/financialService';
import LocationPickerInput from '../components/LocationPickerInput';
import {
  Trash2, Plus, Minus, ShoppingCart, ArrowLeft, Package, Truck,
  CreditCard, Smartphone, Building, Wallet, Banknote, CheckCircle2,
  ShieldCheck, Receipt, ExternalLink
} from 'lucide-react';
import { useState } from 'react';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { t } = useLanguage();
  const { user, userData } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi', 'card', 'netbanking', 'wallet', 'cod'
  const [upiId, setUpiId] = useState('user@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8892');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [completedOrderReceipt, setCompletedOrderReceipt] = useState(null);

  // Delivery fee calculation (Base ₹25 + distance calculation)
  const deliveryInfo = calculateDeliveryFee(5); // Default 5km delivery radius calculation
  const deliveryFee = deliveryInfo.totalDeliveryFee; // ₹55

  // Wallet discount (if eco-points used)
  const userEcoPoints = userData?.ecoPoints || 120;
  const ecoDiscount = paymentMethod === 'wallet' ? Math.min(totalPrice, userEcoPoints * 0.5) : 0;
  const grandTotal = Math.max(0, totalPrice + deliveryFee - ecoDiscount);

  const handleCheckout = async () => {
    if (!user) return navigate('/login');
    if (!address.trim()) return setError('Please enter a shipping address');
    if (items.length === 0) return;

    setOrdering(true);
    setError('');
    try {
      const txnId = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const order = await createOrder(user.uid, items, address, {
        deliveryFee,
        grandTotal,
        consumerName: user.displayName || userData?.fullName || user.email || 'Consumer',
        paymentMethod: paymentMethod.toUpperCase(),
        paymentStatus: paymentMethod === 'cod' ? 'PENDING_COD' : 'PAID',
        transactionId: txnId,
        paidAt: new Date().toISOString()
      });

      // Record delivery payment breakdown
      try {
        await createDeliveryPayment({
          orderId: order.orderId,
          consumerId: user.uid,
          ...deliveryInfo
        });
      } catch (pErr) {
        console.warn('Delivery payment recording skipped:', pErr.message);
      }

      clearCart();

      // Show instant interactive receipt modal
      setCompletedOrderReceipt({
        orderId: order.orderId,
        transactionId: txnId,
        items,
        totalPrice,
        deliveryFee,
        ecoDiscount,
        grandTotal,
        paymentMethod: paymentMethod.toUpperCase(),
        shippingAddress: address,
        date: new Date().toLocaleString('en-IN')
      });

      setSuccess(`Order ${order.orderId} successfully placed & payment verified!`);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || t('common.error'));
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: 'var(--space-8) var(--space-6)', maxWidth: 860 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={18} /> {t('common.back')}
        </button>

        <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-6)' }}>{t('dashboard.cart')}</h1>

        {success && <div className="alert alert-success"><CheckCircle2 size={18} /> {success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {items.length === 0 && !completedOrderReceipt ? (
          <div className="empty-state">
            <ShoppingCart size={64} />
            <p className="empty-state-title">{t('marketplace.emptyCart')}</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/marketplace')}>
              {t('hero.ctaSecondary')}
            </button>
          </div>
        ) : completedOrderReceipt ? (
          /* ================= INSTANT PAYMENT RECEIPT MODAL / CARD ================= */
          <div className="card" style={{ background: '#f8fafc', border: '2px solid #52B788', borderRadius: '1.25rem', padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: 64, height: 64, background: '#D8F3DC', borderRadius: '50%', color: '#2D6A4F', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>Payment Successful!</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Thank you for supporting circular eco-manufacturing.</p>
            </div>

            <div style={{ background: '#fff', borderRadius: '0.85rem', padding: '1.25rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px border #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Order Reference</span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{completedOrderReceipt.orderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px border #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Transaction Txn ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284C7' }}>{completedOrderReceipt.transactionId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px border #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Payment Gateway Method</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{completedOrderReceipt.paymentMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px border #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Paid Amount</span>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1B4332' }}>₹{completedOrderReceipt.grandTotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Shipping Address</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', maxWidth: '60%' }}>{completedOrderReceipt.shippingAddress}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary w-full" onClick={() => navigate('/dashboard/consumer')}>
                <ExternalLink size={18} /> Track Order in Consumer Dashboard
              </button>
              <button className="btn btn-outline w-full" onClick={() => { setCompletedOrderReceipt(null); navigate('/marketplace'); }}>
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {/* Left Column: Cart Items list */}
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShoppingCart size={20} color="var(--color-primary)" /> Cart Items ({items.length})
                </h3>
                {items.map(item => (
                  <div className="cart-item" key={item.productId} style={{ padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="cart-item-img">
                      {item.image ? <img src={item.image} alt={item.name} /> : <Package size={24} />}
                    </div>
                    <div className="cart-item-info">
                      <p className="cart-item-name">{item.name}</p>
                      <p className="cart-item-price">₹{item.price}</p>
                    </div>
                    <div className="qty-control">
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}><Plus size={14} /></button>
                    </div>
                    <span style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>₹{item.price * item.quantity}</span>
                    <button className="btn btn-icon" onClick={() => removeFromCart(item.productId)} style={{ color: 'var(--color-error)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Shipping Address Picker */}
              <div className="card">
                <LocationPickerInput
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  label="Shipping Delivery Address"
                  placeholder="Click 📍 Live Location or pick TN City address..."
                  required
                  autoDetectOnMount={true}
                />
              </div>
            </div>

            {/* Right Column: Order Pricing Summary & Payment Gateway Selector */}
            <div>
              <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1.5rem' }}>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Receipt size={20} color="var(--color-primary)" /> Pricing & Delivery Breakdown
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Items Subtotal</span>
                    <span style={{ fontWeight: 600 }}>₹{totalPrice}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284C7', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Truck size={15} /> Eco Logistics Delivery Fee
                    </span>
                    <span style={{ fontWeight: 600 }}>+₹{deliveryFee}</span>
                  </div>

                  {paymentMethod === 'wallet' && ecoDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Wallet size={15} /> Eco-Points Redemption Discount
                      </span>
                      <span style={{ fontWeight: 600 }}>-₹{ecoDiscount}</span>
                    </div>
                  )}

                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.3rem', color: 'var(--color-primary-dark)' }}>
                    <span>Payable Total</span>
                    <span>₹{grandTotal}</span>
                  </div>
                </div>

                {/* SELECT PAYMENT METHOD */}
                <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldCheck size={18} color="#16a34a" /> Select Payment Option
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {[
                    { id: 'upi', label: 'UPI / QR', icon: <Smartphone size={16} /> },
                    { id: 'card', label: 'Cards', icon: <CreditCard size={16} /> },
                    { id: 'netbanking', label: 'Net Banking', icon: <Building size={16} /> },
                    { id: 'wallet', label: 'Eco-Points', icon: <Wallet size={16} /> },
                    { id: 'cod', label: 'Cash on Delivery', icon: <Banknote size={16} /> },
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: '0.65rem',
                        border: paymentMethod === method.id ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
                        background: paymentMethod === method.id ? '#D8F3DC' : '#fff',
                        color: paymentMethod === method.id ? '#1B4332' : '#334155',
                        fontWeight: paymentMethod === method.id ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {method.icon}
                      {method.label}
                    </button>
                  ))}
                </div>

                {/* PAYMENT METHOD DETAILS INPUT SIMULATION */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                  {paymentMethod === 'upi' && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Enter VPA / UPI ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        placeholder="username@gpay / @paytm / @upi"
                        style={{ fontSize: '0.85rem' }}
                      />
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={13} /> Instant Verification Enabled
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>Card Number</label>
                        <input
                          type="text"
                          className="form-input"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <input type="text" className="form-input" placeholder="MM/YY" defaultValue="12/28" style={{ fontSize: '0.85rem' }} />
                        <input type="password" className="form-input" placeholder="CVV" defaultValue="•••" style={{ fontSize: '0.85rem' }} />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Select Bank</label>
                      <select className="form-select" value={selectedBank} onChange={e => setSelectedBank(e.target.value)} style={{ fontSize: '0.85rem' }}>
                        <option value="HDFC Bank">HDFC Bank Net Banking</option>
                        <option value="State Bank of India">State Bank of India (SBI)</option>
                        <option value="ICICI Bank">ICICI Bank Internet Banking</option>
                        <option value="Axis Bank">Axis Bank Net Banking</option>
                        <option value="Canara Bank">Canara Bank</option>
                      </select>
                    </div>
                  )}

                  {paymentMethod === 'wallet' && (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1B4332' }}>🌿 THULIR Eco-Points Balance</div>
                      <div style={{ fontSize: '0.8rem', color: '#2D6A4F', marginTop: 2 }}>Available: {userEcoPoints} Points (₹{userEcoPoints * 0.5} Discount Value)</div>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 4 }}>Applied Discount: ₹{ecoDiscount}</div>
                    </div>
                  )}

                  {paymentMethod === 'cod' && (
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>💵 Cash on Delivery</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>Pay cash directly to the eco delivery agent upon doorstep package arrival.</div>
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-primary btn-lg w-full"
                  onClick={handleCheckout}
                  disabled={ordering}
                  style={{ fontWeight: 800, fontSize: '1.05rem', background: '#2D6A4F', borderColor: '#2D6A4F' }}
                >
                  {ordering ? t('common.loading') : `Pay Now — ₹${grandTotal}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

