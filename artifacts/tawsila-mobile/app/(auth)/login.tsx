import React, { useState } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSendOtp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const sendOtp = useSendOtp();

  const handleContinue = () => {
    const trimmed = phone.trim();
    if (trimmed.length < 8) {
      setError("Entrez un numéro de téléphone valide");
      return;
    }
    setError("");
    sendOtp.mutate({ data: { phone: trimmed } }, {
      onSuccess: (res) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({ pathname: "/(auth)/otp", params: { phone: trimmed, demoOtp: res.demoOtp ?? "" } });
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.data?.error || "Échec de l'envoi du code. Réessayez.");
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={[styles.logoWrap, { backgroundColor: colors.primary }]}>
          <Ionicons name="bicycle" size={38} color="#fff" />
        </View>
        <Text style={[styles.brand, { color: colors.heading, fontStyle: "italic", letterSpacing: -1 }]}>Jatek.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Livraison express à Oujda
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.foreground }]}>Numéro de téléphone</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border }]}>
            <Text style={[styles.flag, { color: colors.mutedForeground }]}>🇲🇦</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="06 12 34 56 78"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(""); }}
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary, opacity: sendOtp.isPending ? 0.7 : 1 }]}
            onPress={handleContinue}
            disabled={sendOtp.isPending}
            activeOpacity={0.8}
          >
            {sendOtp.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>Continuer</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Nous vous enverrons un code unique pour vérifier votre numéro
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E2006A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    marginTop: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 48,
  },
  form: {
    width: "100%",
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  flag: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  btn: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#E2006A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
});
