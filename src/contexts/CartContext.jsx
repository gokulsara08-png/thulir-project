import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}

export function CartProvider({ children }) {
  const { user, userData } = useAuth();

  // Scopes the storage key to the currently logged in user & role
  const getCartStorageKey = useCallback(() => {
    if (user?.uid) {
      const role = userData?.role || 'user';
      return `thulir_cart_${role}_${user.uid}`;
    }
    return 'thulir_cart_guest';
  }, [user, userData]);

  const [items, setItems] = useState([]);

  // Automatically load the respective role/user cart whenever login/user changes
  useEffect(() => {
    const key = getCartStorageKey();
    try {
      const saved = localStorage.getItem(key);
      setItems(saved ? JSON.parse(saved) : []);
    } catch {
      setItems([]);
    }
  }, [getCartStorageKey]);

  const addToCart = useCallback((product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      let newItems;
      if (existing) {
        newItems = prev.map(i => i.productId === product.id 
          ? { ...i, quantity: i.quantity + qty } 
          : i
        );
      } else {
        newItems = [...prev, {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image || '',
          manufacturerId: product.manufacturerId,
          manufacturerName: product.manufacturerName || '',
          quantity: qty,
          category: product.category || ''
        }];
      }
      const key = getCartStorageKey();
      localStorage.setItem(key, JSON.stringify(newItems));
      return newItems;
    });
  }, [getCartStorageKey]);

  const removeFromCart = useCallback((productId) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.productId !== productId);
      const key = getCartStorageKey();
      localStorage.setItem(key, JSON.stringify(newItems));
      return newItems;
    });
  }, [getCartStorageKey]);

  const updateQuantity = useCallback((productId, qty) => {
    if (qty < 1) return;
    setItems(prev => {
      const newItems = prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i);
      const key = getCartStorageKey();
      localStorage.setItem(key, JSON.stringify(newItems));
      return newItems;
    });
  }, [getCartStorageKey]);

  const clearCart = useCallback(() => {
    setItems([]);
    const key = getCartStorageKey();
    localStorage.removeItem(key);
  }, [getCartStorageKey]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}
