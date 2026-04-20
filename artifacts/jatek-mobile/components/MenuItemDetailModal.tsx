import React, { useEffect, useState } from "react";
import {
  Modal, StyleSheet, Text, View, TouchableOpacity, Image,
  ScrollView, Pressable, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

interface MenuItem {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
}

interface Props {
  visible: boolean;
  item: MenuItem | null;
  initialQty?: number;
  onClose: () => void;
  onAdd: (qty: number) => void;
}

export function MenuItemDetailModal({ visible, item, initialQty = 0, onClose, onAdd }: Props) {
  const colors = useColors();
  const [qty, setQty] = useState(Math.max(1, initialQty));

  useEffect(() => {
    if (visible) setQty(Math.max(1, initialQty));
  }, [visible, initialQty]);

  if (!item) return null;

  const inc = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setQty((q) => q + 1);
  };
  const dec = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setQty((q) => Math.max(1, q - 1));
  };
  const handleAdd = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdd(qty);
    onClose();
  };

  const total = item.price * qty;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View entering={SlideInDown.duration(280)} style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Close handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Image */}
            <View style={styles.imageWrap}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.imagePh, { backgroundColor: colors.muted }]}>
                  <Ionicons name="fast-food-outline" size={56} color={colors.mutedForeground} />
                </View>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color="#0A1B3D" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.body}>
              <Text style={[styles.name, { color: colors.heading }]}>{item.name}</Text>
              <Text style={[styles.price, { color: colors.primary }]}>{item.price.toFixed(0)} MAD</Text>
              {item.description ? (
                <Text style={[styles.desc, { color: colors.mutedForeground }]}>{item.description}</Text>
              ) : (
                <Text style={[styles.desc, { color: colors.mutedForeground }]}>
                  Préparé avec soin par le restaurant. Livré chaud chez vous en quelques minutes.
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Bottom action bar */}
          <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            <View style={[styles.qtyBox, { backgroundColor: colors.muted }]}>
              <TouchableOpacity onPress={dec} hitSlop={6} style={styles.qtyBtn}>
                <Ionicons name="remove" size={20} color={colors.heading} />
              </TouchableOpacity>
              <Text style={[styles.qtyVal, { color: colors.heading }]}>{qty}</Text>
              <TouchableOpacity onPress={inc} hitSlop={6} style={styles.qtyBtn}>
                <Ionicons name="add" size={20} color={colors.heading} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.85}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addBtnText}>Ajouter au panier</Text>
              <Text style={styles.addBtnPrice}>{total.toFixed(0)} MAD</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleWrap: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  handle: { width: 44, height: 4, borderRadius: 2 },

  imageWrap: { width: "100%", height: 240, position: "relative" },
  image: { width: "100%", height: "100%" },
  imagePh: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },

  body: { padding: 20, gap: 8, paddingBottom: 16 },
  name: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.4, lineHeight: 30 },
  price: { fontSize: 20, fontFamily: "Inter_700Bold" },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 6 },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 6,
    height: 56,
    gap: 4,
  },
  qtyBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  qtyVal: { fontSize: 17, fontFamily: "Inter_700Bold", minWidth: 24, textAlign: "center" },

  addBtn: {
    flex: 1,
    height: 56,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    shadowColor: "#E2006A",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  addBtnPrice: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", opacity: 0.95 },
});
