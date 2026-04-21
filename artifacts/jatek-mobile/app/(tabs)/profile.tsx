import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, Platform, Modal, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiBase } from "@/lib/api";
import { WaveEdge } from "@/components/WaveEdge";
import { LinearGradient } from "expo-linear-gradient";

const PINK = "#E91E8C";
const PINK_LIGHT = "#FF5FAD";
const PINK_DEEP = "#C81877";

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

function QuickCard({ icon, label, accent, yellow, onPress }: { icon: string; label: string; accent?: boolean; yellow?: boolean; onPress: () => void }) {
  const colors = useColors();
  const tint = yellow ? colors.yellowForeground : accent ? colors.primary : colors.heading;
  const bg = yellow ? colors.yellowSoft : colors.card;
  const border = yellow ? colors.yellow : colors.border;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.quickCard, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons name={icon as any} size={28} color={tint} />
      <Text style={[styles.quickLabel, { color: tint }]}>{label}</Text>
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

  // GUEST / LOGGED-OUT VIEW
  if (!token) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F8F8F8" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }}
      >
        {/* Gradient hero — invité */}
        <View style={{ position: "relative" }}>
          <LinearGradient
            colors={[PINK_LIGHT, PINK, PINK_DEEP]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.guestHero, { paddingTop: insets.top + 24 + webTopPad }]}
          >
            <Text style={styles.guestEmoji}>🛍️</Text>
            <Text style={styles.guestTitle}>
              Inscris-toi maintenant et fais-toi livrer tes favoris.
            </Text>
          </LinearGradient>
          <WaveEdge color={PINK_DEEP} height={28}
            gradientStops={[{ offset: 0, color: PINK }, { offset: 1, color: PINK_DEEP }]} />
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
          <Row icon="chatbubbles-outline" label="Centre d'aide" onPress={() => router.push("/profile/help" as any)} />
          <Row icon="create-outline" label="Donner mon avis" onPress={() => router.push("/profile/feedback" as any)} />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Légal & Confidentialité</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => router.push("/profile/legal?type=privacy" as any)} />
          <Row icon="server-outline" label="Politique des cookies" onPress={() => router.push("/profile/legal?type=cookies" as any)} />
          <Row icon="document-text-outline" label="Conditions d'utilisation" onPress={() => router.push("/profile/legal?type=terms" as any)} />
          <Row icon="business-outline" label="Mentions légales" onPress={() => router.push("/profile/legal?type=mentions" as any)} />
        </View>
      </ScrollView>
    );
  }

  // LOGGED-IN VIEW
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F8F8F8" }}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Gradient hero — style Talabat Account */}
      <View style={{ position: "relative" }}>
        <LinearGradient
          colors={[PINK_LIGHT, PINK, PINK_DEEP]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.heroPink, { paddingTop: insets.top + 28 + webTopPad }]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name ?? "J").charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.heroHello}>
              {user?.name?.split(" ")[0] ?? "Vous"}
            </Text>
            {user?.email ? (
              <Text style={styles.heroEmail}>{user.email}</Text>
            ) : null}
          </View>
        </LinearGradient>
        <WaveEdge color={PINK_DEEP} height={28}
          gradientStops={[{ offset: 0, color: PINK }, { offset: 1, color: PINK_DEEP }]} />
      </View>

      {/* Floating quick-action cards row */}
      <Animated.View entering={FadeInDown.duration(380)} style={styles.quickRow}>
        <QuickCard icon="heart-outline" label="Favoris" onPress={() => router.push("/profile/favorites" as any)} />
        <QuickCard icon="bag-handle-outline" label="Commandes" onPress={() => router.push("/(tabs)/orders")} />
        <QuickCard icon="gift" label="Récompenses" accent yellow onPress={() => router.push("/profile/coupons" as any)} />
      </Animated.View>

      {/* Jatek+ premium upsell */}
      <Animated.View entering={FadeInDown.delay(80).duration(380)}>
        <TouchableOpacity activeOpacity={0.85} style={[styles.premiumCard, { backgroundColor: "#0A1B3D" }]}>
          <View style={styles.premiumIcon}>
            <Ionicons name="sparkles" size={22} color="#FFD700" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.premiumTitle}>Jatek+ <Text style={{ color: "#FFD700" }}>Essai gratuit</Text></Text>
            <Text style={styles.premiumSub}>Livraison gratuite illimitée et offres exclusives</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Mon activité</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="bag-handle-outline" label="Mes commandes" subtitle="Voir l'historique et le suivi en direct" onPress={() => router.push("/(tabs)/orders")} />
          <Row icon="heart-outline" label="Mes favoris" subtitle="Restos et produits sauvegardés" onPress={() => router.push("/profile/favorites" as any)} />
          <Row icon="repeat-outline" label="Recommander" subtitle="Refaire une commande passée" onPress={() => router.push("/profile/reorder" as any)} />
          <Row icon="star-outline" label="Mes avis" onPress={() => router.push("/profile/reviews" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Gérer le compte</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="person-circle-outline" label="Informations personnelles" subtitle={user?.email ?? "Compte & préférences"} onPress={() => router.push("/profile/info" as any)} />
          <Row icon="card-outline" label="Modes de paiement" subtitle="Cartes, wallets, espèces" onPress={() => router.push("/profile/payments" as any)} />
          <Row icon="location-outline" label="Adresses enregistrées" subtitle="Domicile, travail…" onPress={() => router.push("/profile/addresses" as any)} />
          <Row icon="pricetag-outline" label="Bons de réduction" subtitle="JATEK10 actif" onPress={() => router.push("/profile/coupons" as any)} />
          <Row icon="notifications-outline" label="Notifications" onPress={() => router.push("/profile/notifications" as any)} />
          <Row icon="language-outline" label="Langue & région" subtitle="Français · Maroc" onPress={() => router.push("/profile/language" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Aide & Support</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="chatbubbles-outline" label="Centre d'aide" onPress={() => router.push("/profile/help" as any)} />
          <Row icon="headset-outline" label="Contacter le support" onPress={() => router.push("/profile/support" as any)} />
          <Row icon="create-outline" label="Donner mon avis" onPress={() => router.push("/profile/feedback" as any)} />
          <Row icon="bug-outline" label="Signaler un problème" onPress={() => router.push("/profile/report" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(380)}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Légal & Confidentialité</Text>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Row icon="lock-closed-outline" label="Confidentialité & RGPD" subtitle="Consentements, export, suppression" onPress={() => router.push("/profile/privacy" as any)} />
          <Row icon="shield-checkmark-outline" label="Politique de confidentialité" onPress={() => router.push("/profile/legal?type=privacy" as any)} />
          <Row icon="server-outline" label="Politique des cookies" onPress={() => router.push("/profile/legal?type=cookies" as any)} />
          <Row icon="document-text-outline" label="Conditions d'utilisation" onPress={() => router.push("/profile/legal?type=terms" as any)} />
          <Row icon="business-outline" label="Mentions légales" onPress={() => router.push("/profile/legal?type=mentions" as any)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).duration(380)}>
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 16 }]}>
          <Row icon="log-out-outline" label="Se déconnecter" onPress={handleLogout} danger />
          <Row icon="trash-outline" label="Supprimer mon compte" subtitle="Action irréversible" onPress={() => setDeleteModal(true)} danger />
        </View>
      </Animated.View>

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
  heroPink: { paddingHorizontal: 24, paddingBottom: 28, alignItems: "center" },
  heroTopRow: { alignItems: "center", gap: 10 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  avatarText: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  heroHello: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26, letterSpacing: -0.3, color: "#fff", textAlign: "center" },
  heroEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", textAlign: "center" },
  guestHero: { paddingHorizontal: 24, paddingBottom: 28, alignItems: "center" },
  guestEmoji: { fontSize: 64, marginBottom: 12 },
  guestTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 26, color: "#fff", paddingHorizontal: 8 },
  guestCtaWrap: { paddingHorizontal: 16, marginTop: 16, gap: 10 },

  // Quick action cards
  quickRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: -28 },
  quickCard: { flex: 1, height: 96, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  quickLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center", paddingHorizontal: 4 },

  // Premium upsell card
  premiumCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    marginHorizontal: 16, marginTop: 18, padding: 16, borderRadius: 18,
    shadowColor: "#0A1B3D", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  premiumIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,215,0,0.15)", alignItems: "center", justifyContent: "center" },
  premiumTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  premiumSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Section
  sectionHeader: { fontSize: 18, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginTop: 28, marginBottom: 10 },
  section: { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Buttons
  btnPrimary: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: PINK, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
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
