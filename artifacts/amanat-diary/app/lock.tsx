import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinInput } from "@/components/PinInput";
import { useAppLock } from "@/context/AppLockContext";
import { useColors } from "@/hooks/useColors";

export default function LockScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { verifyPin, unlock, pinLength, biometricAvailable, biometricEnabled, tryBiometric } = useAppLock();
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const finishUnlock = async () => {
    unlock();
    const pendingRoute = await AsyncStorage.getItem("@amanat/pending_notification_route");
    if (pendingRoute) await AsyncStorage.removeItem("@amanat/pending_notification_route");
    router.replace((pendingRoute || "/(tabs)") as any);
  };

  useEffect(() => {
    if (biometricAvailable && biometricEnabled) {
      setTimeout(() => tryBiometric().then(ok => { if (ok) finishUnlock(); }), 500);
    }
  }, [biometricAvailable, biometricEnabled, tryBiometric]);

  const handlePin = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      await finishUnlock();
    } else {
      setError(true);
      setAttempts(a => a + 1);
      setTimeout(() => setError(false), 600);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 60 }]}>
      <View style={[styles.logoWrap, { backgroundColor: colors.secondary }]}>
        <Feather name="book-open" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.brand, { color: colors.foreground }]}>Amanat Diary</Text>
      <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Your diary is private</Text>

      <View style={styles.pinWrap}>
        <PinInput
          onComplete={handlePin}
          length={pinLength}
          title="Enter your diary PIN"
          subtitle={attempts > 0 ? "Incorrect PIN. Try again." : undefined}
          error={error}
        />
      </View>

      {biometricAvailable && biometricEnabled && (
        <TouchableOpacity
          onPress={() => tryBiometric().then(ok => { if (ok) finishUnlock(); })}
          style={[styles.bioBtn, { borderColor: colors.border }]}
        >
          <Feather name="cpu" size={20} color={colors.primary} />
          <Text style={[styles.bioText, { color: colors.primary }]}>Use Face ID / Fingerprint</Text>
        </TouchableOpacity>
      )}
      <Text style={[styles.forgot, { color: colors.mutedForeground }]}>
        For privacy, your PIN cannot be recovered. You can reset app data only.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  brand: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  pinWrap: {
    marginTop: 16,
  },
  bioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 24,
  },
  bioText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  forgot: { maxWidth: 310, marginTop: 8, paddingHorizontal: 20, textAlign: "center", fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular" },
});
