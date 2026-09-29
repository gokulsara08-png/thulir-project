import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Leaf, Recycle, Truck, Factory, ShoppingBag, Package, ArrowRight,
  Users, Scale, CheckCircle, TrendingUp, Heart, Eye, Shield, Sparkles
} from 'lucide-react';
import Footer from '../components/Footer';
import { getAllWasteRequests, getAllProducts, getAllUsers } from '../services/firestoreService';

export default function LandingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [liveStats, setLiveStats] = useState({
    wasteCollected: '0 kg',
    productsCreated: '0',
    happyUsers: '0'
  });

  useEffect(() => {
    let isMounted = true;
    async function loadLiveStats() {
      try {
        const [requests, products, users] = await Promise.all([
          getAllWasteRequests(),
          getAllProducts(),
          getAllUsers()
        ]);

        if (!isMounted) return;

        // Calculate sum of verified or reported weight in kg from all recorded waste requests
        const totalKg = requests.reduce((sum, r) => {
          const w = Number(r.verifiedCollectedWeight || r.verifiedWeight || r.weight || r.generatorReportedWeight || r.pricing?.estimatedWeightKg || 0);
          return sum + w;
        }, 0);

        setLiveStats({
          wasteCollected: totalKg > 0 ? `${totalKg.toLocaleString()} kg` : `${requests.length > 0 ? requests.length + ' requests' : '0 kg'}`,
          productsCreated: `${products.length}`,
          happyUsers: `${users.length > 0 ? users.length : 9}`
        });
      } catch (err) {
        console.warn('Failed to load live landing stats:', err);
      }
    }
    loadLiveStats();
    return () => { isMounted = false; };
  }, []);

  const ecoSteps = [
    { icon: <Recycle size={28} />, label: t('ecosystem.waste') },
    { icon: <Truck size={28} />, label: t('ecosystem.collect') },
    { icon: <Scale size={28} />, label: t('ecosystem.verify') },
    { icon: <Factory size={28} />, label: t('ecosystem.manufacture') },
    { icon: <Package size={28} />, label: t('ecosystem.create') },
    { icon: <Truck size={28} />, label: t('ecosystem.deliver') },
    { icon: <Leaf size={28} />, label: t('ecosystem.reuse') },
  ];

  const roles = [
    { icon: '🏠', name: t('roles.household'), desc: t('roles.householdDesc') },
    { icon: '🏨', name: t('roles.hotel'), desc: t('roles.hotelDesc') },
    { icon: '🏢', name: t('roles.office'), desc: t('roles.officeDesc') },
    { icon: '📍', name: t('roles.other'), desc: t('roles.otherDesc') },
    { icon: '🚛', name: t('roles.collectionPartner'), desc: t('roles.collectionPartnerDesc') },
    { icon: '🏭', name: t('roles.manufacturer'), desc: t('roles.manufacturerDesc') },
    { icon: '🛒', name: t('roles.consumer'), desc: t('roles.consumerDesc') },
    { icon: '📦', name: t('roles.deliveryPartner'), desc: t('roles.deliveryPartnerDesc') },
  ];

  const steps = [
    { title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc') },
    { title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc') },
    { title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc') },
    { title: t('howItWorks.step4Title'), desc: t('howItWorks.step4Desc') },
    { title: t('howItWorks.step5Title'), desc: t('howItWorks.step5Desc') },
    { title: t('howItWorks.step6Title'), desc: t('howItWorks.step6Desc') },
  ];

  return (
    <div className="page-wrapper">
      {/* Hero */}
      <section className="hero">
        <div className="hero-decoration" />
        <div className="hero-decoration" />
        <div className="hero-decoration" />
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Leaf size={16} /> {t('hero.badge')}
            </div>
            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
              {t('app.tagline')}
            </h1>
            <p className="hero-subtitle">{t('app.subtitle')}</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate(user ? '/dashboard/generator' : '/signup')}>
                {t('hero.cta')} <ArrowRight size={18} />
              </button>
              <Link to="/marketplace" className="btn btn-secondary btn-lg">
                {t('hero.ctaSecondary')}
              </Link>
            </div>

            {/* Live Calculated Stats Pills */}
            <div style={{ 
              display: 'flex', justifyContent: 'center', gap: 'var(--space-8)', 
              marginTop: 'var(--space-12)', flexWrap: 'wrap',
              animation: 'fadeInUp 0.6s ease 0.6s both'
            }}>
              {[
                { icon: <Recycle size={20} />, val: liveStats.wasteCollected, label: t('stats.wasteCollected') },
                { icon: <Package size={20} />, val: liveStats.productsCreated, label: t('stats.productsCreated') },
                { icon: <Users size={20} />, val: liveStats.happyUsers, label: t('stats.happyUsers') },
              ].map((s, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
                  padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(45,106,79,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <span style={{ color: 'var(--color-primary)' }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-gray-800)' }}>{s.val}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Flow */}
      <section className="section" style={{ background: 'var(--color-white)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">🔄 {t('ecosystem.title')}</h2>
            <p className="section-subtitle">{t('ecosystem.subtitle')}</p>
          </div>
          <div className="ecosystem-flow">
            {ecoSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="eco-step">
                  <div className="eco-step-icon">{step.icon}</div>
                  <span className="eco-step-label">{step.label}</span>
                </div>
                {i < ecoSteps.length - 1 && (
                  <ArrowRight size={20} className="eco-arrow" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="section" style={{ background: 'var(--color-off-white)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">👥 {t('roles.title')}</h2>
            <p className="section-subtitle">{t('roles.subtitle')}</p>
          </div>
          <div className="roles-grid">
            {roles.map((role, i) => (
              <div className="role-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="role-icon">{role.icon}</div>
                <h3 className="role-name">{role.name}</h3>
                <p className="role-desc">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: 'var(--color-white)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">⚡ {t('howItWorks.title')}</h2>
            <p className="section-subtitle">{t('howItWorks.subtitle')}</p>
          </div>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div className="step-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="step-number">{i + 1}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section" style={{ background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5, #fefce8)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">🌿 {t('about.title')}</h2>
            <p className="section-subtitle">{t('about.subtitle')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-8)' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #D8F3DC, #B7E4C7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={22} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h3 style={{ fontSize: 'var(--text-xl)' }}>{t('about.mission')}</h3>
              </div>
              <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.8 }}>{t('about.missionText')}</p>
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={22} style={{ color: '#2563EB' }} />
                </div>
                <h3 style={{ fontSize: 'var(--text-xl)' }}>{t('about.vision')}</h3>
              </div>
              <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.8 }}>{t('about.visionText')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section" style={{ 
        background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-primary-light) 100%)', 
        backgroundSize: '200% 200%',
        animation: 'gradientShift 6s ease infinite',
        textAlign: 'center', color: 'white', position: 'relative', overflow: 'hidden' 
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -80, left: -60 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -40, right: -30 }} />
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-4xl)' }}>🌍</div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'white' }}>
            {t('hero.cleanerPlanet')}
          </h2>
          <p style={{ fontSize: 'var(--text-lg)', opacity: 0.85, marginBottom: 'var(--space-8)', maxWidth: 550, margin: '0 auto var(--space-8)' }}>
            {t('hero.joinCircular')}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-lg" style={{ 
              background: 'white', color: 'var(--color-primary-dark)', fontWeight: 700,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)' 
            }}>
              {t('nav.getStarted')} <ArrowRight size={18} />
            </Link>
            <Link to="/marketplace" className="btn btn-lg" style={{ 
              background: 'rgba(255,255,255,0.15)', color: 'white', 
              border: '2px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(8px)' 
            }}>
              {t('hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
