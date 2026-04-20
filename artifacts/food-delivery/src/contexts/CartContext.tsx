import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

interface CartContextType {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string;
  addItem: (restaurantId: number, restaurantName: string, item: CartItem) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  itemCount: number;
}

const CART_KEY = "jatek_cart";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { items: CartItem[]; restaurantId: number | null; restaurantName: string };
  } catch {
    return null;
  }
}

function saveCart(items: CartItem[], restaurantId: number | null, restaurantName: string) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ items, restaurantId, restaurantName }));
  } catch {}
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const saved = loadCart();
  const [items, setItems] = useState<CartItem[]>(saved?.items ?? []);
  const [restaurantId, setRestaurantId] = useState<number | null>(saved?.restaurantId ?? null);
  const [restaurantName, setRestaurantName] = useState<string>(saved?.restaurantName ?? "");

  // Persist to localStorage whenever cart changes
  useEffect(() => {
    saveCart(items, restaurantId, restaurantName);
  }, [items, restaurantId, restaurantName]);

  const addItem = (rId: number, rName: string, item: CartItem) => {
    if (restaurantId && restaurantId !== rId) {
      setItems([{ ...item, quantity: 1 }]);
      setRestaurantId(rId);
      setRestaurantName(rName);
      return;
    }

    setRestaurantId(rId);
    setRestaurantName(rName);
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.menuItemId !== menuItemId);
      if (next.length === 0) {
        setRestaurantId(null);
        setRestaurantName("");
      }
      return next;
    });
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setRestaurantName("");
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = subtotal;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, restaurantId, restaurantName,
      addItem, removeItem, updateQuantity, clearCart,
      total, subtotal, itemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
