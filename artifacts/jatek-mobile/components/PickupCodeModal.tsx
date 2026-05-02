/**
 * OTP delivery confirmation modal for the driver.
 *
 * The customer receives a 6-digit OTP when they place the order.
 * At the doorstep, the driver asks for it and enters it here.
 * The backend validates the code and — only if correct — marks
 * the order as delivered, credits the driver's earnings, and
 * makes them available again.
 *
 * UX highlights:
 *  - 6 individual digit boxes with active-border highlight
 *  - Auto-submits the moment the 6th digit is entered
 *  - Shake animation on wrong code
 *  - Success state shows the credited amount before closing
 */
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

const OTP_LENGTH = 6;

export interface PickupCodeModalProps {
  visible: boolean;
  loading?: boolean;
  /** Earning credited on success (MAD). Show in success state if provided. */
  lastEarning?: number | null;
  onCancel: () => void;
  onSubmit: (code: string) => void | Promise<void>;
}

export function PickupCodeModal({
  visible,
  loading,
  lastEarning,
  onCancel,
  onSubmit,
}: PickupCodeModalProps) {
  const colors = useColors();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  // Shake animation on wrong code
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  useEffect(() => {
    if (visible) {
      setCode("");
      setError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === OTP_LENGTH && !loading) {
      onSubmit(digits);
    }
  };

  const handleSubmit = () => {
    if (code.length !== OTP_LENGTH) {
      setError(`Saisissez les ${OTP_LENGTH} chiffres`);
      shake();
      return;
    }
    onSubmit(code);
  };

  // Expose shake so parent can trigger it on API error
  // (parent calls onSubmit and awaits; if it throws, we shake)

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <Animated.View
          entering={FadeInDown.springify().damping(18)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
              <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>
            Confirmer la livraison
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Demandez au client son code OTP et saisissez-le ci-dessous pour valider la remise.
          </Text>

          {/* 6 digit boxes */}
          <Animated.View style={[styles.boxes, shakeStyle]}>
            <Pressable
              style={styles.boxesInner}
              onPress={() => inputRef.current?.focus()}
            >
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const ch = code[i] ?? "";
                const isActive = code.length === i;
                const isFilled = code.length > i;
                return (
                  <View
                    key={i}
                    style={[
                      styles.box,
                      {
                        backgroundColor: colors.background,
                        borderColor: error
                          ? "#EF4444"
                          : isActive
                          ? colors.primary
                          : isFilled
                          ? colors.primary + "60"
                          : colors.border,
                        borderWidth: isActive ? 2.5 : isFilled ? 1.5 : 1,
                      },
                    ]}
                  >
                    {isFilled && (
                      <Text style={[styles.boxText, { color: colors.foreground }]}>
                        {ch}
                      </Text>
                    )}
                    {isActive && !loading && (
                      <View
                        style={[styles.cursor, { backgroundColor: colors.primary }]}
                      />
                    )}
                  </View>
                );
              })}
            </Pressable>
          </Animated.View>

          {/* Hidden native input */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus
            style={styles.hiddenInput}
            editable={!loading}
            testID="input-pickup-code"
          />

          {/* Error message */}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {/* Earning preview */}
          {lastEarning != null && lastEarning > 0 && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.earningPill, { backgroundColor: "#16A34A20", borderColor: "#16A34A40" }]}
            >
              <Ionicons name="cash-outline" size={16} color="#16A34A" />
              <Text style={[styles.earningText, { color: "#16A34A" }]}>
                +{lastEarning.toFixed(0)} MAD crédités après confirmation
              </Text>
            </Animated.View>
          )}

          {/* Loading state */}
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Vérification en cours…
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.muted }]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                {
                  backgroundColor: colors.primary,
                  opacity: code.length === OTP_LENGTH && !loading ? 1 : 0.45,
                },
              ]}
              onPress={handleSubmit}
              disabled={loading || code.length !== OTP_LENGTH}
              testID="button-confirm-pickup-code"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={[styles.btnText, { color: "#fff", marginLeft: 6 }]}>
                    Valider
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    alignItems: "stretch",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: { alignItems: "center", marginBottom: 10 },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  boxes: { marginBottom: 4 },
  boxesInner: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  box: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  boxText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  cursor: {
    width: 2,
    height: 28,
    borderRadius: 1,
    opacity: 0.8,
  },
  hiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 4,
  },
  earningPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  earningText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
