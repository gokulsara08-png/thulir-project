import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { getProduct, getProductJourney } from '../services/firestoreService';
import { Package, ShoppingCart, ArrowLeft, Check, Leaf, Truck, Scale, Factory, User } from 'lucide-react';
import { getProductImage } from '../utils/productImages';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [showJourney, setShowJourney] = useState(false);

  useEffect(() => {
    async function load() {
      const p = await getProduct(id);
      setProduct(p);
      try {
        const j = await getProductJourney(id);
        setJourney(j);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!product) return <div className="empty-state"><p className="empty-state-title">Product not found</p></div>;

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const journeySteps = [];
  if (journey) {
    if (journey.generator) journeySteps.push({ icon: <User size={14} />, title: 'Waste Generator', info: journey.generator.fullName, done: true });
    if (journey.wasteRequest) journeySteps.push({ icon: <Truck size={14} />, title: 'Waste Collected', info: `Type: ${journey.wasteRequest.wasteType} | Status: ${journey.wasteRequest.status}`, done: journey.wasteRequest.status === 'DELIVERED' });
    if (journey.wasteRequest?.weightStatus === 'VERIFIED') journeySteps.push({ icon: <Scale size={14} />, title: 'Weight Verified', info: `${journey.wasteRequest.verifiedCollectedWeight} kg`, done: true });
    if (journey.manufacturer) journeySteps.push({ icon: <Factory size={14} />, title: 'Manufacturer', info: journey.manufacturer.fullName, done: true });
    if (journey.processing) journeySteps.push({ icon: <Leaf size={14} />, title: 'Processing', info: `Status: ${journey.processing.status}`, done: journey.processing.status === 'COMPLETED' });
    journeySteps.push({ icon: <Package size={14} />, title: 'Product Created', info: product.name, done: true });
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ padding: 'var(--space-8) var(--space-6)' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-6)' }}>
          <ArrowLeft size={18} /> {t('common.back')}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-8)' }}>
          <div className="product-image" style={{ height: 400, borderRadius: 'var(--radius-2xl)', overflow: 'hidden' }}>
            <img src={getProductImage(product)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div>
            <span className="badge badge-success" style={{ marginBottom: 'var(--space-3)' }}>{product.category}</span>
            <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>{product.name}</h1>
            <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--space-4)' }}>by {product.manufacturerName || 'Manufacturer'}</p>
            <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.7, marginBottom: 'var(--space-6)' }}>{product.description}</p>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-primary-dark)' }}>₹{product.price}</span>
              <span style={{ color: 'var(--color-gray-400)' }}>{product.availableQuantity} {t('marketplace.available')}</span>
            </div>

            {product.wasteType && (
              <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                <Leaf size={16} /> Made from recycled {product.wasteType}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              <button className="btn btn-primary btn-lg" onClick={handleAdd} disabled={product.availableQuantity < 1} style={{ flex: 1 }}>
                {added ? <><Check size={18} /> Added!</> : <><ShoppingCart size={18} /> {t('marketplace.addToCart')}</>}
              </button>
            </div>

            <button className="btn btn-secondary w-full" onClick={() => setShowJourney(!showJourney)}>
              <Leaf size={16} /> {t('marketplace.viewJourney')}
            </button>
          </div>
        </div>

        {showJourney && journeySteps.length > 0 && (
          <div className="card" style={{ marginTop: 'var(--space-8)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-6)' }}>{t('dashboard.productJourney')}</h2>
            <div className="journey-timeline">
              {journeySteps.map((step, i) => (
                <div className="journey-step" key={i}>
                  <div className={`journey-dot ${step.done ? 'completed' : ''}`}>
                    {step.done && <Check size={12} style={{ color: 'white' }} />}
                  </div>
                  <div className="journey-step-title">{step.title}</div>
                  <div className="journey-step-info">{step.info}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
