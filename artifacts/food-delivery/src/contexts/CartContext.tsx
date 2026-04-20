import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

export interface RestaurantPricing {
  deliveryFee?: number | null;
  freeDeliveryThreshold?: number | null;
}

const DEFAULT_DELIVERY_FEE = 15;
const DEFAULT_FREE_DELIVERY_THRESHOLD = 150;

interface CartContextType {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  addItem: (restaurantId: number, restaurantName: string, item: CartItem, pricing?: RestaurantPricing) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  itemCount: number;
}

const CART_KEY = "jatek_cart";

interface PersistedCart {
  items: CartItem[];
  restaurantId: number | null;
  restaurantName: string;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
}

function loadCart(): PersistedCart | null {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedCart;
  } catch (err) {
    console.warn("[Cart] failed to parse persisted cart:", err);
    return null;
  }
}

function saveCart(payload: PersistedCart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("[Cart] failed to persist cart:", err);
  }
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const saved = loadCart();
  const [items, setItems] = useState<CartItem[]>(saved?.items ?? []);
  const [restaurantId, setRestaurantId] = useState<number | null>(saved?.restaurantId ?? null);
  const [restaurantName, setRestaurantName] = useState<string>(saved?.restaurantName ?? "");
  const [deliveryFee, setDeliveryFee] = useState<number>(saved?.deliveryFee ?? DEFAULT_DELIVERY_FEE);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(saved?.freeDeliveryThreshold ?? DEFAULT_FREE_DELIVERY_THRESHOLD);

  useEffect(() => {
    saveCart({ items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold });
  }, [items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold]);

  const applyPricing = (pricing?: RestaurantPricing) => {
    if (!pricing) return;
    if (typeof pricing.deliveryFee === "number") setDeliveryFee(pricing.deliveryFee);
    if (typeof pricing.freeDeliveryThreshold === "number") setFreeDeliveryThreshold(pricing.freeDeliveryThreshold);
  };

  const addItem = (rId: number, rName: string, item: CartItem, pricing?: RestaurantPricing) => {
    if (restaurantId && restaurantId !== rId) {
      setItems([{ ...item, quantity: 1 }]);
      setRestaurantId(rId);
      setRestaurantName(rName);
      applyPricing(pricing);
      return;
    }

    setRestaurantId(rId);
    setRestaurantName(rName);
    applyPricing(pricing);
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
    setDeliveryFee(DEFAULT_DELIVERY_FEE);
    setFreeDeliveryThreshold(DEFAULT_FREE_DELIVERY_THRESHOLD);
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const effectiveDeliveryFee = subtotal === 0 ? 0 : (subtotal >= freeDeliveryThreshold ? 0 : deliveryFee);
  const total = subtotal + effectiveDeliveryFee;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, restaurantId, restaurantName,
      deliveryFee, freeDeliveryThreshold,
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
