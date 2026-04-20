import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, ActivityIndicator, Alert } from "react-native";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { fetchNotifPrefs, updateNotifPrefs, type NotifPrefs } from "@/lib/api";

const ROWS: Array<{ key: keyof NotifPrefs; label: string; desc: string }> = [
  { key: "pushOrders", label: "Suivi de commandes", desc: "Statut, livreur en route, livraison" },
  { key: "pushPromos", label: "Offres & promotions", desc: "Codes promo, ventes flash" },
  { key: "emailReceipts", label: "Reçus par email", desc: "Confirmation de chaque commande" },
  { key: "emailNewsletter", label: "Newsletter", desc: "Nouveaux restos & nouveautés" },
  { key: "smsAlerts", label: "Alertes SMS", desc: "Codes OTP & alertes critiques" },
];

export default function NotificationsScreen() {
  const colors = useColors();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifPrefs().then(setPrefs).catch((e) => Alert.alert("Erreur", e?.message ?? "Impossible de charger.")).finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof NotifPrefs) => {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] } as NotifPrefs;
    setPrefs(next);
    try { await updateNotifPrefs({ [key]: next[key] } as any); }
    catch (e: any) { setPrefs(prefs); Alert.alert("Erreur", e?.message ?? "Échec de la mise à jour."); }
  };

  return (
    <ProfileScreenLayout title="Notifications">
      {loading || !prefs ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <View style={{ padding: 16 }}>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {ROWS.map((r, i) => (
              <View key={r.key as string} style={[styles.row, i < ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.heading }]}>{r.label}</Text>
                  <Text style={[styles.desc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                </View>
                <Switch
                  value={!!prefs[r.key]}
                  onValueChange={() => toggle(r.key)}
                  trackColor={{ false: "#ccc", true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
