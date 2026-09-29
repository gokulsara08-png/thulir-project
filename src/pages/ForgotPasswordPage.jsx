import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Leaf, Mail, AlertCircle, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError(t('common.requiredField'));
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo"><Leaf size={32} />{t('app.name')}</div>
          <h2 className="auth-title">{t('auth.resetPassword')}</h2>
          <p className="auth-subtitle">{t('auth.resetPasswordMessage')}</p>
        </div>

        {success ? (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            Password reset link sent! Check your email.
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error"><AlertCircle size={18} />{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.email')}</label>
                <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading ? t('common.loading') : t('auth.sendResetLink')}
              </button>
            </form>
          </>
        )}

        <div className="auth-footer">
          <Link to="/login" className="auth-link" style={{ color: 'var(--color-primary)' }}>{t('auth.backToLogin')}</Link>
        </div>
      </div>
    </div>
  );
}
