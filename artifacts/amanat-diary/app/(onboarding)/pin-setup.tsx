import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PinInput } from "@/components/PinInput";
import { useAppLock } from "@/context/AppLockContext";
import { useColors } from "@/hooks/useColors";

export default function PinSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { setupPin, skipPinSetup, biometricAvailable, setBiometricEnabled } = useAppLock();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [length, setLength] = useState<4 | 6>(4);
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
      const finish = () => router.replace(returnTo === "home" ? "/(tabs)" : returnTo === "privacy" ? "/settings/privacy" : "/(onboarding)/backup");
      if (!biometricAvailable) {
        finish();
        return;
      }
      Alert.alert("Faster private access", "Enable Face ID / Fingerprint for faster unlock?", [
        { text: "Not now", style: "cancel", onPress: finish },
        {
          text: "Enable",
          onPress: async () => {
            await setBiometricEnabled(true, pin);
            finish();
          },
        },
      ]);
    } else {
      setError(true);
      setTimeout(() => { setError(false); setStep("create"); setFirstPin(""); }, 800);
    }
  };

  const skip = async () => {
    await skipPinSetup();
    Alert.alert("App lock is off", "You can protect your diary later from Profile.", [
      { text: "Continue", onPress: () => router.replace(returnTo === "home" ? "/(tabs)" : "/(onboarding)/backup") },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
        <Text style={styles.icon}>🔒</Text>
      </View>
      <Text style={[styles.heading, { color: colors.foreground }]}>Your diary is private.</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>Let's protect it with a PIN.</Text>

      <View style={styles.pinWrap}>
        {step === "create" && (
          <View style={[styles.lengthPicker, { backgroundColor: colors.secondary }]}>
            {[4, 6].map(option => (
              <TouchableOpacity
                key={option}
                onPress={() => setLength(option as 4 | 6)}
                style={[styles.lengthOption, { backgroundColor: length === option ? colors.card : "transparent" }]}
              >
                <Text style={[styles.lengthText, { color: length === option ? colors.primary : colors.mutedForeground }]}>{option}-digit</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {step === "create" ? (
          <PinInput
            onComplete={handleFirst}
            length={length}
            title="Create your PIN"
            subtitle={`Choose a ${length}-digit PIN to lock the app`}
          />
        ) : (
          <PinInput
            onComplete={handleConfirm}
            length={length}
            title="Confirm your PIN"
            subtitle="Enter the same PIN again"
            error={error}
          />
        )}
      </View>

      <Text style={[styles.privateNote, { color: colors.mutedForeground, paddingBottom: botPad + 16 }]}>
        Your PIN is hashed and stored securely on this device.
      </Text>
      {returnTo !== "privacy" && step === "create" && (
        <TouchableOpacity onPress={skip} style={[styles.skip, { borderColor: colors.border }]}>
          <Text style={[styles.skipText, { color: colors.primary }]}>Skip for now</Text>
          <Text style={[styles.skipNote, { color: colors.mutedForeground }]}>You can protect your diary later from Profile.</Text>
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
  lengthPicker: { flexDirection: "row", alignSelf: "center", borderRadius: 18, padding: 3, marginBottom: 18 },
  lengthOption: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 15 },
  lengthText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  privateNote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  skip: { marginBottom: 18, borderTopWidth: 1, paddingTop: 13, alignItems: "center", gap: 3 },
  skipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  skipNote: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
