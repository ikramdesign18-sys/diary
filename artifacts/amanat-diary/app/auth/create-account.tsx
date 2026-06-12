import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
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

export default function CreateAccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleRegister = async () => {
    if (!email.trim() || !password) { setError("Email and password required."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    const result = await register(email.trim(), password);
    if (result.success) {
      router.replace((result.verificationRequired ? "/auth/verification" : "/(tabs)/profile") as any);
    } else {
      setError(result.error ?? "Registration failed.");
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: topPad + 16, paddingBottom: botPad + 24 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="cloud" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Create Backup Account</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Your diary works without an account. This is only for backup, sync, restore, and future cloud options.
        </Text>

        <View style={styles.form}>
          <TextInput
            value={email} onChangeText={setEmail}
            style={inputStyle} placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address" autoCapitalize="none"
          />
          <TextInput
            value={password} onChangeText={setPassword}
            style={inputStyle} placeholder="Password (min 8 characters)"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />
          <TextInput
            value={confirm} onChangeText={setConfirm}
            style={inputStyle} placeholder="Confirm password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />
        </View>

        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

        <View style={[styles.note, { backgroundColor: colors.moodCalm, borderColor: colors.border }]}>
          <Feather name="mail" size={14} color="#5A8A6A" />
          <Text style={[styles.noteText, { color: "#5A8A6A" }]}>
            You'll receive a verification email. Verify before backup is enabled.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleRegister}
          disabled={saving}
          style={[styles.btn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
            {saving ? "Creating..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={[styles.link, { color: colors.primary }]}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 28, alignItems: "stretch", gap: 16 },
  header: { alignItems: "flex-start" },
  iconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  form: { gap: 12 },
  input: { height: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular" },
  error: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  note: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  btn: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  link: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
});
