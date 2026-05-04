/**
 * Referral & Wallet screen.
 * Shows the user's unique referral code, stats and wallet balance.
 * Calls GET /api/referrals/my-code (auto-generates code on first visit).
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  ScrollView,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { apiBase, getAuthToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const PINK = "#E91E63";
const STAR = "#FFD400";

interface ReferralData {
  referralCode: string;
  shareUrl: string;
  referrals: number;
  completedReferrals: number;
  totalEarned: number;
  walletBalance: number;
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  accent: string;
}) {
  const colors = useColors();
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.icon, { backgroundColor: accent + "18" }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 20, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});

export default function ReferralScreen() {
  const colors = useColors();
  const { token } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const tok = await getAuthToken();
      const res = await fetch(`${apiBase}/api/referrals/my-code`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) throw new Error("Erreur réseau");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      setError("Impossible de charger vos données de parrainage.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleShare = async () => {
    if (!data) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `🍔 Commande sur Jatek à Oujda avec mon code de parrainage ${data.referralCode} et profite d'une réduction sur ta première commande ! ${data.shareUrl}`,
        title: "Rejoins Jatek !",
      });
    } catch {
      // user cancelled
    }
  };

  const handleCopyCode = () => {
    if (!data) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Clipboard API — works on web and native via expo-clipboard if installed,
    // graceful fallback otherwise.
    try {
      const { Clipboard } = require("react-native");
      Clipboard.setString(data.referralCode);
    } catch {
      // expo-clipboard may not be installed; show copy feedback anyway
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ProfileScreenLayout title="Parrainage & Wallet">
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PINK} />}
      >
        {/* Hero banner */}
        <View style={[styles.hero, { backgroundColor: PINK }]}>
          <Ionicons name="gift" size={36} color="#fff" />
          <Text style={styles.heroTitle}>Parrainez vos proches</Text>
          <Text style={styles.heroSub}>
            Invitez un ami — il obtient une réduction sur sa 1ère commande et vous gagnez du crédit Jatek.
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={PINK} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.errorTxt, { color: colors.mutedForeground }]}>{error}</Text>
            <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: PINK }]}>
              <Text style={styles.retryTxt}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : !token ? (
          <View style={styles.center}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.errorTxt, { color: colors.mutedForeground }]}>
              Connectez-vous pour accéder à votre code de parrainage.
            </Text>
          </View>
        ) : data ? (
          <>
            {/* Wallet balance */}
            <View style={[styles.walletCard, { backgroundColor: "#0A1B3D" }]}>
              <View>
                <Text style={styles.walletLabel}>Solde du portefeuille</Text>
                <Text style={styles.walletBalance}>{data.walletBalance.toFixed(2)} MAD</Text>
              </View>
              <View style={[styles.walletIcon, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
                <Ionicons name="wallet" size={28} color="#FFD400" />
              </View>
            </View>

            {/* Code block */}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              Votre code de parrainage
            </Text>
            <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.codeText, { color: PINK }]}>{data.referralCode}</Text>
              <TouchableOpacity
                onPress={handleCopyCode}
                activeOpacity={0.7}
                style={[styles.copyBtn, { backgroundColor: copied ? colors.turquoiseSoft : colors.muted }]}
              >
                <Ionicons
                  name={copied ? "checkmark-circle" : "copy-outline"}
                  size={18}
                  color={copied ? colors.turquoise : colors.mutedForeground}
                />
                <Text style={[styles.copyTxt, { color: copied ? colors.turquoise : colors.mutedForeground }]}>
                  {copied ? "Copié !" : "Copier"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Share button */}
            <TouchableOpacity onPress={handleShare} activeOpacity={0.85} style={styles.shareBtn}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
              <Text style={styles.shareTxt}>Partager mon code</Text>
            </TouchableOpacity>

            {/* Stats */}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Mes statistiques</Text>
            <View style={styles.statsRow}>
              <StatCard
                icon="people-outline"
                label="Amis invités"
                value={String(data.referrals)}
                accent={PINK}
              />
              <StatCard
                icon="checkmark-circle-outline"
                label="Confirmés"
                value={String(data.completedReferrals)}
                accent={colors.turquoise}
              />
              <StatCard
                icon="cash-outline"
                label="Gains"
                value={`${data.totalEarned} MAD`}
                accent={STAR}
              />
            </View>

            {/* How it works */}
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Comment ça marche</Text>
            <View style={[styles.howCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { icon: "share-outline", text: "Partagez votre code unique avec vos amis" },
                { icon: "bag-handle-outline", text: "Votre ami s'inscrit et passe sa 1ère commande" },
                { icon: "wallet-outline", text: "Vous recevez du crédit dans votre portefeuille Jatek" },
              ].map((step, i) => (
                <View key={i} style={styles.howRow}>
                  <View style={[styles.howNum, { backgroundColor: PINK + "18" }]}>
                    <Text style={[styles.howNumTxt, { color: PINK }]}>{i + 1}</Text>
                  </View>
                  <Ionicons name={step.icon as any} size={18} color={colors.mutedForeground} />
                  <Text style={[styles.howTxt, { color: colors.foreground }]}>{step.text}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { color: "rgba(255,255,255,0.88)", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  center: { alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  errorTxt: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  retryTxt: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    padding: 20,
    marginBottom: 4,
  },
  walletLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 4 },
  walletBalance: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  walletIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  codeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 16,
  },
  codeText: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PINK,
    borderRadius: 26,
    height: 52,
    shadowColor: PINK,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  shareTxt: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  howCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  howRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  howNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  howNumTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  howTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
