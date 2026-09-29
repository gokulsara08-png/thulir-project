import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Menu } from 'lucide-react';

export default function DashboardLayout({ sidebar, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        {sidebar}
      </aside>
      <main className="dashboard-content">
        <button 
          className="btn btn-ghost btn-icon" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ display: 'none', marginBottom: 'var(--space-4)' }}
          id="sidebar-toggle"
        >
          <Menu size={20} />
        </button>
        <style>{`
          @media (max-width: 1024px) {
            #sidebar-toggle { display: flex !important; }
          }
        `}</style>
        {children}
      </main>
      {sidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 149 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
