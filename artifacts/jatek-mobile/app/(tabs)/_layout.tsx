import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";

const PINK = "#E91E63";
const INACTIVE = "#B5B5B5";
const TAB_H = Platform.OS === "web" ? 84 : 72;

function JatekTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={s.jWrap}>
      <Text style={[s.jWordmark, { color: focused ? PINK : INACTIVE }]}>
        Jatek
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PINK,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 6 },
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "#EBEBEB",
          height: TAB_H,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <JatekTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="restaurants"
        options={{
          title: "Restaurants",
          tabBarIcon: ({ color }) => (
            <Ionicons name="fast-food-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favoris"
        options={{
          title: "Favoris",
          tabBarIcon: ({ color }) => (
            <Ionicons name="heart-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Commandes",
          tabBarIcon: ({ color }) => (
            <Ionicons name="bag-outline" size={24} color={color} />
          ),
        }}
      />
      {/* Hidden screens — kept for navigation but excluded from the tab bar */}
      <Tabs.Screen name="deliver" options={{ href: null }} />
      <Tabs.Screen name="manage" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  jWrap: {
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  jWordmark: {
    fontFamily: "Inter_900Black",
    fontSize: 18,
    fontStyle: "italic",
    letterSpacing: -0.5,
    lineHeight: 22,
  },
});
