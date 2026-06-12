import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Email and password required."); return; }
    setSaving(true);
    const result = await login(email.trim(), password);
    if (result.success) {
      router.replace((result.verificationRequired ? "/auth/verification" : "/(tabs)/profile") as any);
    } else {
      setError(result.error ?? "Login failed.");
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }];

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name="log-in" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Login to Backup Account</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Access your cloud backup and synced diaries.
      </Text>

      <View style={styles.form}>
        <TextInput value={email} onChangeText={setEmail} style={inputStyle}
          placeholder="Email address" placeholderTextColor={colors.mutedForeground}
          keyboardType="email-address" autoCapitalize="none" />
        <TextInput value={password} onChangeText={setPassword} style={inputStyle}
          placeholder="Password" placeholderTextColor={colors.mutedForeground} secureTextEntry />
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <TouchableOpacity onPress={handleLogin} disabled={saving}
        style={[styles.btn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
        <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
          {saving ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/auth/forgot-password" as any)}>
        <Text style={[styles.link, { color: colors.mutedForeground }]}>Forgot password?</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/auth/create-account")}>
        <Text style={[styles.link, { color: colors.primary }]}>Don't have an account? Create one</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, gap: 16 },
  header: { alignItems: "flex-start" },
  iconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  form: { gap: 12 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular" },
  error: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  btn: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
