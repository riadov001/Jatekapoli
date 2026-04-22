import React, { useRef } from "react";
import { StyleSheet, Text, View, Pressable, Image, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface RestaurantCardProps {
  restaurant: {
    id: number;
    name: string;
    description?: string | null;
    category?: string | null;
    rating?: number | null;
    deliveryTime?: number | null;
    isOpen?: boolean | null;
    imageUrl?: string | null;
    logoUrl?: string | null;
    minOrderAmount?: number | null;
  };
  onPress: () => void;
  horizontal?: boolean;
}

export function RestaurantCard({ restaurant, onPress, horizontal }: RestaurantCardProps) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 6, tension: 220 }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 240 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} style={{ width: horizontal ? 220 : undefined }}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            transform: [{ scale }],
          },
        ]}
      >
        <View style={styles.imageContainer}>
          {restaurant.imageUrl ? (
            <Image source={{ uri: restaurant.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
              <Ionicons name="restaurant" size={32} color={colors.mutedForeground} />
            </View>
          )}

          {/* Merchant logo overlay (top-left) */}
          <View style={styles.logoWrap}>
            {restaurant.logoUrl ? (
              <Image source={{ uri: restaurant.logoUrl }} style={styles.logoImg} resizeMode="contain" />
            ) : (
              <View style={[styles.logoImg, styles.logoFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.logoLetter}>
                  {restaurant.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
          </View>

          {restaurant.isOpen === false && (
            <View style={styles.closedBadge}>
              <Text style={styles.closedText}>Fermé</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.category && (
            <Text style={[styles.category, { color: colors.mutedForeground }]} numberOfLines={1}>
              {restaurant.category}
            </Text>
          )}
          <View style={styles.meta}>
            {restaurant.rating != null && (
              <View style={styles.metaItem}>
                <Ionicons name="star" size={12} color={colors.yellow} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {" "}{restaurant.rating.toFixed(1)}
                </Text>
              </View>
            )}
            {restaurant.deliveryTime != null && (
              <View style={[styles.deliveryPill, { backgroundColor: colors.primary }]}>
                <Ionicons name="flash" size={11} color={colors.primaryForeground} />
                <Text style={[styles.deliveryPillText, { color: colors.primaryForeground }]}>
                  {restaurant.deliveryTime} min
                </Text>
              </View>
            )}
            {restaurant.minOrderAmount != null && restaurant.minOrderAmount > 0 && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  Min {restaurant.minOrderAmount} MAD
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  imageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: "100%", height: "100%", borderRadius: 9, backgroundColor: "transparent" },
  logoFallback: { alignItems: "center", justifyContent: "center" },
  logoLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  closedBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  closedText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  info: { padding: 12, gap: 3 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  category: { fontSize: 12, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap", alignItems: "center" },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deliveryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deliveryPillText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
