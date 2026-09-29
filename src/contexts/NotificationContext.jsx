import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';

const NotificationContext = createContext(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Simple query without orderBy to avoid needing a composite index
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side instead
      notifs.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    }, (error) => {
      // Silently handle permission/index errors - notifications aren't critical for app function
      console.warn('Notification listener error (non-critical):', error.message);
      setNotifications([]);
      setUnreadCount(0);
    });

    return unsubscribe;
  }, [user]);

  const markAsRead = useCallback(async (notifId) => {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  }, [user, notifications]);

  const togglePanel = useCallback(() => {
    setShowPanel(prev => !prev);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, showPanel, togglePanel, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

// Helper to create notification from anywhere
export async function createNotification(userId, type, message, data = {}) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    message,
    data,
    read: false,
    createdAt: serverTimestamp()
  });
}
