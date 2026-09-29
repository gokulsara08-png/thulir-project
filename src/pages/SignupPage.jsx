import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf, AlertCircle, CheckCircle } from 'lucide-react';
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
};

const ROLES = [
  { value: 'household', label: '🏠 Household' },
  { value: 'hotel', label: '🏨 Hotel / Restaurant' },
  { value: 'office', label: '🏢 Commercial Office / IT Park' },
  { value: 'other', label: '📍 Other Establishment (Specify Below)' },
  { value: 'manufacturer', label: '🏭 Recycling Manufacturer' },
  { value: 'transport_partner', label: '🚛 Transport & Logistics Partner' },
  { value: 'consumer', label: '🛒 Eco Consumer' },
  { value: 'delivery_partner', label: '📦 Delivery Partner' },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '', location: '', role: '', customRoleDetails: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.fullName.trim()) return t('common.requiredField');
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t('common.invalidEmail');
    if (!form.phone.trim()) return t('common.invalidPhone');
    if (form.password.length < 6) return t('common.passwordTooShort');
    if (form.password !== form.confirmPassword) return t('common.passwordMismatch');
    if (!form.location.trim()) return t('common.requiredField');
    if (!form.role) return t('common.requiredField');
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) return setError(validationError);

    setLoading(true);
    try {
      await signup(form.email, form.password, {
        fullName: form.fullName,
        phone: form.phone,
        location: form.location,
        role: form.role,
        customRoleDetails: form.customRoleDetails || '',
      });
      navigate(ROLE_ROUTES[form.role] || '/', { replace: true });
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else {
        setError(err.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-header">
          <div className="auth-logo">
            <Leaf size={32} />
            {t('app.name')}
          </div>
          <h2 className="auth-title">{t('auth.signup')}</h2>
          <p className="auth-subtitle">{t('auth.signupMessage')}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.fullName')}</label>
            <input type="text" className="form-input" value={form.fullName} onChange={update('fullName')} placeholder="John Doe" required />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input type="email" className="form-input" value={form.email} onChange={update('email')} placeholder="you@example.com" required />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.phone')}</label>
            <input type="tel" className="form-input" value={form.phone} onChange={update('phone')} placeholder="+91 98765 43210" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <input type="password" className="form-input" value={form.password} onChange={update('password')} placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auth.confirmPassword')}</label>
              <input type="password" className="form-input" value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="••••••••" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.location')}</label>
            <input type="text" className="form-input" value={form.location} onChange={update('location')} placeholder="Your city or area" required />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.role')}</label>
            <select className="form-select" value={form.role} onChange={update('role')} required>
              <option value="">Select your role...</option>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {(form.role === 'other' || form.role === 'office') && (
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                Specify Establishment / Place Type *
              </label>
              <input 
                type="text" 
                className="form-input" 
                value={form.customRoleDetails} 
                onChange={update('customRoleDetails')} 
                placeholder={form.role === 'office' ? 'e.g. IT Park, Corporate Office, Business Center' : 'e.g. School, Hospital, Shopping Mall, Factory Canteen'} 
                required 
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>This helps customize your waste collection and rate card.</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? t('common.loading') : t('auth.createAccount')}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-link">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login">{t('auth.login')}</Link>
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
}
