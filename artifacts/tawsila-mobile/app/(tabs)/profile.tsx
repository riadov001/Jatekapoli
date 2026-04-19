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
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={[styles.row, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon as any} size={22} color={danger ? colors.destructive : colors.heading} />
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.heading }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

function QuickCard({ icon, label, accent, onPress }: { icon: string; label: string; accent?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Ionicons name={icon as any} size={28} color={accent ? colors.primary : colors.heading} />
      <Text style={[styles.quickLabel, { color: accent ? colors.primary : colors.heading }]}>{label}</Text>
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
      { text: "Se déconnecter", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/welcome"); } },
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/me`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setDeleteModal(false);
        await logout();
        router.replace("/(auth)/welcome");
      } else { Alert.alert("Erreur", "La suppression a échoué. Veuillez réessayer."); }
    } catch { Alert.alert("Erreur", "Impossible de contacter le serveur."); }
    finally { setDeleting(false); }
  };

  // GUEST / LOGGED-OUT VIEW (Flink style)
  if (!token) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }}
      >
        {/* Pink hero card with "Sign up" promo */}
        <View style={[styles.guestHero, { backgroundColor: colors.pinkBg, paddingTop: insets.top + 24 + webTopPad }]}>
          <Text style={styles.guestEmoji}>🛍️</Text>
          <Text style={[styles.guestTitle, { color: colors.heading }]}>
            Inscris-toi maintenant et fais-toi livrer tes favoris.
          </Text>
        </View>

        <View style={styles.guestCtaWrap}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Créer un compte</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSoft, { backgroundColor: colors.primarySoft }]}
            onPress={() => router.push("/(auth)/login")}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSoftText, { color: colors.primary }]}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Aide & Support</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="chatbubbles-outline" label="Centre d'aide" onPress={() => {}} />
          <Row icon="create-outline" label="Donner mon avis" onPress={() => {}} />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Légal & Confidentialité</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => {}} />
          <Row icon="document-text-outline" label="Conditions d'utilisation" onPress={() => {}} />
          <Row icon="business-outline" label="Mentions légales" onPress={() => {}} />
        </View>
      </ScrollView>
    );
  }

  // LOGGED-IN VIEW (Flink "Welcome back" style)
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Pink hero "Welcome back" */}
      <View style={[styles.heroPink, { backgroundColor: colors.pinkBg, paddingTop: insets.top + 28 + webTopPad }]}>
        <Text style={[styles.heroHello, { color: colors.primary }]}>
          Bon retour,{"\n"}{user?.name?.split(" ")[0] ?? "vous"}
        </Text>
      </View>

      {/* Floating quick-action cards row */}
      <View style={styles.quickRow}>
        <QuickCard icon="heart-outline" label="Mes favoris" onPress={() => {}} />
        <QuickCard icon="bag-handle-outline" label="Commandes" onPress={() => router.push("/(tabs)/orders")} />
        <QuickCard icon="gift" label="Gagner pts" accent onPress={() => {}} />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.heading }]}>Gérer le compte</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row icon="person-circle-outline" label="Compte & préférences" onPress={() => {}} />
        <Row icon="card-outline" label="Modes de paiement" onPress={() => {}} />
        <Row icon="location-outline" label="Adresses enregistrées" onPress={() => {}} />
        <Row icon="pricetag-outline" label="Bons de réduction" onPress={() => {}} />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.heading }]}>Aide & Support</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row icon="chatbubbles-outline" label="Centre d'aide" onPress={() => {}} />
        <Row icon="create-outline" label="Donner mon avis" onPress={() => {}} />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.heading }]}>Légal & Confidentialité</Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => {}} />
        <Row icon="document-text-outline" label="Conditions d'utilisation" onPress={() => {}} />
        <Row icon="business-outline" label="Mentions légales" onPress={() => {}} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, marginTop: 16 }]}>
        <Row icon="log-out-outline" label="Se déconnecter" onPress={handleLogout} danger />
        <Row icon="trash-outline" label="Supprimer mon compte" subtitle="Action irréversible" onPress={() => setDeleteModal(true)} danger />
      </View>

      <Text style={[styles.versionText, { color: colors.mutedForeground }]}>2026.04.0</Text>

      {/* Delete confirmation modal */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.destructive + "15" }]}>
              <Ionicons name="warning-outline" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.heading }]}>Supprimer le compte</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              Cette action est définitive et irréversible. Toutes vos données seront effacées dans un délai de 30 jours conformément au RGPD.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.muted }]} onPress={() => setDeleteModal(false)} disabled={deleting}>
                <Text style={[styles.modalBtnText, { color: colors.heading }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.destructive }]} onPress={handleDeleteAccount} disabled={deleting}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.modalBtnText, { color: "#fff" }]}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Hero
  heroPink: { paddingHorizontal: 24, paddingBottom: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroHello: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34, letterSpacing: -0.5 },
  guestHero: { paddingHorizontal: 24, paddingBottom: 32, alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  guestEmoji: { fontSize: 64, marginBottom: 12 },
  guestTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 28, paddingHorizontal: 8 },
  guestCtaWrap: { paddingHorizontal: 16, marginTop: 16, gap: 10 },

  // Quick action cards
  quickRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: -28 },
  quickCard: { flex: 1, height: 96, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  quickLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingHorizontal: 4 },

  // Section
  sectionHeader: { fontSize: 18, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginTop: 28, marginBottom: 10 },
  section: { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Buttons
  btnPrimary: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#E2006A", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  btnSoft: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  btnSoftText: { fontSize: 16, fontFamily: "Inter_700Bold" },

  versionText: { textAlign: "center", marginTop: 24, fontSize: 12, fontFamily: "Inter_400Regular" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { borderRadius: 20, borderWidth: 1, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", gap: 12 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
