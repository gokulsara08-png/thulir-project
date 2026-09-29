import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../services/firestoreService';
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft, Package } from 'lucide-react';
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

  const handleCheckout = async () => {
    if (!user) return navigate('/login');
    if (!address.trim()) return setError('Please enter a shipping address');
    if (items.length === 0) return;

    setOrdering(true);
    setError('');
    try {
      const order = await createOrder(user.uid, items, address);
      clearCart();
      setSuccess(`Order ${order.orderId} placed successfully!`);
      setTimeout(() => navigate('/dashboard/consumer'), 2000);
    } catch (err) {
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{t('marketplace.total')}</span>
                <span style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-primary-dark)' }}>₹{totalPrice}</span>
              </div>

              <div className="form-group">
                <label className="form-label">Shipping Address</label>
                <textarea className="form-input" rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your full delivery address..." />
              </div>

              <button className="btn btn-primary btn-lg w-full" onClick={handleCheckout} disabled={ordering}>
                {ordering ? t('common.loading') : t('marketplace.placeOrder')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
