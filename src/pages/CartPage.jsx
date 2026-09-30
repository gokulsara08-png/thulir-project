import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../services/firestoreService';
import { calculateDeliveryFee, createDeliveryPayment } from '../services/financialService';
import LocationPickerInput from '../components/LocationPickerInput';
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, Package, Truck } from 'lucide-react';
import { useState } from 'react';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Delivery fee calculation (Base ₹25 + distance calculation)
  const deliveryInfo = calculateDeliveryFee(5); // Default 5km delivery radius calculation
  const deliveryFee = deliveryInfo.totalDeliveryFee; // ₹55
  const grandTotal = totalPrice + deliveryFee;

  const handleCheckout = async () => {
    if (!user) return navigate('/login');
    if (!address.trim()) return setError('Please enter a shipping address');
    if (items.length === 0) return;

    setOrdering(true);
    setError('');
    try {
      const order = await createOrder(user.uid, items, address, { 
        deliveryFee, 
        grandTotal,
        consumerName: user.displayName || user.email || 'Consumer'
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
      setSuccess(`Order ${order.orderId} placed successfully! Total: ₹${grandTotal}`);
      setTimeout(() => navigate('/dashboard/consumer'), 1800);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || t('common.error'));
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: 'var(--space-8) var(--space-6)', maxWidth: 800 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={18} /> {t('common.back')}
        </button>

        <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-6)' }}>{t('dashboard.cart')}</h1>

        {success && <div className="alert alert-success">{success}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {items.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={64} />
            <p className="empty-state-title">{t('marketplace.emptyCart')}</p>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/marketplace')}>
              {t('hero.ctaSecondary')}
            </button>
          </div>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              {items.map(item => (
                <div className="cart-item" key={item.productId}>
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

            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>
                📋 Order & Delivery Fee Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                  <span>Products Subtotal ({items.length} items)</span>
                  <span style={{ fontWeight: 600 }}>₹{totalPrice}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284C7', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Truck size={16} /> Eco Logistics Delivery Fee (Base ₹{deliveryInfo.baseFee} + Dist ₹{deliveryInfo.distanceCharge})
                  </span>
                  <span style={{ fontWeight: 600 }}>+₹{deliveryFee}</span>
                </div>

                <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '0.75rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.3rem', color: 'var(--color-primary-dark)' }}>
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>

              <LocationPickerInput
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                label="Shipping Delivery Address"
                placeholder="Click 📍 Live Location or pick TN City address..."
                required
                autoDetectOnMount={true}
              />

              <button className="btn btn-primary btn-lg w-full" onClick={handleCheckout} disabled={ordering}>
                {ordering ? t('common.loading') : `Place Order — ₹${grandTotal}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
