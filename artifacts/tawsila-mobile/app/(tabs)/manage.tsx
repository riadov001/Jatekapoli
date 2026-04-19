/**
 * Restaurant owner dashboard — mobile mirror of the PWA panel.
 *
 * Shown only when `user.role === "owner"`. Covers:
 * - Profile-completion gate banner → restaurant-onboarding screen
 * - Real-time new-order alerts via SSE
 * - Pending orders with Accept / Reject
 * - Active orders with kitchen code pill and workflow buttons
 * - Daily revenue + pending-count stats
 */
import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useListRestaurants, useListOrders } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSSE } from "@/hooks/useSSE";
import { apiBase, updateOrderStatus } from "@/lib/api";

function haptic(type: "light" | "medium" | "success" | "warning" | "error" = "light") {
  if (Platform.OS === "web") return;
  if (type === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (type === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else if (type === "warning") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (type === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

const STATUS_FLOW: Record<string, { label: string; icon: string; next?: string; nextLabel?: string }> = {
  pending: { label: "Nouveau", icon: "time-outline", next: "accepted", nextLabel: "Accepter" },
  accepted: { label: "Accepté", icon: "checkmark-circle-outline", next: "preparing", nextLabel: "En préparation" },
  preparing: { label: "Préparation", icon: "restaurant-outline", next: "ready", nextLabel: "Prêt pour livraison" },
  ready: { label: "Prêt", icon: "bag-check-outline" },
  picked_up: { label: "En route", icon: "bicycle-outline" },
  delivered: { label: "Livré", icon: "checkmark-done-circle-outline" },
  cancelled: { label: "Annulé", icon: "close-circle-outline" },
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#E2006A",
  accepted: "#2563EB",
  preparing: "#7C3AED",
  ready: "#059669",
  picked_up: "#0284C7",
  delivered: "#0F172A",
  cancelled: "#64748B",
};

function OrderRow({
  order,
  profileComplete,
  onAction,
  actionLoading,
}: {
  order: any;
  profileComplete: boolean;
  onAction: (id: number, status: string) => void;
  actionLoading: number | null;
}) {
  const colors = useColors();
  const cfg = STATUS_FLOW[order.status] ?? STATUS_FLOW.pending;
  const color = STATUS_COLOR[order.status] ?? "#E2006A";
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const loading = actionLoading === order.id;

  const firstItem = order.items?.[0];
  const extraCount = (order.items?.length ?? 1) - 1;
  const summary = firstItem
    ? `${firstItem.quantity}× ${firstItem.menuItemName}${extraCount > 0 ? ` +${extraCount}` : ""}`
    : "—";

  return (
    <Animated.View entering={FadeInDown.duration(300)} layout={Layout.springify()}>
      <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.orderRef, { color: colors.foreground }]} numberOfLines={1}>
              {order.reference || `#${order.id}`}
            </Text>
            <Text style={[styles.orderAddr, { color: colors.mutedForeground }]} numberOfLines={1}>
              {order.deliveryAddress}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: color + "20" }]}>
            <Ionicons name={cfg.icon as any} size={12} color={color} />
            <Text style={[styles.statusText, { color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Kitchen code */}
        {order.kitchenCode && isActive && (
          <View style={[styles.kitchenCode, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Ionicons name="receipt-outline" size={14} color={colors.primary} />
            <Text style={[styles.kitchenCodeText, { color: colors.primary }]}>
              Code cuisine · <Text style={{ fontFamily: "Inter_700Bold", letterSpacing: 2 }}>{order.kitchenCode}</Text>
            </Text>
          </View>
        )}

        {/* Items + total */}
        <View style={styles.orderFooter}>
          <Text style={[styles.orderSummary, { color: colors.mutedForeground }]} numberOfLines={1}>{summary}</Text>
          <Text style={[styles.orderTotal, { color: colors.primary }]}>{order.total?.toFixed(0)} MAD</Text>
        </View>

        {/* Action buttons */}
        {order.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#FEF3C7", borderColor: "#FBBF24", flex: 0, paddingHorizontal: 16 }]}
              onPress={() => onAction(order.id, "cancelled")}
              disabled={loading}
              testID={`btn-reject-${order.id}`}
            >
              <Ionicons name="close" size={14} color="#92400E" />
              <Text style={{ color: "#92400E", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1, opacity: profileComplete ? 1 : 0.4 }]}
              onPress={() => profileComplete
                ? onAction(order.id, "accepted")
                : Alert.alert("Profil incomplet", "Complétez votre profil professionnel pour accepter des commandes.", [
                    { text: "Plus tard", style: "cancel" },
                    { text: "Compléter", onPress: () => router.push("/restaurant-onboarding") },
                  ])
              }
              disabled={loading}
              testID={`btn-accept-${order.id}`}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Accepter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {cfg.next && order.status !== "pending" && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={() => onAction(order.id, cfg.next!)}
            disabled={loading}
            testID={`btn-next-${order.id}`}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>{cfg.nextLabel}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {order.status === "ready" && (
          <View style={[styles.waitPill, { backgroundColor: colors.accent }]}>
            <Ionicons name="bicycle-outline" size={14} color={colors.primary} />
            <Text style={[styles.waitText, { color: colors.primary }]}>En attente d'un livreur…</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export default function ManageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const { data: restaurants, refetch: refetchRestaurants } = useListRestaurants(
    user ? { ownerId: user.id } : undefined,
    { query: { enabled: !!user } }
  );
  const myRestaurant = restaurants?.[0];
  const profileComplete = !!(myRestaurant as any)?.profileCompletedAt;

  const { data: orders, isLoading, refetch: refetchOrders } = useListOrders(
    myRestaurant ? { restaurantId: myRestaurant.id } : undefined,
    { query: { enabled: !!myRestaurant, refetchInterval: 30000 } }
  );

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [newOrderBanner, setNewOrderBanner] = useState<any | null>(null);

  const activeOrders = (orders ?? []).filter(o => !["delivered", "cancelled"].includes(o.status));
  const pendingOrders = activeOrders.filter(o => o.status === "pending");
  const todayRevenue = (orders ?? [])
    .filter(o => o.status === "delivered" && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + o.total, 0);

  const handleSSEOrderNew = useCallback((data: any) => {
    haptic("success");
    setNewOrderBanner(data);
    refetchOrders();
  }, [refetchOrders]);

  const handleSSEOrderStatus = useCallback(() => {
    refetchOrders();
  }, [refetchOrders]);

  // SSE — real-time new order notifications
  useSSE({
    url: myRestaurant ? `${apiBase}/api/events?channels=restaurant:${myRestaurant.id}` : "",
    enabled: !!myRestaurant && !!token,
    events: {
      order_new: handleSSEOrderNew,
      order_status: handleSSEOrderStatus,
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOrders(), refetchRestaurants()]);
    setRefreshing(false);
  };

  const handleAction = async (orderId: number, status: string) => {
    haptic("medium");
    setActionLoading(orderId);
    try {
      await updateOrderStatus(orderId, status);
      haptic("success");
      refetchOrders();
    } catch (e: any) {
      haptic("error");
      if (e?.message?.includes("OWNER_PROFILE_INCOMPLETE")) {
        Alert.alert("Profil incomplet", "Complétez votre profil professionnel pour accepter des commandes.", [
          { text: "Plus tard", style: "cancel" },
          { text: "Compléter", onPress: () => router.push("/restaurant-onboarding") },
        ]);
      } else {
        Alert.alert("Erreur", e?.message ?? "Impossible d'effectuer cette action.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (!token || (user?.role !== "owner" && user?.role !== "restaurant_owner")) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Espace propriétaire</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Connectez-vous avec un compte propriétaire.</Text>
      </View>
    );
  }

  if (!myRestaurant) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucun restaurant associé</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Contactez l'administrateur pour associer votre compte.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16 + webTopPad,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Restaurant</Text>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{myRestaurant.name}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/restaurant-onboarding")}
            style={[styles.settingsBtn, { backgroundColor: colors.muted }]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Profile completion gate */}
        {!profileComplete && (
          <Animated.View entering={FadeIn.duration(350)}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/restaurant-onboarding")}
              style={[styles.profileGate, { backgroundColor: "#FEF3C7", borderColor: "#FBBF24" }]}
              testID="banner-owner-profile"
            >
              <Ionicons name="warning-outline" size={22} color="#92400E" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.gateTitle, { color: "#92400E" }]}>Complétez votre profil professionnel</Text>
                <Text style={[styles.gateSub, { color: "#78350F" }]}>Nom légal + ICE requis pour accepter les commandes.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#92400E" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* New order alert */}
        {newOrderBanner && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity
              style={[styles.newOrderBanner, { backgroundColor: colors.primary }]}
              onPress={() => setNewOrderBanner(null)}
              testID="banner-new-order"
            >
              <Ionicons name="notifications" size={20} color="#fff" />
              <Text style={styles.newOrderText}>
                Nouvelle commande {newOrderBanner.reference || `#${newOrderBanner.id}`} · {newOrderBanner.total?.toFixed(0)} MAD
              </Text>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{pendingOrders.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>En attente</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{activeOrders.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Actives</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{todayRevenue.toFixed(0)} MAD</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Aujourd'hui</Text>
          </View>
        </View>

        {/* Orders list */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Commandes actives · {activeOrders.length}
        </Text>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : activeOrders.length === 0 ? (
          <View style={[styles.center, { marginTop: 40 }]}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucune commande en cours</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Tirez vers le bas pour actualiser.</Text>
          </View>
        ) : (
          activeOrders
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map(order => (
              <OrderRow
                key={order.id}
                order={order}
                profileComplete={profileComplete}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 8 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },

  profileGate: {
    borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  gateTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  gateSub: { fontSize: 11, marginTop: 2 },

  newOrderBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14, marginBottom: 12,
  },
  newOrderText: { flex: 1, color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  statBox: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 2, textAlign: "center" },

  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 10 },

  orderCard: {
    borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  orderHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  orderRef: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  orderAddr: { fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  kitchenCode: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 8, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  kitchenCodeText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  orderFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderSummary: { fontSize: 12, flex: 1, marginRight: 8 },
  orderTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "transparent",
  },
  waitPill: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 10 },
  waitText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 12, textAlign: "center", paddingHorizontal: 32 },
});
