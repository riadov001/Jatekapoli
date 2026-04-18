import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Platform, Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  searchPlaces,
  reverseGeocode,
  checkDeliveryZone,
  PlaceSuggestion,
  MAX_RADIUS_KM,
} from "@/utils/deliveryZone";

interface Props {
  value: string;
  onChange: (address: string) => void;
  onZoneChange?: (inZone: boolean, distanceKm?: number) => void;
}

export function AddressAutocomplete({ value, onChange, onZoneChange }: Props) {
  const colors = useColors();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [zoneInfo, setZoneInfo] = useState<{ inZone: boolean; distanceKm: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const runSearch = useCallback(async (text: string) => {
    if (text.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearching(true);
    try {
      const results = await searchPlaces(text);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    onChange(text);
    setZoneInfo(null);
    onZoneChange?.(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 450);
  };

  const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
    Keyboard.dismiss();
    setShowSuggestions(false);
    setSuggestions([]);

    const addr = [suggestion.shortName, suggestion.secondaryText]
      .filter(Boolean)
      .join(", ");

    setQuery(addr);
    onChange(addr);

    const zone = checkDeliveryZone(suggestion.latitude, suggestion.longitude);
    setZoneInfo(zone);
    onZoneChange?.(zone.inZone, zone.distanceKm);

    if (Platform.OS !== "web") {
      Haptics.impactAsync(
        zone.inZone
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
      );
    }
  };

  const handleUseLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLocating(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });

      const { latitude, longitude } = loc.coords;
      const { address } = await reverseGeocode(latitude, longitude);

      setQuery(address);
      onChange(address);

      const zone = checkDeliveryZone(latitude, longitude);
      setZoneInfo(zone);
      onZoneChange?.(zone.inZone, zone.distanceKm);

      setShowSuggestions(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(
          zone.inZone
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
        );
      }
    } catch {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLocating(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setSuggestions([]);
    setShowSuggestions(false);
    setZoneInfo(null);
    onZoneChange?.(true);
    inputRef.current?.focus();
  };

  const isOutOfZone = zoneInfo !== null && !zoneInfo.inZone;

  return (
    <View>
      {/* Input row */}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.card,
            borderColor: isOutOfZone ? "#EF4444" : zoneInfo?.inZone ? "#22C55E" : colors.border,
            borderWidth: zoneInfo !== null ? 1.5 : 1,
          },
        ]}
      >
        <Ionicons
          name="location"
          size={20}
          color={isOutOfZone ? "#EF4444" : zoneInfo?.inZone ? "#22C55E" : colors.primary}
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground }]}
          placeholder="Enter your delivery address in Oujda"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={handleChangeText}
          multiline={false}
          returnKeyType="search"
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
        />
        {/* Trailing icons */}
        {searching && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        {!searching && query.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleUseLocation}
          disabled={locating}
          hitSlop={8}
          style={[styles.gpsBtn, { backgroundColor: colors.primary + "18" }]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="navigate" size={17} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border, shadowColor: "#000" },
          ]}
        >
          <FlatList
            data={suggestions}
            keyExtractor={(item) => String(item.placeId)}
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View style={[styles.sep, { backgroundColor: colors.border }]} />
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionRow}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.pinIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Ionicons name="location-outline" size={15} color={colors.primary} />
                </View>
                <View style={styles.suggestionText}>
                  <Text style={[styles.suggestionMain, { color: colors.foreground }]} numberOfLines={1}>
                    {item.shortName}
                  </Text>
                  <Text style={[styles.suggestionSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.secondaryText}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Zone status banner */}
      {zoneInfo !== null && (
        <View
          style={[
            styles.zoneBanner,
            {
              backgroundColor: zoneInfo.inZone ? "#DCFCE7" : "#FEE2E2",
              borderColor: zoneInfo.inZone ? "#BBF7D0" : "#FECACA",
            },
          ]}
        >
          <Ionicons
            name={zoneInfo.inZone ? "checkmark-circle" : "warning"}
            size={16}
            color={zoneInfo.inZone ? "#16A34A" : "#DC2626"}
          />
          {zoneInfo.inZone ? (
            <Text style={[styles.zoneText, { color: "#16A34A" }]}>
              ✓ Within delivery zone — {zoneInfo.distanceKm.toFixed(1)} km from city centre
            </Text>
          ) : (
            <Text style={[styles.zoneText, { color: "#DC2626" }]}>
              Outside delivery zone ({zoneInfo.distanceKm.toFixed(1)} km — max {MAX_RADIUS_KM} km). Please choose a closer address.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  gpsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pinIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
    gap: 2,
  },
  suggestionMain: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  suggestionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  zoneBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  zoneText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
