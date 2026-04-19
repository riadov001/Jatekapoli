import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

function NativeTabLayout({ isDriver, isOwner }: { isDriver: boolean; isOwner: boolean }) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Explore</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: "bag", selected: "bag.fill" }} />
        <Label>Mes commandes</Label>
      </NativeTabs.Trigger>
      {isDriver ? (
        <NativeTabs.Trigger name="deliver">
          <Icon sf={{ default: "scooter", selected: "scooter" }} />
          <Label>Livrer</Label>
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="deliver" hidden>
          <Icon sf={{ default: "scooter", selected: "scooter" }} />
          <Label>Livrer</Label>
        </NativeTabs.Trigger>
      )}
      {isOwner ? (
        <NativeTabs.Trigger name="manage">
          <Icon sf={{ default: "storefront", selected: "storefront.fill" }} />
          <Label>Gérer</Label>
        </NativeTabs.Trigger>
      ) : (
        <NativeTabs.Trigger name="manage" hidden>
          <Icon sf={{ default: "storefront", selected: "storefront.fill" }} />
          <Label>Gérer</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout({ isDriver, isOwner }: { isDriver: boolean; isOwner: boolean }) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Inter_700Bold",
          fontSize: 11,
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 8 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : { height: 78 }),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? <SymbolView name={focused ? "square.grid.2x2.fill" : "square.grid.2x2"} tintColor={color} size={24} /> : <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Mes commandes",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? <SymbolView name={focused ? "bag.fill" : "bag"} tintColor={color} size={24} /> : <Ionicons name={focused ? "bag-handle" : "bag-handle-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deliver"
        options={{
          title: "Livrer",
          href: isDriver ? "/deliver" : null,
          tabBarIcon: ({ color, focused }) =>
            isIOS ? <SymbolView name="bicycle" tintColor={color} size={24} /> : <Ionicons name={focused ? "bicycle" : "bicycle-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: "Gérer",
          href: isOwner ? "/manage" : null,
          tabBarIcon: ({ color, focused }) =>
            isIOS ? <SymbolView name={focused ? "storefront.fill" : "storefront"} tintColor={color} size={24} /> : <Ionicons name={focused ? "storefront" : "storefront-outline"} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) =>
            isIOS ? <SymbolView name={focused ? "person.fill" : "person"} tintColor={color} size={24} /> : <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { user } = useAuth();
  const isDriver = user?.role === "driver";
  const isOwner = user?.role === "owner" || user?.role === "restaurant_owner";

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout isDriver={isDriver} isOwner={isOwner} />;
  }
  return <ClassicTabLayout isDriver={isDriver} isOwner={isOwner} />;
}
