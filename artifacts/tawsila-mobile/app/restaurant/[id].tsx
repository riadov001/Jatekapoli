import React, { useEffect, useState } from "react";
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Platform, ScrollView,
} from "react-native";
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

export default function RestaurantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
            </View>

            {/* Info */}
            <View style={[styles.infoSection, { backgroundColor: colors.background }]}>
              <Text style={[styles.rName, { color: colors.foreground }]}>{restaurant.name}</Text>
              {restaurant.description && (
                <Text style={[styles.rDesc, { color: colors.mutedForeground }]}>{restaurant.description}</Text>
              )}
              <View style={styles.metaRow}>
                {restaurant.rating != null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={14} color={colors.warning} />
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
                    <Ionicons name="bicycle-outline" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{restaurant.deliveryFee > 0 ? `${restaurant.deliveryFee} MAD` : "Livraison offerte"}</Text>
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
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedItem(item)}
            style={styles.menuItemWrap}
          >
            <MenuItemCard
              item={item}
              quantity={getQty(item.id)}
              onAdd={() => addItem(restaurantId, restaurant.name, { menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl })}
              onRemove={() => updateQuantity(item.id, getQty(item.id) - 1)}
            />
          </TouchableOpacity>
        )}
      />

      {/* Cart CTA */}
      {itemCount > 0 && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 12) }]}>
          <TouchableOpacity
            style={[styles.cartBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/cart")}
            activeOpacity={0.85}
          >
            <View style={[styles.cartQty, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
              <Text style={styles.cartQtyText}>{itemCount}</Text>
            </View>
            <Text style={styles.cartBtnText}>Voir le panier</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Product detail modal */}
      <MenuItemDetailModal
        visible={!!selectedItem}
        item={selectedItem}
        initialQty={selectedItem ? getQty(selectedItem.id) : 0}
        onClose={() => setSelectedItem(null)}
        onAdd={(qty) => {
          if (!selectedItem) return;
          for (let i = 0; i < qty; i++) {
            addItem(restaurantId, restaurant.name, {
              menuItemId: selectedItem.id,
              name: selectedItem.name,
              price: selectedItem.price,
              imageUrl: selectedItem.imageUrl,
            });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroWrap: { position: "relative" },
  hero: { width: "100%", height: 220 },
  heroPlaceholder: { width: "100%", height: 220, alignItems: "center", justifyContent: "center" },
  backBtn: {
    position: "absolute", top: 48, left: 16,
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
  },
  infoSection: { padding: 16, paddingTop: 20, gap: 6 },
  rName: { fontSize: 24, fontFamily: "Inter_700Bold" },
  rDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 16, marginTop: 6, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
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
  cartBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 8 },
  cartBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    height: 60, borderRadius: 30,
    shadowColor: "#E2006A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  cartQty: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  cartQtyText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  cartBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
  warning: { color: "#F59E0B" },
});
