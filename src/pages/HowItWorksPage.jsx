import { useLanguage } from '../contexts/LanguageContext';
import Footer from '../components/Footer';
import { Leaf, Truck, Scale, Factory, ShoppingBag, Package } from 'lucide-react';

export default function HowItWorksPage() {
  const { t } = useLanguage();
  const steps = [
    { icon: <Leaf size={32} />, title: t('howItWorks.step1Title'), desc: t('howItWorks.step1Desc'), color: '#D8F3DC' },
    { icon: <Truck size={32} />, title: t('howItWorks.step2Title'), desc: t('howItWorks.step2Desc'), color: '#FEF3C7' },
    { icon: <Scale size={32} />, title: t('howItWorks.step3Title'), desc: t('howItWorks.step3Desc'), color: '#DBEAFE' },
    { icon: <Factory size={32} />, title: t('howItWorks.step4Title'), desc: t('howItWorks.step4Desc'), color: '#FCE7F3' },
    { icon: <ShoppingBag size={32} />, title: t('howItWorks.step5Title'), desc: t('howItWorks.step5Desc'), color: '#E0E7FF' },
    { icon: <Package size={32} />, title: t('howItWorks.step6Title'), desc: t('howItWorks.step6Desc'), color: '#D8F3DC' },
  ];

  return (
    <div className="page-wrapper">
      <section className="section" style={{ background: 'linear-gradient(135deg, var(--color-off-white), var(--color-primary-bg))' }}>
        <div className="container">
          <div className="section-header">
            <h1 className="section-title">{t('howItWorks.title')}</h1>
            <p className="section-subtitle">{t('howItWorks.subtitle')}</p>
          </div>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-8)', opacity: 0, animation: `fadeUp 0.5s ease ${i * 0.15}s forwards` }}>
                <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-xl)', background: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary-dark)' }}>
                  {step.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-sm)', fontWeight: 700 }}>{i + 1}</span>
                    <h3 style={{ fontSize: 'var(--text-lg)' }}>{step.title}</h3>
                  </div>
                  <p style={{ color: 'var(--color-gray-500)', lineHeight: 1.7 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
