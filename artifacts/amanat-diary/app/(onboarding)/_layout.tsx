import { Stack } from "expo-router";
import React from "react";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pin-setup" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="create-diary" />
    </Stack>
  );
}
