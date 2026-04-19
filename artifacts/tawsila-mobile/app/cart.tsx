import React, { useState } from "react";
import {
  StyleSheet, Text, View, TouchableOpacity,
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
  const { items, restaurantId, restaurantName, updateQuantity, removeItem, clearCart, subtotal, itemCount, selectedAddress, selectedAddressInZone } = useCart();
  const { token } = useAuth();
  const createOrder = useCreateOrder();
  const address = selectedAddress;
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
      Alert.alert("Adresse requise", "Veuillez choisir une adresse de livraison.", [
        { text: "Annuler", style: "cancel" },
        { text: "Choisir", onPress: () => router.push("/profile/addresses?select=1") },
      ]);
      return;
    }
    if (!selectedAddressInZone) {
      Alert.alert("Hors zone de livraison", "Cette adresse est en dehors de notre zone (15 km autour d'Oujda). Choisissez une autre adresse.", [
        { text: "Annuler", style: "cancel" },
        { text: "Changer", onPress: () => router.push("/profile/addresses?select=1") },
      ]);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        clearCart();
        router.replace({ pathname: "/order/[id]", params: { id: String(order.id) } });
      },
      onError: () => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const orderDisabled = createOrder.isPending || (!!address && !selectedAddressInZone);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Cart</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert("Clear cart?", "Remove all items?", [
            { text: "Cancel" },
            { text: "Clear", style: "destructive", onPress: clearCart },
          ]);
        }}>
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120 }}
        bottomOffset={120}
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
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    style={[styles.qtyBtn, { backgroundColor: colors.muted }]}
                  >
                    <Ionicons
                      name={item.quantity === 1 ? "trash-outline" : "remove"}
                      size={16}
                      color={item.quantity === 1 ? colors.destructive : colors.foreground}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.qty, { color: colors.foreground }]}>{item.quantity}</Text>
                  <TouchableOpacity
                    onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cartItemTotal, { color: colors.foreground }]}>
                  {(item.price * item.quantity).toFixed(0)} MAD
                </Text>
              </View>
              {idx < items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* Delivery address — tap to choose from saved addresses */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Adresse de livraison</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/profile/addresses?select=1")}
          style={[styles.addressCard, { backgroundColor: colors.card, borderColor: address ? colors.primary + "40" : colors.border }]}
        >
          <View style={[styles.addressIcon, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.addressTitle, { color: colors.foreground }]}>{address ? "Livraison à" : "Choisir une adresse"}</Text>
            <Text style={[styles.addressValue, { color: address ? colors.foreground : colors.mutedForeground }]} numberOfLines={2}>
              {address || "Sélectionnez une adresse enregistrée ou ajoutez-en une nouvelle"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Notes */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Notes (optional)</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.notesInput, { color: colors.foreground }]}
            placeholder="Any special requests..."
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Order Summary</Text>
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
        {!!address && !selectedAddressInZone && (
          <View style={styles.zoneBlocker}>
            <Ionicons name="warning" size={14} color="#DC2626" />
            <Text style={styles.zoneBlockerText}>Adresse hors de notre zone de livraison</Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.orderBtn,
            {
              backgroundColor: orderDisabled ? colors.muted : colors.primary,
              shadowColor: orderDisabled ? "transparent" : "#E2006A",
            },
          ]}
          onPress={handlePlaceOrder}
          disabled={orderDisabled}
          activeOpacity={0.85}
        >
          {createOrder.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={[styles.orderBtnText, { color: orderDisabled ? colors.mutedForeground : "#fff" }]}>
                {!!address && !selectedAddressInZone ? "Adresse hors zone" : "Commander"}
              </Text>
              {!orderDisabled && (
                <Text style={[styles.orderBtnPrice, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                  {(subtotal + DELIVERY_FEE).toFixed(0)} MAD
                </Text>
              )}
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
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
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
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingHorizontal: 16, marginBottom: 8 },
  addressCard: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14, borderWidth: 1 },
  addressIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  addressTitle: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  addressValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  inputWrap: {
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1,
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  notesInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 40 },
  summary: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  summaryTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  zoneBlocker: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginBottom: 8, paddingHorizontal: 4,
  },
  zoneBlockerText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#DC2626" },
  orderBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    height: 56, borderRadius: 16, paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  orderBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  orderBtnPrice: {
    color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  browseBtn: {
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8,
    shadowColor: "#E2006A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  browseBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
