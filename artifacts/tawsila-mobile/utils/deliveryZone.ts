/**
 * Delivery zone for Tawsila — Oujda, Morocco
 * Covers the city and its immediate suburbs within MAX_RADIUS_KM.
 */

export const OUJDA_CENTER = {
  latitude: 34.6878,
  longitude: -1.9076,
  name: "Oujda",
};

/** Maximum delivery radius in kilometres */
export const MAX_RADIUS_KM = 15;

/**
 * Haversine formula — returns the great-circle distance (km) between two
 * lat/lng points.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ZoneCheckResult {
  inZone: boolean;
  distanceKm: number;
}

/**
 * Check whether a lat/lng coordinate is within the Oujda delivery zone.
 */
export function checkDeliveryZone(
  latitude: number,
  longitude: number
): ZoneCheckResult {
  const distanceKm = haversineKm(
    OUJDA_CENTER.latitude,
    OUJDA_CENTER.longitude,
    latitude,
    longitude
  );
  return { inZone: distanceKm <= MAX_RADIUS_KM, distanceKm };
}

/**
 * Nominatim reverse-geocode: coords → human-readable address string.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ address: string; displayName: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=fr`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TawsilaMobileApp/1.0" },
  });
  if (!res.ok) throw new Error("Reverse geocoding failed");
  const data = await res.json();

  const a = data.address ?? {};
  const parts = [
    a.road ?? a.pedestrian ?? a.footway,
    a.house_number,
    a.neighbourhood ?? a.suburb,
    a.city ?? a.town ?? a.village,
  ].filter(Boolean);

  const address =
    parts.join(", ") || data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return { address, displayName: data.display_name ?? address };
}

/**
 * Nominatim forward-geocode: text query → array of place suggestions,
 * biased towards Morocco.
 */
export interface PlaceSuggestion {
  placeId: number;
  displayName: string;
  shortName: string;
  secondaryText: string;
  latitude: number;
  longitude: number;
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 3) return [];

  const params = new URLSearchParams({
    format: "json",
    q: `${query}, Oujda`,
    countrycodes: "ma",
    limit: "6",
    addressdetails: "1",
    "accept-language": "fr",
    viewbox: "-2.15,34.55,-1.65,34.85",
    bounded: "0",
  });

  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TawsilaMobileApp/1.0" },
  });
  if (!res.ok) return [];

  const results: any[] = await res.json();

  return results.map((r) => {
    const a = r.address ?? {};
    const road = a.road ?? a.pedestrian ?? a.footway ?? "";
    const suburb = a.neighbourhood ?? a.suburb ?? "";
    const city = a.city ?? a.town ?? a.village ?? "Oujda";

    const mainParts = [road, a.house_number].filter(Boolean);
    const shortName =
      mainParts.length > 0 ? mainParts.join(" ") : r.display_name.split(",")[0];

    const secParts = [suburb, city].filter(Boolean);
    const secondaryText = secParts.join(", ") || r.display_name;

    return {
      placeId: r.place_id,
      displayName: r.display_name,
      shortName,
      secondaryText,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    };
  });
}
