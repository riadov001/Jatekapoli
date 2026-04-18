import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
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
    minOrderAmount?: number | null;
  };
  onPress: () => void;
  horizontal?: boolean;
}

export function RestaurantCard({ restaurant, onPress, horizontal }: RestaurantCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          width: horizontal ? 220 : undefined,
        },
      ]}
    >
      <View style={styles.imageContainer}>
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="restaurant" size={32} color={colors.mutedForeground} />
          </View>
        )}
        {restaurant.isOpen === false && (
          <View style={[styles.closedBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
            <Text style={[styles.closedText, { color: "#fff" }]}>Closed</Text>
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
              <Ionicons name="star" size={12} color={colors.warning} />
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: "100%",
    height: 140,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  closedBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closedText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  info: {
    padding: 12,
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  category: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  meta: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  warning: {
    color: "#E2006A",
  },
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
