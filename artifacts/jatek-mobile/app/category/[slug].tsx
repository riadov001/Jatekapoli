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

// ─── Sub-category config per slug ─────────────────────────────────────────────
type SubcatConfig = {
  id: string;
  label: string;
  /** Filter restaurants by `category` field on the menu/business */
  apiCategory?: string;
  icon: string;
};

type SlugConfig = {
  label: string;
  color: string;
  image: any;
  /** Backend `businessType` for the API filter */
  businessType: string;
  subcategories: SubcatConfig[];
};

const SLUG_CONFIG: Record<string, SlugConfig> = {
  restauration: {
    label: "Restauration",
    color: "#E91E63",
    image: require("../../assets/images/cat-restauration-nb.png"),
    businessType: "restaurant",
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
    businessType: "shop",
    subcategories: [
      { id: "all",      label: "Tout",                icon: "grid-outline" },
      { id: "fruits",   label: "Fruits & Légumes",    icon: "leaf",      apiCategory: "Fruits & Légumes" },
      { id: "bakery",   label: "Boulangerie",         icon: "cafe",      apiCategory: "Boulangerie" },
      { id: "drinks",   label: "Boissons",            icon: "wine",      apiCategory: "Boissons" },
      { id: "dairy",    label: "Produits Laitiers",   icon: "nutrition", apiCategory: "Laitiers" },
      { id: "spices",   label: "Épices & Condiments", icon: "flask",     apiCategory: "Épices" },
    ],
  },
  sante: {
    label: "Santé",
    color: "#8B5CF6",
    image: require("../../assets/images/cat-sante-nb.png"),
    businessType: "pharmacy",
    subcategories: [
      { id: "all",         label: "Tout",          icon: "grid-outline" },
      { id: "pharmacy",    label: "Pharmacie",     icon: "medkit",   apiCategory: "Pharmacie" },
      { id: "parapharma",  label: "Parapharmacie", icon: "heart",    apiCategory: "Parapharmacie" },
      { id: "wellness",    label: "Bien-être",     icon: "fitness",  apiCategory: "Bien-être" },
      { id: "optics",      label: "Optique",       icon: "eye",      apiCategory: "Optique" },
      { id: "supplements", label: "Compléments",   icon: "flask",    apiCategory: "Compléments" },
    ],
  },
  supermarche: {
    label: "Supermarché",
    color: "#0AA5C0",
    image: require("../../assets/images/cat-supermarche-nb.png"),
    businessType: "shop",
    subcategories: [
      { id: "all",       label: "Tout",              icon: "grid-outline" },
      { id: "food",      label: "Alimentation",      icon: "basket",   apiCategory: "Alimentation" },
      { id: "frozen",    label: "Surgelés",          icon: "snow",     apiCategory: "Surgelés" },
      { id: "hygiene",   label: "Hygiène & Beauté",  icon: "rose",     apiCategory: "Hygiène" },
      { id: "cleaning",  label: "Produits Ménagers", icon: "sparkles", apiCategory: "Ménagers" },
      { id: "beverages", label: "Boissons",          icon: "wine",     apiCategory: "Boissons" },
    ],
  },
  boutiques: {
    label: "Boutiques",
    color: "#C2185B",
    image: require("../../assets/images/cat-boutiques-nb.png"),
    businessType: "shop",
    subcategories: [
      { id: "all",         label: "Tout",          icon: "grid-outline" },
      { id: "fashion",     label: "Mode",          icon: "shirt",         apiCategory: "Mode" },
      { id: "cosmetics",   label: "Cosmétiques",   icon: "sparkles",      apiCategory: "Cosmétiques" },
      { id: "home",        label: "Maison & Déco", icon: "home",          apiCategory: "Maison" },
      { id: "gifts",       label: "Cadeaux",       icon: "gift",          apiCategory: "Cadeaux" },
      { id: "electronics", label: "Électronique",  icon: "hardware-chip", apiCategory: "Électronique" },
    ],
  },
  coursier: {
    label: "Coursier",
    color: "#3A7D1B",
    image: require("../../assets/images/cat-coursier-nb.png"),
    businessType: "courier",
    subcategories: [
      { id: "all",      label: "Tout",              icon: "grid-outline" },
      { id: "express",  label: "Livraison Express", icon: "flash",  apiCategory: "Express" },
      { id: "errands",  label: "Courses à faire",   icon: "list",   apiCategory: "Courses" },
      { id: "parcel",   label: "Envoi de Colis",    icon: "cube",   apiCategory: "Colis" },
    ],
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RestaurantCardGrid({ restaurant, onPress, color }: { restaurant: Restaurant; onPress: () => void; color: string }) {
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
        <View style={[styles.gridCardLogo, { backgroundColor: color, alignItems: "center", justifyContent: "center" }]}>
          <Text style={styles.cardLogoLetter}>{restaurant.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.gridCardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{restaurant.name}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="star" size={10} color={color} />
            <Text style={styles.metaTxt}>{rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.metaTxt}>{time} min</Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyCategorySection({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: color + "1A" }]}>
        <Ionicons name="storefront-outline" size={42} color={color} />
      </View>
      <Text style={styles.emptyTitle}>Aucun établissement disponible</Text>
      <Text style={styles.emptySub}>
        Les commerces de la catégorie {label} seront bientôt disponibles dans votre zone.
      </Text>
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
    businessType: "restaurant",
    subcategories: [{ id: "all", label: "Tout", icon: "grid-outline" }],
  };

  const activeSub = config.subcategories.find((s) => s.id === activeSubId) ?? config.subcategories[0];
  const apiCategory = activeSub.id === "all" ? undefined : activeSub.apiCategory;

  const { data: restaurants, isLoading } = useListRestaurants({
    businessType: config.businessType,
    category: apiCategory,
    search: search.trim() || undefined,
  });

  const filtered = useMemo(() => {
    if (!restaurants) return [];
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    return restaurants.filter((r: Restaurant) =>
      r.name.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q),
    );
  }, [restaurants, search]);

  const goRestaurant = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Header ─── */}
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
      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={config.color} />
          <Text style={styles.loaderTxt}>Chargement…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <EmptyCategorySection color={config.color} label={config.label} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => String(r.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {filtered.length} établissement{filtered.length > 1 ? "s" : ""}
            </Text>
          }
          renderItem={({ item }) => (
            <RestaurantCardGrid restaurant={item} onPress={() => goRestaurant(item.id)} color={config.color} />
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
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },

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

  chipsScroll: { marginTop: 8, flexGrow: 0 },
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
    gap: 14,
  },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: TEXT_DARK, textAlign: "center" },
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
  cardLogoLetter: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  closedBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  closedText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  cardName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT_DARK },
  cardMeta: { flexDirection: "row", gap: 8, alignItems: "center" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_MUTED },
});
