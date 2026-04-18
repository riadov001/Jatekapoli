import React from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetOrder } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STEPS = [
  { key: "pending", label: "Order placed", icon: "bag-add-outline" },
  { key: "accepted", label: "Accepted", icon: "checkmark-circle-outline" },
  { key: "preparing", label: "Preparing", icon: "restaurant-outline" },
  { key: "ready", label: "Ready for pickup", icon: "bag-check-outline" },
  { key: "picked_up", label: "On the way", icon: "bicycle-outline" },
  { key: "delivered", label: "Delivered!", icon: "home-outline" },
];
const STATUS_ORDER = STEPS.map((s) => s.key);

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = parseInt(id, 10);

  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, refetchInterval: 15000 } });

  const currentIdx = order ? STATUS_ORDER.indexOf(order.status) : -1;

  if (isLoading || !order) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/orders")}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Order #{order.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24), paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Restaurant + status */}
        <View style={styles.topInfo}>
          <Text style={[styles.restName, { color: colors.foreground }]}>{order.restaurantName}</Text>
          {order.status === "cancelled" ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.destructive + "20" }]}>
              <Text style={[styles.statusText, { color: colors.destructive }]}>Cancelled</Text>
            </View>
          ) : order.status === "delivered" ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>Delivered</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + "20" }]}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.primary }]}>In progress</Text>
            </View>
          )}
        </View>

        {/* Progress tracker */}
        {order.status !== "cancelled" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Order status</Text>
            {STEPS.map((step, idx) => {
              const done = idx <= currentIdx;
              const active = idx === currentIdx;
              return (
                <View key={step.key} style={styles.step}>
                  <View style={[styles.stepIcon, { backgroundColor: done ? colors.primary : colors.muted }]}>
                    <Ionicons name={step.icon as any} size={16} color={done ? "#fff" : colors.mutedForeground} />
                  </View>
                  {idx < STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: idx < currentIdx ? colors.primary : colors.border }]} />
                  )}
                  <Text style={[styles.stepLabel, { color: done ? colors.foreground : colors.mutedForeground, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {step.label}
                    {active && order.estimatedDeliveryTime ? ` · ${order.estimatedDeliveryTime} min` : ""}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Delivery address */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.addrRow}>
            <View style={[styles.addrIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="location" size={18} color={colors.primary} />
            </View>
            <View style={styles.addrInfo}>
              <Text style={[styles.addrLabel, { color: colors.mutedForeground }]}>Delivering to</Text>
              <Text style={[styles.addrText, { color: colors.foreground }]}>{order.deliveryAddress}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Items</Text>
          {order.items.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.itemRow}>
                <Text style={[styles.itemQty, { color: colors.primary }]}>{item.quantity}×</Text>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.menuItemName}</Text>
                <Text style={[styles.itemPrice, { color: colors.foreground }]}>{item.totalPrice.toFixed(0)} MAD</Text>
              </View>
              {idx < order.items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.itemRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{order.subtotal.toFixed(0)} MAD</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Delivery</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{order.deliveryFee.toFixed(0)} MAD</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.itemRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{order.total.toFixed(0)} MAD</Text>
          </View>
        </View>

        {order.notes ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
            <Text style={[styles.notesText, { color: colors.mutedForeground }]}>{order.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  topInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 16 },
  restName: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12, gap: 10 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 12, position: "relative" },
  stepIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", zIndex: 1 },
  stepLine: { position: "absolute", left: 17, top: 34, width: 2, height: 20, marginLeft: -1 },
  stepLabel: { fontSize: 14, lineHeight: 34 },
  addrRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  addrIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addrInfo: { flex: 1, gap: 3 },
  addrLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addrText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemQty: { fontSize: 14, fontFamily: "Inter_600SemiBold", minWidth: 24 },
  itemName: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  itemPrice: { fontSize: 14, fontFamily: "Inter_500Medium" },
  divider: { height: 1 },
  summaryLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  totalLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  notesText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  success: { color: "#22C55E" },
});
