/**
 * Lightweight helpers for endpoints not yet in the generated client.
 * All requests authenticate via the token stored in AuthContext (`jatek_jwt`).
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getApiBaseSafe } from "./apiBase";

const API_BASE = getApiBaseSafe();
const TOKEN_KEY = "jatek_jwt";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export const getAuthToken = getToken;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(await authHeaders()),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err?.error || msg;
    } catch (parseErr) {
      console.warn(`[api] could not parse error body for ${res.status}:`, parseErr);
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiBase = API_BASE;

// Drivers ------------------------------------------------------------
export async function fetchAvailableOrders(): Promise<any[]> {
  return jsonFetch("/api/orders/available");
}

export async function acceptDelivery(orderId: number, driverId: number): Promise<any> {
  return jsonFetch(`/api/orders/${orderId}/accept-delivery`, {
    method: "POST",
    body: JSON.stringify({ driverId }),
  });
}

/** Driver confirms delivery by entering the 4-digit code shown on the customer's phone. */
export async function confirmDelivery(orderId: number, pickupCode: string): Promise<any> {
  return jsonFetch(`/api/orders/${orderId}/confirm-delivery`, {
    method: "POST",
    body: JSON.stringify({ pickupCode }),
  });
}

export interface DriverProfileInput {
  vehicleType: string;
  vehiclePlate: string;
  nationalId: string;
  licenseNumber?: string;
  photoUrl?: string;
}
export async function completeDriverProfile(driverId: number, data: DriverProfileInput): Promise<any> {
  return jsonFetch(`/api/drivers/${driverId}/complete-profile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDriverLocation(driverId: number, lat: number, lng: number): Promise<void> {
  await jsonFetch(`/api/drivers/${driverId}/location`, {
    method: "PATCH",
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
}

export async function getDriverLocation(driverId: number): Promise<{ latitude: number | null; longitude: number | null } | null> {
  try {
    const driver = await jsonFetch<any>(`/api/drivers/${driverId}`);
    return { latitude: driver.latitude, longitude: driver.longitude };
  } catch {
    return null;
  }
}

/** Geocode an address to lat/lng using OpenStreetMap Nominatim (free, no API key). */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", Oujda, Morocco")}&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "Jatek/1.0" } });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    console.warn("[geocode] Nominatim lookup failed:", err);
  }
  return null;
}

// Users --------------------------------------------------------------
export async function fetchMe(): Promise<any> {
  return jsonFetch("/api/auth/me");
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string; phone?: string | null; address?: string | null; avatarUrl?: string | null }): Promise<any> {
  return jsonFetch(`/api/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) });
}

// Favorites ----------------------------------------------------------
export async function listFavorites(): Promise<Array<{ id: number; restaurantId: number; restaurant: any }>> {
  return jsonFetch("/api/favorites");
}
export async function addFavorite(restaurantId: number): Promise<any> {
  return jsonFetch("/api/favorites", { method: "POST", body: JSON.stringify({ restaurantId }) });
}
export async function removeFavorite(restaurantId: number): Promise<void> {
  await jsonFetch(`/api/favorites/${restaurantId}`, { method: "DELETE" });
}

// Addresses ----------------------------------------------------------
export interface SavedAddress { id: number; label: string; fullAddress: string; details: string | null; isDefault: boolean; }
export async function listAddresses(): Promise<SavedAddress[]> { return jsonFetch("/api/addresses"); }
export async function createAddress(data: Omit<SavedAddress, "id">): Promise<SavedAddress> {
  return jsonFetch("/api/addresses", { method: "POST", body: JSON.stringify(data) });
}
export async function updateAddress(id: number, data: Partial<Omit<SavedAddress, "id">>): Promise<SavedAddress> {
  return jsonFetch(`/api/addresses/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deleteAddress(id: number): Promise<void> { await jsonFetch(`/api/addresses/${id}`, { method: "DELETE" }); }

// Payment methods ----------------------------------------------------
export interface PaymentMethod { id: number; type: string; label: string; last4: string | null; brand: string | null; isDefault: boolean; }
export async function listPaymentMethods(): Promise<PaymentMethod[]> { return jsonFetch("/api/payment-methods"); }
export async function createPaymentMethod(data: Omit<PaymentMethod, "id">): Promise<PaymentMethod> {
  return jsonFetch("/api/payment-methods", { method: "POST", body: JSON.stringify(data) });
}
export async function updatePaymentMethod(id: number, data: Partial<Omit<PaymentMethod, "id">>): Promise<PaymentMethod> {
  return jsonFetch(`/api/payment-methods/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export async function deletePaymentMethod(id: number): Promise<void> { await jsonFetch(`/api/payment-methods/${id}`, { method: "DELETE" }); }

// Support tickets ----------------------------------------------------
export interface SupportTicket { id: number; category: string; subject: string; message: string; status: string; createdAt: string; }
export async function listSupportTickets(): Promise<SupportTicket[]> { return jsonFetch("/api/support-tickets"); }
export async function createSupportTicket(data: { category: string; subject: string; message: string }): Promise<SupportTicket> {
  return jsonFetch("/api/support-tickets", { method: "POST", body: JSON.stringify(data) });
}

// Notification prefs -------------------------------------------------
export interface NotifPrefs { pushOrders: boolean; pushPromos: boolean; emailReceipts: boolean; emailNewsletter: boolean; smsAlerts: boolean; language: string; }
export async function fetchNotifPrefs(): Promise<NotifPrefs> { return jsonFetch("/api/notification-prefs"); }
export async function updateNotifPrefs(data: Partial<NotifPrefs>): Promise<NotifPrefs> {
  return jsonFetch("/api/notification-prefs", { method: "PATCH", body: JSON.stringify(data) });
}

// Reviews ------------------------------------------------------------
export async function listReviews(params?: { userId?: number; restaurantId?: number }): Promise<any[]> {
  const q = new URLSearchParams();
  if (params?.userId) q.set("userId", String(params.userId));
  if (params?.restaurantId) q.set("restaurantId", String(params.restaurantId));
  const qs = q.toString();
  return jsonFetch(`/api/reviews${qs ? `?${qs}` : ""}`);
}
export async function createReview(data: { restaurantId: number; rating: number; comment?: string }): Promise<any> {
  return jsonFetch("/api/reviews", { method: "POST", body: JSON.stringify(data) });
}
export async function deleteReview(id: number): Promise<void> { await jsonFetch(`/api/reviews/${id}`, { method: "DELETE" }); }

// Orders -------------------------------------------------------------
export async function listMyOrders(): Promise<any[]> {
  return jsonFetch("/api/orders");
}
export async function updateOrderStatus(orderId: number, status: string): Promise<any> {
  return jsonFetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Restaurants --------------------------------------------------------
export interface RestaurantProfileInput {
  legalName: string;
  ice: string;
  printerEmail?: string;
}
export async function completeRestaurantProfile(restaurantId: number, data: RestaurantProfileInput): Promise<any> {
  return jsonFetch(`/api/restaurants/${restaurantId}/complete-profile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// RGPD / Consents ----------------------------------------------------
export interface UserConsents {
  cookiesEssential: boolean;
  cookiesAnalytics: boolean;
  cookiesMarketing: boolean;
  dataProcessing: boolean;
  dataSharing: boolean;
  personalization: boolean;
  marketingEmails: boolean;
  marketingSms: boolean;
  marketingPush: boolean;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  cookiesAcceptedAt: string | null;
  termsVersion: string | null;
  privacyVersion: string | null;
  cookiesVersion: string | null;
  currentVersions?: { terms: string; privacy: string; cookies: string };
}
export async function fetchConsents(): Promise<UserConsents> { return jsonFetch("/api/consents"); }
export async function updateConsents(data: Partial<UserConsents> & { acceptTerms?: boolean; acceptPrivacy?: boolean; acceptCookies?: boolean }): Promise<UserConsents> {
  return jsonFetch("/api/consents", { method: "PATCH", body: JSON.stringify(data) });
}
export async function acceptAllConsents(): Promise<UserConsents> {
  return jsonFetch("/api/consents/accept-all", { method: "POST", body: JSON.stringify({}) });
}
export async function rejectAllConsents(): Promise<UserConsents> {
  return jsonFetch("/api/consents/reject-all", { method: "POST", body: JSON.stringify({}) });
}
export function exportMyDataUrl(): string { return `${API_BASE}/api/me/export`; }
export async function deleteMyAccount(): Promise<void> { await jsonFetch("/api/me", { method: "DELETE" }); }
