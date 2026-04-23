import React, { useMemo, useRef } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { OUJDA_CENTER, MAX_RADIUS_KM } from "@/utils/deliveryZone";

interface Props {
  latitude?: number;
  longitude?: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: number;
}

const PINK = "#E91E63";

export function LocationMapPicker({ latitude, longitude, onChange, height = 220 }: Props) {
  const lat = latitude ?? OUJDA_CENTER.latitude;
  const lng = longitude ?? OUJDA_CENTER.longitude;
  const webRef = useRef<WebView>(null);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#m{height:100%;margin:0;padding:0;background:#eef}</style>
</head>
<body>
<div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var center=[${lat},${lng}];
  var oujda=[${OUJDA_CENTER.latitude},${OUJDA_CENTER.longitude}];
  var map=L.map('m',{zoomControl:true,attributionControl:false}).setView(center,14);
  L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',{maxZoom:20,subdomains:['0','1','2','3']}).addTo(map);
  L.circle(oujda,{radius:${MAX_RADIUS_KM * 1000},color:'${PINK}',weight:1.5,fillColor:'${PINK}',fillOpacity:0.07}).addTo(map);
  var marker=L.marker(center,{draggable:true}).addTo(map);
  function send(latlng){
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({lat:latlng.lat,lng:latlng.lng}));
  }
  marker.on('dragend',function(e){send(e.target.getLatLng());});
  map.on('click',function(e){marker.setLatLng(e.latlng);send(e.latlng);});
  document.addEventListener('message',function(ev){
    try{var d=JSON.parse(ev.data);if(d&&d.lat&&d.lng){marker.setLatLng([d.lat,d.lng]);map.setView([d.lat,d.lng],map.getZoom());}}catch(e){}
  });
</script>
</body>
</html>`,
    // intentionally do not depend on lat/lng so the map isn't rebuilt on every drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (typeof d.lat === "number" && typeof d.lng === "number") {
              onChange({ latitude: d.lat, longitude: d.lng });
            }
          } catch {
            /* ignore */
          }
        }}
        // Smoothly recenter the marker when parent props change (e.g. GPS pick)
        injectedJavaScript={
          latitude != null && longitude != null
            ? `try{marker.setLatLng([${lat},${lng}]);map.setView([${lat},${lng}],map.getZoom());}catch(e){}true;`
            : "true;"
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#eef",
    ...(Platform.OS === "android" ? { elevation: 1 } : {}),
  },
  web: { flex: 1, backgroundColor: "transparent" },
});
