import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PINK = "#E91E63";
const NAVY = "#0A1B3D";
const GOLD = "#FFD700";
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

const ADS = [
  {
    key: "pro",
    tag: "JATEK PRO",
    title: "Livraisons illimitées\nsans frais",
    sub: "Abonnez-vous et économisez chaque jour",
    accent: PINK,
    icon: "rocket" as const,
    light: false,
  },
  {
    key: "vip",
    tag: "JATEK VIP",
    title: "Accès prioritaire &\noffres exclusives",
    sub: "Rejoignez le club VIP et bénéficiez d'avantages uniques",
    accent: NAVY,
    icon: "star" as const,
    light: false,
  },
  {
    key: "premium",
    tag: "JATEK PREMIUM",
    title: "L'expérience\nultime",
    sub: "Coursier dédié, support 24/7 et réductions maxi",
    accent: "#8B1A6B",
    icon: "sparkles" as const,
    light: false,
  },
  {
    key: "fast",
    tag: "JATEK FAST",
    title: "Livré en\n20 minutes",
    sub: "Notre réseau express pour les plus pressés",
    accent: "#FF6B00",
    icon: "flash" as const,
    light: false,
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function JatekAdSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 11,
        tension: 80,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetLogoWrap}>
            <Ionicons name="bag-handle" size={20} color="#fff" />
          </View>
          <Text style={styles.sheetTitle}>Offres Jatek</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <Text style={styles.sheetSub}>Découvrez nos formules exclusives</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.adsRow}
          decelerationRate="fast"
          snapToInterval={SCREEN_W * 0.8 + 12}
        >
          {ADS.map((ad) => (
            <TouchableOpacity
              key={ad.key}
              activeOpacity={0.88}
              style={[styles.adCard, { backgroundColor: ad.accent }]}
            >
              <View style={styles.adIconWrap}>
                <Ionicons name={ad.icon} size={28} color={GOLD} />
              </View>
              <View style={[styles.adTag]}>
                <Text style={styles.adTagTxt}>{ad.tag}</Text>
              </View>
              <Text style={styles.adTitle}>{ad.title}</Text>
              <Text style={styles.adSub}>{ad.sub}</Text>
              <View style={styles.adCtaRow}>
                <View style={styles.adCta}>
                  <Text style={[styles.adCtaTxt, { color: ad.accent }]}>Découvrir</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {ADS.map((_, i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 2 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 2,
    gap: 10,
  },
  sheetLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold", color: "#0A1B3D" },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280", paddingHorizontal: 20, marginBottom: 16 },

  adsRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 4 },
  adCard: {
    width: SCREEN_W * 0.8,
    borderRadius: 20,
    padding: 20,
    gap: 10,
    overflow: "hidden",
  },
  adIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  adTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adTagTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  adTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_900Black", lineHeight: 28, letterSpacing: -0.5 },
  adSub: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  adCtaRow: { marginTop: 8 },
  adCta: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  adCtaTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dotsRow: { flexDirection: "row", gap: 6, justifyContent: "center", paddingTop: 12, paddingBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { backgroundColor: PINK, width: 18 },
});
