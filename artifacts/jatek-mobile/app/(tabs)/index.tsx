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
import { ShortPlayerModal } from "@/components/ShortPlayerModal";
import { AddressQuickPicker } from "@/components/AddressQuickPicker";

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

// Shop categories (3×2 grid below the header)
const CAT_TINT = "#F2EDD0"; // light yellow-olive — shared tile background

const SHOP_CATEGORIES = [
  { slug: "restauration", label: "Restauration", image: require("../../assets/images/icon-restauration.jpg"),  accent: "#B85C00" },
  { slug: "epicerie",     label: "Épicerie",      image: require("../../assets/images/icon-epicerie.jpg"),      accent: "#2E7D32" },
  { slug: "sante",        label: "Santé",         image: require("../../assets/images/icon-sante.jpg"),         accent: "#C62828" },
  { slug: "supermarche",  label: "Supermarché",   image: require("../../assets/images/icon-supermarche.jpg"),  accent: "#E65100" },
  { slug: "boutiques",    label: "Boutiques",     image: require("../../assets/images/icon-boutiques.jpg"),     accent: "#880E4F" },
  { slug: "coursier",     label: "Coursier",      image: require("../../assets/images/icon-coursier.jpg"),      accent: "#1A237E" },
];

// Service squares (Service Coursier / Boutiques / Offers / Parapharm)
const SERVICES = [
  { key: "courier",  label: "Service Coursier", bg: "#D7F6FA", icon: "bicycle"   as const, color: "#0AA5C0", businessType: "services",     categorySlug: "coursier" },
  { key: "shops",    label: "Boutiques",        bg: "#FFC9D8", icon: "storefront" as const, color: "#C2185B", businessType: "shop",          categorySlug: "boutiques" },
  { key: "offers",   label: "Offers",           bg: "#A8F08A", icon: "pricetag"  as const, color: "#3A7D1B", businessType: "restaurant",    categorySlug: null, isOpen: true },
  { key: "pharm",    label: "Parapharm",        bg: "#E5A3F0", icon: "medkit"    as const, color: "#7A2A8C", businessType: "parapharmacy",  categorySlug: "sante" },
];


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

function PromoBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.promoBanner, pressed && { opacity: 0.9 }]}>
      <View style={{ flex: 1 }}>
        <Text style={s.promoMinus}>-10%</Text>
        <Text style={s.promoCode}>WELCOME10</Text>
      </View>
      <Text style={s.promoBrand}>Jatek</Text>
    </Pressable>
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
        <View style={s.tileLogo}>
          {restaurant.logoUrl ? (
            <Image source={{ uri: restaurant.logoUrl }} style={s.tileLogoImg} resizeMode="contain" />
          ) : (
            <Text style={s.tileLogoText}>{restaurant.name.charAt(0).toUpperCase()}</Text>
          )}
        </View>
      </View>
      <View style={s.tileBody}>
        <View style={s.tileNameRow}>
          <Text style={s.tileName} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={s.tileRatingInline}>
            <Ionicons name="star" size={11} color={STAR} />
            <Text style={s.tileRatingTxt}>{rating.toFixed(1)}</Text>
          </View>
        </View>
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
  const [activeBusinessType, setActiveBusinessType] = useState("restaurant");
  const [activeLabel, setActiveLabel] = useState("Tous les Restaurants");
  const [onlyOpen, setOnlyOpen] = useState<boolean | undefined>(undefined);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [shortsVisible, setShortsVisible] = useState(false);
  const [initialShort, setInitialShort] = useState(0);

  const params = useMemo<ListRestaurantsParams>(() => {
    const p: ListRestaurantsParams = { businessType: activeBusinessType };
    if (activeCat) p.category = activeCat;
    if (search.trim()) p.search = search.trim();
    if (onlyOpen !== undefined) p.isOpen = onlyOpen;
    return p;
  }, [activeBusinessType, activeCat, onlyOpen, search]);

  const { data: restaurants, isLoading } = useListRestaurants(params);
  const shorts = useMemo(
    () => (restaurants ?? []).filter((r) => r.imageUrl || r.coverImageUrl).slice(0, 8),
    [restaurants],
  );

  const goRestaurant = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  const addressLabel = selectedAddress || "Livraison en 5R22+CVC2";
  const currentLabel = activeLabel;

  const showRestaurants = () => {
    setActiveBusinessType("restaurant");
    setActiveCat(null);
    setOnlyOpen(undefined);
    setActiveLabel("Tous les Restaurants");
  };

  const applyService = (sv: typeof SERVICES[number]) => {
    if (sv.categorySlug) {
      router.push({ pathname: "/category/[slug]", params: { slug: sv.categorySlug } });
      return;
    }
    setActiveBusinessType(sv.businessType);
    setActiveCat(null);
    setOnlyOpen(sv.isOpen);
    setActiveLabel(sv.label);
  };

  const openShort = (index: number) => {
    setInitialShort(index);
    setShortsVisible(true);
  };

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
              <TouchableOpacity activeOpacity={0.8} style={s.locRow} onPress={() => setAddressPickerOpen(true)}>
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

        {/* ─── Shop categories horizontal slider ─── */}
        <Text style={s.sliderSectionTitle}>Explorer</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.shopCatsScroll}
          contentContainerStyle={s.shopCatsContent}
        >
          {SHOP_CATEGORIES.map((c) => (
            <Pressable
              key={c.slug}
              onPress={() => router.push({ pathname: "/category/[slug]", params: { slug: c.slug } })}
              style={({ pressed }) => [s.shopCatItem, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
            >
              <View style={s.shopCatTile}>
                <Image source={c.image} style={s.shopCatImg} resizeMode="contain" />
              </View>
              <Text style={[s.shopCatLabel, { color: c.accent }]} numberOfLines={1}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ─── 4 service squares ─── */}
        <View style={s.servicesRow}>
          {SERVICES.map((sv) => (
            <Pressable
              key={sv.key}
              onPress={() => applyService(sv)}
              style={({ pressed }) => [s.serviceItem, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            >
              <View style={[s.serviceSquare, { backgroundColor: sv.bg }]}>
                <Ionicons name={sv.icon} size={26} color={sv.color} />
              </View>
              <Text style={s.serviceLabel} numberOfLines={1}>
                {sv.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ─── Promo banner -10% Jatek WELCOME10 ─── */}
        <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <PromoBanner onPress={() => router.push("/profile/coupons?code=WELCOME10" as any)} />
        </View>

        {/* ─── Découvrir en vidéo ─── */}
        <SectionHeader title="Decouvrir en video" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.videosRow}
        >
          {shorts.map((restaurant, i) => (
            <Pressable key={restaurant.id} onPress={() => openShort(i)} style={({ pressed }) => [s.videoCard, pressed && { opacity: 0.9 }]}>
              <Image
                source={{ uri: restaurant.imageUrl || restaurant.coverImageUrl || FALLBACK_FOOD }}
                style={s.videoImg}
                resizeMode="cover"
              />
              <View style={s.videoScrim} />
              <View style={s.videoPlay}>
                <Ionicons name="play-circle-outline" size={26} color="#fff" />
              </View>
              <Text style={s.videoTitle} numberOfLines={2}>{restaurant.name}</Text>
            </Pressable>
          ))}
          {shorts.length === 0 && !isLoading && (
            <Text style={s.emptyTxt}>Aucune vidéo disponible pour le moment</Text>
          )}
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
          <PromoBanner onPress={() => router.push("/profile/coupons?code=WELCOME10" as any)} />
        </View>

        {/* ─── Tous les Restaurants (2-column grid) ─── */}
        <View style={s.gridSection}>
          <Text style={s.gridSectionTitle}>{currentLabel}</Text>
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
      <AddressQuickPicker visible={addressPickerOpen} onClose={() => setAddressPickerOpen(false)} />
      <ShortPlayerModal
        visible={shortsVisible}
        shorts={shorts}
        initialIndex={Math.min(initialShort, Math.max(shorts.length - 1, 0))}
        onClose={() => setShortsVisible(false)}
      />
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
  // ── Shop categories horizontal slider ──
  sliderSectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    marginTop: 20,
    marginBottom: 2,
    paddingHorizontal: 16,
  },
  shopCatsScroll: {
    marginTop: 6,
  },
  shopCatsContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  shopCatItem: {
    alignItems: "center",
    gap: 8,
    width: 90,
  },
  shopCatTile: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  shopCatImg: {
    width: 72,
    height: 72,
  },
  shopCatLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 14,
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
    overflow: "hidden",
    backgroundColor: PINK_SOFT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PINK,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pillCircleActive: {
    borderWidth: 2.5,
    borderColor: PINK,
  },
  pillImg: {
    width: "100%",
    height: "100%",
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
    overflow: "hidden",
    position: "relative",
  },
  videoImg: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  videoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,27,61,0.28)",
  },
  videoPlay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  videoTitle: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    lineHeight: 14,
    marginTop: 6,
    zIndex: 1,
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
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tileLogoImg: { width: "100%", height: "100%", backgroundColor: "transparent" },
  tileLogoText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18, textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 4 },
  tileRatingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF1F6",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tileRatingTxt: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
  },
  tileBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  tileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tileName: {
    flex: 1,
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
