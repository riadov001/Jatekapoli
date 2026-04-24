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
  function handleMsg(raw){
    try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){window.updateDriverPosition(d.lat,d.lng);}}catch(e){}
  }
  window.addEventListener('message',function(ev){handleMsg(ev.data);});
  document.addEventListener('message',function(ev){handleMsg(ev.data);});
  setTimeout(function(){map.invalidateSize();},150);
  setTimeout(function(){map.invalidateSize();},600);
</script>
</body>
</html>`;
}

export function DriverMap({ driverLat, driverLng, destLat, destLng, height = 220 }: Props) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Build initial HTML once; subsequent driver-position updates flow through
  // updateDriverPosition() so the map doesn't re-mount on every GPS tick.
  const initialHtml = React.useMemo(
    () => buildHtml(driverLat, driverLng, destLat, destLng),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destLat, destLng],
  );

  // Native: inject JS into the WebView when driver position changes
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.updateDriverPosition && window.updateDriverPosition(${driverLat}, ${driverLng}); true;`
    );
  }, [driverLat, driverLng]);

  // Web: postMessage into the iframe when driver position changes
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    try {
      w.postMessage(JSON.stringify({ lat: driverLat, lng: driverLng }), "*");
    } catch {
      /* ignore */
    }
  }, [driverLat, driverLng]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { height }]}>
        {/* @ts-expect-error iframe is web-only */}
        <iframe
          ref={iframeRef as any}
          srcDoc={initialHtml}
          style={{ border: 0, width: "100%", height: "100%", display: "block", background: "#eef" }}
          title="Live driver location"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: initialHtml }}
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
