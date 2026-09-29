import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { X, Bell } from 'lucide-react';

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationPanel() {
  const { notifications, showPanel, togglePanel, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { t } = useLanguage();

  return (
    <>
      {showPanel && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 199 }} onClick={togglePanel} />}
      <div className={`notification-panel ${showPanel ? 'open' : ''}`}>
        <div className="notification-panel-header">
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{t('notifications.title')}</h3>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAllAsRead}>
                {t('notifications.markAllRead')}
              </button>
            )}
            <button className="btn btn-icon" onClick={togglePanel}><X size={18} /></button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <p className="empty-state-title">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              className={`notification-item ${notif.read ? '' : 'unread'}`}
              onClick={() => !notif.read && markAsRead(notif.id)}
            >
              {!notif.read && <div className="notif-dot" />}
              <div className="notif-content">
                <p className="notif-message">{notif.message}</p>
                <p className="notif-time">{timeAgo(notif.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
