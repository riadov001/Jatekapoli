import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { fetchMe } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const AVAILABLE = [
  { code: "JATEK10", label: "10% sur la première commande", desc: "Valide jusqu'au 31 déc." },
  { code: "FREESHIP", label: "Livraison gratuite", desc: "À partir de 80 MAD d'achat" },
  { code: "WEEKEND15", label: "-15% le week-end", desc: "Sam. & dim. uniquement" },
];

export default function CouponsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loyalty, setLoyalty] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((u) => setLoyalty(u?.loyaltyPoints ?? user?.loyaltyPoints ?? 0)).catch(() => setLoyalty(user?.loyaltyPoints ?? 0)).finally(() => setLoading(false));
  }, [user]);

  const apply = () => {
    const found = AVAILABLE.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (found) Alert.alert("Code valide ✓", `${found.label} sera appliqué à votre prochaine commande.`);
    else Alert.alert("Code invalide", "Vérifiez le code et réessayez.");
  };

  return (
    <ProfileScreenLayout title="Bons de réduction">
      <View style={{ padding: 16 }}>
        <View style={[styles.loyalty, { backgroundColor: colors.primary }]}>
          <Ionicons name="gift" size={32} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.loyaltyLabel}>Vos points de fidélité</Text>
            <Text style={styles.loyaltyValue}>{loading ? "…" : `${loyalty} pts`}</Text>
          </View>
        </View>

        <Text style={[styles.section, { color: colors.heading }]}>Saisir un code promo</Text>
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder="JATEK10"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="characters"
            style={{ flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: colors.heading }}
          />
          <TouchableOpacity onPress={apply} style={[styles.applyBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.applyText}>Appliquer</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { color: colors.heading }]}>Codes disponibles</Text>
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {AVAILABLE.map((c) => (
            <View key={c.code} style={[styles.coupon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.couponLeft, { backgroundColor: colors.primary }]}>
                <Text style={styles.couponCode}>{c.code}</Text>
              </View>
              <View style={{ flex: 1, padding: 12 }}>
                <Text style={[styles.couponLabel, { color: colors.heading }]}>{c.label}</Text>
                <Text style={[styles.couponDesc, { color: colors.mutedForeground }]}>{c.desc}</Text>
              </View>
              <TouchableOpacity onPress={() => { setCode(c.code); apply(); }} hitSlop={10} style={{ paddingRight: 12 }}>
                <Ionicons name="copy-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  loyalty: { flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 18 },
  loyaltyLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_500Medium" },
  loyaltyValue: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  section: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 24, marginBottom: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingLeft: 16, paddingRight: 6, height: 56, gap: 8 },
  applyBtn: { paddingHorizontal: 18, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  applyText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  coupon: { flexDirection: "row", alignItems: "stretch", borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden" },
  couponLeft: { width: 90, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  couponCode: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  couponLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  couponDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
