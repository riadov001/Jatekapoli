/**
 * DriverMap — displays driver position + delivery destination on a live map.
 *
 * Uses Google Maps JavaScript API when EXPO_PUBLIC_GOOGLE_MAPS_KEY is set,
 * otherwise falls back to Leaflet + OpenStreetMap. Works on web (iframe) and
 * native (react-native-webview) without a custom dev client.
 *
 * When the driver position updates, we postMessage / inject JS so the existing
 * map instance pans smoothly instead of remounting.
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
  pinColor?: string;
  driverColor?: string;
}

const GOOGLE_KEY = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? "").trim();

function buildGoogleHtml(
  driverLat: number,
  driverLng: number,
  destLat: number | undefined,
  destLng: number | undefined,
  pin: string,
  driver: string,
) {
  const hasDest = destLat != null && destLng != null;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>html,body,#m{height:100%;margin:0;padding:0;background:#eef;font-family:-apple-system,BlinkMacSystemFont,sans-serif}</style>
</head>
<body>
<div id="m"></div>
<script>
  function initMap(){
    var driverPos={lat:${driverLat},lng:${driverLng}};
    var destPos=${hasDest ? `{lat:${destLat},lng:${destLng}}` : "null"};
    var map=new google.maps.Map(document.getElementById('m'),{
      center:driverPos,zoom:14,disableDefaultUI:true,gestureHandling:'greedy',
      clickableIcons:false,
      styles:[{featureType:'transit',stylers:[{visibility:'off'}]}],
    });

    var driverSvg='<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">'+
      '<circle cx="21" cy="21" r="18" fill="${driver}" stroke="#fff" stroke-width="3"/>'+
      '<path d="M14 24h4l2-5 6 0 2 5h4l-3-7-3 0-1-3-6 0-1 3-3 0z" fill="#fff"/>'+
      '<circle cx="16" cy="28" r="2.5" fill="#fff"/><circle cx="26" cy="28" r="2.5" fill="#fff"/>'+
      '</svg>';
    var driverMarker=new google.maps.Marker({
      position:driverPos,map:map,
      icon:{url:'data:image/svg+xml;utf-8,'+encodeURIComponent(driverSvg),
        scaledSize:new google.maps.Size(42,42),anchor:new google.maps.Point(21,21)},
      title:'Driver'
    });

    if(destPos){
      var pinSvg='<svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">'+
        '<path d="M19 2C9.6 2 2 9.6 2 19c0 13 17 29 17 29s17-16 17-29C36 9.6 28.4 2 19 2z" fill="${pin}" stroke="#fff" stroke-width="2"/>'+
        '<circle cx="19" cy="19" r="6" fill="#fff"/></svg>';
      new google.maps.Marker({
        position:destPos,map:map,
        icon:{url:'data:image/svg+xml;utf-8,'+encodeURIComponent(pinSvg),
          scaledSize:new google.maps.Size(38,50),anchor:new google.maps.Point(19,48)},
        title:'Delivery'
      });
      var b=new google.maps.LatLngBounds();
      b.extend(driverPos);b.extend(destPos);
      map.fitBounds(b,{top:60,right:60,bottom:60,left:60});
      var poly=new google.maps.Polyline({
        path:[driverPos,destPos],geodesic:true,strokeColor:'${pin}',
        strokeOpacity:0.6,strokeWeight:3,
        icons:[{icon:{path:'M 0,-1 0,1',strokeOpacity:1,scale:3},offset:'0',repeat:'12px'}],
      });
      poly.setMap(map);
    }

    window.updateDriverPosition=function(lat,lng){
      var p={lat:lat,lng:lng};
      driverMarker.setPosition(p);
      map.panTo(p);
    };
    function applyMsg(raw){
      try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){window.updateDriverPosition(d.lat,d.lng);}}catch(e){}
    }
    document.addEventListener('message',function(ev){applyMsg(ev.data);});
    window.addEventListener('message',function(ev){applyMsg(ev.data);});
  }
  window.initMap=initMap;
</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&callback=initMap&v=quarterly"></script>
</body>
</html>`;
}

function buildLeafletHtml(
  driverLat: number,
  driverLng: number,
  destLat: number | undefined,
  destLng: number | undefined,
  pin: string,
  driver: string,
) {
  const destMarker =
    destLat != null && destLng != null
      ? `
    var destIcon = L.divIcon({
      html: '<div style="background:${pin};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><div style="width:10px;height:10px;background:#fff;border-radius:50%;transform:rotate(45deg);"></div></div>',
      className: '', iconAnchor: [15, 30]
    });
    L.marker([${destLat}, ${destLng}], {icon: destIcon}).addTo(map);
    var bounds = L.latLngBounds([[${driverLat},${driverLng}],[${destLat},${destLng}]]);
    map.fitBounds(bounds, {padding: [40, 40]});
    L.polyline([[${driverLat},${driverLng}],[${destLat},${destLng}]],{color:'${pin}',weight:3,opacity:0.6,dashArray:'8,8'}).addTo(map);
  `
      : `map.setView([${driverLat}, ${driverLng}], 15);`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%}
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map=L.map('map',{zoomControl:false,attributionControl:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,subdomains:['a','b','c']}).addTo(map);
  var driverIcon=L.divIcon({
    html:'<div style="background:${driver};width:36px;height:36px;border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;">●</div>',
    className:'',iconAnchor:[18,18]
  });
  var driverMarker=L.marker([${driverLat},${driverLng}],{icon:driverIcon}).addTo(map);
  ${destMarker}
  window.updateDriverPosition=function(lat,lng){
    driverMarker.setLatLng([lat,lng]);
    map.panTo([lat,lng],{animate:true,duration:0.8});
  };
  function handleMsg(raw){try{var d=JSON.parse(raw);if(d&&typeof d.lat==='number'&&typeof d.lng==='number'){window.updateDriverPosition(d.lat,d.lng);}}catch(e){}}
  window.addEventListener('message',function(ev){handleMsg(ev.data);});
  document.addEventListener('message',function(ev){handleMsg(ev.data);});
  setTimeout(function(){map.invalidateSize();},150);
  setTimeout(function(){map.invalidateSize();},600);
</script>
</body>
</html>`;
}

export function DriverMap({
  driverLat,
  driverLng,
  destLat,
  destLng,
  height = 220,
  pinColor = "#E91E8C",
  driverColor = "#00C2C7",
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const initialHtml = React.useMemo(
    () =>
      GOOGLE_KEY
        ? buildGoogleHtml(driverLat, driverLng, destLat, destLng, pinColor, driverColor)
        : buildLeafletHtml(driverLat, driverLng, destLat, destLng, pinColor, driverColor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [destLat, destLng],
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `window.updateDriverPosition && window.updateDriverPosition(${driverLat}, ${driverLng}); true;`,
    );
  }, [driverLat, driverLng]);

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
