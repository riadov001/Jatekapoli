import React from "react";
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Platform } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useListOrders } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { OrderCard } from "@/components/OrderCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const webTopPad = Platform.OS === "web" ? 67 : 0;

  const { data: orders, isLoading, refetch } = useListOrders(
    user ? { userId: user.id } : undefined,
    { query: { enabled: !!token && !!user, refetchInterval: 30000 } as any }
  );

  const sorted = [...(orders ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 + webTopPad, paddingBottom: 16, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Orders</Text>
      </View>

      {!token ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to see your orders</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your order history will appear here</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="bag-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Your past orders will appear here</Text>
            </View>
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => router.push({ pathname: "/order/[id]", params: { id: String(item.id) } })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, borderBottomWidth: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 12 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
});
