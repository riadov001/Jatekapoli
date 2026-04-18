/**
 * Lightweight helpers for endpoints not yet in the generated client.
 * All requests authenticate via the token stored in AuthContext (`tawsila_jwt`).
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
const TOKEN_KEY = "tawsila_jwt";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const apiBase = API_BASE;

export async function fetchAvailableOrders(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/orders/available`, {
    headers: { ...(await authHeaders()) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function acceptDelivery(orderId: number, driverId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/orders/${orderId}/accept-delivery`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ driverId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateDriverLocation(driverId: number, lat: number, lng: number): Promise<void> {
  await fetch(`${API_BASE}/api/drivers/${driverId}/location`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
}

export async function getDriverLocation(driverId: number): Promise<{ latitude: number | null; longitude: number | null } | null> {
  const res = await fetch(`${API_BASE}/api/drivers/${driverId}`, {
    headers: { ...(await authHeaders()) },
  });
  if (!res.ok) return null;
  const driver = await res.json();
  return { latitude: driver.latitude, longitude: driver.longitude };
}

/** Geocode an address to lat/lng using OpenStreetMap Nominatim (free, no API key). */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", Oujda, Morocco")}&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en", "User-Agent": "Tawsila/1.0" } });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}
