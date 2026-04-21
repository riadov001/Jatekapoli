import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Modal, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import ProfileScreenLayout from "@/components/ProfileScreenLayout";
import { useColors } from "@/hooks/useColors";
import { listAddresses, createAddress, updateAddress, deleteAddress, type SavedAddress } from "@/lib/api";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useCart } from "@/contexts/CartContext";

export default function AddressesScreen() {
  const colors = useColors();
  const { select, returnTo } = useLocalSearchParams<{ select?: string; returnTo?: string }>();
  const selectMode = select === "1";
  const { setSelectedAddress } = useCart();

  const ALLOWED_RETURN_PATHS = ["/cart", "/(tabs)", "/(tabs)/profile"] as const;
  const pickAddress = (a: SavedAddress) => {
    const full = a.details ? `${a.fullAddress} (${a.details})` : a.fullAddress;
    setSelectedAddress(full);
    const safePath = ALLOWED_RETURN_PATHS.find((p) => p === returnTo) ?? null;
    if (safePath) {
      router.replace(safePath);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/cart");
    }
  };
  const [items, setItems] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [formAddrInZone, setFormAddrInZone] = useState<boolean>(true);
  const [label, setLabel] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [details, setDetails] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await listAddresses()); }
    catch (e: any) { Alert.alert("Erreur", e?.message ?? "Impossible de charger."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setLabel(""); setFullAddress(""); setDetails(""); setIsDefault(items.length === 0); setFormAddrInZone(true); setShowForm(true); };
  const openEdit = (a: SavedAddress) => { setEditing(a); setLabel(a.label); setFullAddress(a.fullAddress); setDetails(a.details ?? ""); setIsDefault(a.isDefault); setFormAddrInZone(true); setShowForm(true); };

  const save = async () => {
    if (!label.trim() || !fullAddress.trim()) { Alert.alert("Champs requis", "Le libellé et l'adresse sont requis."); return; }
    if (!formAddrInZone) { Alert.alert("Hors zone", "Cette adresse est en dehors de notre zone de livraison (15 km autour d'Oujda)."); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateAddress(editing.id, { label: label.trim(), fullAddress: fullAddress.trim(), details: details.trim() || null, isDefault });
        setItems((prev) => prev.map((x) => x.id === updated.id ? updated : (isDefault ? { ...x, isDefault: false } : x)).map((x) => x.id === updated.id ? updated : x));
      } else {
        const created = await createAddress({ label: label.trim(), fullAddress: fullAddress.trim(), details: details.trim() || null, isDefault });
        setItems((prev) => [created, ...prev.map((x) => isDefault ? { ...x, isDefault: false } : x)]);
      }
      setShowForm(false);
    } catch (e: any) { Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer."); }
    finally { setSaving(false); }
  };

  const onDelete = (id: number) => {
    Alert.alert("Supprimer cette adresse ?", "", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: async () => {
        setItems((prev) => prev.filter((x) => x.id !== id));
        try { await deleteAddress(id); } catch { load(); }
      } },
    ]);
  };

  const setAsDefault = async (id: number) => {
    setItems((prev) => prev.map((x) => ({ ...x, isDefault: x.id === id })));
    try { await updateAddress(id, { isDefault: true }); } catch { load(); }
  };

  return (
    <ProfileScreenLayout
      title={selectMode ? "Choisir une adresse" : "Adresses enregistrées"}
      headerRight={<TouchableOpacity onPress={openAdd} hitSlop={10}><Ionicons name="add" size={26} color={colors.primary} /></TouchableOpacity>}
      scroll={false}
    >
      {selectMode && (
        <View style={[styles.selectHint, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.selectHintText, { color: colors.primary }]} numberOfLines={2}>Touchez une adresse pour la sélectionner. Appui long pour modifier.</Text>
        </View>
      )}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {items.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="location-outline" size={64} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.heading }]}>Aucune adresse</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Ajoutez votre domicile, votre travail ou tout autre lieu de livraison.</Text>
            </View>
          ) : items.map((a) => (
            <View key={a.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name={a.label.toLowerCase().includes("dom") ? "home" : a.label.toLowerCase().includes("trav") || a.label.toLowerCase().includes("bur") ? "briefcase" : "location"} size={20} color={colors.primary} />
              </View>
              <TouchableOpacity onPress={() => selectMode ? pickAddress(a) : openEdit(a)} onLongPress={() => openEdit(a)} style={{ flex: 1 }} activeOpacity={0.7}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.title, { color: colors.heading }]}>{a.label}</Text>
                  {a.isDefault && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>Par défaut</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={2}>{a.fullAddress}</Text>
                {a.details ? <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>{a.details}</Text> : null}
              </TouchableOpacity>
              <View style={{ gap: 6 }}>
                {!a.isDefault && (
                  <TouchableOpacity onPress={() => setAsDefault(a.id)} hitSlop={6}>
                    <Ionicons name="star-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => onDelete(a.id)} hitSlop={6}>
                  <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { borderColor: colors.primary }]}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Ajouter une adresse</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.heading }]}>{editing ? "Modifier l'adresse" : "Nouvelle adresse"}</Text>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Libellé</Text>
            <TextInput value={label} onChangeText={setLabel} placeholder="Domicile, Bureau..." placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Adresse complète</Text>
            <AddressAutocomplete value={fullAddress} onChange={setFullAddress} onZoneChange={(inZone) => setFormAddrInZone(inZone)} />
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Détails (étage, code, etc.)</Text>
            <TextInput value={details} onChangeText={setDetails} placeholder="Optionnel" placeholderTextColor={colors.mutedForeground} style={[styles.input, { backgroundColor: colors.card, color: colors.heading, borderColor: colors.border }]} />
            <TouchableOpacity onPress={() => setIsDefault((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
              <Ionicons name={isDefault ? "checkbox" : "square-outline"} size={22} color={isDefault ? colors.primary : colors.mutedForeground} />
              <Text style={{ color: colors.heading, fontSize: 14, fontFamily: "Inter_500Medium" }}>Définir par défaut</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.btn, { backgroundColor: colors.muted, flex: 1 }]}>
                <Text style={[styles.btnText, { color: colors.heading }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={save} disabled={saving} style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, { color: "#fff" }]}>{editing ? "Enregistrer" : "Ajouter"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ProfileScreenLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 12 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  selectHint: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  selectHintText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", marginTop: 8 },
  addBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 14, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: "Inter_400Regular" },
  btn: { height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
