import React, { useState } from "react";
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCreateOrder } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const DELIVERY_FEE = 15;

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, restaurantId, restaurantName, updateQuantity, removeItem, clearCart, subtotal, itemCount } = useCart();
  const { user, token } = useAuth();
  const createOrder = useCreateOrder();
  const [address, setAddress] = useState((user as any)?.address ?? "");
  const [notes, setNotes] = useState("");

  const handlePlaceOrder = () => {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in to place an order.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    if (!address.trim()) {
      Alert.alert("Address required", "Please enter your delivery address.");
      return;
    }
    createOrder.mutate({
      data: {
        restaurantId: restaurantId!,
        deliveryAddress: address.trim(),
        notes: notes.trim() || undefined,
        items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      },
    }, {
      onSuccess: (order) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearCart();
        router.replace({ pathname: "/order/[id]", params: { id: String(order.id) } });
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Could not place order. Please try again.");
      },
    });
  };

  if (itemCount === 0) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
          <Ionicons name="bag-outline" size={40} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add items from a restaurant to get started</Text>
        <TouchableOpacity
          style={[styles.browseBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(tabs)")}
        >
          <Text style={styles.browseBtnText}>Browse restaurants</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cart</Text>
        <TouchableOpacity onPress={() => { Alert.alert("Clear cart?", "", [{ text: "Cancel" }, { text: "Clear", style: "destructive", onPress: clearCart }]); }}>
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100 }}
        bottomOffset={100}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Restaurant name */}
        <Text style={[styles.fromText, { color: colors.mutedForeground }]}>From {restaurantName}</Text>

        {/* Items */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {items.map((item, idx) => (
            <View key={item.menuItemId}>
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={[styles.cartItemName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.cartItemPrice, { color: colors.primary }]}>{item.price.toFixed(0)} MAD each</Text>
                </View>
                <View style={styles.qtyRow}>
                  <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)} style={[styles.qtyBtn, { backgroundColor: colors.muted }]}>
                    <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={16} color={item.quantity === 1 ? colors.destructive : colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)} style={[styles.qtyBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cartItemTotal, { color: colors.foreground }]}>{(item.price * item.quantity).toFixed(0)} MAD</Text>
              </View>
              {idx < items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Delivery address</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <TextInput
            style={[styles.addressInput, { color: colors.foreground }]}
            placeholder="Enter your delivery address in Oujda"
            placeholderTextColor={colors.mutedForeground}
            value={address}
            onChangeText={setAddress}
            multiline
            returnKeyType="done"
          />
        </View>

        {/* Notes */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Notes (optional)</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.addressInput, { color: colors.foreground }]}
            placeholder="Any special requests..."
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{subtotal.toFixed(0)} MAD</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Delivery fee</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{DELIVERY_FEE} MAD</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{(subtotal + DELIVERY_FEE).toFixed(0)} MAD</Text>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Place order button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16), borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.orderBtn, { backgroundColor: colors.primary, opacity: createOrder.isPending ? 0.7 : 1 }]}
          onPress={handlePlaceOrder}
          disabled={createOrder.isPending}
          activeOpacity={0.85}
        >
          {createOrder.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.orderBtnText}>Place Order</Text>
              <Text style={[styles.orderBtnPrice, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                {(subtotal + DELIVERY_FEE).toFixed(0)} MAD
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  fromText: { fontSize: 13, fontFamily: "Inter_500Medium", paddingHorizontal: 16, paddingVertical: 10 },
  section: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  cartItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  cartItemInfo: { flex: 1, gap: 3 },
  cartItemName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  cartItemPrice: { fontSize: 12, fontFamily: "Inter_400Regular" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  qty: { fontSize: 15, fontFamily: "Inter_600SemiBold", minWidth: 20, textAlign: "center" },
  cartItemTotal: { fontSize: 14, fontFamily: "Inter_600SemiBold", minWidth: 56, textAlign: "right" },
  divider: { height: 1, marginHorizontal: 14 },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16, marginBottom: 8 },
  inputWrap: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  addressInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 40 },
  summary: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  orderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56, borderRadius: 16, paddingHorizontal: 20, shadowColor: "#F97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  orderBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  orderBtnPrice: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  browseBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8, shadowColor: "#F97316", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  browseBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
