import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, RefreshControl, ScrollView, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { listFavorites, removeFavorite } from "@/lib/api";

export default function FavoritesScreen() {
  const colors = useColors();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await listFavorites();
      setItems(rows.filter((r) => r.restaurant));
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de charger.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRemove = async (restaurantId: number) => {
    setItems((prev) => prev.filter((it) => it.restaurantId !== restaurantId));
    try { await removeFavorite(restaurantId); } catch { load(); }
  };

  return (
    <ProfileScreenLayout title="Mes favoris" scroll={false}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.heading }]}>Aucun favori</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Touchez le ♡ sur un restaurant pour le sauvegarder ici.</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)")} style={[styles.cta, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaText}>Découvrir des restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          {items.map((it) => (
            <View key={it.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={{ flexDirection: "row", flex: 1, gap: 12, alignItems: "center" }} onPress={() => router.push(`/restaurant/${it.restaurantId}` as any)} activeOpacity={0.8}>
                {it.restaurant?.imageUrl ? (
                  <Image source={{ uri: it.restaurant.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }]}>
                    <Ionicons name="restaurant-outline" size={24} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.heading }]} numberOfLines={1}>{it.restaurant?.name ?? `Resto #${it.restaurantId}`}</Text>
                  <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>{it.restaurant?.cuisine ?? ""}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRemove(it.restaurantId)} hitSlop={10} style={styles.heartBtn}>
                <Ionicons name="heart" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  cta: { marginTop: 16, paddingHorizontal: 24, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  heartBtn: { padding: 8 },
});
