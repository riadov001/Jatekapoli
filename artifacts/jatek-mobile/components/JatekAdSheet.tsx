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
  },
  {
    key: "vip",
    tag: "JATEK VIP",
    title: "Accès prioritaire &\noffres exclusives",
    sub: "Rejoignez le club VIP et bénéficiez d'avantages uniques",
    accent: NAVY,
    icon: "star" as const,
  },
  {
    key: "premium",
    tag: "JATEK PREMIUM",
    title: "L'expérience\nultime",
    sub: "Coursier dédié, support 24/7 et réductions maxi",
    accent: "#7C3AED",
    icon: "sparkles" as const,
  },
  {
    key: "fast",
    tag: "JATEK FAST",
    title: "Livré en\n20 minutes",
    sub: "Notre réseau express pour les plus pressés",
    accent: "#EA580C",
    icon: "flash" as const,
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function JatekAdSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  // Sheet slide-up
  const slideY = useRef(new Animated.Value(SCREEN_H)).current;
  // Overlay fade
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Staggered content anims (header, sub, cards row, dots)
  const contentAnims = useRef(
    Array.from({ length: 4 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(18),
    }))
  ).current;

  // Per-card "puzzle" entry: each card flies in from a different corner with
  // rotation + scale, like puzzle pieces snapping into place.
  const PUZZLE_FROM = [
    { dx: -SCREEN_W * 0.6, dy: -120, rot: -25 }, // top-left
    { dx:  SCREEN_W * 0.6, dy: -100, rot:  20 }, // top-right
    { dx: -SCREEN_W * 0.6, dy:  140, rot:  18 }, // bottom-left
    { dx:  SCREEN_W * 0.6, dy:  120, rot: -22 }, // bottom-right
  ];
  const cardAnims = useRef(
    ADS.map((_, i) => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(PUZZLE_FROM[i % PUZZLE_FROM.length].dx),
      translateY: new Animated.Value(PUZZLE_FROM[i % PUZZLE_FROM.length].dy),
      rotate: new Animated.Value(PUZZLE_FROM[i % PUZZLE_FROM.length].rot),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  const runOpen = () => {
    // Reset content
    contentAnims.forEach(({ opacity, translateY }) => {
      opacity.setValue(0);
      translateY.setValue(18);
    });
    cardAnims.forEach((a, i) => {
      const from = PUZZLE_FROM[i % PUZZLE_FROM.length];
      a.opacity.setValue(0);
      a.translateX.setValue(from.dx);
      a.translateY.setValue(from.dy);
      a.rotate.setValue(from.rot);
      a.scale.setValue(0.5);
    });
    slideY.setValue(SCREEN_H);
    overlayOpacity.setValue(0);

    Animated.parallel([
      // Overlay fade in
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      // Sheet spring up
      Animated.spring(slideY, {
        toValue: 0,
        friction: 10,
        tension: 75,
        useNativeDriver: true,
      }),
      // Staggered content fade + slide (header, sub, cards row, dots)
      Animated.stagger(
        70,
        contentAnims.map(({ opacity, translateY }) =>
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(translateY, {
              toValue: 0,
              friction: 9,
              tension: 80,
              useNativeDriver: true,
            }),
          ])
        )
      ),
      // Puzzle pieces snap in — staggered, after the cards row container appears
      Animated.stagger(
        110,
        cardAnims.map((a) =>
          Animated.parallel([
            Animated.timing(a.opacity, {
              toValue: 1,
              duration: 280,
              useNativeDriver: true,
            }),
            Animated.spring(a.translateX, {
              toValue: 0,
              friction: 7,
              tension: 70,
              useNativeDriver: true,
            }),
            Animated.spring(a.translateY, {
              toValue: 0,
              friction: 7,
              tension: 70,
              useNativeDriver: true,
            }),
            Animated.spring(a.rotate, {
              toValue: 0,
              friction: 7,
              tension: 70,
              useNativeDriver: true,
            }),
            Animated.spring(a.scale, {
              toValue: 1,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }),
          ])
        )
      ),
    ]).start();
  };

  const runClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: SCREEN_H,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      // Small delay so modal mounts before animating
      const t = setTimeout(runOpen, 20);
      return () => clearTimeout(t);
    } else {
      runClose();
    }
  }, [visible]);

  const animStyle = (i: number) => ({
    opacity: contentAnims[i].opacity,
    transform: [{ translateY: contentAnims[i].translateY }],
  });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Dimmed overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + 16, transform: [{ translateY: slideY }] },
        ]}
      >
        {/* Handle — always visible immediately */}
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>

        {/* Header — anim[0] */}
        <Animated.View style={[styles.sheetHeader, animStyle(0)]}>
          <View style={styles.sheetLogoWrap}>
            <Ionicons name="bag-handle" size={20} color="#fff" />
          </View>
          <Text style={styles.sheetTitle}>Offres Jatek</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </Animated.View>

        {/* Subtitle — anim[1] */}
        <Animated.Text style={[styles.sheetSub, animStyle(1)]}>
          Découvrez nos formules exclusives
        </Animated.Text>

        {/* Cards — anim[2] */}
        <Animated.View style={animStyle(2)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.adsRow}
            decelerationRate="fast"
            snapToInterval={SCREEN_W * 0.8 + 12}
            pagingEnabled={false}
          >
            {ADS.map((ad, i) => {
              const a = cardAnims[i];
              const rotateInterpolated = a.rotate.interpolate({
                inputRange: [-30, 30],
                outputRange: ["-30deg", "30deg"],
              });
              return (
                <Animated.View
                  key={ad.key}
                  style={{
                    opacity: a.opacity,
                    transform: [
                      { translateX: a.translateX },
                      { translateY: a.translateY },
                      { rotate: rotateInterpolated },
                      { scale: a.scale },
                    ],
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={[styles.adCard, { backgroundColor: ad.accent }]}
                  >
                    {/* Decorative circle */}
                    <View style={styles.decorCircle} />

                    <View style={styles.adIconWrap}>
                      <Ionicons name={ad.icon} size={28} color={GOLD} />
                    </View>
                    <View style={styles.adTag}>
                      <Text style={styles.adTagTxt}>{ad.tag}</Text>
                    </View>
                    <Text style={styles.adTitle}>{ad.title}</Text>
                    <Text style={styles.adSub}>{ad.sub}</Text>
                    <View style={styles.adCtaRow}>
                      <View style={styles.adCta}>
                        <Text style={[styles.adCtaTxt, { color: ad.accent }]}>Découvrir</Text>
                        <Ionicons name="arrow-forward" size={14} color={ad.accent} />
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Dots — anim[3] */}
        <Animated.View style={[styles.dotsRow, animStyle(3)]}>
          {ADS.map((_, i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 4 },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 2,
    gap: 12,
  },
  sheetLogoWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: { flex: 1, fontSize: 19, fontFamily: "Inter_700Bold", color: "#0A1B3D" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 18,
  },

  adsRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 6 },
  adCard: {
    width: SCREEN_W * 0.8,
    borderRadius: 22,
    padding: 22,
    gap: 10,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  adIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  adTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adTagTxt: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  adTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_900Black", lineHeight: 28, letterSpacing: -0.4 },
  adSub: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  adCtaRow: { marginTop: 6 },
  adCta: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adCtaTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  dotsRow: { flexDirection: "row", gap: 6, justifyContent: "center", paddingTop: 14, paddingBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D1D5DB" },
  dotActive: { backgroundColor: PINK, width: 20, borderRadius: 3 },
});
