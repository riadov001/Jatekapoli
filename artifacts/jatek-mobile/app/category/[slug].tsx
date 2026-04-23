import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useListRestaurants, type Restaurant } from "@workspace/api-client-react";

// ─── Brand palette ────────────────────────────────────────────────────────────
const PINK = "#E91E63";
const TEXT_DARK = "#0A1B3D";
const TEXT_MUTED = "#6B7280";
const CARD_BG = "#FFFFFF";
const BG = "#F8F8F8";
const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format&fit=crop";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W * 0.56;

// ─── Sub-category config per slug ─────────────────────────────────────────────
type SubcatConfig = {
  id: string;
  label: string;
  apiCategory?: string;
  icon: string;
};

type SlugConfig = {
  label: string;
  color: string;
  image: any;
  subcategories: SubcatConfig[];
};

const SLUG_CONFIG: Record<string, SlugConfig> = {
  restauration: {
    label: "Restauration",
    color: "#E91E63",
    image: require("../../assets/images/cat-restauration-nb.png"),
    subcategories: [
      { id: "all",        label: "Tout",       icon: "grid-outline" },
      { id: "Pizza",      label: "Pizza",       icon: "pizza",           apiCategory: "Pizza" },
      { id: "Burgers",    label: "Burgers",     icon: "fast-food",       apiCategory: "Burgers" },
      { id: "Sandwiches", label: "Sandwichs",   icon: "nutrition",       apiCategory: "Sandwiches" },
      { id: "Moroccan",   label: "Marocain",    icon: "leaf",            apiCategory: "Moroccan" },
      { id: "Chicken",    label: "Poulet",      icon: "restaurant",      apiCategory: "Chicken" },
      { id: "Sushi",      label: "Sushi",       icon: "fish",            apiCategory: "Sushi" },
    ],
  },
  epicerie: {
    label: "Épicerie",
    color: "#F97316",
    image: require("../../assets/images/cat-epicerie-nb.png"),
    subcategories: [
      { id: "all",      label: "Tout",                icon: "grid-outline" },
      { id: "fruits",   label: "Fruits & Légumes",    icon: "leaf" },
      { id: "bakery",   label: "Boulangerie",          icon: "cafe" },
      { id: "drinks",   label: "Boissons",             icon: "wine" },
      { id: "dairy",    label: "Produits Laitiers",    icon: "nutrition" },
      { id: "spices",   label: "Épices & Condiments",  icon: "flask" },
    ],
  },
  sante: {
    label: "Santé",
    color: "#8B5CF6",
    image: require("../../assets/images/cat-sante-nb.png"),
    subcategories: [
      { id: "all",         label: "Tout",               icon: "grid-outline" },
      { id: "pharmacy",    label: "Pharmacie",           icon: "medkit" },
      { id: "parapharma",  label: "Parapharmacie",       icon: "heart" },
      { id: "wellness",    label: "Bien-être",           icon: "fitness" },
      { id: "optics",      label: "Optique",             icon: "eye" },
      { id: "supplements", label: "Compléments",         icon: "flask" },
    ],
  },
  supermarche: {
    label: "Supermarché",
    color: "#0AA5C0",
    image: require("../../assets/images/cat-supermarche-nb.png"),
    subcategories: [
      { id: "all",       label: "Tout",            icon: "grid-outline" },
      { id: "food",      label: "Alimentation",    icon: "basket" },
      { id: "frozen",    label: "Surgelés",        icon: "snow" },
      { id: "hygiene",   label: "Hygiène & Beauté", icon: "rose" },
      { id: "cleaning",  label: "Produits Ménagers", icon: "sparkles" },
      { id: "beverages", label: "Boissons",        icon: "wine" },
    ],
  },
  boutiques: {
    label: "Boutiques",
    color: "#C2185B",
    image: require("../../assets/images/cat-boutiques-nb.png"),
    subcategories: [
      { id: "all",         label: "Tout",          icon: "grid-outline" },
      { id: "fashion",     label: "Mode",          icon: "shirt" },
      { id: "cosmetics",   label: "Cosmétiques",   icon: "sparkles" },
      { id: "home",        label: "Maison & Déco", icon: "home" },
      { id: "gifts",       label: "Cadeaux",       icon: "gift" },
      { id: "electronics", label: "Électronique",  icon: "hardware-chip" },
    ],
  },
  coursier: {
    label: "Coursier",
    color: "#3A7D1B",
    image: require("../../assets/images/cat-coursier-nb.png"),
    subcategories: [
      { id: "all",      label: "Tout",               icon: "grid-outline" },
      { id: "express",  label: "Livraison Express",  icon: "flash" },
      { id: "errands",  label: "Courses à faire",    icon: "list" },
      { id: "parcel",   label: "Envoi de Colis",     icon: "cube" },
    ],
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RestaurantCard({ restaurant, onPress, width }: { restaurant: Restaurant; onPress: () => void; width?: number }) {
  const img = restaurant.imageUrl || FALLBACK_IMG;
  const rating = restaurant.rating ?? 4.5;
  const time = restaurant.deliveryTime ?? 25;
  const fee = restaurant.deliveryFee ?? 10;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        width ? { width } : undefined,
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={styles.cardImgWrap}>
        <Image source={{ uri: img }} style={styles.cardImg} resizeMode="cover" />
        {restaurant.isOpen === false && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Fermé</Text>
          </View>
        )}
        {restaurant.logoUrl ? (
          <Image source={{ uri: restaurant.logoUrl }} style={styles.cardLogo} resizeMode="contain" />
        ) : (
          <View style={[styles.cardLogo, styles.cardLogoFallback]}>
            <Text style={styles.cardLogoLetter}>{restaurant.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="star" size={10} color={PINK} />
            <Text style={styles.metaTxt}>{rating.toFixed(1)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={10} color={TEXT_MUTED} />
            <Text style={styles.metaTxt}>{time}-{time + 10} min</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="bicycle-outline" size={10} color={TEXT_MUTED} />
            <Text style={styles.metaTxt}>{fee === 0 ? "Gratuit" : `${fee} MAD`}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function RestaurantCardGrid({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) {
  const img = restaurant.imageUrl || FALLBACK_IMG;
  const rating = restaurant.rating ?? 4.5;
  const time = restaurant.deliveryTime ?? 25;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Image source={{ uri: img }} style={styles.gridCardImg} resizeMode="cover" />
      {restaurant.isOpen === false && (
        <View style={styles.closedBadge}>
          <Text style={styles.closedText}>Fermé</Text>
        </View>
      )}
      {restaurant.logoUrl ? (
        <Image source={{ uri: restaurant.logoUrl }} style={styles.gridCardLogo} resizeMode="contain" />
      ) : (
        <View style={[styles.gridCardLogo, styles.cardLogoFallback]}>
          <Text style={styles.cardLogoLetter}>{restaurant.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.gridCardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="star" size={10} color={PINK} />
            <Text style={styles.metaTxt}>{rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.metaTxt}>{time} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ComingSoonSection({ sub, color }: { sub: SubcatConfig; color: string }) {
  return (
    <View style={styles.comingSoonBox}>
      <View style={[styles.comingSoonIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={sub.icon as any} size={36} color={color} />
      </View>
      <Text style={styles.comingSoonTitle}>{sub.label}</Text>
      <Text style={styles.comingSoonSub}>Bientôt disponible</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [activeSubId, setActiveSubId] = useState("all");

  const config = SLUG_CONFIG[slug ?? ""] ?? {
    label: slug ?? "Catégorie",
    color: PINK,
    image: null,
    subcategories: [{ id: "all", label: "Tout", icon: "grid-outline" }],
  };

  const activeSub = config.subcategories.find((s) => s.id === activeSubId) ?? config.subcategories[0];

  const apiCategory = activeSub.id === "all" ? undefined : activeSub.apiCategory;
  const hasApiCategory = slug === "restauration";

  const { data: restaurants, isLoading } = useListRestaurants(
    hasApiCategory
      ? { category: apiCategory, search: search.trim() || undefined }
      : undefined,
    { query: { enabled: hasApiCategory } }
  );

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter((r) => r.name.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q));
  }, [restaurants, search]);

  const goRestaurant = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  const showComingSoon = !hasApiCategory && activeSub.id !== "all";
  const showAllComingSoon = !hasApiCategory && activeSub.id === "all";

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Pink Header ─── */}
      <View style={[styles.header, { backgroundColor: config.color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {config.image && (
            <Image source={config.image} style={styles.headerImg} resizeMode="contain" />
          )}
          <Text style={styles.headerTitle}>{config.label}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Search bar ─── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Rechercher dans ${config.label}…`}
          placeholderTextColor={TEXT_MUTED}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Sub-category filter chips ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
      >
        {config.subcategories.map((sub) => {
          const active = sub.id === activeSubId;
          return (
            <TouchableOpacity
              key={sub.id}
              onPress={() => setActiveSubId(sub.id)}
              style={[styles.chip, active && { backgroundColor: config.color, borderColor: config.color }]}
              activeOpacity={0.8}
            >
              <Ionicons name={sub.icon as any} size={13} color={active ? "#fff" : TEXT_MUTED} style={{ marginRight: 4 }} />
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{sub.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Content ─── */}
      {isLoading && hasApiCategory ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={config.color} />
          <Text style={styles.loaderTxt}>Chargement…</Text>
        </View>
      ) : showComingSoon ? (
        <View style={{ flex: 1 }}>
          <ComingSoonSection sub={activeSub} color={config.color} />
        </View>
      ) : showAllComingSoon ? (
        /* All sub-categories grid for non-restauration categories */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.subCatGrid}
        >
          {config.subcategories.filter((s) => s.id !== "all").map((sub) => (
            <Pressable
              key={sub.id}
              onPress={() => setActiveSubId(sub.id)}
              style={({ pressed }) => [styles.subCatBox, pressed && { opacity: 0.85 }]}
            >
              <View style={[styles.subCatIcon, { backgroundColor: config.color + "22" }]}>
                <Ionicons name={sub.icon as any} size={30} color={config.color} />
              </View>
              <Text style={styles.subCatLabel}>{sub.label}</Text>
              <Text style={styles.subCatSoon}>Bientôt</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : filtered.length === 0 && !isLoading ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="storefront-outline" size={56} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>Aucun établissement trouvé</Text>
          <Text style={styles.emptySub}>
            Essayez une autre sous-catégorie ou modifiez votre recherche.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => String(r.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            filtered.length > 0 ? (
              <Text style={styles.resultsCount}>{filtered.length} établissement{filtered.length > 1 ? "s" : ""}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <RestaurantCardGrid restaurant={item} onPress={() => goRestaurant(item.id)} />
          )}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const SIDE = 16;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerImg: { width: 32, height: 32 },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD_BG,
    marginHorizontal: SIDE,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },

  chipsScroll: { marginTop: 8 },
  chipsContent: { paddingHorizontal: SIDE, gap: 8, paddingVertical: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  chipTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_DARK },
  chipTxtActive: { color: "#fff" },

  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_MUTED },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: TEXT_DARK, textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_MUTED, textAlign: "center", lineHeight: 20 },

  resultsCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: TEXT_MUTED,
    marginBottom: 8,
  },

  grid: { padding: SIDE, paddingTop: 12, gap: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
  },
  gridCardImg: { width: "100%", height: 110 },
  gridCardLogo: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 7,
  },
  gridCardBody: { padding: 8, gap: 3 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImgWrap: { width: "100%", height: 120, position: "relative" },
  cardImg: { width: "100%", height: "100%" },
  cardLogo: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  cardLogoFallback: { backgroundColor: PINK, alignItems: "center", justifyContent: "center" },
  cardLogoLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  closedBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  closedText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardBody: { padding: 10, gap: 4 },
  cardName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT_DARK },
  cardMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_MUTED },

  subCatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: SIDE,
    gap: 12,
    paddingTop: 20,
  },
  subCatBox: {
    width: (SCREEN_W - SIDE * 2 - 12 * 2) / 3,
    alignItems: "center",
    gap: 8,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  subCatIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  subCatLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: TEXT_DARK,
    textAlign: "center",
  },
  subCatSoon: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
  },

  comingSoonBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  comingSoonIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: TEXT_DARK,
    textAlign: "center",
  },
  comingSoonSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: TEXT_MUTED,
    textAlign: "center",
  },
});
