import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CookieConsentBanner from "@/components/CookieConsentBanner";

// Configure the API base URL — fail loud if the deployment forgot to inject
// EXPO_PUBLIC_DOMAIN, otherwise the entire app would silently 404 every call.
const apiDomain = process.env.EXPO_PUBLIC_DOMAIN;
if (!apiDomain) {
  console.warn(
    "[Boot] EXPO_PUBLIC_DOMAIN is not set — API calls will fail. " +
    "Check the deployment env vars.",
  );
}
setBaseUrl(`https://${apiDomain ?? "missing-domain"}`);

// Prevent the splash screen from auto-hiding before asset loading is complete.
// Wrap in try/catch — on web (and some Expo Go reloads) preventAutoHideAsync
// can reject with "Splash screen module is not available", which would crash
// the JS bundle before any UI ever renders → infinite blue splash.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="restaurant/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="cart" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashHidden, setSplashHidden] = React.useState(false);

  // Hide the splash as soon as fonts are ready OR a 1.5 s safety timeout
  // elapses — whichever comes first. Without this fallback, a slow / blocked
  // Google Fonts CDN response would leave the splash visible forever
  // (the "écran bleu" production crash on Expo Go).
  useEffect(() => {
    let cancelled = false;
    const hide = () => {
      if (cancelled) return;
      cancelled = true;
      setSplashHidden(true);
      SplashScreen.hideAsync().catch(() => {});
    };
    if (fontsLoaded || fontError) {
      hide();
      return;
    }
    const timer = setTimeout(hide, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fontsLoaded, fontError]);

  // Render the tree even if fonts aren't ready yet — system fonts will be
  // used as a fallback, and Inter swaps in once it loads. Returning null
  // here was the root cause of the splash hang in production.
  if (!splashHidden && !fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <LanguageProvider>
              <CartProvider>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <RootLayoutNav />
                    <CookieConsentBanner />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </CartProvider>
            </LanguageProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
