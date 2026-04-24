/**
 * DriverMap — displays driver position + delivery destination on a live map.
 * Uses WebView + Leaflet (works with Expo Go, no native build needed).
 *
 * When the driver position updates, we call `updateDriverPosition()` on the
 * WebView via injectJavaScript so the map re-centres smoothly.
 */
import React, { useRef, useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  driverLat: number;
  driverLng: number;
  destLat?: number;
  destLng?: number;
  height?: number;
}

function buildHtml(driverLat: number, driverLng: number, destLat?: number, destLng?: number) {
  const destMarker =
    destLat != null && destLng != null
      ? `
    var destIcon = L.divIcon({
      html: '<div style="background:#E2006A;width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>',
      className: '', iconAnchor: [14, 14]
    });
    L.marker([${destLat}, ${destLng}], {icon: destIcon}).addTo(map)
      .bindPopup('<b>Delivery address</b>').openPopup();
    var bounds = L.latLngBounds([[${driverLat},${driverLng}],[${destLat},${destLng}]]);
    map.fitBounds(bounds, {padding: [40, 40]});
  `
      : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);

  var driverIcon = L.divIcon({
    html: '<div style="background:#22C55E;width:36px;height:36px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:18px;">🏍</div>',
    className: '', iconAnchor: [18, 18]
  });

  var driverMarker = L.marker([${driverLat}, ${driverLng}], {icon: driverIcon}).addTo(map);
  ${destMarker}
  ${destLat == null ? `map.setView([${driverLat}, ${driverLng}], 15);` : ""}

  window.updateDriverPosition = function(lat, lng) {
    driverMarker.setLatLng([lat, lng]);
    map.panTo([lat, lng], {animate: true, duration: 0.8});
  };
</script>
</body>
</html>`;
}

export function DriverMap({ driverLat, driverLng, destLat, destLng, height = 220 }: Props) {
  const webViewRef = useRef<WebView>(null);

  // On position change after initial mount, update marker smoothly via JS injection
  useEffect(() => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.updateDriverPosition(${driverLat}, ${driverLng}); true;`
    );
  }, [driverLat, driverLng]);

  if (Platform.OS === "web") {
    return null; // Web already has its own map
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: buildHtml(driverLat, driverLng, destLat, destLng) }}
        style={styles.map}
        scrollEnabled={false}
        originWhitelist={["*"]}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", borderRadius: 14, overflow: "hidden" },
  map: { flex: 1 },
});
