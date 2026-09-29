import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Leaf, Menu, X, Bell, ShoppingCart, LogOut, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import LanguageSelector from './LanguageSelector';
import NotificationPanel from './NotificationPanel';
import { useCart } from '../contexts/CartContext';

const ROLE_ROUTES = {
  household: '/dashboard/generator',
  hotel: '/dashboard/generator',
  waste_generator: '/dashboard/generator',
  manufacturer: '/dashboard/manufacturer',
  transport_partner: '/dashboard/transport',
  collection_partner: '/dashboard/transport',
  consumer: '/dashboard/consumer',
  delivery_partner: '/dashboard/delivery',
  admin: '/dashboard/admin'
};

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const { t } = useLanguage();
  const { unreadCount, togglePanel, showPanel } = useNotifications();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const dashboardRoute = userData ? ROLE_ROUTES[userData.role] || '/dashboard' : '/dashboard';
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <Leaf size={28} />
            {t('app.name')}
          </Link>

          <div className="navbar-links">
            <Link to="/" className={isActive('/')}>{t('nav.home')}</Link>
            <Link to="/how-it-works" className={isActive('/how-it-works')}>{t('nav.howItWorks')}</Link>
            <Link to="/marketplace" className={isActive('/marketplace')}>{t('nav.marketplace')}</Link>
            <Link to="/about" className={isActive('/about')}>{t('nav.about')}</Link>
          </div>

          <div className="navbar-actions">
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <LanguageSelector />

            {user && (
              <>
                <Link to="/marketplace/cart" className="btn btn-icon" style={{ position: 'relative' }}>
                  <ShoppingCart size={20} />
                  {totalItems > 0 && <span className="notification-badge">{totalItems}</span>}
                </Link>
                <button className="btn btn-icon" onClick={togglePanel} style={{ position: 'relative' }}>
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </button>
                <Link to={dashboardRoute} className="btn btn-sm btn-secondary">{t('nav.dashboard')}</Link>
                <button onClick={handleLogout} className="btn btn-icon btn-ghost" title={t('nav.logout')}>
                  <LogOut size={18} />
                </button>
              </>
            )}

            {!user && (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">{t('nav.login')}</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">{t('nav.getStarted')}</Link>
              </>
            )}

            <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <div className={`mobile-nav ${mobileOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMobileOpen(false)}>{t('nav.home')}</Link>
        <Link to="/how-it-works" onClick={() => setMobileOpen(false)}>{t('nav.howItWorks')}</Link>
        <Link to="/marketplace" onClick={() => setMobileOpen(false)}>{t('nav.marketplace')}</Link>
        <Link to="/about" onClick={() => setMobileOpen(false)}>{t('nav.about')}</Link>
        {user ? (
          <>
            <Link to={dashboardRoute} onClick={() => setMobileOpen(false)}>{t('nav.dashboard')}</Link>
            <button className="btn btn-primary w-full" onClick={() => { handleLogout(); setMobileOpen(false); }}>{t('nav.logout')}</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setMobileOpen(false)}>{t('nav.login')}</Link>
            <Link to="/signup" className="btn btn-primary w-full" onClick={() => setMobileOpen(false)}>{t('nav.getStarted')}</Link>
          </>
        )}
        <LanguageSelector />
      </div>

      <NotificationPanel />
    </>
  );
}
