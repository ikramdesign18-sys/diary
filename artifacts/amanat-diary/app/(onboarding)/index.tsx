import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { AmanatIllustration } from "@/components/vector-assets/AmanatIllustration";

const { width } = Dimensions.get("window");

const slides = [
  {
    icon: "book-open" as const,
    illustration: "write-first-memory",
    title: "Your private diary,\nbeautifully kept.",
    subtitle: "Write your thoughts, memories, and feelings in a space that feels truly yours.",
    color: "#C4A55A",
  },
  {
    icon: "mic" as const,
    illustration: "voice-diary",
    title: "Speak, and your voice\nbecomes a page.",
    subtitle: "Record your thoughts and turn them into clean diary entries with voice transcription.",
    color: "#7090A0",
  },
  {
    icon: "layers" as const,
    illustration: "diary-book-pages",
    title: "Create diaries for\nevery part of life.",
    subtitle: "Personal, school, work, dreams, gratitude, travel, and future letters.",
    color: "#709080",
  },
  {
    icon: "book" as const,
    illustration: "photo-memories",
    title: "Relive memories\nlike a real book.",
    subtitle: "Open your diary and swipe through pages just like a real notebook.",
    color: "#A07890",
  },
  {
    icon: "clock" as const,
    illustration: "safe-memories",
    title: "Keep memories safe\nfor the future.",
    subtitle: "Lock your diary, back it up, and schedule selected memories with local reminders.",
    color: "#C08070",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      setActiveIndex(i => i + 1);
    } else {
      router.push("/(onboarding)/pin-setup");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + "10", borderColor: item.color + "25" }]}>
              <AmanatIllustration id={item.illustration} width={210} color={colors.foreground} accent={item.color} />
            </View>
            <Text style={[styles.slideTitle, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
          </View>
        )}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(idx);
        }}
      />

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? colors.primary : colors.border,
                  width: i === activeIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.btn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
            {activeIndex === slides.length - 1 ? "Create My Private Diary" : "Continue"}
          </Text>
          {activeIndex < slides.length - 1 && (
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
        {activeIndex === slides.length - 1 && (
          <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
            No account required. No forced login.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  iconCircle: {
    width: 230,
    height: 170,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.7,
    lineHeight: 36,
  },
  slideSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 20,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 32,
    width: "100%",
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  privacy: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
