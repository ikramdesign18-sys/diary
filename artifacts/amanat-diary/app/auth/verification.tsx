import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function VerificationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { account, resendVerification } = useAuth();
  const [message, setMessage] = useState("");

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 24 }]}>
      <View style={[styles.icon, { backgroundColor: colors.moodCalm }]}><Feather name="mail" size={34} color={colors.moodCalmAccent} /></View>
      <Text style={[styles.title, { color: colors.foreground }]}>Verify your email</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>Please verify {account?.email ?? "your email"} to enable secure backup. Your local diary keeps working while you wait.</Text>
      {!!message && <Text style={[styles.message, { color: colors.primary }]}>{message}</Text>}
      <TouchableOpacity onPress={async () => {
        const result = await resendVerification();
        setMessage(result.success ? "Verification email sent." : result.error ?? "Unable to resend.");
      }} style={[styles.primary, { backgroundColor: colors.primary }]}>
        <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Resend Verification Email</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.replace("/(tabs)/profile")} style={[styles.secondary, { borderColor: colors.border }]}>
        <Text style={[styles.secondaryText, { color: colors.primary }]}>Continue in Local Mode</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", gap: 16 },
  icon: { width: 76, height: 76, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 25, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  body: { maxWidth: 360, fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center" },
  message: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  primary: { width: "100%", height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginTop: 8 },
  primaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  secondary: { width: "100%", height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
