import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Platform, ScrollView, Animated, Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetRestaurant, useListMenuItems } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { MenuItemCard } from "@/components/MenuItemCard";
import { MenuItemDetailModal } from "@/components/MenuItemDetailModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listFavorites, addFavorite, removeFavorite } from "@/lib/api";
import { useT } from "@/contexts/LanguageContext";

export default function RestaurantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = parseInt(id, 10);
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const { items: cartItems, addItem, updateQuantity, restaurantId: cartRestaurantId, itemCount } = useCart();
  const { token } = useAuth();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!token || !restaurantId) return;
    listFavorites().then((rows) => setIsFav(rows.some((r) => r.restaurantId === restaurantId))).catch(() => {});
  }, [token, restaurantId]);

  const toggleFav = async () => {
    if (!token) { router.push("/(auth)/login" as any); return; }
    const next = !isFav;
    setIsFav(next);
    try {
      if (next) await addFavorite(restaurantId);
      else await removeFavorite(restaurantId);
    } catch { setIsFav(!next); }
  };

  const { data: restaurant, isLoading: rLoading } = useGetRestaurant(restaurantId);
  const { data: menuItems, isLoading: mLoading } = useListMenuItems(restaurantId);

  const categories = ["Tous", ...Array.from(new Set((menuItems ?? []).map((m) => m.category).filter(Boolean)))];
  const filtered = activeCategory === "Tous"
    ? (menuItems ?? [])
    : (menuItems ?? []).filter((m) => m.category === activeCategory);

  const getQty = (itemId: number) => cartItems.find((i) => i.menuItemId === itemId)?.quantity ?? 0;
  const businessType = (restaurant as any)?.businessType ?? "restaurant";
  const isServices = businessType === "services";

  if (rLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={styles.center} color={colors.primary} size="large" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Restaurant introuvable</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (itemCount > 0 ? 110 : 70) + (Platform.OS === "web" ? 34 : 0) }}
        ListHeaderComponent={
          <>
            {/* Hero image */}
            <View style={styles.heroWrap}>
              {restaurant.imageUrl ? (
                <Image source={{ uri: restaurant.imageUrl }} style={styles.hero} resizeMode="cover" />
              ) : (
                <View style={[styles.heroPlaceholder, { backgroundColor: colors.muted }]}>
                  <Ionicons name="restaurant" size={48} color={colors.mutedForeground} />
                </View>
              )}
              {/* Back button */}
              <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backBtn, { backgroundColor: "rgba(0,0,0,0.4)" }]}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              {/* Favorite button */}
              <TouchableOpacity
                onPress={toggleFav}
                style={[styles.backBtn, { backgroundColor: "rgba(0,0,0,0.4)", left: undefined, right: 16 }]}
              >
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? "#E2006A" : "#fff"} />
              </TouchableOpacity>
              {/* Circular merchant logo overlapping hero bottom-left */}
              {(restaurant.logoUrl || restaurant.imageUrl) ? (
                <View style={[styles.heroLogoWrap, { borderColor: colors.card, shadowColor: colors.primary }]}>
                  <Image
                    source={{ uri: restaurant.logoUrl ?? restaurant.imageUrl! }}
                    style={styles.heroLogoImg}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={[styles.heroLogoWrap, { borderColor: colors.card, backgroundColor: colors.primary, shadowColor: colors.primary, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 32, color: "#fff", fontFamily: "Inter_700Bold" }}>
                    {restaurant.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={[styles.infoSection, { backgroundColor: colors.background, paddingTop: 40 }]}>
              <Text style={[styles.rName, { color: colors.foreground }]}>{restaurant.name}</Text>
              {restaurant.description && (
                <Text style={[styles.rDesc, { color: colors.mutedForeground }]}>{restaurant.description}</Text>
              )}
              <View style={styles.metaRow}>
                {(() => {
                  const isOpen = (restaurant as { isOpen?: boolean | null }).isOpen;
                  if (isOpen !== true) return null;
                  return (
                    <View style={[styles.openBadge, { backgroundColor: colors.turquoiseSoft }]}>
                      <View style={[styles.openDot, { backgroundColor: colors.turquoise }]} />
                      <Text style={[styles.openText, { color: colors.turquoise }]}>Ouvert</Text>
                    </View>
                  );
                })()}
                {restaurant.rating != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={14} color={colors.yellow} />
                    <Text style={[styles.metaText, { color: colors.foreground }]}>{restaurant.rating.toFixed(1)}</Text>
                  </View>
                )}
                {restaurant.deliveryTime != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{restaurant.deliveryTime} min</Text>
                  </View>
                )}
                {restaurant.deliveryFee != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="bicycle-outline" size={14} color={restaurant.deliveryFee === 0 ? colors.turquoise : colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: restaurant.deliveryFee === 0 ? colors.turquoise : colors.mutedForeground, fontFamily: restaurant.deliveryFee === 0 ? "Inter_700Bold" : "Inter_500Medium" }]}>{restaurant.deliveryFee > 0 ? `${restaurant.deliveryFee} MAD` : "Livraison offerte"}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Category tabs */}
            {categories.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[styles.catChip, { backgroundColor: activeCategory === cat ? colors.primary : colors.card, borderColor: activeCategory === cat ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.catText, { color: activeCategory === cat ? "#fff" : colors.mutedForeground }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {cartRestaurantId && cartRestaurantId !== restaurantId && (
              <View style={[styles.warningBanner, { backgroundColor: colors.warning + "20", borderColor: colors.warning + "40" }]}>
                <Ionicons name="warning-outline" size={16} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Ajouter des produits videra votre panier actuel
                </Text>
              </View>
            )}

            {mLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.menuItemWrap}>
            <MenuItemCard
              item={item}
              quantity={getQty(item.id)}
              onPressCard={() => setSelectedItem(item)}
              onAdd={() => {
                const pricing = restaurant as { deliveryFee?: number | null; freeDeliveryThreshold?: number | null };
                addItem(restaurantId, restaurant.name, { menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl }, { deliveryFee: pricing.deliveryFee, freeDeliveryThreshold: pricing.freeDeliveryThreshold });
              }}
              onRemove={() => updateQuantity(item.id, getQty(item.id) - 1)}
            />
          </View>
        )}
      />

      {/* Quote CTA — for service-type merchants (no menu cart) */}
      {isServices && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 10) }]}>
          <TouchableOpacity
            style={[styles.cartBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/quote/new", params: { restaurantId: String(restaurantId), restaurantName: restaurant.name } })}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.cartBtnText} numberOfLines={1}>{t("quote_request")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Floating bottom back button (no overlap with hero content) */}
      <View
        pointerEvents="box-none"
        style={[styles.bottomBackWrap, { bottom: insets.bottom + (itemCount > 0 ? 80 : 24) + (Platform.OS === "web" ? 34 : 0) }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.bottomBackBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Cart CTA — light gradient pill matching "+" style, with bouncy add animation */}
      {!isServices && itemCount > 0 && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 10) }]}>
          <CartPillButton
            count={itemCount}
            label={t("view_cart")}
            onPress={() => router.push("/cart")}
            color={colors.primary}
          />
        </View>
      )}

      {/* Product detail modal */}
      <MenuItemDetailModal
        visible={!!selectedItem}
        item={selectedItem}
        initialQty={selectedItem ? getQty(selectedItem.id) : 0}
        onClose={() => setSelectedItem(null)}
        onAdd={({ qty, unitPrice, displayName, variantId }) => {
          if (!selectedItem) return;
          const pricing = restaurant as { deliveryFee?: number | null; freeDeliveryThreshold?: number | null };
          for (let i = 0; i < qty; i++) {
            addItem(restaurantId, restaurant.name, {
              menuItemId: variantId,
              name: displayName,
              price: unitPrice,
              imageUrl: selectedItem.imageUrl,
            }, { deliveryFee: pricing.deliveryFee, freeDeliveryThreshold: pricing.freeDeliveryThreshold });
          }
        }}
      />
    </View>
  );
}

// Light "Voir panier" pill — same minimal style as the round "+" buttons,
// no chunky shadow. Bounces softly each time the cart count grows.
function CartPillButton({
  count,
  label,
  onPress,
  color,
}: {
  count: number;
  label: string;
  onPress: () => void;
  color: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(count);

  // Bounce/pulse whenever the cart count increases (item added)
  useEffect(() => {
    if (count > prevCount.current) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.sequence([
        Animated.spring(bounce, { toValue: 1, useNativeDriver: true, friction: 4, tension: 220 }),
        Animated.spring(bounce, { toValue: 0, useNativeDriver: true, friction: 5, tension: 180 }),
      ]).start();
    }
    prevCount.current = count;
  }, [count, bounce]);

  const onIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 6 }).start();
  };
  const onOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  const bumpScale = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={{ transform: [{ scale }, { scale: bumpScale }] }}>
        <View style={[styles.pillCartBtn, { backgroundColor: color }]}>
          <View style={styles.pillCartQty}>
            <Text style={[styles.pillCartQtyText, { color }]}>{count}</Text>
          </View>
          <Text style={styles.pillCartLabel} numberOfLines={1}>{label}</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroWrap: { position: "relative" },
  hero: { width: "100%", height: 200 },
  heroPlaceholder: { width: "100%", height: 200, alignItems: "center", justifyContent: "center" },
  heroLogoWrap: {
    position: "absolute",
    bottom: -30,
    left: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  heroLogoImg: { width: "100%", height: "100%" },
  backBtn: {
    position: "absolute", top: 48, left: 16,
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  infoSection: { padding: 16, paddingTop: 20, gap: 6 },
  rName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  rDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 16, marginTop: 6, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  openBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  openDot: { width: 6, height: 6, borderRadius: 3 },
  openText: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  metaText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  catRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  menuItemWrap: { paddingHorizontal: 16 },
  warningBanner: {
    margin: 16, marginBottom: 0, padding: 10, borderRadius: 10, borderWidth: 1,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  warningText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  cartBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 6,
    alignItems: "center",
  },
  cartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 44, borderRadius: 22,
    paddingHorizontal: 18,
    minWidth: 200,
    maxWidth: 360,
    alignSelf: "center",
    shadowColor: "#E2006A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 8,
  },
  cartQty: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cartQtyText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  cartBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  warning: { color: "#F59E0B" },
  // Light pill cart button — matches the "+" minimal style, no chunky shadow
  pillCartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    height: 46, borderRadius: 23,
    paddingLeft: 8, paddingRight: 18,
    minWidth: 220, maxWidth: 360, alignSelf: "center",
  },
  pillCartQty: {
    minWidth: 30, height: 30, paddingHorizontal: 9, borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  pillCartQtyText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pillCartLabel: {
    color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold",
    textAlign: "center", letterSpacing: 0.2,
  },
  // Floating bottom-left back button on restaurant screen
  bottomBackWrap: {
    position: "absolute",
    left: 16,
  },
  bottomBackBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
});
