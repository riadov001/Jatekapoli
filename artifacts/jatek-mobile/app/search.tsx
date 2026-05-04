/**
 * Full-screen search with live results and filter chips.
 * Covers: text search, open-now filter, rating threshold, delivery time.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Image,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useListRestaurants, type Restaurant } from "@workspace/api-client-react";

const PINK = "#E91E63";
const TEXT_DARK = "#0A1B3D";
const TEXT_MUTED = "#6B7280";
const CARD_BORDER = "#F0F0F0";
const FALLBACK =
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format&fit=crop";

type FilterKey = "open" | "rating4" | "fast" | "free";

const FILTERS: { key: FilterKey; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "open", label: "Ouvert maintenant", icon: "time-outline" },
  { key: "rating4", label: "Note 4+", icon: "star-outline" },
  { key: "fast", label: "< 30 min", icon: "bicycle-outline" },
  { key: "free", label: "Livraison offerte", icon: "gift-outline" },
];

function RestaurantRow({ restaurant, onPress }: { restaurant: Restaurant; onPress: () => void }) {
  const img = restaurant.imageUrl || FALLBACK;
  const rating = restaurant.rating ?? 4.5;
  const time = restaurant.deliveryTime ?? 25;
  const fee = restaurant.deliveryFee ?? 10;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.88, backgroundColor: "#F9F9F9" }]}
    >
      <Image source={{ uri: img }} style={styles.rowImg} resizeMode="cover" />
      <View style={styles.rowBody}>
        <View style={styles.rowNameRow}>
          <Text style={styles.rowName} numberOfLines={1}>{restaurant.name}</Text>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={11} color={PINK} />
            <Text style={styles.ratingTxt}>{rating.toFixed(1)}</Text>
          </View>
        </View>
        {restaurant.cuisineType ? (
          <Text style={styles.rowCuisine} numberOfLines={1}>{restaurant.cuisineType}</Text>
        ) : null}
        <View style={styles.rowMeta}>
          <Ionicons name="time-outline" size={12} color={TEXT_MUTED} />
          <Text style={styles.rowMetaTxt}>{time}–{time + 10} min</Text>
          <Ionicons name="bicycle-outline" size={12} color={TEXT_MUTED} style={{ marginLeft: 8 }} />
          <Text style={styles.rowMetaTxt}>{fee === 0 ? "Livraison offerte" : `${fee} MAD`}</Text>
          {(restaurant as any).isOpen === false && (
            <>
              <Ionicons name="lock-closed-outline" size={11} color="#EF4444" style={{ marginLeft: 8 }} />
              <Text style={[styles.rowMetaTxt, { color: "#EF4444" }]}>Fermé</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timeout);
  }, []);

  const apiParams = useMemo(() => {
    const p: any = {};
    if (query.trim()) p.search = query.trim();
    if (activeFilters.has("open")) p.isOpen = true;
    return p;
  }, [query, activeFilters]);

  const { data: raw = [], isLoading } = useListRestaurants(apiParams, {
    query: { enabled: query.trim().length > 0 || activeFilters.size > 0 },
  });

  const results = useMemo(() => {
    let list = [...raw];
    if (activeFilters.has("rating4")) list = list.filter((r) => (r.rating ?? 0) >= 4);
    if (activeFilters.has("fast")) list = list.filter((r) => (r.deliveryTime ?? 99) < 30);
    if (activeFilters.has("free")) list = list.filter((r) => (r.deliveryFee ?? 10) === 0);
    return list;
  }, [raw, activeFilters]);

  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const showEmpty = !isLoading && results.length === 0 && (query.trim().length > 0 || activeFilters.size > 0);
  const showPrompt = query.trim().length === 0 && activeFilters.size === 0;

  return (
    <View style={[styles.root, { backgroundColor: "#fff" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12) }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={TEXT_MUTED} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Rechercher un restaurant, une cuisine..."
            placeholderTextColor={TEXT_MUTED}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {query.length > 0 && Platform.OS !== "ios" && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersList}
        renderItem={({ item }) => {
          const active = activeFilters.has(item.key);
          return (
            <TouchableOpacity
              onPress={() => toggleFilter(item.key)}
              activeOpacity={0.75}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Ionicons name={item.icon} size={13} color={active ? "#fff" : TEXT_MUTED} />
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Body */}
      {showPrompt ? (
        <View style={styles.prompt}>
          <Ionicons name="search" size={48} color="#E5E7EB" />
          <Text style={styles.promptTitle}>Cherchez votre bonheur</Text>
          <Text style={styles.promptSub}>
            Tapez le nom d'un restaurant, d'une cuisine ou activez un filtre ci-dessus
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.prompt}>
          <ActivityIndicator color={PINK} size="large" />
          <Text style={[styles.promptSub, { marginTop: 12 }]}>Recherche en cours...</Text>
        </View>
      ) : showEmpty ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.prompt}>
          <Ionicons name="search-circle-outline" size={52} color="#E5E7EB" />
          <Text style={styles.promptTitle}>Aucun résultat</Text>
          <Text style={styles.promptSub}>
            Essayez un autre terme ou retirez un filtre
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 30).duration(250)}>
              <RestaurantRow
                restaurant={item}
                onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: String(item.id) } })}
              />
            </Animated.View>
          )}
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.resultsCount}>
                {results.length} résultat{results.length > 1 ? "s" : ""}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CARD_BORDER,
  },
  backBtn: { padding: 2 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: TEXT_DARK,
  },
  filtersList: { maxHeight: 52 },
  filtersRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: "#F9F9F9",
  },
  chipActive: { backgroundColor: PINK, borderColor: PINK },
  chipTxt: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT_MUTED },
  chipTxtActive: { color: "#fff" },
  resultsCount: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: TEXT_MUTED,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  rowImg: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  rowBody: { flex: 1, justifyContent: "center", gap: 4 },
  rowNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowName: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold", color: TEXT_DARK },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF1F6",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ratingTxt: { fontSize: 11, fontFamily: "Inter_700Bold", color: TEXT_DARK },
  rowCuisine: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_MUTED },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  rowMetaTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_MUTED },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: CARD_BORDER, marginLeft: 104 },
  prompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  promptTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: TEXT_DARK, textAlign: "center" },
  promptSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_MUTED, textAlign: "center", lineHeight: 20 },
});
