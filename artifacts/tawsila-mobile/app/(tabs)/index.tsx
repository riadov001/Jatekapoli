import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet, Text, View, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Platform, ScrollView, Animated, Image,
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
  { id: "restaurant", label: "Restos",   emoji: "🍽️", ring: "#FFD9E8" },
  { id: "grocery",    label: "Courses",  emoji: "🛒", ring: "#FFE8B0" },
  { id: "health",     label: "Santé",    emoji: "💊", ring: "#C9F0D7" },
  { id: "other",      label: "Cadeaux",  emoji: "🎁", ring: "#D9E3FF" },
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
        <Text style={[styles.sectionTitle, { color: colors.heading }]}>À la une</Text>
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
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <Text style={styles.bannerEmoji}>
                  {item.category === "Pizza" ? "🍕" : item.category === "Burgers" ? "🍔" : item.category === "Sushi" ? "🍣" : "🍽️"}
                </Text>
              )}
              <View style={styles.delivTimePill}>
                <Ionicons name="flash" size={10} color="#fff" />
                <Text style={styles.delivTimeText}>{item.deliveryTime ?? 25} min</Text>
              </View>
            </View>
            <View style={styles.bannerInfo}>
              <Text style={[styles.bannerName, { color: colors.heading }]} numberOfLines={1}>{item.name}</Text>
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
      {/* Circular category icons (Flink-style) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.circleRow}
      >
        {TOP_CATEGORIES.map((cat) => {
          const active = activeTop === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setActiveTop(cat.id)}
              activeOpacity={0.7}
              style={styles.circleItem}
            >
              <View
                style={[
                  styles.circleRing,
                  { borderColor: active ? colors.primary : cat.ring, backgroundColor: cat.ring + "55" },
                ]}
              >
                <Text style={styles.circleEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={[styles.circleLabel, { color: active ? colors.primary : colors.heading, fontFamily: active ? "Inter_700Bold" : "Inter_600SemiBold" }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Promo banner */}
      <View style={[styles.promoBanner, { backgroundColor: colors.primarySoft }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.promoTitle, { color: colors.heading }]}>1ère commande{"\n"}offerte 🎉</Text>
          <Text style={[styles.promoSub, { color: colors.heading }]}>Code TAWSILA10 — livraison gratuite</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.promoBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setActiveSub("Tous"); setSearch(""); }}
          >
            <Text style={styles.promoBtnText}>Commander</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.promoEmoji}>🛍️</Text>
      </View>

      {/* Subcategory chips */}
      {!search && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subScroll} contentContainerStyle={styles.subContent}>
          {subs.map((sub) => {
            const active = activeSub === sub;
            return (
              <TouchableOpacity
                key={sub}
                style={[styles.subChip, { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setActiveSub(sub)}
                activeOpacity={0.7}
              >
                <Text style={[styles.subChipText, { color: active ? "#fff" : colors.heading }]}>{sub}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!search && activeSub === "Tous" && <FeaturedBanner items={featured} />}

      <View style={styles.sectionHeader2}>
        <Text style={[styles.sectionTitle, { color: colors.heading }]}>
          {activeSub !== "Tous" ? activeSub : TOP_CATEGORIES.find((c) => c.id === activeTop)?.label}
        </Text>
        {businesses && (
          <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
            {businesses.length} résultat{businesses.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Pink address-bar header (Flink-style) */}
      <View style={[styles.headerPink, { backgroundColor: colors.pinkBg, paddingTop: insets.top + 14 + webTopPad }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.addressRow}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={[styles.addressLabel, { color: colors.primary }]}>Choisir l'adresse</Text>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/cart")} style={styles.cartBtn}>
          <Ionicons name="bag-handle" size={22} color={colors.heading} />
          {itemCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.cartBadgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.heading }]}
            placeholder="Rechercher un commerce ou un plat…"
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
      </View>

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
              <Text style={[styles.emptyTitle, { color: colors.heading }]}>Aucun résultat</Text>
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

  // Pink header
  headerPink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  addressLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cartBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  cartBadge: { position: "absolute", top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },

  list: { paddingTop: 8 },
  col2: { paddingHorizontal: 16, gap: 10 },
  cardWrap: { flex: 1 },

  // Circular categories (Flink style)
  circleRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  circleItem: { alignItems: "center", gap: 6, width: 76 },
  circleRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  circleEmoji: { fontSize: 32 },
  circleLabel: { fontSize: 12, textAlign: "center" },

  // Promo banner
  promoBanner: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: 18 },
  promoTitle: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 22 },
  promoSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, opacity: 0.8 },
  promoBtn: { alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99 },
  promoBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  promoEmoji: { fontSize: 64 },

  // Subcategory chips
  subScroll: { marginBottom: 14 },
  subContent: { paddingHorizontal: 16, gap: 8 },
  subChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  subChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Featured banner
  bannerSection: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 10 },
  sectionHeader2: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bannerCard: { width: 200, borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  bannerImg: { width: "100%", height: 110, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  bannerEmoji: { fontSize: 36 },
  delivTimePill: { position: "absolute", bottom: 6, left: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#E2006A", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  delivTimeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  bannerInfo: { padding: 10 },
  bannerName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bannerCat: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Misc
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
