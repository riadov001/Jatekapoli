import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const go = (path: any) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.replace(path);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.pinkBg }}
      contentContainerStyle={[
        styles.flex,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <View style={styles.hero}>
        <Text style={[styles.heroTitle, { color: colors.heading }]}>
          Livraison express,{"\n"}en quelques minutes.
        </Text>
        <Text style={[styles.heroSub, { color: colors.heading }]}>
          Restaurants, courses, pharmacies — livrés chez vous à Oujda en un éclair.
        </Text>

        {/* big visual */}
        <View style={styles.visualWrap}>
          <View style={[styles.bagBg, { backgroundColor: colors.primary }]}>
            <Text style={styles.bagWord}>tawsila</Text>
            <Text style={styles.bagWord}>tawsila</Text>
            <Text style={styles.bagWord}>tawsila</Text>
          </View>
          <Text style={styles.scooter}>🛵</Text>
        </View>
      </View>

      {/* CTAs */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => go("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Commencer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnGhost, { backgroundColor: "rgba(255,255,255,0.85)" }]}
          onPress={() => go("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnGhostText, { color: colors.primary }]}>
            J'ai déjà un compte ? Se connecter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => go("/(tabs)")} activeOpacity={0.7} style={styles.guestBtn}>
          <Text style={[styles.guestText, { color: colors.primary }]}>Continuer comme invité</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  hero: { gap: 12 },
  heroTitle: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 38, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, opacity: 0.85, marginTop: 4 },
  visualWrap: { alignItems: "center", justifyContent: "center", marginTop: 28, position: "relative", height: 280 },
  bagBg: {
    width: 220,
    height: 260,
    borderRadius: 16,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 24,
    transform: [{ rotate: "-6deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bagWord: {
    color: "#FFD9E8",
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    fontStyle: "italic",
    letterSpacing: -1,
    transform: [{ rotate: "-4deg" }],
    marginVertical: 2,
  },
  scooter: { position: "absolute", right: 10, top: 0, fontSize: 70 },
  ctaWrap: { gap: 12, marginTop: 24 },
  btnPrimary: {
    height: 54,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E2006A",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  btnGhost: { height: 54, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  btnGhostText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  guestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  guestText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
