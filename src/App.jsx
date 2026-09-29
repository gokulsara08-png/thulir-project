import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CartProvider } from './contexts/CartContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import MarketplacePage from './pages/MarketplacePage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import SeedPage from './pages/SeedPage';

// Dashboards
import GeneratorDashboard from './pages/dashboards/GeneratorDashboard';
import TransportDashboard from './pages/dashboards/TransportDashboard';
import ManufacturerDashboard from './pages/dashboards/ManufacturerDashboard';
import ConsumerDashboard from './pages/dashboards/ConsumerDashboard';
import DeliveryDashboard from './pages/dashboards/DeliveryDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

function DashboardRouter() {
  const { userData, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" /><p>Loading...</p></div>;
  if (!userData) return <Navigate to="/login" replace />;
  
  const routes = {
    household: '/dashboard/generator',
    hotel: '/dashboard/generator',
    waste_generator: '/dashboard/generator',
    manufacturer: '/dashboard/manufacturer',
    transport_partner: '/dashboard/transport',
    collection_partner: '/dashboard/transport',
    consumer: '/dashboard/consumer',
    delivery_partner: '/dashboard/delivery',
    admin: '/dashboard/admin',
  };
  return <Navigate to={routes[userData.role] || '/'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<><Navbar /><LandingPage /></>} />
      <Route path="/login" element={<><Navbar /><LoginPage /></>} />
      <Route path="/signup" element={<><Navbar /><SignupPage /></>} />
      <Route path="/forgot-password" element={<><Navbar /><ForgotPasswordPage /></>} />
      <Route path="/how-it-works" element={<><Navbar /><HowItWorksPage /></>} />
      <Route path="/about" element={<><Navbar /><AboutPage /></>} />
      <Route path="/marketplace" element={<><Navbar /><MarketplacePage /></>} />
      <Route path="/marketplace/product/:id" element={<><Navbar /><ProductDetailPage /></>} />
      <Route path="/marketplace/cart" element={<><Navbar /><CartPage /></>} />
      <Route path="/seed" element={<SeedPage />} />

      {/* Dashboard redirect */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />

      {/* Protected Dashboards */}
      <Route path="/dashboard/generator" element={
        <ProtectedRoute roles={['household', 'hotel', 'waste_generator']}><Navbar /><GeneratorDashboard /></ProtectedRoute>
      } />
      <Route path="/dashboard/transport" element={
        <ProtectedRoute roles={['transport_partner', 'collection_partner']}><Navbar /><TransportDashboard /></ProtectedRoute>
      } />
      <Route path="/dashboard/manufacturer" element={
        <ProtectedRoute roles={['manufacturer']}><Navbar /><ManufacturerDashboard /></ProtectedRoute>
      } />
      <Route path="/dashboard/consumer" element={
        <ProtectedRoute roles={['consumer']}><Navbar /><ConsumerDashboard /></ProtectedRoute>
      } />
      <Route path="/dashboard/delivery" element={
        <ProtectedRoute roles={['delivery_partner']}><Navbar /><DeliveryDashboard /></ProtectedRoute>
      } />
      <Route path="/dashboard/admin" element={
        <ProtectedRoute roles={['admin']}><Navbar /><AdminDashboard /></ProtectedRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { ThemeProvider } from './contexts/ThemeContext';
import AIChatbot from './components/AIChatbot';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
              <CartProvider>
                <AppRoutes />
                <AIChatbot />
              </CartProvider>
            </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

