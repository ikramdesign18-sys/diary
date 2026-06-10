import { router } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinInput } from "@/components/PinInput";
import { useAppLock } from "@/context/AppLockContext";
import { useColors } from "@/hooks/useColors";

export default function PinSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setupPin } = useAppLock();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleFirst = (pin: string) => {
    setFirstPin(pin);
    setStep("confirm");
  };

  const handleConfirm = async (pin: string) => {
    if (pin === firstPin) {
      await setupPin(pin);
      router.replace("/(onboarding)/backup");
    } else {
      setError(true);
      setTimeout(() => { setError(false); setStep("create"); setFirstPin(""); }, 800);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Text style={styles.icon}>🔒</Text>
      </View>
      <Text style={[styles.heading, { color: colors.foreground }]}>Your diary is private.</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Let's protect it with a PIN.</Text>

      <View style={styles.pinWrap}>
        {step === "create" ? (
          <PinInput
            onComplete={handleFirst}
            title="Create your PIN"
            subtitle="Choose a 4-digit PIN to lock the app"
          />
        ) : (
          <PinInput
            onComplete={handleConfirm}
            title="Confirm your PIN"
            subtitle="Enter the same PIN again"
            error={error}
          />
        )}
      </View>

      <TouchableOpacity
        onPress={() => router.replace("/(onboarding)/backup")}
        style={{ paddingBottom: botPad + 16 }}
      >
        <Text style={[styles.skip, { color: colors.mutedForeground }]}>
          Skip for now (not recommended)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 8,
  },
  icon: { fontSize: 32 },
  heading: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  sub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
    textAlign: "center",
  },
  pinWrap: {
    flex: 1,
    justifyContent: "center",
  },
  skip: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
});
