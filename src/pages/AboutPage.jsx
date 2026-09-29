import { useLanguage } from '../contexts/LanguageContext';
import Footer from '../components/Footer';
import { Heart, Eye, Shield, Lightbulb, Leaf, Users, Globe } from 'lucide-react';

export default function AboutPage() {
  const { t } = useLanguage();
  const values = [
    { icon: <Leaf size={24} />, title: t('about.sustainability'), desc: t('about.sustainabilityDesc') },
    { icon: <Eye size={24} />, title: t('about.transparency'), desc: t('about.transparencyDesc') },
    { icon: <Users size={24} />, title: t('about.community'), desc: t('about.communityDesc') },
    { icon: <Lightbulb size={24} />, title: t('about.innovation'), desc: t('about.innovationDesc') },
  ];

  return (
    <div className="page-wrapper">
      <section className="section" style={{ background: 'linear-gradient(135deg, var(--color-off-white), var(--color-cream))' }}>
        <div className="container">
          <div className="section-header">
            <h1 className="section-title">{t('about.title')}</h1>
            <p className="section-subtitle">{t('about.subtitle')}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-8)', marginBottom: 'var(--space-16)' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <Heart size={24} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: 'var(--text-xl)' }}>{t('about.mission')}</h2>
              </div>
              <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.8 }}>{t('about.missionText')}</p>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--color-accent-warm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <Globe size={24} style={{ color: 'var(--color-accent-warm)' }} />
                <h2 style={{ fontSize: 'var(--text-xl)' }}>{t('about.vision')}</h2>
              </div>
              <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.8 }}>{t('about.visionText')}</p>
            </div>
          </div>
          <div className="section-header"><h2 className="section-title">{t('about.values')}</h2></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-6)' }}>
            {values.map((v, i) => (
              <div className="card" key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)', color: 'var(--color-primary)' }}>
                  {v.icon}
                </div>
                <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{v.title}</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)', lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
