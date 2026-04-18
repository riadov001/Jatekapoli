import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet, Text, View, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Platform, ScrollView, Animated,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useListRestaurants } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOP_CATEGORIES = [
  { id: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { id: "grocery",    label: "Courses",      emoji: "🛒" },
  { id: "health",     label: "Santé",        emoji: "💊" },
  { id: "other",      label: "Autres",       emoji: "📦" },
] as const;

type TopId = typeof TOP_CATEGORIES[number]["id"];

const SUBCATEGORIES: Record<TopId, string[]> = {
  restaurant: ["Tous", "Halal", "Pizza", "Burger", "Sushi", "Marocain", "Sandwichs", "Poulet"],
  grocery:    ["Tous", "Épicerie", "Grande surface", "Bio", "Primeur"],
  health:     ["Tous", "Pharmacie", "Parapharmacie", "Optique", "Médecin"],
  other:      ["Tous", "Fleuriste", "Librairie", "Cadeaux", "Vêtements"],
};

function FeaturedBanner({ items }: { items: any[] }) {
  const colors = useColors();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef<FlatList>(null);
  const indexRef = useRef(0);

  const doubled = useMemo(() => [...items, ...items], [items]);

  useEffect(() => {
    if (doubled.length < 2) return;
    const CARD_W = 200 + 12;
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % doubled.length;
      flatRef.current?.scrollToOffset({ offset: indexRef.current * CARD_W, animated: true });
    }, 2500);
    return () => clearInterval(timer);
  }, [doubled.length]);

  if (!items.length) return null;

  return (
    <View style={styles.bannerSection}>
      <View style={styles.sectionHeader}>
        <Ionicons name="flash" size={16} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>À la une</Text>
      </View>
      <FlatList
        ref={flatRef}
        data={doubled}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.bannerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: String(item.id) } })}
            activeOpacity={0.85}
          >
            <View style={[styles.bannerImg, { backgroundColor: colors.muted }]}>
              <Text style={styles.bannerEmoji}>
                {item.category === "Pizza" ? "🍕" : item.category === "Burgers" ? "🍔" : item.category === "Sushi" ? "🍣" : "🍽️"}
              </Text>
              <View style={styles.delivTimePill}>
                <Ionicons name="flash" size={10} color="#fff" />
                <Text style={styles.delivTimeText}>{item.deliveryTime ?? 25} min</Text>
              </View>
            </View>
            <View style={styles.bannerInfo}>
              <Text style={[styles.bannerName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.bannerCat, { color: colors.mutedForeground }]} numberOfLines={1}>{item.category}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [search, setSearch] = useState("");
  const [activeTop, setActiveTop] = useState<TopId>("restaurant");
  const [activeSub, setActiveSub] = useState("Tous");
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  useEffect(() => { setActiveSub("Tous"); }, [activeTop]);

  const params = useMemo(() => {
    const p: Record<string, string> = { businessType: activeTop };
    if (activeSub !== "Tous") p.category = activeSub;
    if (search.trim()) p.search = search;
    return p;
  }, [activeTop, activeSub, search]);

  const { data: businesses, isLoading, refetch } = useListRestaurants(params as any);
  const { data: allData } = useListRestaurants({});
  const featured = useMemo(() => (allData ?? []).slice(0, 8), [allData]);

  const subs = SUBCATEGORIES[activeTop];

  const ListHeader = (
    <>
      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Rechercher..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Top categories grid */}
      <View style={styles.topCatGrid}>
        {TOP_CATEGORIES.map((cat) => {
          const active = activeTop === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.topCatCard,
                {
                  backgroundColor: active ? colors.accent : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveTop(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.topCatEmoji}>{cat.emoji}</Text>
              <Text style={[styles.topCatLabel, { color: active ? colors.primary : colors.foreground }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Subcategory chips */}
      {!search && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.subContent}>
          {subs.map((sub) => {
            const active = activeSub === sub;
            return (
              <TouchableOpacity
                key={sub}
                style={[styles.subChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setActiveSub(sub)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subChipText, { color: active ? "#fff" : colors.foreground }]}>{sub}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Featured banner */}
      {!search && activeSub === "Tous" && <FeaturedBanner items={featured} />}

      {/* Section label */}
      <View style={styles.sectionHeader2}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {activeSub !== "Tous" ? activeSub : TOP_CATEGORIES.find((c) => c.id === activeTop)?.label}
        </Text>
        {businesses && (
          <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{businesses.length} résultat{businesses.length !== 1 ? "s" : ""}</Text>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 + webTopPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.primary }]}>Ultra-fast delivery</Text>
            <Text style={[styles.name, { color: colors.foreground }]}>Salut, {user?.name ?? "invité"} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/cart")} style={styles.cartBtn}>
            <Ionicons name="bag-outline" size={24} color={colors.foreground} />
            {itemCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.cartBadgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={businesses ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          numColumns={2}
          columnWrapperStyle={styles.col2}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="restaurant-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun résultat</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Essayez une autre recherche ou catégorie</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <RestaurantCard
                restaurant={item}
                onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: String(item.id) } })}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 12, fontFamily: "Inter_500Medium" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 2 },
  cartBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  cartBadge: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  list: { paddingTop: 16 },
  col2: { paddingHorizontal: 16, gap: 10 },
  cardWrap: { flex: 1 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, marginBottom: 14, marginHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  topCatGrid: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 14 },
  topCatCard: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  topCatEmoji: { fontSize: 24, marginBottom: 4 },
  topCatLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  subScroll: { marginBottom: 14 },
  subContent: { paddingHorizontal: 16, gap: 8 },
  subChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  bannerSection: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  sectionHeader2: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bannerCard: { width: 200, borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  bannerImg: { width: "100%", height: 110, alignItems: "center", justifyContent: "center", position: "relative" },
  bannerEmoji: { fontSize: 36 },
  delivTimePill: { position: "absolute", bottom: 6, left: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#E2006A", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  delivTimeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  bannerInfo: { padding: 10 },
  bannerName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bannerCat: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
