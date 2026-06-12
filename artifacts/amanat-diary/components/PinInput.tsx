import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  title?: string;
  subtitle?: string;
  error?: boolean;
  compact?: boolean;
}

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

export function PinInput({ length = 4, onComplete, title, subtitle, error, compact = false }: PinInputProps) {
  const colors = useColors();
  const [pin, setPin] = useState("");
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(-12, { duration: 60 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
      setPin("");
    }
  }, [error]);

  const dotsStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const handleKey = (key: string) => {
    if (key === "⌫") {
      setPin(p => p.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (key === "") {
      return;
    } else if (pin.length < length) {
      const newPin = pin + key;
      setPin(newPin);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (newPin.length === length) {
        setTimeout(() => { onComplete(newPin); setPin(""); }, 150);
      }
    }
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {title && <Text style={[styles.title, compact && styles.compactTitle, { color: colors.foreground }]}>{title}</Text>}
      {subtitle && <Text style={[styles.subtitle, compact && styles.compactSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>}
      <Animated.View style={[styles.dots, compact && styles.compactDots, dotsStyle]}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              compact && styles.compactDot,
              {
                backgroundColor: i < pin.length ? colors.primary : "transparent",
                borderColor: error ? colors.destructive : i < pin.length ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </Animated.View>
      <View style={[styles.keypad, compact && styles.compactKeypad]}>
        {KEYS.map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.key, compact && styles.compactKey, { backgroundColor: key === "" ? "transparent" : colors.secondary }]}
            onPress={() => handleKey(key)}
            disabled={key === ""}
            activeOpacity={0.6}
          >
            <Text style={[styles.keyText, compact && styles.compactKeyText, { color: key === "⌫" ? colors.mutedForeground : colors.foreground }]}>
              {key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 32,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: -20,
  },
  dots: {
    flexDirection: "row",
    gap: 20,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: 280,
    gap: 16,
    justifyContent: "center",
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 24,
    fontFamily: "Inter_400Regular",
  },
  compactContainer: {
    gap: 18,
  },
  compactTitle: {
    fontSize: 20,
  },
  compactSubtitle: {
    fontSize: 13,
    marginTop: -10,
  },
  compactDots: {
    gap: 16,
    marginVertical: 2,
  },
  compactDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  compactKeypad: {
    width: 238,
    gap: 10,
  },
  compactKey: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  compactKeyText: {
    fontSize: 21,
  },
});
