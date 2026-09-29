import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf } from 'lucide-react';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Leaf size={24} />
              {t('app.name')}
            </div>
            <p className="footer-tagline">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="footer-title">{t('footer.platform')}</h4>
            <div className="footer-links">
              <Link to="/how-it-works">{t('nav.howItWorks')}</Link>
              <Link to="/marketplace">{t('nav.marketplace')}</Link>
              <Link to="/about">{t('nav.about')}</Link>
            </div>
          </div>
          <div>
            <h4 className="footer-title">{t('footer.resources')}</h4>
            <div className="footer-links">
              <a href="#">{t('footer.faq')}</a>
              <a href="#">{t('footer.support')}</a>
              <Link to="/login">{t('nav.login')}</Link>
            </div>
          </div>
          <div>
            <h4 className="footer-title">{t('footer.legal')}</h4>
            <div className="footer-links">
              <a href="#">{t('footer.privacy')}</a>
              <a href="#">{t('footer.terms')}</a>
              <a href="#">{t('footer.contact')}</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
}
