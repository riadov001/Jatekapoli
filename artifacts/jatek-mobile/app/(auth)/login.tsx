import React, { useState } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSendOtp } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CountryPickerModal } from "@/components/CountryPickerModal";
import { DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { useT } from "@/contexts/LanguageContext";

type Channel = "sms" | "whatsapp";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [error, setError] = useState("");
  const sendOtp = useSendOtp();

  const fullPhone = `${country.dialCode}${phone.replace(/^0+/, "").replace(/\s/g, "")}`;

  const handleContinue = () => {
    const local = phone.trim().replace(/\s/g, "");
    if (local.length < 5) {
      setError(t("login_phone_error"));
      return;
    }
    setError("");
    sendOtp.mutate({ data: { phone: fullPhone, channel } as any }, {
      onSuccess: (res) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push({
          pathname: "/(auth)/otp",
          params: { phone: fullPhone, demoOtp: (res as any).demoOtp ?? "", channel },
        });
      },
      onError: (err: any) => {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err?.data?.error || t("login_send_fail"));
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
        {/* Logo with pink->turquoise gradient hero */}
        <LinearGradient
          colors={[colors.primary, colors.turquoise]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoWrap}
        >
          <Ionicons name="bicycle" size={38} color="#fff" />
        </LinearGradient>
        <Text style={[styles.brand, { color: colors.heading, fontStyle: "italic", letterSpacing: -1 }]}>Jatek.</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t("login_subtitle")}
        </Text>

        <View style={styles.form}>
          {/* Channel selector */}
          <Text style={[styles.label, { color: colors.foreground }]}>{t("login_channel_label")}</Text>
          <View style={[styles.channelRow, { backgroundColor: colors.muted, borderRadius: 14 }]}>
            <TouchableOpacity
              style={[
                styles.channelBtn,
                channel === "whatsapp" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
              ]}
              onPress={() => setChannel("whatsapp")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="logo-whatsapp"
                size={20}
                color={channel === "whatsapp" ? "#25D366" : colors.mutedForeground}
              />
              <Text style={[styles.channelLabel, { color: channel === "whatsapp" ? colors.foreground : colors.mutedForeground }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.channelBtn,
                channel === "sms" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
              ]}
              onPress={() => setChannel("sms")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color={channel === "sms" ? colors.primary : colors.mutedForeground}
              />
              <Text style={[styles.channelLabel, { color: channel === "sms" ? colors.foreground : colors.mutedForeground }]}>
                SMS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Phone number */}
          <Text style={[styles.label, { color: colors.foreground }]}>{t("login_phone_label")}</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border }]}>
            {/* Country code picker */}
            <TouchableOpacity
              style={[styles.dialCodeBtn, { borderRightColor: colors.border }]}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dialCodeText, { color: colors.foreground }]}>{country.dialCode}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="6 12 34 56 78"
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
            style={[styles.btn, { backgroundColor: channel === "whatsapp" ? "#25D366" : colors.primary, opacity: sendOtp.isPending ? 0.7 : 1 }]}
            onPress={handleContinue}
            disabled={sendOtp.isPending}
            activeOpacity={0.8}
          >
            {sendOtp.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={channel === "whatsapp" ? "logo-whatsapp" : "chatbubble-ellipses-outline"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.btnText}>
                  {channel === "whatsapp" ? t("login_send_whatsapp") : t("login_send_sms")}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          {channel === "whatsapp" ? t("login_hint_whatsapp") : t("login_hint_sms")}
        </Text>
      </ScrollView>

      <CountryPickerModal
        visible={showPicker}
        selected={country}
        onSelect={setCountry}
        onClose={() => setShowPicker(false)}
      />
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
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#E2006A", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  brand: {
    fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 16, letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, marginBottom: 36,
  },
  form: { width: "100%", gap: 10 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 2 },
  channelRow: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
  },
  channelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 11,
  },
  channelLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    height: 54,
    overflow: "hidden",
  },
  dialCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    height: "100%",
    borderRightWidth: 1,
  },
  dialCodeText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 14,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  btn: {
    height: 54, borderRadius: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  hint: {
    fontSize: 13, fontFamily: "Inter_400Regular",
    textAlign: "center", marginTop: 28, paddingHorizontal: 16, lineHeight: 20,
  },
});
