import React, { useRef, useEffect, useState } from "react";
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

const AUTO_MS = 4000;
const CARD_W = SCREEN_W * 0.62;
const CARD_GAP = 10;
const SNAP = CARD_W + CARD_GAP;

export function JatekAdSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userPaused = useRef(false);

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

  // Per-card circular splash: cards explode out from the centre on a ring,
  // each at its own angle, then converge back into the row (Talabat-style).
  const RADIUS = Math.min(SCREEN_W, SCREEN_H) * 0.55;
  const PUZZLE_FROM = ADS.map((_, i) => {
    // Angles spread across the upper hemisphere so cards visibly fan in
    const angle = -Math.PI / 2 + ((i + 0.5) / ADS.length - 0.5) * Math.PI * 1.1;
    return {
      dx: Math.cos(angle) * RADIUS,
      dy: Math.sin(angle) * RADIUS - 40,
      rot: ((angle + Math.PI / 2) * 180) / Math.PI * 0.6,
    };
  });
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

  const clearAuto = () => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
    progress.stopAnimation();
  };

  const scheduleNext = (fromIdx: number) => {
    clearAuto();
    if (userPaused.current) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: AUTO_MS,
      useNativeDriver: false,
    }).start();
    autoTimer.current = setTimeout(() => {
      const next = (fromIdx + 1) % ADS.length;
      setActiveIdx(next);
      scrollRef.current?.scrollTo({ x: next * SNAP, animated: true });
      scheduleNext(next);
    }, AUTO_MS);
  };

  useEffect(() => {
    if (visible) {
      userPaused.current = false;
      setActiveIdx(0);
      // Small delay so modal mounts before animating
      const t = setTimeout(() => {
        runOpen();
        scrollRef.current?.scrollTo({ x: 0, animated: false });
        // Start auto-rotate after the splash settles
        const t2 = setTimeout(() => scheduleNext(0), 900);
        autoTimer.current = t2;
      }, 20);
      return () => {
        clearTimeout(t);
        clearAuto();
      };
    } else {
      clearAuto();
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
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.adsRow}
            decelerationRate="fast"
            snapToInterval={SNAP}
            pagingEnabled={false}
            onScrollBeginDrag={() => {
              userPaused.current = true;
              clearAuto();
            }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
              const clamped = Math.max(0, Math.min(ADS.length - 1, idx));
              setActiveIdx(clamped);
              userPaused.current = false;
              scheduleNext(clamped);
            }}
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
                      <Ionicons name={ad.icon} size={20} color={GOLD} />
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

        {/* Progress indicators — anim[3] */}
        <Animated.View style={[styles.dotsRow, animStyle(3)]}>
          {ADS.map((_, i) => {
            const isActive = i === activeIdx;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  userPaused.current = false;
                  setActiveIdx(i);
                  scrollRef.current?.scrollTo({ x: i * SNAP, animated: true });
                  scheduleNext(i);
                }}
                hitSlop={8}
                style={[styles.dotTrack, isActive && styles.dotTrackActive]}
              >
                {isActive && (
                  <Animated.View
                    style={[
                      styles.dotFill,
                      {
                        width: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
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

  adsRow: { paddingHorizontal: 14, gap: 10, paddingBottom: 6 },
  adCard: {
    width: SCREEN_W * 0.62,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    overflow: "hidden",
    position: "relative",
  },
  decorCircle: {
    position: "absolute",
    right: -24,
    top: -24,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  adIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  adTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adTagTxt: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  adTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_900Black", lineHeight: 20, letterSpacing: -0.3 },
  adSub: { color: "rgba(255,255,255,0.82)", fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  adCtaRow: { marginTop: 4 },
  adCta: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  adCtaTxt: { fontSize: 11, fontFamily: "Inter_700Bold" },
  dotsRow: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", paddingTop: 14, paddingBottom: 6 },
  dotTrack: {
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  dotTrackActive: {
    width: 28,
    backgroundColor: "#F3D7E1",
  },
  dotFill: {
    height: "100%",
    backgroundColor: PINK,
    borderRadius: 2,
  },
});
