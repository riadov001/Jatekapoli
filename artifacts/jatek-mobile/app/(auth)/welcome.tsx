import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocationMapPicker } from "@/components/LocationMapPicker";
import { useCart } from "@/contexts/CartContext";
import {
  OUJDA_CENTER,
  checkDeliveryZone,
  reverseGeocode,
  OUT_OF_ZONE_MESSAGE,
} from "@/utils/deliveryZone";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setSelectedAddress } = useCart();

  const [coords, setCoords] = useState({
    latitude: OUJDA_CENTER.latitude,
    longitude: OUJDA_CENTER.longitude,
  });
  const [address, setAddress] = useState<string>("Centre-ville d'Oujda");
  const [zoneOk, setZoneOk] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);

  const updateForCoords = async (latitude: number, longitude: number) => {
    setCoords({ latitude, longitude });
    const zone = checkDeliveryZone(latitude, longitude);
    setZoneOk(zone.inZone);
    setResolving(true);
    try {
      const { address: addr } = await reverseGeocode(latitude, longitude);
      setAddress(addr);
    } catch {
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } finally {
      setResolving(false);
    }
  };

  const handleUseGps = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setLocating(true);
    try {
      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        Alert.alert("Localisation refusée", "Vous pouvez sélectionner votre position sur la carte.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await updateForCoords(loc.coords.latitude, loc.coords.longitude);
    } catch {
      Alert.alert("Erreur", "Impossible d'obtenir votre position.");
    } finally {
      setLocating(false);
    }
  };

  const goLogin = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push("/(auth)/login");
  };

  const goGuest = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (zoneOk && address) setSelectedAddress(address, true);
    router.replace("/(tabs)");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.brand, { color: colors.heading }]}>Jatek<Text style={{ color: colors.primary }}>.</Text></Text>
      </View>
      <Text style={[styles.title, { color: colors.heading }]}>Choisissez votre adresse de livraison</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Touchez la carte ou faites glisser le repère pour ajuster.</Text>

      <View style={styles.mapWrap}>
        <LocationMapPicker
          latitude={coords.latitude}
          longitude={coords.longitude}
          onChange={(c) => updateForCoords(c.latitude, c.longitude)}
          height={260}
        />
        <TouchableOpacity
          style={[styles.gpsFab, { backgroundColor: colors.primary }]}
          onPress={handleUseGps}
          activeOpacity={0.85}
          disabled={locating}
        >
          {locating ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="navigate" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      <View style={[styles.addrCard, { backgroundColor: colors.card, borderColor: zoneOk ? colors.border : "#FECACA" }]}>
        <Ionicons name={zoneOk ? "checkmark-circle" : "alert-circle"} size={20} color={zoneOk ? "#16A34A" : "#DC2626"} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.addrLabel, { color: colors.heading }]} numberOfLines={2}>
            {resolving ? "Localisation…" : address}
          </Text>
          {!zoneOk && (
            <Text style={[styles.addrHint, { color: "#DC2626" }]} numberOfLines={3}>
              {OUT_OF_ZONE_MESSAGE}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: zoneOk ? 1 : 0.55 }]}
          onPress={goLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>J'ai déjà un compte — Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnGhost, { borderColor: colors.primary, opacity: zoneOk ? 1 : 0.55 }]}
          onPress={goGuest}
          activeOpacity={0.85}
          disabled={!zoneOk}
        >
          <Text style={[styles.btnGhostText, { color: colors.primary }]}>Continuer comme invité</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  headerRow: { alignItems: "center", marginBottom: 8 },
  brand: { fontSize: 28, fontFamily: "Inter_900Black", letterSpacing: -1, fontStyle: "italic" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 6 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, marginBottom: 12 },
  mapWrap: { position: "relative" },
  gpsFab: {
    position: "absolute", bottom: 12, right: 12,
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  addrCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 14,
  },
  addrLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addrHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 16 },
  cta: { gap: 10, marginTop: 16 },
  btnPrimary: {
    height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center",
    shadowColor: "#E2006A", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  btnGhost: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  btnGhostText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
