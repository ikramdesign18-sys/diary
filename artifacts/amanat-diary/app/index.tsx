import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useDiary } from "@/context/DiaryContext";
import { useAppLock } from "@/context/AppLockContext";

export default function Index() {
  const { settings, loading } = useDiary();
  const { isLocked } = useAppLock();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FBF8F3" }}>
        <ActivityIndicator color="#7C5C3E" />
      </View>
    );
  }

  if (isLocked) return <Redirect href="/lock" />;
  if (!settings.onboardingComplete) return <Redirect href="/(onboarding)" />;
  return <Redirect href="/(tabs)" />;
}
