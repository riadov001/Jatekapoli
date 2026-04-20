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
import { LinearGradient } from "expo-linear-gradient";
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
import { TornEdge } from "@/components/TornEdge";

// Talabat-inspired palette
const BG = "#FFF5F8";
const CARD_BG = "#FFFFFF";
const PINK = "#FF4593";
const PINK_DEEP = "#E91E63";
const PINK_SOFT = "#FFE0EC";
const TURQUOISE = "#00BFA6";
const TURQUOISE_SOFT = "#E0F7F4";
const TEXT_DARK = "#0A1B3D";
const TEXT_MUTED = "#6B7280";
const BORDER = "#F1E0E8";
const STAR_YELLOW = "#FFC107";

// Each category gets an emoji (more "réaliste") and its own pastel background.
const CATEGORIES = [
  { id: "all",        label: "Tous",       emoji: "🍽️",  bg: "#FFE7DC" },
  { id: "Pizza",      label: "Pizza",      emoji: "🍕",  bg: "#FFE0E0" },
  { id: "Burger",     label: "Burger",     emoji: "🍔",  bg: "#FFF1D6" },
  { id: "Sushi",      label: "Sushi",      emoji: "🍣",  bg: "#DCEFFF" },
  { id: "Marocain",   label: "Marocain",   emoji: "🫖",  bg: "#FFE4D1" },
  { id: "Sandwichs",  label: "Sandwichs",  emoji: "🥪",  bg: "#E5F5DC" },
  { id: "Poulet",     label: "Poulet",     emoji: "🍗",  bg: "#FFEFD0" },
  { id: "Healthy",    label: "Healthy",    emoji: "🥗",  bg: "#DDF5E2" },
  { id: "Boissons",   label: "Boissons",   emoji: "🥤",  bg: "#E2DEFF" },
  { id: "Dessert",    label: "Dessert",    emoji: "🍰",  bg: "#FFE0F4" },
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
          <Image source={{ uri: restaurant.imageUrl }} style={styles.rImage} resizeMode="cover" />
        ) : (
          <View style={[styles.rImage, styles.rImagePlaceholder]}>
            <Ionicons name="restaurant" size={28} color={TEXT_MUTED} />
          </View>
        )}
        {restaurant.deliveryTime != null && (
          <View style={styles.deliveryBadge}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={styles.deliveryBadgeText}>{restaurant.deliveryTime} min</Text>
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
          <Text style={styles.rTitle} numberOfLines={1}>{restaurant.name}</Text>
          {restaurant.rating != null && (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color={STAR_YELLOW} />
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {restaurant.category ? (
          <Text style={styles.rCategory} numberOfLines={1}>{restaurant.category}</Text>
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
              <Text style={styles.rMetaText}>Min {restaurant.minimumOrder} MAD</Text>
            </View>
          ) : null}
          {restaurant.deliveryFee != null && restaurant.deliveryFee === 0 ? (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>Livraison offerte</Text>
            </View>
          ) : restaurant.deliveryFee != null ? (
            <View style={styles.rMetaItem}>
              <Text style={styles.rMetaText}>{restaurant.deliveryFee} MAD livraison</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PromoCard({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.promoCard}>
      {restaurant.imageUrl ? (
        <Image source={{ uri: restaurant.imageUrl }} style={styles.promoImg} resizeMode="cover" />
      ) : (
        <View style={[styles.promoImg, styles.rImagePlaceholder]}>
          <Ionicons name="restaurant" size={28} color={TEXT_MUTED} />
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.0)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.promoBadge}>
        <Text style={styles.promoBadgeText}>PROMO</Text>
      </View>
      <View style={styles.promoBody}>
        <Text style={styles.promoTitle} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.promoMeta}>
          {restaurant.rating != null && (
            <View style={styles.promoMetaItem}>
              <Ionicons name="star" size={12} color={STAR_YELLOW} />
              <Text style={styles.promoMetaText}>{restaurant.rating.toFixed(1)}</Text>
            </View>
          )}
          {restaurant.deliveryTime != null && (
            <View style={styles.promoMetaItem}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.promoMetaText}>{restaurant.deliveryTime} min</Text>
            </View>
          )}
          <View style={styles.promoCta}>
            <Text style={styles.promoCtaText}>Voir</Text>
            <Ionicons name="arrow-forward" size={12} color={PINK} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ShortCard({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.shortCard}>
      {restaurant.imageUrl ? (
        <Image source={{ uri: restaurant.imageUrl }} style={styles.shortImg} resizeMode="cover" />
      ) : (
        <View style={[styles.shortImg, styles.rImagePlaceholder]}>
          <Ionicons name="videocam" size={24} color={TEXT_MUTED} />
        </View>
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.shortPlay}>
        <Ionicons name="play" size={20} color="#fff" />
      </View>
      <View style={styles.shortBody}>
        <Text style={styles.shortTitle} numberOfLines={2}>{restaurant.name}</Text>
        <View style={styles.shortMetaRow}>
          <Ionicons name="heart" size={11} color={PINK} />
          <Text style={styles.shortMetaText}>
            {Math.floor(((restaurant.rating ?? 4.2) - 3) * 280 + 120)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedAddress } = useCart();
  const t = useT();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [showAddrPicker, setShowAddrPicker] = useState(false);
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const params = useMemo<ListRestaurantsParams>(() => {
    const p: ListRestaurantsParams = { businessType: "restaurant" };
    if (activeCat !== "all") p.category = activeCat;
    if (search.trim()) p.search = search;
    return p;
  }, [activeCat, search]);

  const { data: restaurants, isLoading, refetch } = useListRestaurants(params);

  const allRestaurantsParams: ListRestaurantsParams = useMemo(
    () => ({ businessType: "restaurant" }),
    [],
  );
  const { data: allRestaurants } = useListRestaurants(allRestaurantsParams);

  const ordersParams = user ? { userId: user.id } : undefined;
  const { data: pastOrders } = useListOrders(ordersParams, {
    query: {
      queryKey: getListOrdersQueryKey(ordersParams),
      enabled: !!user,
    },
  });

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
      if (r) { list.push(r); seen.add(rid); }
      if (list.length >= 6) break;
    }
    return list;
  }, [pastOrders, allRestaurants]);

  // Promotions = top-rated restaurants with images.
  const promoRestaurants = useMemo<Restaurant[]>(() => {
    if (!allRestaurants) return [];
    return [...allRestaurants]
      .filter((r) => !!r.imageUrl)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 6);
  }, [allRestaurants]);

  // "Shorts" = restaurants shuffled deterministically by id, with images.
  const shortsRestaurants = useMemo<Restaurant[]>(() => {
    if (!allRestaurants) return [];
    return [...allRestaurants]
      .filter((r) => !!r.imageUrl)
      .sort((a, b) => ((a.id * 7919) % 100) - ((b.id * 7919) % 100))
      .slice(0, 8);
  }, [allRestaurants]);

  const goRestaurant = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  const ListHeader = (
    <View>
      {/* Catégories */}
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
                active && styles.catCardActive,
              ]}
            >
              <View style={[styles.catIconWrap, { backgroundColor: active ? "rgba(255,255,255,0.22)" : c.bg }]}>
                <Text style={styles.catEmoji}>{c.emoji}</Text>
              </View>
              <Text
                style={[styles.catLabel, { color: active ? "#fff" : TEXT_DARK }]}
                numberOfLines={1}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Promotions — défilement horizontal */}
      {promoRestaurants.length > 0 ? (
        <View style={{ marginTop: 18 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>🔥 Promotions</Text>
            <Text style={styles.sectionLink}>Tout voir</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoRow}
            decelerationRate="fast"
            snapToInterval={296}
          >
            {promoRestaurants.map((r) => (
              <PromoCard key={r.id} restaurant={r} onPress={() => goRestaurant(r.id)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Shorts / Reels */}
      {shortsRestaurants.length > 0 ? (
        <View style={{ marginTop: 18 }}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.shortsTitleRow}>
              <Ionicons name="play-circle" size={20} color={PINK} />
              <Text style={styles.sectionTitle}>Shorts gourmands</Text>
            </View>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shortsRow}
          >
            {shortsRestaurants.map((r) => (
              <ShortCard key={r.id} restaurant={r} onPress={() => goRestaurant(r.id)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Reorder */}
      {reorderRestaurants.length > 0 ? (
        <View style={styles.reorderSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recommandés pour vous</Text>
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
                onPress={() => goRestaurant(r.id)}
                style={styles.reorderCard}
              >
                <View style={styles.reorderImgWrap}>
                  {r.imageUrl ? (
                    <Image source={{ uri: r.imageUrl }} style={styles.reorderImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.reorderImg, styles.rImagePlaceholder]}>
                      <Ionicons name="restaurant" size={22} color={TEXT_MUTED} />
                    </View>
                  )}
                </View>
                <Text style={styles.reorderName} numberOfLines={1}>{r.name}</Text>
                <View style={styles.reorderBtn}>
                  <Ionicons name="repeat" size={12} color="#fff" />
                  <Text style={styles.reorderBtnText}>Recommander</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
        <Text style={styles.sectionTitle}>
          {activeCat === "all" ? "Tous les restaurants" : activeCat}
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
      {/* En-tête rose avec bord papier déchiré */}
      <View style={styles.headerWrap}>
        <LinearGradient
          colors={[PINK, PINK_DEEP]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerBg, { paddingTop: insets.top + 12 + webTopPad }]}
        >
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliverToLabel}>Livrer à</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowAddrPicker(true)}
                style={styles.addressRow}
              >
                <Ionicons name="location" size={16} color="#fff" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {selectedAddress || t("home_choose_address")}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            {user ? (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/profile" as any)}
                style={styles.avatarBtn}
                activeOpacity={0.8}
              >
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarLetter}>
                    {(user.name ?? "J").charAt(0).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>
            {user ? `Salut ${user.name?.split(" ")[0] ?? ""} 👋` : "Bienvenue chez Jatek 👋"}
          </Text>
          <Text style={styles.greetingSub}>Que mangerez-vous aujourd'hui ?</Text>

          {/* Search bar */}
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
        </LinearGradient>
        <TornEdge color={PINK_DEEP} position="bottom" height={20} />
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
            { paddingTop: 22, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="restaurant-outline" size={48} color={TEXT_MUTED} />
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptyText}>Essayez une autre recherche ou catégorie</Text>
            </View>
          }
          renderItem={({ item }) => (
            <RestaurantRow restaurant={item} onPress={() => goRestaurant(item.id)} />
          )}
        />
      )}

      <AddressQuickPicker visible={showAddrPicker} onClose={() => setShowAddrPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Header
  headerWrap: {
    position: "relative",
  },
  headerBg: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  deliverToLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
    letterSpacing: 0.4,
    textTransform: "uppercase",
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
    color: "#fff",
    letterSpacing: -0.2,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },

  greeting: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  greetingSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
    marginBottom: 14,
  },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
  },

  // Section titles
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
  sectionLink: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: PINK,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },
  shortsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Categories
  catRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  catCard: {
    width: 82,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 18,
    alignItems: "center",
    gap: 8,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#FF4593",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catCardActive: {
    backgroundColor: PINK,
    borderColor: PINK,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  catEmoji: { fontSize: 26 },
  catLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  // Promo banners
  promoRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  promoCard: {
    width: 284,
    height: 156,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#222",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  promoImg: { width: "100%", height: "100%" },
  promoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: PINK,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  promoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  promoBody: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
  },
  promoTitle: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  promoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  promoMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  promoMetaText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  promoCta: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  promoCtaText: {
    color: PINK,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // Shorts
  shortsRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  shortCard: {
    width: 120,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#222",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shortImg: { width: "100%", height: "100%" },
  shortPlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: -20,
    marginLeft: -20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  shortBody: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
  },
  shortTitle: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.1,
  },
  shortMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  shortMetaText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },

  // Reorder
  reorderSection: { marginTop: 18 },
  reorderRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
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
  reorderImg: { width: "100%", height: "100%" },
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

  // Restaurants list
  list: {
    paddingHorizontal: 16,
    gap: 16,
  },
  rCard: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rImageWrap: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: BG,
  },
  rImage: { width: "100%", height: "100%" },
  rImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PINK_SOFT,
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
  rBody: { padding: 16, gap: 6 },
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
    backgroundColor: PINK_SOFT,
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
