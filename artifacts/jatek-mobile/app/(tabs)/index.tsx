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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import {
  useListRestaurants,
  useGetFeaturedRestaurants,
  type Restaurant,
  type ListRestaurantsParams,
} from "@workspace/api-client-react";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { getApiBaseSafe } from "@/lib/apiBase";
import { WaveEdge } from "@/components/WaveEdge";
import { ShortPlayerModal } from "@/components/ShortPlayerModal";
import { AddressQuickPicker } from "@/components/AddressQuickPicker";
import { JatekAdSheet } from "@/components/JatekAdSheet";
import { JatekScrollingBanner } from "@/components/JatekScrollingBanner";

function trackBannerClick(restaurantId: number) {
  try {
    fetch(`${getApiBaseSafe()}/api/restaurants/${restaurantId}/track-click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  } catch {
    // Fire-and-forget — never block navigation on analytics
  }
}

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
  { slug: "restauration", label: "Restauration", icon: "restaurant"  as const, accent: "#B85C00" },
  { slug: "epicerie",     label: "Épicerie",     icon: "basket"      as const, accent: "#2E7D32" },
  { slug: "sante",        label: "Santé",        icon: "medkit"      as const, accent: "#C62828" },
  { slug: "supermarche",  label: "Supermarché",  icon: "cart"        as const, accent: "#E65100" },
  { slug: "boutiques",    label: "Boutiques",    icon: "storefront"  as const, accent: "#880E4F" },
  { slug: "coursier",     label: "Coursier",     icon: "bicycle"     as const, accent: "#1A237E" },
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
      <View style={s.promoBannerLeft}>
        <View style={s.promoTagBadge}>
          <Text style={s.promoTagTxt}>CODE PROMO</Text>
        </View>
        <Text style={s.promoMinusClean}>-10%</Text>
        <Text style={s.promoCodeClean}>avec WELCOME10</Text>
      </View>
      <View style={s.promoBrandWrap}>
        <Text style={s.promoBrandClean}>Jatek</Text>
        <Ionicons name="arrow-forward-circle" size={24} color={PINK} />
      </View>
    </Pressable>
  );
}

function VipBannerCard({
  title,
  subtitle,
  bgColor,
  badge,
  imageUrl,
  onPress,
}: {
  title: string;
  subtitle: string;
  bgColor: string;
  badge: string;
  imageUrl?: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.vipCard, { backgroundColor: bgColor }, pressed && { opacity: 0.92 }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={s.vipCardImg} resizeMode="cover" />
      ) : null}
      <View style={s.vipCardScrim} />
      <View style={s.vipBadge}>
        <Ionicons name="star" size={11} color="#fff" />
        <Text style={s.vipBadgeTxt}>{badge}</Text>
      </View>
      <View style={s.vipCardBody}>
        <Text style={s.vipCardTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.vipCardSubtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
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
  const { selectedAddress, itemCount } = useCart();

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeBusinessType, setActiveBusinessType] = useState("restaurant");
  const [activeLabel, setActiveLabel] = useState("Tous les Restaurants");
  const [onlyOpen, setOnlyOpen] = useState<boolean | undefined>(undefined);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [shortsVisible, setShortsVisible] = useState(false);
  const [initialShort, setInitialShort] = useState(0);
  const [adSheetVisible, setAdSheetVisible] = useState(false);

  const params = useMemo<ListRestaurantsParams>(() => {
    const p: ListRestaurantsParams = { businessType: activeBusinessType };
    if (activeCat) p.category = activeCat;
    if (search.trim()) p.search = search.trim();
    if (onlyOpen !== undefined) p.isOpen = onlyOpen;
    return p;
  }, [activeBusinessType, activeCat, onlyOpen, search]);

  const { data: restaurants, isLoading } = useListRestaurants(params);
  const { data: featuredPartners } = useGetFeaturedRestaurants();
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
  // Real rendered tab bar height — keeps the floating bar glued to its top edge
  // on every device (handles bottom safe-area / home indicator automatically).
  const tabBarHeight = useBottomTabBarHeight();
  const tabBarPad = tabBarHeight;
  const fabBottom = insets.bottom + tabBarHeight + 16;

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
                style={s.cartBtn}
                onPress={() => router.push("/cart")}
                accessibilityRole="button"
                accessibilityLabel="Voir le panier"
              >
                <Ionicons name="bag-handle" size={20} color={PINK} />
                {itemCount > 0 && (
                  <View style={s.cartBadge}>
                    <Text style={s.cartBadgeTxt}>{itemCount > 9 ? "9+" : itemCount}</Text>
                  </View>
                )}
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
        <Animated.Text entering={FadeInDown.delay(80).duration(450).springify()} style={s.sliderSectionTitle}>Explorer</Animated.Text>
        <Animated.ScrollView
          entering={FadeInDown.delay(140).duration(500).springify()}
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
              <View style={[s.shopCatTile, { backgroundColor: c.accent + "1A" }]}>
                <Ionicons name={c.icon} size={34} color={c.accent} />
              </View>
              <Text style={[s.shopCatLabel, { color: c.accent }]} numberOfLines={1}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </Animated.ScrollView>

        {/* ─── JATEK brand scrolling banner ─── */}
        <Animated.View entering={FadeIn.delay(200).duration(500)}>
          <JatekScrollingBanner />
        </Animated.View>

        {/* ─── Partenaires VIP & promotions (Talabat-style horizontal slider) ─── */}
        <Animated.View entering={FadeInDown.delay(260).duration(500).springify()} style={s.vipHeaderWrap}>
          <Text style={s.vipSectionTitle}>Partenaires VIP & Promos</Text>
        </Animated.View>
        <Animated.ScrollView
          entering={FadeInDown.delay(320).duration(550).springify()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.vipScrollRow}
          decelerationRate="fast"
          snapToInterval={SCREEN_W * 0.78 + 12}
        >
          {(featuredPartners ?? []).slice(0, 6).map((r, i) => (
            <VipBannerCard
              key={`vip-${r.id}`}
              title={r.name}
              subtitle={i % 2 === 0 ? "-20% sur votre première commande" : "Livraison gratuite aujourd'hui"}
              bgColor={i % 2 === 0 ? PINK : "#0A1B3D"}
              badge={i % 2 === 0 ? "VIP" : "PROMO"}
              imageUrl={r.imageUrl ?? r.coverImageUrl}
              onPress={() => {
                trackBannerClick(r.id);
                goRestaurant(r.id);
              }}
            />
          ))}
          {(featuredPartners ?? []).length === 0 && (
            <Text style={s.emptyTxt}>Aucune offre disponible pour le moment</Text>
          )}
        </Animated.ScrollView>

        {/* ─── Promo banner -10% Jatek WELCOME10 ─── */}
        <Animated.View entering={FadeInDown.delay(380).duration(500).springify()} style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <PromoBanner onPress={() => router.push("/profile/coupons?code=WELCOME10" as any)} />
        </Animated.View>

        {/* ─── Découvrir en vidéo ─── */}
        <Animated.View entering={FadeInDown.delay(440).duration(500).springify()}>
          <SectionHeader title="Decouvrir en video" />
        </Animated.View>
        <Animated.ScrollView
          entering={FadeInDown.delay(500).duration(550).springify()}
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
        </Animated.ScrollView>

        {/* ─── Pres de chez vous (horizontal scroll) ─── */}
        <Animated.View entering={FadeInDown.delay(560).duration(500).springify()}>
          <SectionHeader title="Pres de chez vous" />
        </Animated.View>
        {isLoading ? (
          <ActivityIndicator color={PINK} style={{ marginVertical: 18 }} />
        ) : (
          <Animated.ScrollView
            entering={FadeInDown.delay(620).duration(550).springify()}
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
          </Animated.ScrollView>
        )}

        {/* ─── Big promotional banner (lower position) ─── */}
        <Animated.View entering={FadeInDown.delay(680).duration(500).springify()} style={{ paddingHorizontal: 16, marginTop: 18 }}>
          <PromoBanner onPress={() => router.push("/profile/coupons?code=WELCOME10" as any)} />
        </Animated.View>

        {/* ─── Tous les Restaurants (2-column grid) ─── */}
        <Animated.View entering={FadeInDown.delay(740).duration(550).springify()} style={s.gridSection}>
          <Text style={s.gridSectionTitle}>{currentLabel}</Text>
          {isLoading ? (
            <ActivityIndicator color={PINK} style={{ marginVertical: 24 }} />
          ) : (
            <View style={s.grid}>
              {(restaurants ?? []).map((r, i) => (
                <Animated.View
                  key={r.id}
                  entering={FadeInDown.delay(800 + i * 60).duration(420).springify()}
                  style={{ width: GRID_CARD_W }}
                >
                  <RestaurantTile
                    restaurant={r}
                    badge={i % 2 === 0 ? "nouveau" : "promo"}
                    width={GRID_CARD_W}
                    onPress={() => goRestaurant(r.id)}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
      {/* ─── JATEK Ad floating trigger bar — glued to the top of the tab bar (Talabat-style) ─── */}
      <Animated.View
        entering={FadeInUp.delay(900).duration(500).springify()}
        style={[s.adTriggerWrap, { bottom: fabBottom }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={() => setAdSheetVisible(true)}
          activeOpacity={0.85}
          style={s.adTriggerBtn}
        >
          <View style={s.adTriggerIconWrap}>
            <Ionicons name="bicycle" size={16} color="#fff" />
          </View>
          <View style={s.adTriggerTxtWrap}>
            <View style={s.adTriggerHighlight}>
              <Text style={s.adTriggerHighlightTxt}>OFFRES</Text>
            </View>
            <Text style={s.adTriggerTxt}> & Avantages Jatek</Text>
          </View>
          <Ionicons name="chevron-up" size={18} color="#06B6D4" />
        </TouchableOpacity>
      </Animated.View>

      <AddressQuickPicker visible={addressPickerOpen} onClose={() => setAddressPickerOpen(false)} />
      <JatekAdSheet visible={adSheetVisible} onClose={() => setAdSheetVisible(false)} />
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
  cartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: "#FFD400",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  cartBadgeTxt: {
    color: "#0A1B3D",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
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
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
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

  // ── Promo banner (clean, no colored bg) ──
  promoBanner: {
    width: "100%",
    height: 84,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  promoBannerLeft: { gap: 2 },
  promoTagBadge: {
    alignSelf: "flex-start",
    backgroundColor: PINK_SOFT,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  promoTagTxt: { fontSize: 10, fontFamily: "Inter_700Bold", color: PINK, letterSpacing: 0.5 },
  promoMinusClean: {
    fontSize: 26,
    fontFamily: "Inter_900Black",
    color: TEXT_DARK,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  promoCodeClean: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: TEXT_MUTED,
  },
  promoBrandWrap: { alignItems: "center", gap: 4 },
  promoBrandClean: {
    fontSize: 22,
    fontFamily: "Inter_900Black",
    color: PINK,
    fontStyle: "italic",
    letterSpacing: -0.5,
  },
  promoMinus: { fontSize: 44, fontFamily: "Inter_900Black", color: "#fff", letterSpacing: -1.5, lineHeight: 48 },
  promoCode: { fontSize: 16, fontFamily: "Inter_700Bold", color: NEW_GREEN, letterSpacing: 1, marginTop: 2 },
  promoBrand: { fontSize: 38, fontFamily: "Inter_900Black", color: "#fff", fontStyle: "italic", letterSpacing: -1 },

  // ── VIP partners horizontal slider ──
  vipHeaderWrap: {
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },
  vipSectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.3,
  },
  vipScrollRow: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 2,
  },
  vipCard: {
    width: SCREEN_W * 0.78,
    height: 130,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 14,
  },
  vipCardImg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  vipCardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  vipBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  vipBadgeTxt: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  vipCardBody: { gap: 2 },
  vipCardTitle: { color: "#fff", fontSize: 18, fontFamily: "Inter_900Black", letterSpacing: -0.3 },
  vipCardSubtitle: { color: "#fff", fontSize: 12, fontFamily: "Inter_500Medium", opacity: 0.95 },

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

  // ── Jatek Ad trigger bar (Talabat-style — solid pill glued above tab bar) ──
  adTriggerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  adTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FCFD",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "#B2EBF2",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  adTriggerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#06B6D4",
    alignItems: "center",
    justifyContent: "center",
  },
  adTriggerTxtWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  adTriggerHighlight: {
    backgroundColor: "#D7F542",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adTriggerHighlightTxt: {
    color: "#0A1B3D",
    fontSize: 13,
    fontFamily: "Inter_900Black",
    letterSpacing: 0.4,
  },
  adTriggerTxt: {
    color: "#0A1B3D",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
});
