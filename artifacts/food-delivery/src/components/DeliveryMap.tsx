import { useEffect, useRef } from "react";

interface DeliveryMapProps {
  driverLat?: number | null;
  driverLng?: number | null;
  driverName?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  className?: string;
}

export function DeliveryMap({
  driverLat,
  driverLng,
  driverName = "Driver",
  className = "h-64 rounded-2xl overflow-hidden",
}: DeliveryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !driverLat || !driverLng) return;

    let L: any;
    let map: any;

    async function initMap() {
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([driverLat!, driverLng!], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([driverLat!, driverLng!]);
        }
        return;
      }

      map = L.map(mapRef.current!).setView([driverLat!, driverLng!], 15);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const driverIcon = L.divIcon({
        html: `<div style="background:#EA580C;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;">🛵</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      markerRef.current = L.marker([driverLat!, driverLng!], { icon: driverIcon })
        .addTo(map)
        .bindPopup(`<b>${driverName}</b><br/>On the way to you`)
        .openPopup();
    }

    initMap();

    return () => {
      if (mapInstanceRef.current && !driverLat) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [driverLat, driverLng, driverName]);

  if (!driverLat || !driverLng) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <div className="text-center text-muted-foreground">
          <div className="text-3xl mb-2">🗺️</div>
          <p className="text-sm">Waiting for driver location…</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} style={{ zIndex: 0 }} />;
}
