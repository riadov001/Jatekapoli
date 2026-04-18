import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Platform } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface RowProps { icon: string; label: string; onPress: () => void; danger?: boolean; }

function Row({ icon, label, onPress, danger }: RowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? colors.destructive + "15" : colors.muted }]}>
        <Ionicons name={icon as any} size={20} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, token } = useAuth();
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  };

  if (!token) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 + webTopPad }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        </View>
        <View style={styles.center}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.muted }]}>
            <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.signInTitle, { color: colors.foreground }]}>Sign in to your account</Text>
          <Text style={[styles.signInSub, { color: colors.mutedForeground }]}>
            Track orders, earn rewards, and more
          </Text>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 + webTopPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
      </View>

      {/* Avatar + info */}
      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarLetter, { color: colors.primary }]}>
            {user?.name?.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.foreground }]}>{user?.name}</Text>
          {user?.phone && (
            <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>{user.phone}</Text>
          )}
          {user?.loyaltyPoints != null && (
            <View style={[styles.pointsBadge, { backgroundColor: colors.accent }]}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={[styles.pointsText, { color: colors.accentForeground }]}>
                {user.loyaltyPoints} pts
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="bag-outline" label="My Orders" onPress={() => router.push("/(tabs)/orders")} />
        <Row icon="location-outline" label="Saved Addresses" onPress={() => {}} />
        <Row icon="gift-outline" label="Rewards & Points" onPress={() => {}} />
        <Row icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <Row icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
        <Row icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  userCard: {
    margin: 16, borderRadius: 16, borderWidth: 1, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 16,
  },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 26, fontFamily: "Inter_700Bold" },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  userPhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  pointsText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  section: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  signInTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  signInSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  signInBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, marginTop: 8, shadowColor: "#E2006A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  signInBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
