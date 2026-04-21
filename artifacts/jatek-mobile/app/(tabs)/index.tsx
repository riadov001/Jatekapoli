import React, { useState, useMemo, useRef } from "react";
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
  Pressable,
  Animated,
  Dimensions,
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
import { WaveEdge } from "@/components/WaveEdge";
import { ShortPlayerModal } from "@/components/ShortPlayerModal";

// Talabat-inspired palette — rose magenta redesign
const BG = "#F8F8F8";
const CARD_BG = "#FFFFFF";
const PINK = "#E91E8C";         // rose magenta (primary)
const PINK_LIGHT = "#FF5FAD";   // lighter top for header gradient
const PINK_DEEP = "#C81877";    // darker bottom for header gradient
const PINK_SOFT = "#FDE8F4";
const TURQUOISE = "#22D3EE";
const TURQUOISE_SOFT = "#ECFEFF";
const YELLOW_PRO = "#FACC15";
const OLIVE = "#84CC16";
const ORANGE_FREE = "#F97316";
const PRO_DAY_BG = "#FFF0F8";   // very light pink
const TEXT_DARK = "#0A1B3D";
const TEXT_MUTED = "#6B7280";
const BORDER = "#22D3EE";  // turquoise border for cards
const STAR_YELLOW = "#FFC107";

const { width: SCREEN_W } = Dimensions.get("window");
const CAT_CELL_W = Math.floor((SCREEN_W - 32) / 4);

// Each category gets an emoji and its own pastel background.
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

// Promo card color schemes (rotated by index for variety).
const PROMO_SCHEMES: Array<[string, string]> = [
  ["#FF4593", "#FF8AB6"],
  ["#00BFA6", "#5BD7C4"],
  ["#FF7A45", "#FFB68A"],
  ["#7B61FF", "#B5A6FF"],
  ["#FFC107", "#FFE082"],
  ["#0EA5E9", "#7DD3FC"],
];

// ---------- Restaurant card (large, with overlay) ----------
function RestaurantCard({
  restaurant,
  variant = "standard",
  onPress,
}: {
  restaurant: Restaurant;
  variant?: "standard" | "split";
  onPress: () => void;
}) {
  const hasFreeDelivery = restaurant.deliveryFee === 0;
  const isTopRated = (restaurant.rating ?? 0) >= 4.6;
  const showPromo = hasFreeDelivery || isTopRated;

  if (variant === "split") {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.splitCard,
          pressed && styles.pressedScale,
        ]}
      >
        <View style={styles.splitImageWrap}>
          {restaurant.imageUrl ? (
            <Image
              source={{ uri: restaurant.imageUrl }}
              style={styles.splitImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.splitImage, styles.imagePlaceholder]}>
              <Ionicons name="restaurant" size={28} color={TEXT_MUTED} />
            </View>
          )}
          {showPromo ? (
            <View style={styles.promoBadgeAbs}>
              <Ionicons name="flame" size={11} color="#fff" />
              <Text style={styles.promoBadgeAbsText}>PROMO</Text>
            </View>
          ) : null}
          {restaurant.isOpen === false ? (
            <View style={styles.closedOverlay}>
              <Text style={styles.closedText}>Fermé</Text>
            </View>
          ) : null}
          {/* Merchant logo overlay */}
          <View style={styles.splitLogoWrap}>
            {restaurant.logoUrl ? (
              <Image source={{ uri: restaurant.logoUrl }} style={styles.splitLogoImg} resizeMode="cover" />
            ) : (
              <View style={[styles.splitLogoImg, styles.bigLogoFallback]}>
                <Text style={styles.splitLogoLetter}>
                  {restaurant.name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.splitBody}>
          <View style={styles.splitTitleRow}>
            <Text style={styles.splitTitle} numberOfLines={1}>
              {restaurant.name}
            </Text>
            {restaurant.rating != null ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={11} color={STAR_YELLOW} />
                <Text style={styles.ratingText}>
                  {restaurant.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
          {restaurant.category ? (
            <Text style={styles.splitCategory} numberOfLines={1}>
              {restaurant.category}
            </Text>
          ) : null}
          <View style={styles.splitMetaRow}>
            {restaurant.deliveryTime != null ? (
              <View style={styles.metaItem}>
                <Ionicons name="bicycle-outline" size={13} color={TEXT_MUTED} />
                <Text style={styles.metaText}>{restaurant.deliveryTime} min</Text>
              </View>
            ) : null}
            {restaurant.minimumOrder != null && restaurant.minimumOrder > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="wallet-outline" size={13} color={TEXT_MUTED} />
                <Text style={styles.metaText}>Min {restaurant.minimumOrder} MAD</Text>
              </View>
            ) : null}
          </View>
          {hasFreeDelivery ? (
            <View style={[styles.freeBadge, { alignSelf: "flex-start", marginTop: 6 }]}>
              <Ionicons name="rocket-outline" size={11} color={TURQUOISE} />
              <Text style={styles.freeBadgeText}>Livraison offerte</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }

  // Standard: large image with text overlay (Talabat-style hero card).
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigCard,
        pressed && styles.pressedScale,
      ]}
    >
      <View style={styles.bigImageWrap}>
        {restaurant.imageUrl ? (
          <Image
            source={{ uri: restaurant.imageUrl }}
            style={styles.bigImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.bigImage, styles.imagePlaceholder]}>
            <Ionicons name="restaurant" size={40} color={TEXT_MUTED} />
          </View>
        )}

        {/* Merchant logo overlay — circular, bottom-left */}
        <View style={styles.bigLogoWrap}>
          {restaurant.logoUrl ? (
            <Image source={{ uri: restaurant.logoUrl }} style={styles.bigLogoImg} resizeMode="cover" />
          ) : (
            <View style={[styles.bigLogoImg, styles.bigLogoFallback]}>
              <Text style={styles.bigLogoLetter}>
                {restaurant.name?.charAt(0)?.toUpperCase() ?? "?"}
              </Text>
            </View>
          )}
        </View>

        <LinearGradient
          colors={[
            "rgba(10,27,61,0.0)",
            "rgba(10,27,61,0.05)",
            "rgba(10,27,61,0.92)",
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Top-row badges */}
        <View style={styles.bigTopRow}>
          {showPromo ? (
            <View style={styles.promoBadgeAbs}>
              <Ionicons name="flame" size={11} color="#fff" />
              <Text style={styles.promoBadgeAbsText}>
                {hasFreeDelivery ? "LIVRAISON OFFERTE" : "TOP NOTÉ"}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {restaurant.deliveryTime != null ? (
            <View style={styles.deliveryBadgeTop}>
              <Ionicons name="time-outline" size={11} color={TEXT_DARK} />
              <Text style={styles.deliveryBadgeTopText}>
                {restaurant.deliveryTime} min
              </Text>
            </View>
          ) : null}
        </View>

        {/* Heart (purely decorative, no logic). */}
        <View style={styles.heartBtn}>
          <Ionicons name="heart-outline" size={18} color="#fff" />
        </View>

        {restaurant.isOpen === false ? (
          <View style={styles.closedOverlayFull}>
            <Text style={styles.closedTextBig}>Fermé</Text>
          </View>
        ) : null}

        {/* Bottom overlay text */}
        <View style={styles.bigOverlayContent}>
          <View style={styles.bigTitleRow}>
            <Text style={styles.bigTitle} numberOfLines={1}>
              {restaurant.name}
            </Text>
            {restaurant.rating != null ? (
              <View style={styles.ratingPillLight}>
                <Ionicons name="star" size={12} color={STAR_YELLOW} />
                <Text style={styles.ratingTextLight}>
                  {restaurant.rating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
          {restaurant.category ? (
            <Text style={styles.bigCategory} numberOfLines={1}>
              {restaurant.category}
            </Text>
          ) : null}
          <View style={styles.bigMetaRow}>
            {restaurant.minimumOrder != null && restaurant.minimumOrder > 0 ? (
              <View style={styles.bigMetaItem}>
                <Ionicons
                  name="wallet-outline"
                  size={12}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={styles.bigMetaText}>
                  Min {restaurant.minimumOrder} MAD
                </Text>
              </View>
            ) : null}
            {hasFreeDelivery ? (
              <View style={styles.freeBadgeLight}>
                <Text style={styles.freeBadgeTextLight}>Gratuit</Text>
              </View>
            ) : restaurant.deliveryFee != null ? (
              <View style={styles.bigMetaItem}>
                <Ionicons
                  name="bicycle-outline"
                  size={12}
                  color="rgba(255,255,255,0.85)"
                />
                <Text style={styles.bigMetaText}>
                  {restaurant.deliveryFee} MAD
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ---------- Promo card (irregular corners) ----------
function PromoCard({
  restaurant,
  scheme,
  onPress,
}: {
  restaurant: Restaurant;
  scheme: [string, string];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.promoCard,
        pressed && styles.pressedScale,
      ]}
    >
      {restaurant.imageUrl ? (
        <Image
          source={{ uri: restaurant.imageUrl }}
          style={styles.promoImg}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.promoImg, styles.imagePlaceholder]}>
          <Ionicons name="restaurant" size={28} color={TEXT_MUTED} />
        </View>
      )}
      <LinearGradient
        colors={[
          `${scheme[0]}00`,
          `${scheme[0]}55`,
          `${scheme[1]}EE`,
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.promoBadge}>
        <Ionicons name="pricetag" size={10} color={PINK_DEEP} />
        <Text style={styles.promoBadgeText}>PROMO</Text>
      </View>
      <View style={styles.promoBody}>
        <Text style={styles.promoTitle} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={styles.promoMeta}>
          {restaurant.rating != null ? (
            <View style={styles.promoMetaItem}>
              <Ionicons name="star" size={12} color={STAR_YELLOW} />
              <Text style={styles.promoMetaText}>
                {restaurant.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
          {restaurant.deliveryTime != null ? (
            <View style={styles.promoMetaItem}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.promoMetaText}>
                {restaurant.deliveryTime} min
              </Text>
            </View>
          ) : null}
          <View style={styles.promoCta}>
            <Text style={styles.promoCtaText}>Voir</Text>
            <Ionicons name="arrow-forward" size={12} color={PINK} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ---------- Short / reel card ----------
function ShortCard({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortCard,
        pressed && styles.pressedScale,
      ]}
    >
      {restaurant.imageUrl ? (
        <Image
          source={{ uri: restaurant.imageUrl }}
          style={styles.shortImg}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.shortImg, styles.imagePlaceholder]}>
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
        <Text style={styles.shortTitle} numberOfLines={2}>
          {restaurant.name}
        </Text>
        <View style={styles.shortMetaRow}>
          <Ionicons name="heart" size={11} color={PINK} />
          <Text style={styles.shortMetaText}>
            {Math.floor(((restaurant.rating ?? 4.2) - 3) * 280 + 120)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ---------- Pro Day card (Talabat-style split: image left + info right) ----------
function ProDayCard({
  restaurant,
  index,
  onPress,
}: {
  restaurant: Restaurant;
  index: number;
  onPress: () => void;
}) {
  const hasFreeDelivery = restaurant.deliveryFee === 0;
  const showDiscount = index % 2 === 1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pdCard, pressed && { opacity: 0.86 }]}
    >
      {/* Left: square image */}
      <View style={styles.pdImgWrap}>
        {restaurant.imageUrl ? (
          <Image source={{ uri: restaurant.imageUrl }} style={styles.pdImg} resizeMode="cover" />
        ) : (
          <View style={[styles.pdImg, styles.pdImgFallback]}>
            <Ionicons name="restaurant" size={22} color={PINK} />
          </View>
        )}
        {/* "pro" badge overlaid on image top-left */}
        <View style={styles.pdProBadge}>
          <Text style={styles.pdProTxt}>pro</Text>
        </View>
        {showDiscount && (
          <View style={styles.pdDiscBadge}>
            <Text style={styles.pdDiscTxt}>30% off</Text>
          </View>
        )}
      </View>

      {/* Right: info */}
      <View style={styles.pdInfo}>
        <Text style={styles.pdName} numberOfLines={2}>{restaurant.name}</Text>
        {restaurant.rating != null && (
          <View style={styles.pdRatingRow}>
            <Ionicons name="star" size={11} color={STAR_YELLOW} />
            <Text style={styles.pdRatingTxt}>{restaurant.rating.toFixed(1)}</Text>
          </View>
        )}
        <Text style={styles.pdMeta} numberOfLines={1}>
          {restaurant.deliveryTime != null ? `${restaurant.deliveryTime}-${restaurant.deliveryTime + 10} mins` : ""}
          {hasFreeDelivery ? " · Free Delivery" : ""}
        </Text>
        {!showDiscount && (
          <View style={styles.pdOffersBadge}>
            <Text style={styles.pdOffersTxt}>Offers</Text>
          </View>
        )}
      </View>
    </Pressable>
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
  const [shortsModal, setShortsModal] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [freeBarOpen, setFreeBarOpen] = useState(true);
  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const promosScrollRef = useRef<ScrollView | null>(null);
  const promoAutoIdx = useRef(0);
  const promoUserPaused = useRef(false);

  const params = useMemo<ListRestaurantsParams>(() => {
    const p: ListRestaurantsParams = { businessType: "restaurant" };
    if (activeCat !== "all") p.category = activeCat;
    if (search.trim()) p.search = search;
    return p;
  }, [activeCat, search]);

  const { data: restaurants, isLoading, refetch } = useListRestaurants(params);

  // Smooth scroll-driven header collapse: greeting+address fade & shrink while search stays.
  const scrollY = useRef(new Animated.Value(0)).current;
  const greetingOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: "clamp" });
  const greetingMaxH = scrollY.interpolate({ inputRange: [0, 80], outputRange: [60, 0], extrapolate: "clamp" });
  const addressOpacity = scrollY.interpolate({ inputRange: [40, 110], outputRange: [1, 0], extrapolate: "clamp" });
  const addressMaxH = scrollY.interpolate({ inputRange: [40, 130], outputRange: [44, 0], extrapolate: "clamp" });

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

  const promoRestaurants = useMemo<Restaurant[]>(() => {
    if (!allRestaurants) return [];
    return [...allRestaurants]
      .filter((r) => !!r.imageUrl)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 6);
  }, [allRestaurants]);

  const shortsRestaurants = useMemo<Restaurant[]>(() => {
    if (!allRestaurants) return [];
    return [...allRestaurants]
      .filter((r) => !!r.imageUrl)
      .sort((a, b) => ((a.id * 7919) % 100) - ((b.id * 7919) % 100))
      .slice(0, 8);
  }, [allRestaurants]);

  const goRestaurant = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  // Auto-scroll the promo carousel every 3.5s, looping back to start.
  React.useEffect(() => {
    if (!promoRestaurants.length) return;
    const interval = setInterval(() => {
      if (promoUserPaused.current) return;
      const next = (promoAutoIdx.current + 1) % promoRestaurants.length;
      promoAutoIdx.current = next;
      promosScrollRef.current?.scrollTo({ x: next * 296, y: 0, animated: true });
    }, 3500);
    return () => clearInterval(interval);
  }, [promoRestaurants.length]);

  const ListHeader = (
    <View>
      {/* ── Categories: 2 × 4 grid ── */}
      <View style={styles.catGridWrap}>
        {CATEGORIES.slice(0, 8).map((c, idx) => {
          const active = activeCat === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setActiveCat(c.id)}
              style={({ pressed }) => [
                styles.catGridCell,
                active && styles.catGridCellActive,
                pressed && { opacity: 0.78 },
              ]}
            >
              <View style={styles.catGridEmojiBox}>
                <Text style={styles.catGridEmoji}>{c.emoji}</Text>
                {idx === 1 && (
                  <View style={styles.catFastBadge}>
                    <Text style={styles.catFastTxt}>Fast</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.catGridLabel, active && styles.catGridLabelActive]}
                numberOfLines={1}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Pro Day Deals section ── */}
      {promoRestaurants.length > 0 ? (
        <View style={styles.proDaySection}>
          {/* Header row */}
          <View style={styles.proDayHeader}>
            <View style={styles.proDayBadgesCol}>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeTxt}>pro</Text>
              </View>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeTxt}>DAY</Text>
              </View>
            </View>
            <View style={styles.proDayTitleCol}>
              <Text style={styles.proDayTitle}>Pro day deals!</Text>
              <Text style={styles.proDaySub}>Up to 50% off, only for pros</Text>
            </View>
            <TouchableOpacity style={styles.proDayArrow} activeOpacity={0.75}>
              <Ionicons name="arrow-forward" size={15} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>

          {/* 2 × 2 card grid */}
          <View style={styles.proDayGrid}>
            {promoRestaurants.slice(0, 4).map((r, i) => (
              <ProDayCard
                key={r.id}
                restaurant={r}
                index={i}
                onPress={() => goRestaurant(r.id)}
              />
            ))}
          </View>
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
            {shortsRestaurants.map((r, i) => (
              <ShortCard
                key={r.id}
                restaurant={r}
                onPress={() => setShortsModal({ open: true, index: i })}
              />
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
              <Pressable
                key={r.id}
                onPress={() => goRestaurant(r.id)}
                style={({ pressed }) => [
                  styles.reorderCard,
                  pressed && styles.pressedScale,
                ]}
              >
                <View style={styles.reorderImgWrap}>
                  {r.imageUrl ? (
                    <Image
                      source={{ uri: r.imageUrl }}
                      style={styles.reorderImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.reorderImg, styles.imagePlaceholder]}>
                      <Ionicons
                        name="restaurant"
                        size={22}
                        color={TEXT_MUTED}
                      />
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
              </Pressable>
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
            {restaurants.length} résultat
            {restaurants.length !== 1 ? "s" : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );

  const freeBarH = freeBarOpen ? 48 : 0;

  return (
    <View style={[styles.flex, { backgroundColor: BG }]}>
      {/* ── Gradient magenta header ── */}
      <View style={styles.headerWrap}>
        <LinearGradient
          colors={[PINK_LIGHT, PINK, PINK_DEEP]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.headerBg,
            { paddingTop: insets.top + 10 + webTopPad },
          ]}
        >
          {/* Top bar: address block centré (style Talabat) */}
          <View style={styles.brandBar}>
            <Animated.View
              style={[styles.addrBlock, { opacity: addressOpacity, maxHeight: addressMaxH, overflow: "hidden" }]}
            >
              <Text style={styles.deliverToLabel}>Livrer à</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowAddrPicker(true)}
                style={styles.addressRow}
              >
                <Text style={styles.addressText} numberOfLines={1}>
                  {selectedAddress || t("home_choose_address")}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Search bar — inside header, fake placeholder */}
          <View style={styles.headerSearchBox}>
            <Ionicons name="search" size={17} color="#9CA3AF" />
            <View style={{ flex: 1, position: "relative", justifyContent: "center" }}>
              <TextInput
                style={styles.headerSearchInput}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                placeholderTextColor="transparent"
                placeholder=" "
              />
              {!search && (
                <View style={[styles.headerSearchPhWrap, { pointerEvents: "none" }]}>
                  <Text style={styles.headerSearchPh}>{t("home_search_ph")}</Text>
                </View>
              )}
            </View>
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={17} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* "With you" tagline */}
          <Animated.View style={{ opacity: greetingOpacity, maxHeight: greetingMaxH, overflow: "hidden" }}>
            <Text style={styles.withYouText}>With you, Oujda 🇲🇦</Text>
          </Animated.View>
        </LinearGradient>

        {/* Organic wave at bottom of header */}
        <WaveEdge
          color={PINK_DEEP}
          height={28}
          gradientStops={[
            { offset: 0, color: PINK },
            { offset: 1, color: PINK_DEEP },
          ]}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PINK} size="large" />
        </View>
      ) : (
        <Animated.FlatList
          data={restaurants ?? []}
          keyExtractor={(r: Restaurant) => String(r.id)}
          contentContainerStyle={[
            styles.list,
            {
              paddingTop: 22,
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 90) + freeBarH,
            },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
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
          renderItem={({ item, index }) => (
            <RestaurantCard
              restaurant={item}
              variant={index > 0 && index % 3 === 0 ? "split" : "standard"}
              onPress={() => goRestaurant(item.id)}
            />
          )}
        />
      )}

      <AddressQuickPicker
        visible={showAddrPicker}
        onClose={() => setShowAddrPicker(false)}
      />

      <ShortPlayerModal
        visible={shortsModal.open}
        shorts={shortsRestaurants}
        initialIndex={shortsModal.index}
        onClose={() => setShortsModal({ open: false, index: 0 })}
      />

      {/* ── 4 FREE deliveries sticky bar (above bottom nav) ── */}
      {freeBarOpen && (
        <View
          style={[
            styles.freeBar,
            { bottom: insets.bottom + (Platform.OS === "web" ? 0 : 58) },
          ]}
        >
          <Text style={styles.freeBarScooter}>🛵</Text>
          <View style={styles.freeBarFreeBadge}>
            <Text style={styles.freeBarFreeText}>4 FREE</Text>
          </View>
          <Text style={styles.freeBarRest}> livraisons. Durée limitée !</Text>
          <TouchableOpacity
            onPress={() => setFreeBarOpen(false)}
            style={styles.freeBarClose}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // ---------- Header ----------
  headerWrap: { position: "relative" },
  headerBg: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    color: "rgba(255,255,255,0.8)",
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  addrBlock: {
    alignItems: "center",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addressText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.1,
    maxWidth: SCREEN_W - 110,
  },
  // Brand bar — address centré (style Talabat, pas de hamburger)
  brandBar: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  brandLogoBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: PINK,
    fontStyle: "italic",
  },
  brandWordmark: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: -0.4,
    fontStyle: "italic",
  },
  brandAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandAvatarImg: { width: "100%", height: "100%" },
  brandAvatarLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },

  // Search bar inside header
  headerSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 10,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
    height: 40,
  },
  headerSearchPhWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  headerSearchPh: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },

  // "With you" tagline
  withYouText: {
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.1,
    paddingBottom: 4,
  },

  // Greeting (used for animated collapse — keep for compat)
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
  },
  // Legacy floating search — kept to avoid undefined style refs
  searchFloatWrap: { display: "none" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
  },

  // ---------- Section titles ----------
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

  // ---------- Categories grid (2 × 4) ----------
  catGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "#fff",
    gap: 8,
  },
  catGridCell: {
    width: (SCREEN_W - 20 - 24) / 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catGridCellActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  catGridEmojiBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F6F6F6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  catGridEmoji: { fontSize: 28 },
  catFastBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#22C55E",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  catFastTxt: {
    color: "#fff",
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  catGridLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
    textAlign: "center",
  },
  catGridLabelActive: {
    color: PINK,
    fontFamily: "Inter_700Bold",
  },
  // Legacy catRow/catCard — kept to avoid undefined style refs
  catRow: { paddingHorizontal: 16, gap: 12, paddingBottom: 6, paddingTop: 2 },
  catCard: {
    width: 88,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 22,
    alignItems: "center",
    gap: 8,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  catCardActive: { backgroundColor: PINK, borderColor: PINK },
  catIconWrap: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  catEmoji: { fontSize: 26 },
  catLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // ---------- Pro Day Deals section ----------
  proDaySection: {
    backgroundColor: PRO_DAY_BG,
    marginTop: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  proDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  proDayBadgesCol: {
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
  },
  proBadge: {
    backgroundColor: PINK,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    minWidth: 32,
    alignItems: "center",
  },
  proBadgeTxt: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  dayBadge: {
    backgroundColor: ORANGE_FREE,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
    minWidth: 32,
    alignItems: "center",
  },
  dayBadgeTxt: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  proDayTitleCol: { flex: 1 },
  proDayTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.2,
  },
  proDaySub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    marginTop: 1,
  },
  proDayArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  proDayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  // ---------- ProDayCard ----------
  pdCard: {
    width: (SCREEN_W - 32 - 8) / 2,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: TURQUOISE,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 8,
    paddingLeft: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pdImgWrap: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: PINK_SOFT,
    position: "relative",
  },
  pdImg: { width: "100%", height: "100%" },
  pdImgFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PINK_SOFT,
  },
  pdProBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: PINK,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pdProTxt: { color: "#fff", fontSize: 7, fontFamily: "Inter_700Bold" },
  pdDiscBadge: {
    position: "absolute",
    bottom: 4,
    left: 0,
    right: 0,
    backgroundColor: PINK_DEEP,
    paddingVertical: 2,
    alignItems: "center",
  },
  pdDiscTxt: { color: "#fff", fontSize: 8, fontFamily: "Inter_700Bold" },
  pdInfo: { flex: 1, justifyContent: "center", gap: 3 },
  pdName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  pdRatingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  pdRatingTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT_DARK },
  pdMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT_MUTED },
  pdOffersBadge: {
    backgroundColor: OLIVE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  pdOffersTxt: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },

  // ---------- 4 FREE deliveries bar ----------
  freeBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: ORANGE_FREE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
    zIndex: 99,
  },
  freeBarScooter: { fontSize: 20 },
  freeBarFreeBadge: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  freeBarFreeText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  freeBarRest: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  freeBarClose: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  // ---------- Promo banners (irregular corners) ----------
  promoRow: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 6,
  },
  promoCard: {
    width: 284,
    height: 160,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 28,
    overflow: "hidden",
    backgroundColor: "#222",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  promoImg: { width: "100%", height: "100%" },
  promoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  promoBadgeText: {
    color: PINK_DEEP,
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
    fontSize: 17,
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

  // ---------- Shorts ----------
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

  // ---------- Reorder ----------
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

  // ---------- Restaurants list ----------
  list: {
    paddingHorizontal: 16,
    gap: 16,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
    opacity: 0.95,
  },

  // Big card (standard variant — image with overlay)
  bigCard: {
    backgroundColor: CARD_BG,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  bigImageWrap: {
    width: "100%",
    height: 220,
    position: "relative",
    backgroundColor: BG,
  },
  bigImage: { width: "100%", height: "100%" },
  // Merchant logo overlays
  bigLogoWrap: {
    position: "absolute",
    bottom: 14,
    left: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    padding: 3,
    shadowColor: "#000",
    shadowOpacity: 0.30,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
    zIndex: 4,
  },
  bigLogoImg: { width: "100%", height: "100%", borderRadius: 24 },
  bigLogoFallback: {
    backgroundColor: PINK,
    alignItems: "center",
    justifyContent: "center",
  },
  bigLogoLetter: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  splitLogoWrap: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#fff",
    padding: 2,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 3,
  },
  splitLogoImg: { width: "100%", height: "100%", borderRadius: 9 },
  splitLogoLetter: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PINK_SOFT,
  },
  bigTopRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoBadgeAbs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: PINK,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  promoBadgeAbsText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  deliveryBadgeTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  deliveryBadgeTopText: {
    color: TEXT_DARK,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  heartBtn: {
    position: "absolute",
    top: 56,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  closedOverlayFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  closedTextBig: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  bigOverlayContent: {
    position: "absolute",
    left: 72,
    right: 14,
    bottom: 14,
  },
  bigTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bigTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  ratingPillLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingTextLight: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  bigCategory: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  bigMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
  },
  bigMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bigMetaText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.9)",
  },
  freeBadgeLight: {
    backgroundColor: TURQUOISE,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  freeBadgeTextLight: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  // Split card (every 3rd item — alternative layout)
  splitCard: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  splitImageWrap: {
    width: 130,
    height: 130,
    position: "relative",
    backgroundColor: BG,
  },
  splitImage: { width: "100%", height: "100%" },
  splitBody: {
    flex: 1,
    padding: 14,
    justifyContent: "center",
    gap: 4,
  },
  splitTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  splitTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    letterSpacing: -0.2,
  },
  splitCategory: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },
  splitMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 6,
  },

  // Shared meta / pills
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
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: TURQUOISE_SOFT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  freeBadgeText: {
    color: TURQUOISE,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  closedOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closedText: {
    color: "#fff",
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
