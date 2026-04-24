import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View, Dimensions, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Props = {
  /** Hide the overlay after this many ms (default 1800). */
  duration?: number;
  /** Called once the fade-out animation finishes. */
  onFinish?: () => void;
};

export default function SplashOverlay({ duration = 1800, onFinish }: Props) {
  const [mounted, setMounted] = useState(true);

  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo: fade-in + scale-in then continuous gentle pulse
    logoOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
    logoScale.value = withSequence(
      withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.4)) }),
      withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(1.0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );

    // Schedule fade-out
    const t = setTimeout(() => {
      containerOpacity.value = withTiming(
        0,
        { duration: 450, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) {
            runOnJS(setMounted)(false);
            if (onFinish) runOnJS(onFinish)();
          }
        },
      );
    }, duration);

    return () => clearTimeout(t);
  }, [duration, onFinish, containerOpacity, logoOpacity, logoScale]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.root, containerStyle]} pointerEvents="none">
      <Image
        source={require("../assets/images/jatek-splash.png")}
        style={styles.bg}
        resizeMode="cover"
      />
      <View style={styles.center}>
        <Animated.Image
          source={require("../assets/images/jatek-logo.png")}
          style={[styles.logo, logoStyle]}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#E91E63",
    ...(Platform.OS === "web"
      ? { width: "100%" as any, height: "100%" as any }
      : { width: SCREEN_W, height: SCREEN_H }),
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 180,
    height: 180,
  },
});
