import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 18 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.close}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
      <View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="key" size={32} color={colors.primary} /></View>
      <Text style={[styles.title, { color: colors.foreground }]}>Reset backup password</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>We will email a secure password reset link. This does not affect your local diary PIN.</Text>
      <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="Email address" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
      {!!message && <Text style={[styles.message, { color: colors.primary }]}>{message}</Text>}
      <TouchableOpacity onPress={async () => {
        if (!email.trim()) return setMessage("Enter your email address.");
        const result = await resetPassword(email.trim());
        setMessage(result.success ? "Password reset email sent." : result.error ?? "Unable to send reset email.");
      }} style={[styles.primary, { backgroundColor: colors.primary }]}>
        <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Send Reset Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", gap: 16 },
  close: { position: "absolute", top: 68, left: 18, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  icon: { width: 76, height: 76, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  body: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center" },
  input: { width: "100%", height: 52, borderWidth: 1, borderRadius: 13, paddingHorizontal: 15, fontSize: 15, fontFamily: "Inter_400Regular" },
  message: { fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "center" },
  primary: { width: "100%", height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
