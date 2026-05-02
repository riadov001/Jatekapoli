/**
 * EarningsHistoryScreen
 * Full earnings ledger for drivers: summary cards + filterable list of past deliveries.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useListDrivers } from "@workspace/api-client-react";
import {
  fetchEarningsHistory,
  type EarningHistoryItem,
  type EarningsHistoryResponse,
} from "@/lib/api";

type Filter = "all" | "today" | "week" | "month";

function haptic(type: "light" | "medium" = "light") {
  if (Platform.OS === "web") return;
  if (type === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-MA", { weekday: "long", day: "numeric", month: "long" });
}

/** Group history rows by calendar day (YYYY-MM-DD). */
function groupByDay(items: EarningHistoryItem[]): { day: string; label: string; rows: EarningHistoryItem[]; total: number }[] {
  const map = new Map<string, EarningHistoryItem[]>();
  for (const item of items) {
    const key = item.createdAt.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([day, rows]) => ({
    day,
    label: formatDay(rows[0].createdAt),
    rows,
    total: rows.reduce((s, r) => s + r.amount, 0),
  }));
}

export default function EarningsHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: drivers } = useListDrivers();
  const myDriver = drivers?.find((d) => d.userId === user?.id);

  const [data, setData] = useState<EarningsHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async (silent = false) => {
    if (!myDriver) return;
    if (!silent) setLoading(true);
    try {
      const result = await fetchEarningsHistory(myDriver.id);
      setData(result);
    } catch (e) {
      console.warn("[earnings-history] fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myDriver?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    haptic("light");
    setRefreshing(true);
    load(true);
  };

  // Filter items
  const filteredItems: EarningHistoryItem[] = React.useMemo(() => {
    if (!data?.history) return [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return data.history.filter((item) => {
      const d = new Date(item.createdAt);
      if (filter === "today") return d >= startOfDay;
      if (filter === "week") return d >= startOfWeek;
      if (filter === "month") return d >= startOfMonth;
      return true;
    });
  }, [data?.history, filter]);

  const groups = React.useMemo(() => groupByDay(filteredItems), [filteredItems]);

  const typeIcon = (type: string) => {
    if (type === "bonus") return "star";
    if (type === "adjustment") return "swap-horizontal";
    return "bicycle";
  };
  const typeColor = (type: string) => {
    if (type === "bonus") return "#F59E0B";
    if (type === "adjustment") return colors.mutedForeground;
    return "#22C55E";
  };
  const typeLabel = (type: string) => {
    if (type === "bonus") return "Bonus";
    if (type === "adjustment") return "Ajustement";
    return "Livraison";
  };

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "Tout" },
    { key: "today", label: "Aujourd'hui" },
    { key: "week", label: "Semaine" },
    { key: "month", label: "Mois" },
  ];

  const summary = data?.summary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { haptic(); router.back(); }} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Mes revenus</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.day}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            <>
              {/* Summary cards */}
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCardLarge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.summaryLargeLabel}>Total cumulé</Text>
                  <Text style={styles.summaryLargeValue}>
                    {summary?.totalEarnings?.toFixed(0) ?? "0"} MAD
                  </Text>
                  <Text style={styles.summaryLargeSub}>
                    {summary?.totalDeliveries ?? 0} livraisons
                  </Text>
                </View>
                <View style={styles.summarySmallCol}>
                  <View style={[styles.summaryCardSmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.summarySmallLabel, { color: colors.mutedForeground }]}>Aujourd'hui</Text>
                    <Text style={[styles.summarySmallValue, { color: colors.foreground }]}>
                      {summary?.today?.toFixed(0) ?? "0"} MAD
                    </Text>
                  </View>
                  <View style={[styles.summaryCardSmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.summarySmallLabel, { color: colors.mutedForeground }]}>Cette semaine</Text>
                    <Text style={[styles.summarySmallValue, { color: colors.foreground }]}>
                      {summary?.thisWeek?.toFixed(0) ?? "0"} MAD
                    </Text>
                  </View>
                  <View style={[styles.summaryCardSmall, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.summarySmallLabel, { color: colors.mutedForeground }]}>Ce mois</Text>
                    <Text style={[styles.summarySmallValue, { color: colors.foreground }]}>
                      {summary?.thisMonth?.toFixed(0) ?? "0"} MAD
                    </Text>
                  </View>
                </View>
              </View>

              {/* Filter tabs */}
              <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => { haptic("light"); setFilter(f.key); }}
                    style={[
                      styles.filterTab,
                      filter === f.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        { color: filter === f.key ? colors.primary : colors.mutedForeground },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          }
          renderItem={({ item: group }) => (
            <View style={styles.dayGroup}>
              {/* Day header */}
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>
                  {group.label}
                </Text>
                <Text style={[styles.dayTotal, { color: colors.primary }]}>
                  +{group.total.toFixed(0)} MAD
                </Text>
              </View>

              {/* Rows */}
              {group.rows.map((item) => (
                <View
                  key={item.id}
                  style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: typeColor(item.type) + "22" }]}>
                    <Ionicons name={typeIcon(item.type) as any} size={18} color={typeColor(item.type)} />
                  </View>
                  <View style={styles.rowMid}>
                    <Text style={[styles.rowRest, { color: colors.foreground }]} numberOfLines={1}>
                      {item.restaurantName}
                    </Text>
                    {item.orderReference && (
                      <Text style={[styles.rowRef, { color: colors.mutedForeground }]}>
                        Réf · {item.orderReference}
                      </Text>
                    )}
                    <Text style={[styles.rowAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.deliveryAddress}
                    </Text>
                    <Text style={[styles.rowTime, { color: colors.mutedForeground }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowAmount, { color: typeColor(item.type) }]}>
                      +{item.amount.toFixed(0)}
                    </Text>
                    <Text style={[styles.rowAmountCurrency, { color: typeColor(item.type) }]}>MAD</Text>
                    <Text style={[styles.rowType, { color: colors.mutedForeground }]}>
                      {typeLabel(item.type)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={[styles.empty, { borderColor: colors.border }]}>
                <Ionicons name="wallet-outline" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucune livraison</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  {filter === "today"
                    ? "Pas encore de livraison aujourd'hui."
                    : filter === "week"
                    ? "Aucune livraison cette semaine."
                    : filter === "month"
                    ? "Aucune livraison ce mois-ci."
                    : "Vous n'avez pas encore effectué de livraison."}
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  summaryCardLarge: {
    flex: 1.1,
    borderRadius: 20,
    padding: 18,
    justifyContent: "flex-end",
    minHeight: 148,
  },
  summaryLargeLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 6,
  },
  summaryLargeValue: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 30,
  },
  summaryLargeSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  summarySmallCol: { flex: 1, gap: 8 },
  summaryCardSmall: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  summarySmallLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  summarySmallValue: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  dayGroup: { paddingHorizontal: 16, marginBottom: 8 },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  dayLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  dayTotal: { fontSize: 13, fontFamily: "Inter_700Bold" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowMid: { flex: 1, gap: 2 },
  rowRest: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowRef: { fontSize: 11, fontFamily: "Inter_500Medium" },
  rowAddr: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 1, flexShrink: 0 },
  rowAmount: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 22 },
  rowAmountCurrency: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  rowType: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2 },

  empty: {
    margin: 16,
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 6 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
