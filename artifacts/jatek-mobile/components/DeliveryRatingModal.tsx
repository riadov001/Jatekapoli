/**
 * DeliveryRatingModal — appears once per order after status reaches "delivered".
 * Lets the user rate the restaurant (required) with an optional text comment.
 * Persists the "already rated" state in AsyncStorage so it only shows once.
 */
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { apiBase, getAuthToken } from "@/lib/api";

const PINK = "#E91E63";
const STAR_ACTIVE = "#FFD400";
const RATED_KEY_PREFIX = "jatek_order_rated_";

interface Props {
  orderId: number;
  restaurantId: number;
  restaurantName: string;
  onClose: () => void;
}

function StarRow({
  value,
  onChange,
  size = 36,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(star);
          }}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={star <= value ? STAR_ACTIVE : "#D1D5DB"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
});

export function DeliveryRatingModal({ orderId, restaurantId, restaurantName, onClose }: Props) {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const key = `${RATED_KEY_PREFIX}${orderId}`;
      const already = await AsyncStorage.getItem(key);
      if (!already) setVisible(true);
    })();
  }, [orderId]);

  const dismiss = async () => {
    const key = `${RATED_KEY_PREFIX}${orderId}`;
    await AsyncStorage.setItem(key, "1");
    setVisible(false);
    onClose();
  };

  const submit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      const token = await getAuthToken();
      await fetch(`${apiBase}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          restaurantId,
          orderId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      const key = `${RATED_KEY_PREFIX}${orderId}`;
      await AsyncStorage.setItem(key, "1");
      setTimeout(() => {
        setVisible(false);
        onClose();
      }, 1600);
    } catch {
      // silently ignore — never block user
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: colors.yellowSoft }]}>
              <Ionicons name="star" size={28} color={STAR_ACTIVE} />
            </View>
            <TouchableOpacity onPress={dismiss} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {done ? (
            <View style={styles.doneWrap}>
              <Ionicons name="checkmark-circle" size={52} color={colors.turquoise} />
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>Merci !</Text>
              <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
                Votre avis aide toute la communauté Jatek 🙌
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Comment était {restaurantName} ?
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Notez votre expérience pour aider les autres utilisateurs
              </Text>

              {/* Stars */}
              <View style={styles.starsWrap}>
                <StarRow value={rating} onChange={setRating} size={40} />
                {rating > 0 && (
                  <Text style={[styles.ratingLabel, { color: STAR_ACTIVE }]}>
                    {["", "Très mauvais", "Mauvais", "Moyen", "Bien", "Excellent !"][rating]}
                  </Text>
                )}
              </View>

              {/* Comment */}
              <TextInput
                style={[styles.commentInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Partagez votre expérience (facultatif)..."
                placeholderTextColor={colors.mutedForeground}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                maxLength={400}
              />

              {/* Actions */}
              <TouchableOpacity
                onPress={submit}
                disabled={rating === 0 || loading}
                activeOpacity={0.85}
                style={[
                  styles.submitBtn,
                  { backgroundColor: rating === 0 ? colors.muted : PINK },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.submitTxt, { color: rating === 0 ? colors.mutedForeground : "#fff" }]}>
                    Envoyer mon avis
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={dismiss} activeOpacity={0.7} style={styles.skipBtn}>
                <Text style={[styles.skipTxt, { color: colors.mutedForeground }]}>
                  Passer
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginBottom: 4,
  },
  starsWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  ratingLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  commentInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 4,
    marginBottom: 8,
  },
  submitBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PINK,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitTxt: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipTxt: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  doneWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  doneTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  doneSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
