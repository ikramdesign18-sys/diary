import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack, router, useSegments } from "expo-router";
import { Platform } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DiaryProvider } from "@/context/DiaryContext";
import { AppLockProvider } from "@/context/AppLockContext";
import { AuthProvider } from "@/context/AuthContext";
import { useAppLock } from "@/context/AppLockContext";
import { useDiary } from "@/context/DiaryContext";

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();
const PENDING_NOTIFICATION_ROUTE = "@amanat/pending_notification_route";

function RootLayoutNav() {
  const segments = useSegments();
  const { initialized, hasPin, pinSetupComplete, isLocked } = useAppLock();
  const { settings, loading } = useDiary();
  const route = segments.join("/");

  useEffect(() => {
    if (Platform.OS === "web" || !initialized || loading) return;
    let cleanup: (() => void) | undefined;
    import("expo-notifications").then(Notifications => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
      });
      const openNotification = async (response: Awaited<ReturnType<typeof Notifications.getLastNotificationResponseAsync>>) => {
        if (!response) return;
        const data = response.notification.request.content.data as { futureMessageId?: string; entryId?: string; diaryId?: string };
        const entryId = typeof data.entryId === "string" ? data.entryId : undefined;
        const diaryId = typeof data.diaryId === "string" ? data.diaryId : undefined;
        const futureMessageId = typeof data.futureMessageId === "string" ? data.futureMessageId : undefined;
        const target = entryId && diaryId
          ? `/diary/${encodeURIComponent(diaryId)}/view?entryId=${encodeURIComponent(entryId)}`
          : `/future-messages${futureMessageId ? `?futureMessageId=${encodeURIComponent(futureMessageId)}` : ""}`;
        if (isLocked) {
          await AsyncStorage.setItem(PENDING_NOTIFICATION_ROUTE, target);
          router.replace("/lock");
        } else {
          await AsyncStorage.removeItem(PENDING_NOTIFICATION_ROUTE);
          router.push(target as any);
        }
      };
      Notifications.getLastNotificationResponseAsync().then(response => {
        openNotification(response);
        if (response) Notifications.clearLastNotificationResponseAsync();
      });
      const subscription = Notifications.addNotificationResponseReceivedListener(openNotification);
      cleanup = () => subscription.remove();
    });
    return () => cleanup?.();
  }, [initialized, isLocked, loading]);

  if (!initialized || loading) return null;
  if (!hasPin && !pinSetupComplete && route !== "(onboarding)/pin-setup" && route !== "auth/callback") {
    const returnTo = settings.onboardingComplete ? "home" : "onboarding";
    return <Redirect href={`/(onboarding)/pin-setup?returnTo=${returnTo}` as any} />;
  }
  if (isLocked && route !== "lock" && route !== "auth/callback") return <Redirect href="/lock" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="lock" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="write" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="voice" options={{ presentation: "modal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="search" options={{ presentation: "fullScreenModal", headerShown: false }} />
      <Stack.Screen name="diary/[id]/index" />
      <Stack.Screen name="diary/[id]/view" options={{ animation: "fade" }} />
      <Stack.Screen name="diary/[id]/entry/[entryId]" />
      <Stack.Screen name="future-messages" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="auth/create-account" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="auth/verification" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth/forgot-password" options={{ presentation: "modal", headerShown: false }} />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <DiaryProvider>
                <AppLockProvider>
                  <AuthProvider>
                    <RootLayoutNav />
                  </AuthProvider>
                </AppLockProvider>
              </DiaryProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
