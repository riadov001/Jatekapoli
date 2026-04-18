import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Platform, Modal, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiBase } from "@/lib/api";

interface RowProps { icon: string; label: string; onPress: () => void; danger?: boolean; subtitle?: string; }

function Row({ icon, label, onPress, danger, subtitle }: RowProps) {
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
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
        {subtitle && <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, token } = useAuth();
  const webTopPad = Platform.OS === "web" ? 67 : 0;
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Êtes-vous sûr de vouloir vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteModal(false);
        await logout();
        router.replace("/(auth)/login");
      } else {
        Alert.alert("Erreur", "La suppression a échoué. Veuillez réessayer.");
      }
    } catch {
      Alert.alert("Erreur", "Impossible de contacter le serveur.");
    } finally {
      setDeleting(false);
    }
  };

  if (!token) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 + webTopPad }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Profil</Text>
        </View>
        <View style={styles.center}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.muted }]}>
            <Ionicons name="person-outline" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.signInTitle, { color: colors.foreground }]}>Connectez-vous</Text>
          <Text style={[styles.signInSub, { color: colors.mutedForeground }]}>
            Suivez vos commandes, gagnez des points et plus encore
          </Text>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.signInBtnText}>Se connecter</Text>
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
      <View style={[styles.header, { paddingTop: insets.top + 16 + webTopPad, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profil</Text>
      </View>

      {/* Hero card */}
      <View style={[styles.heroCard, { background: "linear-gradient(135deg,#B0004F,#E2006A)" as any }]}>
        <View style={[styles.heroCardInner, { backgroundColor: colors.primary }]}>
          <View style={[styles.avatarCircle, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
            <Text style={styles.avatarLetter}>{user?.name?.charAt(0).toUpperCase() ?? "?"}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userNameHero}>{user?.name}</Text>
            {user?.phone && <Text style={styles.userPhoneHero}>{user.phone}</Text>}
            {user?.loyaltyPoints != null && (
              <View style={styles.pointsBadge}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.pointsText}>{user.loyaltyPoints} pts</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Main menu */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row icon="bag-outline" label="Mes commandes" onPress={() => router.push("/(tabs)/orders")} />
        <Row icon="location-outline" label="Adresses enregistrées" onPress={() => {}} />
        <Row icon="gift-outline" label="Récompenses & Points" onPress={() => {}} />
        <Row icon="notifications-outline" label="Notifications" onPress={() => {}} />
      </View>

      {/* Legal & support */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
        <Row icon="help-circle-outline" label="Aide & Support" onPress={() => {}} />
        <Row icon="document-text-outline" label="Mentions légales" subtitle="CGU, RGPD, confidentialité" onPress={() => {}} />
        <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => {}} />
      </View>

      {/* Danger zone */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
        <Row icon="log-out-outline" label="Se déconnecter" onPress={handleLogout} danger />
        <Row icon="trash-outline" label="Supprimer mon compte" subtitle="Action irréversible" onPress={() => setDeleteModal(true)} danger />
      </View>

      {/* Delete confirmation modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.destructive + "15" }]}>
              <Ionicons name="warning-outline" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Supprimer le compte</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Cette action est définitive et irréversible. Toutes vos données seront effacées dans un délai de 30 jours conformément au RGPD.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.muted }]}
                onPress={() => setDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.destructive }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff" }]}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  heroCard: { margin: 16, borderRadius: 20, overflow: "hidden" },
  heroCardInner: { padding: 20, flexDirection: "row", alignItems: "center", gap: 16, borderRadius: 20 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  userInfo: { flex: 1, gap: 4 },
  userNameHero: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff" },
  userPhoneHero: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  pointsText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#fff" },
  section: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  signInTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  signInSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  signInBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, marginTop: 8, shadowColor: "#E2006A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  signInBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { borderRadius: 20, borderWidth: 1, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", gap: 12 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
