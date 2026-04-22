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
import { useQuery } from "@tanstack/react-query";
import { getApiBaseSafe } from "@/lib/apiBase";

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

// ─── Types ────────────────────────────────────────────────────────────────────
type Shop = {
  id: number;
  name: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  rating?: number | null;
  deliveryTime?: number | null;
  deliveryFee?: number | null;
  isOpen?: boolean | null;
  category?: string | null;
  subcategoryId?: number | null;
};

type Subcategory = {
  id: number;
  name: string;
  slug: string;
  shopCount?: number;
  shops: Shop[];
};

type CategoryDetail = {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  subcategories: Subcategory[];
};

// ─── Meta per slug (icon + color when backend isn't ready) ───────────────────
const SLUG_META: Record<string, { label: string; icon: string; color: string }> = {
  restauration: { label: "Restauration", icon: "restaurant",   color: "#E91E63" },
  epicerie:     { label: "Épicerie",      icon: "basket",       color: "#F97316" },
  sante:        { label: "Santé",         icon: "medkit",       color: "#8B5CF6" },
  supermarche:  { label: "Supermarché",   icon: "cart",         color: "#0AA5C0" },
  boutiques:    { label: "Boutiques",     icon: "storefront",   color: "#C2185B" },
  coursier:     { label: "Coursier",      icon: "bicycle",      color: "#0AA5C0" },
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchCategory(slug: string): Promise<CategoryDetail> {
  const base = getApiBaseSafe();
  const res = await fetch(`${base}/shop-categories/${slug}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchSubcategoryShops(subcategoryId: number, search: string): Promise<Shop[]> {
  const base = getApiBaseSafe();
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(`${base}/shop-subcategories/${subcategoryId}/shops?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShopCard({ shop, onPress, width }: { shop: Shop; onPress: () => void; width?: number }) {
  const img = shop.imageUrl || FALLBACK_IMG;
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
        {shop.isOpen === false && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>Fermé</Text>
          </View>
        )}
        {shop.logoUrl ? (
          <Image source={{ uri: shop.logoUrl }} style={styles.cardLogo} resizeMode="contain" />
        ) : (
          <View style={[styles.cardLogo, styles.cardLogoFallback]}>
            <Text style={styles.cardLogoLetter}>{shop.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{shop.name}</Text>
        <View style={styles.cardMeta}>
          {shop.rating != null && (
            <View style={styles.metaChip}>
              <Ionicons name="star" size={10} color={PINK} />
              <Text style={styles.metaTxt}>{shop.rating.toFixed(1)}</Text>
            </View>
          )}
          {shop.deliveryTime != null && (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={10} color={TEXT_MUTED} />
              <Text style={styles.metaTxt}>{shop.deliveryTime} min</Text>
            </View>
          )}
          {shop.deliveryFee != null && (
            <View style={styles.metaChip}>
              <Ionicons name="bicycle-outline" size={10} color={TEXT_MUTED} />
              <Text style={styles.metaTxt}>{shop.deliveryFee} MAD</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ShopCardGrid({ shop, onPress }: { shop: Shop; onPress: () => void }) {
  const img = shop.imageUrl || FALLBACK_IMG;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
      ]}
    >
      <Image source={{ uri: img }} style={styles.gridCardImg} resizeMode="cover" />
      {shop.isOpen === false && (
        <View style={styles.closedBadge}>
          <Text style={styles.closedText}>Fermé</Text>
        </View>
      )}
      {shop.logoUrl ? (
        <Image source={{ uri: shop.logoUrl }} style={styles.gridCardLogo} resizeMode="contain" />
      ) : (
        <View style={[styles.gridCardLogo, styles.cardLogoFallback]}>
          <Text style={styles.cardLogoLetter}>{shop.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.gridCardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{shop.name}</Text>
        <View style={styles.cardMeta}>
          {shop.rating != null && (
            <View style={styles.metaChip}>
              <Ionicons name="star" size={10} color={PINK} />
              <Text style={styles.metaTxt}>{shop.rating.toFixed(1)}</Text>
            </View>
          )}
          {shop.deliveryTime != null && (
            <Text style={styles.metaTxt}>{shop.deliveryTime} min</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function SubcategorySection({
  sub,
  onShopPress,
  onViewMore,
}: {
  sub: Subcategory;
  onShopPress: (id: number) => void;
  onViewMore: (sub: Subcategory) => void;
}) {
  if (!sub.shops || sub.shops.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{sub.name}</Text>
        {sub.shops.length > 3 && (
          <TouchableOpacity onPress={() => onViewMore(sub)} activeOpacity={0.8}>
            <Text style={styles.voirPlus}>Voir plus →</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={sub.shops.slice(0, 8)}
        keyExtractor={(s) => String(s.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item }) => (
          <ShopCard shop={item} onPress={() => onShopPress(item.id)} width={CARD_W} />
        )}
      />
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="storefront-outline" size={56} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Bientôt disponible</Text>
      <Text style={styles.emptySub}>
        La section {label} sera disponible dès que le backend aura été mis en place.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<Subcategory | null>(null);

  const meta = SLUG_META[slug ?? ""] ?? { label: slug ?? "Catégorie", icon: "grid", color: PINK };

  const { data: category, isLoading, isError } = useQuery<CategoryDetail>({
    queryKey: ["shop-category", slug],
    queryFn: () => fetchCategory(slug ?? ""),
    retry: false,
    staleTime: 60_000,
  });

  const goShop = (id: number) =>
    router.push({ pathname: "/restaurant/[id]", params: { id: String(id) } });

  const allShopsFlat: Shop[] = useMemo(() => {
    if (!category) return [];
    return category.subcategories.flatMap((s) => s.shops ?? []);
  }, [category]);

  const filteredSubs = useMemo(() => {
    if (!category) return [];
    const subs = selectedSub
      ? category.subcategories.filter((s) => s.id === selectedSub.id)
      : category.subcategories;

    if (!search.trim()) return subs;
    const q = search.toLowerCase();
    return subs.map((s) => ({
      ...s,
      shops: (s.shops ?? []).filter((sh) => sh.name.toLowerCase().includes(q)),
    }));
  }, [category, selectedSub, search]);

  const gridShops = useMemo(() => {
    if (!selectedSub) return [];
    const sub = filteredSubs[0];
    return sub?.shops ?? [];
  }, [filteredSubs, selectedSub]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ─── Pink Header ─── */}
      <View style={[styles.header, { backgroundColor: meta.color }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name={meta.icon as any} size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>{category?.name ?? meta.label}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Search bar ─── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Rechercher dans ${category?.name ?? meta.label}…`}
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

      {/* ─── Subcategory filter chips ─── */}
      {category && category.subcategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          <TouchableOpacity
            onPress={() => setSelectedSub(null)}
            style={[styles.chip, !selectedSub && styles.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipTxt, !selectedSub && styles.chipTxtActive]}>Tout</Text>
          </TouchableOpacity>
          {category.subcategories.map((sub) => (
            <TouchableOpacity
              key={sub.id}
              onPress={() => setSelectedSub(sub.id === selectedSub?.id ? null : sub)}
              style={[styles.chip, selectedSub?.id === sub.id && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipTxt, selectedSub?.id === sub.id && styles.chipTxtActive]}>
                {sub.name}
              </Text>
              {sub.shopCount != null && (
                <Text style={[styles.chipCount, selectedSub?.id === sub.id && styles.chipTxtActive]}>
                  {" "}·{" "}{sub.shopCount}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ─── Content ─── */}
      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={meta.color} />
          <Text style={styles.loaderTxt}>Chargement…</Text>
        </View>
      ) : isError || !category ? (
        <EmptyState label={meta.label} />
      ) : selectedSub ? (
        /* Grid view for a specific subcategory */
        <FlatList
          data={gridShops}
          keyExtractor={(s) => String(s.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="storefront-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Aucun commerce trouvé</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ShopCardGrid shop={item} onPress={() => goShop(item.id)} />
          )}
        />
      ) : (
        /* Sections view — all subcategories */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {filteredSubs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="storefront-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyTitle}>Aucun commerce trouvé</Text>
            </View>
          ) : (
            filteredSubs.map((sub) => (
              <SubcategorySection
                key={sub.id}
                sub={sub}
                onShopPress={goShop}
                onViewMore={(s) => setSelectedSub(s)}
              />
            ))
          )}
        </ScrollView>
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
  headerCenter: { flexDirection: "row", alignItems: "center" },
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: PINK, borderColor: PINK },
  chipTxt: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_DARK },
  chipTxtActive: { color: "#fff" },
  chipCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_MUTED },

  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_MUTED },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: TEXT_DARK, textAlign: "center" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_MUTED, textAlign: "center", lineHeight: 20 },

  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: TEXT_DARK },
  voirPlus: { fontSize: 13, fontFamily: "Inter_500Medium", color: PINK },

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
});
