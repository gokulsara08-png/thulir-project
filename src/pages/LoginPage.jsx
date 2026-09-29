import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf, Mail, Lock, AlertCircle } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';

const ROLE_ROUTES = {
  household: '/dashboard/generator',
  hotel: '/dashboard/generator',
  office: '/dashboard/generator',
  other: '/dashboard/generator',
  commercial: '/dashboard/generator',
  waste_generator: '/dashboard/generator',
  manufacturer: '/dashboard/manufacturer',
  transport_partner: '/dashboard/transport',
  collection_partner: '/dashboard/transport',
  consumer: '/dashboard/consumer',
  delivery_partner: '/dashboard/delivery',
  admin: '/dashboard/admin'
};

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim()) return setError(t('common.requiredField'));
    if (!password.trim()) return setError(t('common.requiredField'));

    setLoading(true);
    try {
      const userData = await login(email, password);
      const route = ROLE_ROUTES[userData.role] || '/';
      navigate(route, { replace: true });
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Leaf size={32} />
            {t('app.name')}
          </div>
          <h2 className="auth-title">{t('auth.welcomeBack')}</h2>
          <p className="auth-subtitle">{t('auth.welcomeMessage')}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: 40 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: 'var(--space-4)' }}>
            <Link to="/forgot-password" className="auth-link" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)' }}>
              {t('auth.forgotPassword')}
            </Link>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? t('common.loading') : t('auth.login')}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link">
            {t('auth.dontHaveAccount')}{' '}
            <Link to="/signup">{t('auth.createAccount')}</Link>
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
}
