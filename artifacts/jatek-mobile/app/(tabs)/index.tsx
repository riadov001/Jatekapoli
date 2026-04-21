import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListRestaurants,
  type Restaurant,
  type ListRestaurantsParams,
} from "@workspace/api-client-react";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { WaveEdge } from "@/components/WaveEdge";

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette — Jatek (matches Figma prototype)
// ─────────────────────────────────────────────────────────────────────────────
const PINK = "#E91E63";
const PINK_DEEP = "#C2185B";
const PINK_SOFT = "#FFE3EF";
const TEXT_DARK = "#0A1B3D";
const TEXT_MUTED = "#6B7280";
const BG = "#FFFFFF";
const STAR = "#E91E63";
const NEW_GREEN = "#7BE36A";
const CARD_BORDER = "#F0F0F0";

// Service squares (Service Coursier / Boutiques / Offers / Parapharm)
const SERVICES = [
  { key: "courier",  label: "Service Coursier", bg: "#D7F6FA", icon: "bicycle"   as const, color: "#0AA5C0" },
  { key: "shops",    label: "Boutiques",        bg: "#FFC9D8", icon: "storefront" as const, color: "#C2185B" },
  { key: "offers",   label: "Offers",           bg: "#A8F08A", icon: "pricetag"  as const, color: "#3A7D1B" },
  { key: "pharm",    label: "Parapharm",        bg: "#E5A3F0", icon: "medkit"    as const, color: "#7A2A8C" },
];

// Pink pill categories (version B)
const CATEGORIES = [
  { id: "Burger",   label: "Burger" },
  { id: "Tacos",    label: "Tacos" },
  { id: "Pizza",    label: "Pizza" },
  { id: "shawarma", label: "shawarma" },
  { id: "Couscous", label: "Couscous" },
];

// Discovery videos (gray placeholders with play icon — Figma style)
const VIDEO_PLACEHOLDERS = [0, 1, 2, 3];

// Default fallback image used when a restaurant has no imageUrl.
// Picsum food-style placeholder (always reachable, no auth needed).
const FALLBACK_FOOD =
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format&fit=crop";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_GAP = 12;
const GRID_SIDE = 16;
const GRID_CARD_W = (SCREEN_W - GRID_SIDE * 2 - GRID_GAP) / 2;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PromoBanner() {
  return (
    <View style={s.promoBanner}>
      <View style={{ flex: 1 }}>
        <Text style={s.promoMinus}>-10%</Text>
        <Text style={s.promoCode}>WELCOME10</Text>
      </View>
      <Text style={s.promoBrand}>Jatek</Text>
    </View>
  );
}

function SectionHeader({ title, onMore }: { title: string; onMore?: () => void }) {
  return (
    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onMore} activeOpacity={0.85} style={s.voirPlusBtn}>
        <Text style={s.voirPlusTxt}>Voir plus</Text>
      </TouchableOpacity>
    </View>
  );
}

type CardBadge = "nouveau" | "promo" | null;

function RestaurantTile({
  restaurant,
  badge,
  width,
  onPress,
  showDistance = false,
}: {
  restaurant: Restaurant;
  badge: CardBadge;
  width: number;
  onPress: () => void;
  showDistance?: boolean;
}) {
  const img = restaurant.imageUrl || FALLBACK_FOOD;
  const rating = restaurant.rating ?? 4.5;
  const time = restaurant.deliveryTime ?? 25;
  const fee = restaurant.deliveryFee ?? 10;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.tile,
        { width },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={s.tileImgWrap}>
        <Image source={{ uri: img }} style={s.tileImg} resizeMode="cover" />
        {badge === "nouveau" && (
          <View style={[s.tileBadge, { backgroundColor: NEW_GREEN }]}>
            <Text style={s.tileBadgeTxt}>Nouveau</Text>
          </View>
        )}
        {badge === "promo" && (
          <View style={[s.tileBadge, { backgroundColor: PINK }]}>
            <Text style={[s.tileBadgeTxt, { color: "#fff" }]}>Promo</Text>
          </View>
        )}
        {/* Circular grey logo placeholder, like the Figma cards */}
        <View style={s.tileLogo} />
        <View style={s.tileRatingPill}>
          <Ionicons name="star" size={11} color={STAR} />
          <Text style={s.tileRatingTxt}>
            {rating.toFixed(1)} <Text style={s.tileRatingMuted}>(+100)</Text>
          </Text>
        </View>
      </View>
      <View style={s.tileBody}>
        <Text style={s.tileName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={s.tileMetaRow}>
          <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
          <Text style={s.tileMetaTxt}>
            {time} - {time + 10} min
          </Text>
          <Ionicons
            name="bicycle-outline"
            size={12}
            color={TEXT_MUTED}
            style={{ marginLeft: 8 }}
          />
          <Text style={s.tileMetaTxt}>{fee} MAD</Text>
          {showDistance && (
            <>
              <Ionicons
                name="location-outline"
                size={12}
                color={TEXT_MUTED}
                style={{ marginLeft: 8 }}
              />
              <Text style={s.tileMetaTxt}>152m</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Home Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { selectedAddress } = useCart();

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const params = useMemo<ListRestaurantsParams>(() => {
    const p: ListRestaurantsParams = { businessType: "restaurant" };
    if (activeCat) p.category = activeCat;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [activeCat, search]);

  const { data: restaurants, isLoading } = useListRestaurants(params);

  const goRestaurant = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  const addressLabel = selectedAddress || "Livraison en 5R22+CVC2";
  const userInitial = (user?.name || user?.email || "J").charAt(0).toUpperCase();

  // Tab bar leaves ~84pt of empty space at the bottom — pad accordingly.
  const tabBarPad = (Platform.OS === "web" ? 84 : 72) + insets.bottom;

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: tabBarPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Pink header with wavy bottom edge ─── */}
        <View style={s.headerWrap}>
          <View
            style={[
              s.header,
              { paddingTop: insets.top + 12 },
            ]}
          >
            {/* Top row: location + avatar */}
            <View style={s.headerTopRow}>
              <TouchableOpacity activeOpacity={0.8} style={s.locRow}>
                <Ionicons name="location-sharp" size={18} color="#fff" />
                <Text style={s.locTxt} numberOfLines={1}>
                  Livraison en{" "}
                  <Text style={s.locTxtBold}>
                    {addressLabel.replace("Livraison en ", "")}
                  </Text>
                </Text>
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={s.avatar}
                onPress={() => router.push("/profile")}
              >
                <Ionicons name="person" size={18} color={PINK} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={s.searchBox}>
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                style={s.searchInput}
                placeholder="Rechercher dans Jatek..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Wavy bottom edge — extends the pink down with an organic curve */}
          <WaveEdge color={PINK} height={28} />
        </View>

        {/* ─── Top categories: 2 big cards (Restaurants / Supermarche) ─── */}
        <View style={s.topCardsRow}>
          <Pressable
            onPress={() => setActiveCat(null)}
            style={({ pressed }) => [
              s.topCard,
              { backgroundColor: "#FFE3EC" },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={s.topCardPromoBadge}>
              <Text style={s.topCardPromoTxt}>Promo</Text>
            </View>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&auto=format&fit=crop",
              }}
              style={s.topCardImg}
              resizeMode="contain"
            />
            <Text style={s.topCardLabel}>Restaurants</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.topCard,
              { backgroundColor: "#FBE7CF" },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80&auto=format&fit=crop",
              }}
              style={s.topCardImg}
              resizeMode="contain"
            />
            <Text style={s.topCardLabel}>Supermarche</Text>
          </Pressable>
        </View>

        {/* ─── 4 service squares ─── */}
        <View style={s.servicesRow}>
          {SERVICES.map((sv) => (
            <View key={sv.key} style={s.serviceItem}>
              <View style={[s.serviceSquare, { backgroundColor: sv.bg }]}>
                <Ionicons name={sv.icon} size={26} color={sv.color} />
              </View>
              <Text style={s.serviceLabel} numberOfLines={1}>
                {sv.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── Pink pill categories (Burger · Tacos · Pizza · shawarma · Couscous) ─── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pillsRow}
        >
          {CATEGORIES.map((c) => {
            const active = activeCat === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setActiveCat(active ? null : c.id)}
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <View style={s.pillStack}>
                  <View style={[s.pillCircle, active && s.pillCircleActive]} />
                  <Text style={s.pillLabel}>{c.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ─── Promo banner -10% Jatek WELCOME10 ─── */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <PromoBanner />
        </View>

        {/* ─── Découvrir en vidéo ─── */}
        <SectionHeader title="Decouvrir en video" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.videosRow}
        >
          {VIDEO_PLACEHOLDERS.map((i) => (
            <View key={i} style={s.videoCard}>
              <View style={s.videoPlay}>
                <Ionicons name="play-circle-outline" size={26} color="#fff" />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* ─── Pres de chez vous (horizontal scroll) ─── */}
        <SectionHeader title="Pres de chez vous" />
        {isLoading ? (
          <ActivityIndicator color={PINK} style={{ marginVertical: 18 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.horizontalRow}
          >
            {(restaurants ?? []).slice(0, 6).map((r, i) => (
              <RestaurantTile
                key={r.id}
                restaurant={r}
                badge={i % 2 === 0 ? "nouveau" : "promo"}
                width={260}
                onPress={() => goRestaurant(r.id)}
                showDistance
              />
            ))}
            {(restaurants ?? []).length === 0 && !isLoading && (
              <Text style={s.emptyTxt}>Aucun restaurant à proximité</Text>
            )}
          </ScrollView>
        )}

        {/* ─── Big promotional banner (lower position) ─── */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <PromoBanner />
        </View>

        {/* ─── Tous les Restaurants (2-column grid) ─── */}
        <View style={s.gridSection}>
          <Text style={s.gridSectionTitle}>Tous les Restaurants</Text>
          {isLoading ? (
            <ActivityIndicator color={PINK} style={{ marginVertical: 24 }} />
          ) : (
            <View style={s.grid}>
              {(restaurants ?? []).map((r, i) => (
                <RestaurantTile
                  key={r.id}
                  restaurant={r}
                  badge={i % 2 === 0 ? "nouveau" : "promo"}
                  width={GRID_CARD_W}
                  onPress={() => goRestaurant(r.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1, backgroundColor: BG },

  // ── Header ──
  headerWrap: {
    backgroundColor: PINK,
    position: "relative",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 38,
    backgroundColor: PINK,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  locRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 10,
  },
  locTxt: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  locTxtBold: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFB6CC",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  searchBox: {
    height: 48,
    borderRadius: 26,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_DARK,
    fontFamily: "Inter_400Regular",
    height: 44,
    padding: 0,
  },
  // ── Top 2 big cards ──
  topCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  topCard: {
    flex: 1,
    height: 130,
    borderRadius: 18,
    padding: 12,
    overflow: "hidden",
    justifyContent: "flex-end",
    position: "relative",
  },
  topCardImg: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 30,
    width: undefined,
    height: undefined,
  },
  topCardLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
  },
  topCardPromoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: PINK,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    zIndex: 2,
  },
  topCardPromoTxt: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  // ── Services row ──
  servicesRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 12,
  },
  serviceItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  serviceSquare: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: TEXT_DARK,
    textAlign: "center",
  },

  // ── Pink pill categories ──
  pillsRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 18,
  },
  pillStack: { alignItems: "center", gap: 6 },
  pillCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: PINK_SOFT,
  },
  pillCircleActive: {
    backgroundColor: PINK,
  },
  pillLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
  },

  // ── Promo banner ──
  promoBanner: {
    width: "100%",
    height: 110,
    backgroundColor: PINK,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  promoMinus: {
    fontSize: 44,
    fontFamily: "Inter_900Black",
    color: "#fff",
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  promoCode: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: NEW_GREEN,
    letterSpacing: 1,
    marginTop: 2,
  },
  promoBrand: {
    fontSize: 38,
    fontFamily: "Inter_900Black",
    color: "#fff",
    fontStyle: "italic",
    letterSpacing: -1,
  },

  // ── Section headers ──
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.3,
  },
  voirPlusBtn: {
    backgroundColor: PINK,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  voirPlusTxt: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  // ── Videos ──
  videosRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  videoCard: {
    width: 100,
    height: 160,
    borderRadius: 14,
    backgroundColor: "#E5E5E5",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: 8,
  },
  videoPlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Restaurant tiles (shared) ──
  horizontalRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  tile: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    overflow: "hidden",
  },
  tileImgWrap: {
    width: "100%",
    height: 110,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  tileImg: { width: "100%", height: "100%" },
  tileBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tileBadgeTxt: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
  },
  tileLogo: {
    position: "absolute",
    left: "50%",
    bottom: -22,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D1D5DB",
    borderWidth: 3,
    borderColor: "#fff",
  },
  tileRatingPill: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tileRatingTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
  },
  tileRatingMuted: {
    color: TEXT_MUTED,
    fontFamily: "Inter_400Regular",
  },
  tileBody: {
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 12,
    gap: 6,
  },
  tileName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
  },
  tileMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  tileMetaTxt: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },
  emptyTxt: {
    color: TEXT_MUTED,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    paddingHorizontal: 4,
  },

  // ── Grid section ──
  gridSection: {
    paddingHorizontal: 16,
    marginTop: 22,
  },
  gridSectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
});
