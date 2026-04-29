/**
 * usePushNotifications — local push notification support for order status changes.
 *
 * - Requests notification permissions once on mount
 * - Schedules an immediate local notification on each order status transition
 * - Listens for notification taps and navigates to the relevant order screen
 * - Gracefully no-ops on web (notifications API unavailable in Expo web runtime)
 */
import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

const STATUS_LABELS: Record<string, { title: string; body: string }> = {
  accepted:   { title: "Commande acceptée ✅",   body: "Le restaurant a confirmé votre commande." },
  preparing:  { title: "En préparation 🍳",       body: "Le chef est aux fourneaux !" },
  ready:      { title: "Commande prête 🛍️",      body: "Un livreur va bientôt récupérer votre commande." },
  picked_up:  { title: "En route 🛵",              body: "Votre livreur est en chemin vers vous." },
  delivered:  { title: "Commande livrée 🎉",       body: "Bon appétit ! N'oubliez pas de noter votre expérience." },
  cancelled:  { title: "Commande annulée ❌",      body: "Votre commande a été annulée." },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const listenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    })();

    listenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = response.notification.request.content.data?.orderId as number | undefined;
      if (orderId) {
        router.push({ pathname: "/order/[id]", params: { id: String(orderId) } });
      }
    });

    return () => {
      listenerRef.current?.remove();
    };
  }, []);

  const scheduleOrderStatusNotification = useCallback(
    async (status: string, orderId: number) => {
      if (Platform.OS === "web") return;
      const info = STATUS_LABELS[status];
      if (!info) return;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: info.title,
            body: info.body,
            data: { orderId },
            sound: true,
          },
          trigger: null,
        });
      } catch {
      }
    },
    [],
  );

  return { scheduleOrderStatusNotification };
}
