import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { subscribeToProducts } from '../services/firestoreService';
import { Search, ShoppingCart, Package, Filter } from 'lucide-react';
import Footer from '../components/Footer';

import { getProductImage } from '../utils/productImages';

const CATEGORIES = ['All', 'Compost', 'Fertilizer', 'Recycled Plastic', 'Recycled Paper', 'Recycled Glass', 'Recycled Metal', 'Bio Products', 'Other'];

export default function MarketplacePage() {
  const { t } = useLanguage();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    const unsub = subscribeToProducts((prods) => {
      setProducts(prods);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || p.category === category;
    return matchSearch && matchCat;
  });

  const handleAddToCart = (product) => {
    addToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div className="page-wrapper">
      <section className="section" style={{ paddingTop: 'var(--space-8)' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 'var(--space-6)' }}>
            <h1 className="section-title">{t('marketplace.title')}</h1>
            <p className="section-subtitle">Eco-friendly products made from recycled waste</p>
          </div>

          <div className="marketplace-header">
            <div className="search-input-wrap">
              <Search size={18} />
              <input type="text" className="form-input" style={{ paddingLeft: 44 }} placeholder={t('marketplace.search')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="category-pills" style={{ marginBottom: 'var(--space-8)' }}>
            {CATEGORIES.map(cat => (
              <button key={cat} className={`category-pill ${category === cat ? 'active' : ''}`} onClick={() => setCategory(cat)}>
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Package size={64} />
              <p className="empty-state-title">{t('marketplace.noProducts')}</p>
              <p className="empty-state-text">Products will appear here when manufacturers publish them.</p>
            </div>
          ) : (
            <div className="products-grid">
              {filtered.map(product => (
                <div className="product-card" key={product.id}>
                  <div className="product-image">
                    <img src={getProductImage(product)} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div className="product-info">
                    <span className="product-category">{product.category}</span>
                    <h3 className="product-name">{product.name}</h3>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', marginBottom: 'var(--space-2)' }}>
                      by {product.manufacturerName || 'Manufacturer'}
                    </p>
                    <div className="product-meta">
                      <span className="product-price">₹{product.price}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)' }}>
                        {product.availableQuantity} {t('marketplace.available')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                      <Link to={`/marketplace/product/${product.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                        {t('marketplace.viewDetails')}
                      </Link>
                      <button 
                        className="btn btn-primary btn-sm" 
                        style={{ flex: 1 }}
                        onClick={() => handleAddToCart(product)}
                        disabled={product.availableQuantity < 1}
                      >
                        {addedId === product.id ? '✓ Added!' : t('marketplace.addToCart')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
