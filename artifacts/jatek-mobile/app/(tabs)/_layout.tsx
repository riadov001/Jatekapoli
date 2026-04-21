import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";

const ORANGE = "#F97316";
const INACTIVE = "#9CA3AF";
const TAB_H = Platform.OS === "web" ? 84 : 72;

function HomeTabIcon({ focused }: { focused: boolean }) {
  if (focused) {
    return (
      <View style={s.jBadge}>
        <Text style={s.jBadgeText}>J</Text>
      </View>
    );
  }
  return <Ionicons name="home-outline" size={22} color={INACTIVE} />;
}

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ORANGE,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "#EBEBEB",
          elevation: 8,
          height: TAB_H,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ focused }) => <HomeTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Commandes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bag-handle" : "bag-handle-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="deliver"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="manage"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Compte",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  jBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  jBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
});
