import { useState } from 'react';
import { seedDemoData, seedSampleProducts, seedSampleOrders } from '../utils/seedData';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, CheckCircle, AlertCircle, Loader, Database, Users, Package, ShoppingCart } from 'lucide-react';

export default function SeedPage() {
  const { user, userData } = useAuth();
  const [seedStatus, setSeedStatus] = useState('idle');
  const [productStatus, setProductStatus] = useState('idle');
  const [orderStatus, setOrderStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  // Override console.log to capture output
  const captureLog = (fn) => {
    const origLog = console.log;
    const origError = console.error;
    const captured = [];
    console.log = (...args) => { captured.push(args.join(' ')); origLog(...args); };
    console.error = (...args) => { captured.push('❌ ' + args.join(' ')); origError(...args); };
    return fn().then(result => {
      console.log = origLog;
      console.error = origError;
      setLogs(prev => [...prev, ...captured]);
      return result;
    }).catch(err => {
      console.log = origLog;
      console.error = origError;
      setLogs(prev => [...prev, ...captured, '❌ ' + err.message]);
      throw err;
    });
  };

  const handleSeedUsers = async () => {
    setSeedStatus('loading');
    setError('');
    try {
      await captureLog(() => seedDemoData());
      setSeedStatus('done');
    } catch (err) {
      setError(err.message);
      setSeedStatus('error');
    }
  };

  const handleSeedProducts = async () => {
    if (!user || userData?.role !== 'manufacturer') {
      setError('Please log in as a manufacturer first (manufacturer@thulir.demo / demo123456)');
      return;
    }
    setProductStatus('loading');
    setError('');
    try {
      await captureLog(() => seedSampleProducts(user.uid, userData.fullName));
      setProductStatus('done');
    } catch (err) {
      setError(err.message);
      setProductStatus('error');
    }
  };

  const handleSeedOrders = async () => {
    const consumerUid = user?.uid || 'demo-consumer-id';
    const consumerName = userData?.fullName || 'Sample Consumer';
    setOrderStatus('loading');
    setError('');
    try {
      await captureLog(() => seedSampleOrders(consumerUid, consumerName));
      setOrderStatus('done');
    } catch (err) {
      setError(err.message);
      setOrderStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FAFAF5, #D8F3DC)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 600, width: '100%', background: 'white', borderRadius: '1.5rem', boxShadow: '0 20px 25px rgba(0,0,0,0.08)', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Leaf size={32} color="#2D6A4F" />
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#2D6A4F', fontFamily: 'Outfit, sans-serif' }}>THULIR</h1>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#343A40', marginBottom: '0.25rem' }}>Database Setup</h2>
          <p style={{ color: '#6C757D', fontSize: '0.875rem' }}>Seed demo accounts and sample data into Firebase</p>
        </div>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Step 1: Seed Users */}
        <div style={{ background: '#F8F9FA', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D8F3DC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2D6A4F', fontWeight: 700 }}>1</div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Create Demo Accounts</h3>
              <p style={{ fontSize: '0.75rem', color: '#6C757D' }}>Creates 6 users (one for each role)</p>
            </div>
          </div>
          <button
            onClick={handleSeedUsers}
            disabled={seedStatus === 'loading'}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: 'none',
              background: seedStatus === 'done' ? '#2D6A4F' : '#40916C', color: 'white',
              fontWeight: 600, cursor: seedStatus === 'loading' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              fontSize: '0.875rem', opacity: seedStatus === 'loading' ? 0.7 : 1
            }}
          >
            {seedStatus === 'loading' && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {seedStatus === 'done' && <CheckCircle size={16} />}
            {seedStatus === 'idle' && <Users size={16} />}
            {seedStatus === 'loading' ? 'Creating accounts...' : seedStatus === 'done' ? 'Accounts Created!' : 'Create Demo Accounts'}
          </button>
        </div>

        {/* Step 2: Seed Products */}
        <div style={{ background: '#F8F9FA', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309', fontWeight: 700 }}>2</div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Add Sample Products</h3>
              <p style={{ fontSize: '0.75rem', color: '#6C757D' }}>First log in as manufacturer, then click below</p>
            </div>
          </div>
          {user && userData?.role === 'manufacturer' ? (
            <button
              onClick={handleSeedProducts}
              disabled={productStatus === 'loading'}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: 'none',
                background: productStatus === 'done' ? '#2D6A4F' : '#DDA15E', color: 'white',
                fontWeight: 600, cursor: productStatus === 'loading' ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                fontSize: '0.875rem', opacity: productStatus === 'loading' ? 0.7 : 1
              }}
            >
              {productStatus === 'loading' && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              {productStatus === 'done' && <CheckCircle size={16} />}
              {productStatus === 'idle' && <Package size={16} />}
              {productStatus === 'loading' ? 'Creating products...' : productStatus === 'done' ? 'Products Created!' : 'Create Sample Products'}
            </button>
          ) : (
            <p style={{ fontSize: '0.875rem', color: '#6C757D', background: '#FEF3C7', padding: '0.75rem', borderRadius: '0.5rem', textAlign: 'center' }}>
              Log in as <strong>manufacturer@thulir.demo</strong> (password: demo123456), then come back here.
            </p>
          )}
        </div>

        {/* Step 3: Seed Orders */}
        <div style={{ background: '#F8F9FA', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369A1', fontWeight: 700 }}>3</div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Seed Consumer Demo Orders</h3>
              <p style={{ fontSize: '0.75rem', color: '#6C757D' }}>Generates demo marketplace orders & payouts</p>
            </div>
          </div>
          <button
            onClick={handleSeedOrders}
            disabled={orderStatus === 'loading'}
            style={{
              width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: 'none',
              background: orderStatus === 'done' ? '#2D6A4F' : '#0284C7', color: 'white',
              fontWeight: 600, cursor: orderStatus === 'loading' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              fontSize: '0.875rem', opacity: orderStatus === 'loading' ? 0.7 : 1
            }}
          >
            {orderStatus === 'loading' && <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {orderStatus === 'done' && <CheckCircle size={16} />}
            {orderStatus === 'idle' && <ShoppingCart size={16} />}
            {orderStatus === 'loading' ? 'Creating orders...' : orderStatus === 'done' ? 'Orders Created!' : 'Create Consumer Orders'}
          </button>
        </div>
        {seedStatus === 'done' && (
          <div style={{ background: '#D8F3DC', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', color: '#1B4332' }}>📋 Demo Accounts Created</h3>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #95D5B2' }}>
                  <th style={{ textAlign: 'left', padding: '0.25rem 0', color: '#1B4332' }}>Role</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem 0', color: '#1B4332' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '0.25rem 0', color: '#1B4332' }}>Password</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Household', 'household@thulir.demo', 'demo123456'],
                  ['Hotel', 'hotel@thulir.demo', 'demo123456'],
                  ['Commercial Office', 'office@thulir.demo', 'demo123456'],
                  ['Other Establishment', 'other@thulir.demo', 'demo123456'],
                  ['Manufacturer', 'manufacturer@thulir.demo', 'demo123456'],
                  ['Transport', 'transport@thulir.demo', 'demo123456'],
                  ['Consumer', 'consumer@thulir.demo', 'demo123456'],
                  ['Delivery', 'delivery@thulir.demo', 'demo123456'],
                  ['Admin', 'admin@thulir.demo', 'adminThulir2026!'],
                ].map(([role, email, pw]) => (
                  <tr key={role} style={{ borderBottom: '1px solid #B7E4C7' }}>
                    <td style={{ padding: '0.4rem 0', fontWeight: 600 }}>{role}</td>
                    <td style={{ padding: '0.4rem 0' }}>{email}</td>
                    <td style={{ padding: '0.4rem 0', fontFamily: 'monospace' }}>{pw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div style={{ background: '#212529', borderRadius: '0.75rem', padding: '1rem', maxHeight: 200, overflowY: 'auto' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#95D5B2', marginBottom: '0.5rem' }}>Console Output</p>
            {logs.map((log, i) => (
              <p key={i} style={{ fontSize: '0.7rem', color: log.startsWith('❌') ? '#FCA5A5' : '#D1D5DB', fontFamily: 'monospace', margin: '2px 0' }}>{log}</p>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/" style={{ color: '#2D6A4F', fontWeight: 600, fontSize: '0.875rem' }}>← Back to Home</a>
          {' • '}
          <a href="/login" style={{ color: '#2D6A4F', fontWeight: 600, fontSize: '0.875rem' }}>Go to Login →</a>
        </div>
      </div>
    </div>
  );
}
