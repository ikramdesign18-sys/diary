import { Feather } from "@expo/vector-icons";
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
  const { verifyPin, unlock, biometricAvailable, tryBiometric } = useAppLock();
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (biometricAvailable) {
      setTimeout(() => tryBiometric().then(ok => { if (ok) router.replace("/(tabs)"); }), 500);
    }
  }, []);

  const handlePin = async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      unlock();
      router.replace("/(tabs)");
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
          title="Enter your PIN"
          subtitle={attempts > 0 ? "Incorrect PIN. Try again." : undefined}
          error={error}
        />
      </View>

      {biometricAvailable && (
        <TouchableOpacity
          onPress={() => tryBiometric().then(ok => { if (ok) router.replace("/(tabs)"); })}
          style={[styles.bioBtn, { borderColor: colors.border }]}
        >
          <Feather name="cpu" size={20} color={colors.primary} />
          <Text style={[styles.bioText, { color: colors.primary }]}>Use Biometric</Text>
        </TouchableOpacity>
      )}
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
});
