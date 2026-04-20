import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useListRestaurants,
  useListOrders,
  getListOrdersQueryKey,
  type Restaurant,
  type Order,
  type ListRestaurantsParams,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddressQuickPicker } from "@/components/AddressQuickPicker";
import { useT } from "@/contexts/LanguageContext";

// Talabat-inspired palette (UI only, no theme changes)
const BG = "#F8F9FA";
const CARD_BG = "#FFFFFF";
const PINK = "#FF4593";
const TURQUOISE = "#00BFA6";
const TURQUOISE_SOFT = "#E0F7F4";
const TEXT_DARK = "#0A1B3D";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EFEFEF";
const STAR_YELLOW = "#FFC107";

const CATEGORIES = [
  { id: "all",        label: "Tous",       icon: "restaurant" as const },
  { id: "Pizza",      label: "Pizza",      icon: "pizza" as const },
  { id: "Burger",     label: "Burger",     icon: "fast-food" as const },
  { id: "Sushi",      label: "Sushi",      icon: "fish" as const },
  { id: "Marocain",   label: "Marocain",   icon: "leaf" as const },
  { id: "Sandwichs",  label: "Sandwichs",  icon: "cafe" as const },
  { id: "Poulet",     label: "Poulet",     icon: "nutrition" as const },
  { id: "Healthy",    label: "Healthy",    icon: "heart" as const },
];

function RestaurantRow({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.rCard}
    >
      <View style={styles.rImageWrap}>
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={styles.rImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.rImage, styles.rImagePlaceholder]}>
            <Ionicons name="restaurant" size={28} color={TEXT_MUTED} />
          </View>
        )}
        {restaurant.deliveryTime != null && (
          <View style={styles.deliveryBadge}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={styles.deliveryBadgeText}>
              {restaurant.deliveryTime} min
            </Text>
          </View>
        )}
        {restaurant.isOpen === false && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Fermé</Text>
          </View>
        )}
      </View>

      <View style={styles.rBody}>
        <View style={styles.rTitleRow}>
          <Text style={styles.rTitle} numberOfLines={1}>
            {restaurant.name}
          </Text>
          {restaurant.rating != null && (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color={STAR_YELLOW} />
              <Text style={styles.ratingText}>
                {restaurant.rating.toFixed(1)}
              </Text>
            </View>
          )}
        </View>

        {restaurant.category ? (
          <Text style={styles.rCategory} numberOfLines={1}>
            {restaurant.category}
          </Text>
        ) : null}

        <View style={styles.rMetaRow}>
          {restaurant.deliveryTime != null && (
            <View style={styles.rMetaItem}>
              <Ionicons name="bicycle-outline" size={13} color={TEXT_MUTED} />
              <Text style={styles.rMetaText}>{restaurant.deliveryTime} min</Text>
            </View>
          )}
          {restaurant.minimumOrder != null && restaurant.minimumOrder > 0 ? (
            <View style={styles.rMetaItem}>
              <Ionicons name="wallet-outline" size={13} color={TEXT_MUTED} />
              <Text style={styles.rMetaText}>
                Min {restaurant.minimumOrder} MAD
              </Text>
            </View>
          ) : null}
          {restaurant.deliveryFee != null && restaurant.deliveryFee === 0 ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Livraison offerte</Text>
            </View>
          ) : restaurant.deliveryFee != null ? (
            <View style={styles.rMetaItem}>
              <Text style={styles.rMetaText}>
                {restaurant.deliveryFee} MAD livraison
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedAddress } = useCart();
  const t = useT();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [showAddrPicker, setShowAddrPicker] = useState(false);
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  // Restaurants — preserve existing API call shape
  const params = useMemo<ListRestaurantsParams>(() => {
    const p: ListRestaurantsParams = { businessType: "restaurant" };
    if (activeCat !== "all") p.category = activeCat;
    if (search.trim()) p.search = search;
    return p;
  }, [activeCat, search]);

  const { data: restaurants, isLoading, refetch } = useListRestaurants(params);

  // Unfiltered restaurants list — used to look up reorder items independently
  // of the current category/search filter.
  const allRestaurantsParams: ListRestaurantsParams = useMemo(
    () => ({ businessType: "restaurant" }),
    [],
  );
  const { data: allRestaurants } = useListRestaurants(allRestaurantsParams);

  // Past orders for the Reorder section (fully typed query options)
  const ordersParams = user ? { userId: user.id } : undefined;
  const { data: pastOrders } = useListOrders(ordersParams, {
    query: {
      queryKey: getListOrdersQueryKey(ordersParams),
      enabled: !!user,
    },
  });

  // Build "reorder" list: latest unique restaurants from past orders.
  // Looked up against the *unfiltered* list so changing category/search does
  // not hide the user's history.
  const reorderRestaurants = useMemo<Restaurant[]>(() => {
    if (!pastOrders || !allRestaurants) return [];
    const byId = new Map<number, Restaurant>();
    for (const r of allRestaurants) byId.set(r.id, r);

    const seen = new Set<number>();
    const list: Restaurant[] = [];
    for (const o of pastOrders as Order[]) {
      const rid = o.restaurantId;
      if (!rid || seen.has(rid)) continue;
      const r = byId.get(rid);
      if (r) {
        list.push(r);
        seen.add(rid);
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [pastOrders, allRestaurants]);

  const ListHeader = (
    <View>
      {/* Categories — horizontal scroll, small cards */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Catégories</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => {
          const active = activeCat === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.85}
              onPress={() => setActiveCat(c.id)}
              style={[
                styles.catCard,
                { backgroundColor: active ? PINK : CARD_BG },
              ]}
            >
              <View
                style={[
                  styles.catIconWrap,
                  {
                    backgroundColor: active
                      ? "rgba(255,255,255,0.18)"
                      : TURQUOISE_SOFT,
                  },
                ]}
              >
                <Ionicons
                  name={c.icon}
                  size={20}
                  color={active ? "#fff" : TURQUOISE}
                />
              </View>
              <Text
                style={[
                  styles.catLabel,
                  { color: active ? "#fff" : TEXT_DARK },
                ]}
                numberOfLines={1}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Reorder — quick history */}
      {reorderRestaurants.length > 0 ? (
        <View style={styles.reorderSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recommandés</Text>
            <Ionicons name="refresh" size={16} color={TURQUOISE} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reorderRow}
          >
            {reorderRestaurants.map((r) => (
              <TouchableOpacity
                key={r.id}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/restaurant/[id]",
                    params: { id: String(r.id) },
                  })
                }
                style={styles.reorderCard}
              >
                <View style={styles.reorderImgWrap}>
                  {r.imageUrl ? (
                    <Image
                      source={{ uri: r.imageUrl }}
                      style={styles.reorderImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.reorderImg, styles.rImagePlaceholder]}>
                      <Ionicons name="restaurant" size={22} color={TEXT_MUTED} />
                    </View>
                  )}
                </View>
                <Text style={styles.reorderName} numberOfLines={1}>
                  {r.name}
                </Text>
                <View style={styles.reorderBtn}>
                  <Ionicons name="repeat" size={12} color="#fff" />
                  <Text style={styles.reorderBtnText}>Recommander</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>
          {activeCat === "all" ? "Restaurants" : activeCat}
        </Text>
        {restaurants ? (
          <Text style={styles.sectionCount}>
            {restaurants.length} résultat{restaurants.length !== 1 ? "s" : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: BG }]}>
      {/* Minimal header — location only */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10 + webTopPad },
        ]}
      >
        <Text style={styles.deliverToLabel}>Livrer à</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowAddrPicker(true)}
          style={styles.addressRow}
        >
          <Ionicons name="location" size={16} color={PINK} />
          <Text style={styles.addressText} numberOfLines={1}>
            {selectedAddress || t("home_choose_address")}
          </Text>
          <Ionicons name="chevron-down" size={16} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      {/* Search bar — rounded, white */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("home_search_ph")}
            placeholderTextColor={TEXT_MUTED}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PINK} size="large" />
        </View>
      ) : (
        <FlatList
          data={restaurants ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={[
            styles.list,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 90),
            },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="restaurant-outline"
                size={48}
                color={TEXT_MUTED}
              />
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptyText}>
                Essayez une autre recherche ou catégorie
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <RestaurantRow
              restaurant={item}
              onPress={() =>
                router.push({
                  pathname: "/restaurant/[id]",
                  params: { id: String(item.id) },
                })
              }
            />
          )}
        />
      )}

      <AddressQuickPicker
        visible={showAddrPicker}
        onClose={() => setShowAddrPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  header: {
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  deliverToLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.2,
  },

  // Search
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: 999,
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
  },

  // Generic section header
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },

  // Categories
  catRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  catCard: {
    width: 88,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // Reorder section
  reorderSection: {
    marginTop: 4,
  },
  reorderRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  reorderCard: {
    width: 140,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    gap: 8,
  },
  reorderImgWrap: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: BG,
  },
  reorderImg: {
    width: "100%",
    height: "100%",
  },
  reorderName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
    textAlign: "center",
  },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PINK,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  reorderBtnText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // Restaurant list items
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 16,
  },
  rCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  rImageWrap: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: BG,
  },
  rImage: {
    width: "100%",
    height: "100%",
  },
  rImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },
  deliveryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TURQUOISE,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  deliveryBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  closedOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closedText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  rBody: {
    padding: 16,
    gap: 6,
  },
  rTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.2,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: BG,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
  },
  rCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },
  rMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
  },
  rMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },
  freeBadge: {
    backgroundColor: TURQUOISE_SOFT,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    color: TURQUOISE,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // Misc
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 8,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    textAlign: "center",
  },
});
