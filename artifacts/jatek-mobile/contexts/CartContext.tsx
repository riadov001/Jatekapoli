import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  /** Unique line identifier (combines menuItemId + variant + extras).
   *  Used for client-side de-duplication & quantity updates. */
  cartLineId: string;
  /** REAL menu item id from the database — sent to the API at checkout. */
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
  addItem: (restaurantId: number, restaurantName: string, item: Omit<CartItem, "quantity">, pricing?: RestaurantPricing) => void;
  removeItem: (cartLineId: string) => void;
  updateQuantity: (cartLineId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  selectedAddress: string;
  selectedAddressInZone: boolean;
  setSelectedAddress: (a: string, inZone?: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);
// Bumped to v3 — schema change: items now require `cartLineId` for de-dup
// (real `menuItemId` is preserved separately so the API gets the right DB id).
// Previous carts (v2) may contain items with the old fake variant id stored
// as `menuItemId` and would cause /api/orders to return 404.
const CART_KEY = "jatek_cart_v3";
const ADDR_KEY = "jatek_selected_address_v1";
const OLD_CART_KEYS = ["jatek_cart_v2", "jatek_cart"];

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number>(DEFAULT_DELIVERY_FEE);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(DEFAULT_FREE_DELIVERY_THRESHOLD);
  const [selectedAddress, setSelectedAddressState] = useState<string>("");
  const [selectedAddressInZone, setSelectedAddressInZone] = useState<boolean>(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Always set ready=true — even if AsyncStorage is unavailable (rare on
    // older Android Expo Go builds) we still want the app to render with
    // empty defaults instead of being stuck.
    // Best-effort cleanup of legacy cart keys — ignore failures.
    OLD_CART_KEYS.forEach((k) => { AsyncStorage.removeItem(k).catch(() => {}); });
    Promise.all([AsyncStorage.getItem(CART_KEY), AsyncStorage.getItem(ADDR_KEY)])
      .then(([raw, addr]) => {
        if (raw) {
          try {
            const s = JSON.parse(raw);
            setItems(s.items ?? []);
            setRestaurantId(s.restaurantId ?? null);
            setRestaurantName(s.restaurantName ?? "");
            if (typeof s.deliveryFee === "number") setDeliveryFee(s.deliveryFee);
            if (typeof s.freeDeliveryThreshold === "number") setFreeDeliveryThreshold(s.freeDeliveryThreshold);
          } catch (err) {
            console.warn("[Cart] failed to parse persisted cart:", err);
          }
        }
        if (addr) {
          try {
            const parsed = JSON.parse(addr);
            if (typeof parsed === "string") { setSelectedAddressState(parsed); setSelectedAddressInZone(true); }
            else { setSelectedAddressState(parsed.address ?? ""); setSelectedAddressInZone(parsed.inZone !== false); }
          } catch { setSelectedAddressState(addr); }
        }
      })
      .catch((err) => {
        console.warn("[Cart] AsyncStorage unavailable:", err);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(CART_KEY, JSON.stringify({ items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold }));
  }, [items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold, ready]);

  const setSelectedAddress = (a: string, inZone: boolean = true) => {
    setSelectedAddressState(a);
    setSelectedAddressInZone(inZone);
    AsyncStorage.setItem(ADDR_KEY, JSON.stringify({ address: a, inZone })).catch((err) => {
      console.warn("[Cart] failed to persist address:", err);
    });
  };

  const applyPricing = (pricing?: RestaurantPricing) => {
    if (!pricing) return;
    if (typeof pricing.deliveryFee === "number") setDeliveryFee(pricing.deliveryFee);
    if (typeof pricing.freeDeliveryThreshold === "number") setFreeDeliveryThreshold(pricing.freeDeliveryThreshold);
  };

  const addItem = (rId: number, rName: string, item: Omit<CartItem, "quantity">, pricing?: RestaurantPricing) => {
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
      const ex = prev.find((i) => i.cartLineId === item.cartLineId);
      if (ex) return prev.map((i) => i.cartLineId === item.cartLineId ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (cartLineId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.cartLineId !== cartLineId);
      if (next.length === 0) { setRestaurantId(null); setRestaurantName(""); }
      return next;
    });
  };

  const updateQuantity = (cartLineId: string, quantity: number) => {
    if (quantity <= 0) { removeItem(cartLineId); return; }
    setItems((prev) => prev.map((i) => i.cartLineId === cartLineId ? { ...i, quantity } : i));
  };

  const clearCart = () => {
    setItems([]); setRestaurantId(null); setRestaurantName("");
    setDeliveryFee(DEFAULT_DELIVERY_FEE);
    setFreeDeliveryThreshold(DEFAULT_FREE_DELIVERY_THRESHOLD);
  };

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, restaurantId, restaurantName, deliveryFee, freeDeliveryThreshold, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount, selectedAddress, selectedAddressInZone, setSelectedAddress }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
