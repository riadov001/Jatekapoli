import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform, ScrollView, Image } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO = require("@/assets/images/hero-bag.png");

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
        styles.scroll,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Heading */}
      <View style={styles.headWrap}>
        <Text style={[styles.title, { color: colors.heading }]}>
          Vos courses livrées{"\n"}en quelques minutes.
        </Text>
        <Text style={[styles.sub, { color: colors.heading }]}>
          Plus de 2 600 produits et 900 marques — au prix supermarché, livrés chez vous.
        </Text>
      </View>

      {/* Hero photo: pink kraft bag of groceries with stenciled Jatek wordmark */}
      <View style={styles.heroWrap}>
        <Image source={HERO} style={styles.heroImg} resizeMode="contain" />
        <View pointerEvents="none" style={styles.stencilWrap}>
          <Text style={styles.stencil}>Jatek.</Text>
          <Text style={styles.stencil}>Jatek.</Text>
          <Text style={[styles.stencil, { opacity: 0.6 }]}>Jatek.</Text>
        </View>
      </View>

      {/* CTA tray */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => go("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Commencer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnGhost, { backgroundColor: "#fff" }]}
          onPress={() => go("/(auth)/login")}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnGhostText, { color: colors.primary }]}>
            J'ai déjà un compte ? Se connecter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => go("/(tabs)")} activeOpacity={0.7} style={styles.guestBtn}>
          <Text style={[styles.guestText, { color: colors.primary }]}>Continuer comme invité</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24 },
  headWrap: { gap: 8, paddingHorizontal: 0 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 36, letterSpacing: -0.6 },
  sub: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, opacity: 0.88, marginTop: 2 },

  heroWrap: { alignItems: "center", justifyContent: "center", marginTop: 16, marginBottom: 16, position: "relative", width: "100%" },
  heroImg: { width: 320, height: 320, maxWidth: "100%" },
  stencilWrap: {
    position: "absolute",
    bottom: "8%",
    left: "22%",
    right: "10%",
    alignItems: "flex-start",
    transform: [{ rotate: "-4deg" }],
  },
  stencil: {
    color: "rgba(176, 0, 79, 0.88)",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    fontStyle: "italic",
    letterSpacing: -1.2,
    lineHeight: 32,
    marginVertical: 1,
  },

  cta: { paddingHorizontal: 0, paddingTop: 4, gap: 10 },
  btnPrimary: {
    height: 56,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  btnGhost: { height: 56, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  btnGhostText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  guestBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  guestText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
