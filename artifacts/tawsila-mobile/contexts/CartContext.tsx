import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  addItem: (restaurantId: number, restaurantName: string, item: Omit<CartItem, "quantity">) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  selectedAddress: string;
  setSelectedAddress: (a: string) => void;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = "tawsila_cart_v2";
const ADDR_KEY = "tawsila_selected_address_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [selectedAddress, setSelectedAddressState] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(CART_KEY), AsyncStorage.getItem(ADDR_KEY)]).then(([raw, addr]) => {
      if (raw) {
        try {
          const s = JSON.parse(raw);
          setItems(s.items ?? []);
          setRestaurantId(s.restaurantId ?? null);
          setRestaurantName(s.restaurantName ?? "");
        } catch {}
      }
      if (addr) setSelectedAddressState(addr);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify({ items, restaurantId, restaurantName }));
  }, [items, restaurantId, restaurantName, ready]);

  const setSelectedAddress = (a: string) => {
    setSelectedAddressState(a);
    AsyncStorage.setItem(ADDR_KEY, a).catch(() => {});
  };

  const addItem = (rId: number, rName: string, item: Omit<CartItem, "quantity">) => {
    if (restaurantId && restaurantId !== rId) {
      setItems([{ ...item, quantity: 1 }]);
      setRestaurantId(rId);
      setRestaurantName(rName);
      return;
    }
    setRestaurantId(rId);
    setRestaurantName(rName);
    setItems((prev) => {
      const ex = prev.find((i) => i.menuItemId === item.menuItemId);
      if (ex) return prev.map((i) => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (menuItemId: number) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.menuItemId !== menuItemId);
      if (next.length === 0) { setRestaurantId(null); setRestaurantName(""); }
      return next;
    });
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) { removeItem(menuItemId); return; }
    setItems((prev) => prev.map((i) => i.menuItemId === menuItemId ? { ...i, quantity } : i));
  };

  const clearCart = () => { setItems([]); setRestaurantId(null); setRestaurantName(""); };

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, restaurantId, restaurantName, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, selectedAddress, setSelectedAddress }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
