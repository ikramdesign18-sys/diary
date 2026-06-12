import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

function authParams(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  return {
    code: params.get("code"),
    accessToken: hash.get("access_token") ?? params.get("access_token"),
    refreshToken: hash.get("refresh_token") ?? params.get("refresh_token"),
    error: hash.get("error_description") ?? params.get("error_description"),
  };
}

export default function AuthCallbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("Confirming your email…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const complete = async (url: string | null) => {
      if (!active || !supabase || !url) {
        if (active) { setFailed(true); setMessage("Open the verification link again, then sign in."); }
        return;
      }
      try {
        const params = authParams(url);
        if (params.error) throw new Error(params.error);
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.accessToken && params.refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: params.accessToken, refresh_token: params.refreshToken });
          if (error) throw error;
        }
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user?.email_confirmed_at) throw error ?? new Error("Email confirmation is still pending.");
        setMessage("Email verified. Your optional backup account is ready.");
        setTimeout(() => router.replace("/(tabs)/profile"), 800);
      } catch (error) {
        if (__DEV__) console.warn("[auth-callback] Verification failed.", error instanceof Error ? error.message : "Unknown error");
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "Unable to confirm this email link.");
      }
    };
    Linking.getInitialURL().then(complete);
    const subscription = Linking.addEventListener("url", event => complete(event.url));
    return () => { active = false; subscription.remove(); };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: (Platform.OS === "web" ? 50 : insets.top) + 20 }]}>
      <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
        {failed ? <Feather name="alert-circle" size={30} color={colors.destructive} /> : <ActivityIndicator color={colors.primary} />}
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{failed ? "Verification needs attention" : "Verifying your email"}</Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>{message}</Text>
      {failed && <TouchableOpacity onPress={() => router.replace("/auth/login")} style={[styles.button, { backgroundColor: colors.primary }]}><Text style={{ color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }}>Continue to Login</Text></TouchableOpacity>}
      <TouchableOpacity onPress={() => router.replace("/(tabs)/profile")}><Text style={[styles.local, { color: colors.primary }]}>Continue in Local Mode</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 16 },
  icon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", textAlign: "center" },
  button: { width: "100%", height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginTop: 6 },
  local: { fontSize: 13, fontFamily: "Inter_600SemiBold", padding: 10 },
});
