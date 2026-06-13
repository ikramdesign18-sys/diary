import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MoodPicker } from "@/components/MoodPicker";
import { FramedPhotos, PageBackgroundDecorations } from "@/components/PageCustomizationElements";
import { PageCustomizationSheet } from "@/components/PageCustomizationSheet";
import { PageStickerCanvas } from "@/components/PageStickerCanvas";
import { ThemeSelectorSheet } from "@/components/ThemeSelectorSheet";
import { DEFAULT_THEME_ID, getDiaryTheme } from "@/constants/diaryThemes";
import { createPlacedSticker, getMoodStyleSuggestion, getPageBackground, getPageFont, getTextStyle, STICKERS } from "@/constants/pageCustomization";
import { useAppLock } from "@/context/AppLockContext";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { detectThemeForEntry } from "@/services/themeDetectionService";
import { activeEntryLock } from "@/lib/futureMemories";
import type { Entry, Mood } from "@/types";

type WriteCustomization = Pick<Entry, "fontKey" | "backgroundKey" | "stickers" | "photoFrameKey" | "textStyleKey">;
interface WriteImageDraft {
  diaryId: string;
  entryId?: string;
  title: string;
  body: string;
  mood: Mood;
  photos: string[];
  customization: WriteCustomization;
  themeId: string;
  autoTheme: boolean;
  expiresAt: number;
}

const IMAGE_DRAFT_TTL = 2 * 60 * 60 * 1000;

async function readWriteImageDraft(key: string) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as WriteImageDraft;
    if (!draft || draft.expiresAt <= Date.now()) {
      await AsyncStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function WriteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { beginExternalActivity, endExternalActivity } = useAppLock();
  const { diaryId: paramDiaryId, entryId, returnTo } = useLocalSearchParams<{
    diaryId?: string;
    entryId?: string;
    returnTo?: string;
  }>();
  const { diaries, futureMessages, createEntry, getEntries, updateEntry } = useDiary();
  const [diaryId, setDiaryId] = useState(paramDiaryId ?? diaries[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<Mood>("Neutral");
  const [moodPickerVisible, setMoodPickerVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [customizationVisible, setCustomizationVisible] = useState(false);
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [autoTheme, setAutoTheme] = useState(true);
  const [detectingTheme, setDetectingTheme] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [stickerEditing, setStickerEditing] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [pickingImage, setPickingImage] = useState(false);
  const [customization, setCustomization] = useState<WriteCustomization>({
    fontKey: "clean", backgroundKey: "theme", stickers: [], photoFrameKey: "rounded-classic", textStyleKey: "classic",
  });
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageDraftRef = useRef<WriteImageDraft | null>(null);
  const imageDraftSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const imageDraftKey = `@amanat/write_image_draft/${entryId ?? `new-${paramDiaryId ?? "default"}`}`;

  const theme = getDiaryTheme(themeId);
  const customBackground = getPageBackground(customization.backgroundKey);
  const customFont = getPageFont(customization.fontKey);
  const customText = getTextStyle(customization.textStyleKey);
  const pageBg = customization.backgroundKey === "theme" ? theme.paperColor : customBackground.paper;
  const accentColor = customization.backgroundKey === "theme" ? theme.accentColor : customBackground.accent;
  const selectedDiary = diaries.find(d => d.id === diaryId);
  const hasContent = !!body.trim() || !!title.trim() || photos.length > 0 || !!customization.stickers?.length;

  useEffect(() => {
    if (!diaryId && diaries.length > 0) setDiaryId(diaries[0].id);
  }, [diaries]);

  const applyImageDraft = (draft: WriteImageDraft) => {
    setDiaryId(draft.diaryId);
    setTitle(draft.title);
    setBody(draft.body);
    setMood(draft.mood);
    setPhotos(draft.photos);
    setCustomization(draft.customization);
    setThemeId(draft.themeId);
    setAutoTheme(draft.autoTheme);
    imageDraftRef.current = draft;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (paramDiaryId && entryId) {
        const entries = await getEntries(paramDiaryId);
        const existing = entries.find(entry => entry.id === entryId);
        if (!existing || cancelled) return;
        const lock = activeEntryLock(futureMessages, existing.id);
        if (lock) {
          Alert.alert("This memory is sealed", "Unlock it with your PIN from Diary View before editing.");
          router.back();
          return;
        }
        setDiaryId(existing.diaryId);
        setTitle(existing.title);
        setBody(existing.body);
        setMood(existing.mood);
        setPhotos(existing.photos ?? []);
        setCustomization({
          fontKey: existing.fontKey, backgroundKey: existing.backgroundKey, stickers: existing.stickers,
          photoFrameKey: existing.photoFrameKey, textStyleKey: existing.textStyleKey,
        });
        setThemeId(existing.themeId ?? DEFAULT_THEME_ID);
        setAutoTheme(!existing.userOverriddenTheme);
      }
      const draft = await readWriteImageDraft(imageDraftKey);
      if (!cancelled && draft) applyImageDraft(draft);
    };
    load();
    return () => { cancelled = true; };
  }, [entryId, futureMessages, getEntries, imageDraftKey, paramDiaryId]);

  useEffect(() => {
    if (body.length > 0 || title.length > 0) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(() => setSavedAt(new Date()), 3000);
    }
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [body, title]);

  useEffect(() => {
    if (!imageDraftRef.current) return;
    if (imageDraftSaveRef.current) clearTimeout(imageDraftSaveRef.current);
    imageDraftSaveRef.current = setTimeout(() => {
      const draft: WriteImageDraft = {
        diaryId,
        entryId,
        title,
        body,
        mood,
        photos,
        customization,
        themeId,
        autoTheme,
        expiresAt: Date.now() + IMAGE_DRAFT_TTL,
      };
      imageDraftRef.current = draft;
      AsyncStorage.setItem(imageDraftKey, JSON.stringify(draft)).catch(() => {});
    }, 250);
    return () => {
      if (imageDraftSaveRef.current) clearTimeout(imageDraftSaveRef.current);
    };
  }, [autoTheme, body, customization, diaryId, entryId, imageDraftKey, mood, photos, themeId, title]);

  const clearImageDraft = async () => {
    imageDraftRef.current = null;
    if (imageDraftSaveRef.current) clearTimeout(imageDraftSaveRef.current);
    await AsyncStorage.removeItem(imageDraftKey);
  };

  const handleSave = async () => {
    if (!diaryId) {
      Alert.alert("No diary selected", "Please create a diary first.");
      return;
    }
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const detection = autoTheme
      ? await detectThemeForEntry({ title: title.trim(), body: body.trim() })
      : null;
    const resolvedThemeId = detection?.themeId ?? themeId;
    const resolvedMood = detection?.mood ?? mood;
    const resolvedTags = detection?.tags ?? [];
    if (entryId) {
      await updateEntry(diaryId, entryId, {
        title: title.trim(),
        body: body.trim(),
        mood: resolvedMood,
        themeId: resolvedThemeId,
        aiDetectedTheme: detection?.themeId,
        userOverriddenTheme: !autoTheme,
        photos,
        ...customization,
        ...(detection ? { tags: detection.tags } : {}),
      });
      await clearImageDraft();
      router.back();
      return;
    }

    const created = await createEntry({
      diaryId,
      title: title.trim(),
      body: body.trim(),
      mood: resolvedMood,
      tags: resolvedTags,
      themeId: resolvedThemeId,
      aiDetectedTheme: detection?.themeId,
      userOverriddenTheme: !autoTheme,
      isFavorite: false,
      isLocked: false,
      hasVoice: false,
      photos,
      ...customization,
      date: new Date().toISOString(),
    });
    await clearImageDraft();
    if (returnTo === "reader") {
      router.replace(`/diary/${diaryId}/view?entryId=${created.id}` as any);
    } else {
      router.back();
    }
  };

  const attachImage = async () => {
    if (pickingImage) return;
    const draft: WriteImageDraft = {
      diaryId,
      entryId,
      title,
      body,
      mood,
      photos: [...photos],
      customization,
      themeId,
      autoTheme,
      expiresAt: Date.now() + IMAGE_DRAFT_TTL,
    };
    imageDraftRef.current = draft;
    setPickingImage(true);
    beginExternalActivity();
    try {
      await AsyncStorage.setItem(imageDraftKey, JSON.stringify(draft)).catch(() => {});
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      applyImageDraft(imageDraftRef.current ?? draft);
      if (!permission.granted) {
        Alert.alert("Photo access needed", "Photo access is needed to attach an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.9,
      });
      applyImageDraft(imageDraftRef.current ?? draft);
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const source = result.assets[0];
      let savedUri = source.uri;
      if (FileSystem.documentDirectory && !source.uri.startsWith(FileSystem.documentDirectory)) {
        const folder = `${FileSystem.documentDirectory}diary-images`;
        await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
        const extension = source.fileName?.split(".").pop()?.toLowerCase() || source.uri.split(".").pop()?.split("?")[0] || "jpg";
        savedUri = `${folder}/image-${Date.now()}.${extension}`;
        await FileSystem.copyAsync({ from: source.uri, to: savedUri });
      }
      const updatedDraft = { ...draft, photos: [...draft.photos, savedUri], expiresAt: Date.now() + IMAGE_DRAFT_TTL };
      applyImageDraft(updatedDraft);
      await AsyncStorage.setItem(imageDraftKey, JSON.stringify(updatedDraft)).catch(() => {});
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      applyImageDraft(imageDraftRef.current ?? draft);
      Alert.alert("Image could not be added", "Image could not be added. Please try again.");
    } finally {
      setPickingImage(false);
      endExternalActivity();
    }
  };

  const removeImage = (uri: string) => {
    const nextPhotos = photos.filter(photo => photo !== uri);
    setPhotos(nextPhotos);
    if (imageDraftRef.current) {
      const updatedDraft = { ...imageDraftRef.current, photos: nextPhotos, expiresAt: Date.now() + IMAGE_DRAFT_TTL };
      imageDraftRef.current = updatedDraft;
      AsyncStorage.setItem(imageDraftKey, JSON.stringify(updatedDraft)).catch(() => {});
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAutoTheme = async () => {
    setDetectingTheme(true);
    setAutoTheme(true);
    const detection = await detectThemeForEntry({ title, body });
    setThemeId(detection.themeId);
    setMood(detection.mood);
    setDetectingTheme(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const applySuggestedStyle = () => {
    const suggestion = getMoodStyleSuggestion(mood);
    const suggestedSticker = STICKERS.find(item => item.category === suggestion.stickerCategory);
    setCustomization({
      fontKey: suggestion.fontKey,
      backgroundKey: suggestion.backgroundKey,
      photoFrameKey: suggestion.photoFrameKey,
      textStyleKey: suggestion.textStyleKey,
      stickers: suggestedSticker ? [createPlacedSticker(suggestedSticker, 0)] : [],
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      {customization.backgroundKey !== "theme" && <PageBackgroundDecorations backgroundKey={customization.backgroundKey} accent={accentColor} />}
      {customization.backgroundKey === "theme" && theme.lineStyle !== "none" && theme.lineStyle !== "dotted" && (
        <View pointerEvents="none" style={styles.editorLines}>
          {Array.from({ length: 26 }).map((_, line) => <View key={line} style={[styles.editorLine, { backgroundColor: theme.borderColor }]} />)}
        </View>
      )}
      {customization.backgroundKey === "theme" && theme.decorationStyle === "margin" && <View pointerEvents="none" style={[styles.editorMargin, { backgroundColor: theme.accentColor }]} />}
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.topBar, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 8, borderBottomColor: colors.border + "40" }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Diary Selector */}
          {selectedDiary && (
            <View style={[styles.diaryPill, { backgroundColor: colors.border + "60" }]}>
              <Feather name="book-open" size={13} color={colors.mutedForeground} />
              <Text style={[styles.diaryName, { color: colors.mutedForeground }]} numberOfLines={1}>
                {selectedDiary.title}
              </Text>
            </View>
          )}

          <View style={styles.headerRight}>
            {savedAt && (
              <Text style={[styles.savedText, { color: accentColor }]}>Saved</Text>
            )}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !hasContent}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || !hasContent ? 0.4 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>{entryId ? "Update" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.page, { paddingBottom: botPad + 150 }]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!stickerEditing}
          showsVerticalScrollIndicator={false}
        >
          <PageStickerCanvas
            stickers={customization.stickers}
            accent={accentColor}
            editable
            onChange={stickers => setCustomization(current => ({ ...current, stickers }))}
            onEditingChange={setStickerEditing}
          />
          {/* Page Header */}
          <View style={[styles.pageHeader, { borderBottomColor: colors.border + "40" }]}>
            <Text style={[styles.pageDate, { color: accentColor }]}>{formatDate()}</Text>
            <Text style={[styles.pageTime, { color: colors.mutedForeground }]}>{formatTime()}</Text>
          </View>

          <View style={[styles.themePreview, { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor }]}>
            <View style={[styles.themeSwatch, { backgroundColor: theme.paperColor, borderColor: theme.accentColor }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.themeNameRow}>
                <Text style={[styles.themeName, { color: theme.textColor }]}>{theme.name}</Text>
                {autoTheme && <View style={[styles.autoPill, { backgroundColor: theme.accentColor + "18" }]}><Text style={[styles.autoPillText, { color: theme.accentColor }]}>AUTO THEME</Text></View>}
              </View>
              <Text style={[styles.themeDescription, { color: theme.secondaryTextColor }]} numberOfLines={1}>{theme.description}</Text>
            </View>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (optional)"
            placeholderTextColor={colors.border}
            style={[styles.titleInput, { color: theme.textColor, fontFamily: customFont.title }]}
            multiline
            maxLength={80}
          />

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write your thoughts here..."
            placeholderTextColor={colors.border}
            style={[styles.bodyInput, { color: theme.textColor, fontFamily: customFont.body, fontSize: customText.size, lineHeight: customText.lineHeight, textAlign: customText.align }]}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          {!!photos.length && (
            <View style={styles.attachments}>
              <Text style={[styles.attachmentLabel, { color: accentColor }]}>ATTACHED IMAGES</Text>
              <View>
                <FramedPhotos photos={photos} frameKey={customization.photoFrameKey} accent={accentColor} removable onRemove={removeImage} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Toolbar */}
        <View style={[styles.toolbar, { backgroundColor: pageBg + "F0", borderTopColor: colors.border + "40", paddingBottom: botPad + 8 }]}>
          <TouchableOpacity onPress={() => setMoodPickerVisible(true)} activeOpacity={0.65} style={styles.toolBtn}>
            <Feather name="smile" size={20} color={accentColor} />
            <Text style={[styles.toolLabel, { color: accentColor }]}>{mood}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push({ pathname: "/voice", params: { diaryId } })} activeOpacity={0.65} style={styles.toolBtn}>
            <Feather name="mic" size={20} color={colors.mutedForeground} />
            <Text style={[styles.toolLabel, { color: colors.mutedForeground }]}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={attachImage} disabled={pickingImage} activeOpacity={0.65} style={[styles.toolBtn, pickingImage && styles.toolDisabled]}>
            <Feather name="image" size={20} color={photos.length ? accentColor : colors.mutedForeground} />
            <Text style={[styles.toolLabel, { color: photos.length ? accentColor : colors.mutedForeground }]}>{pickingImage ? "Opening…" : photos.length ? `Images (${photos.length})` : "Image"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCustomizationVisible(true)} activeOpacity={0.65} style={styles.toolBtn}>
            <Feather name="sliders" size={20} color={accentColor} />
            <Text style={[styles.toolLabel, { color: accentColor }]}>Style</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.themeTools, { bottom: botPad + 60 }]}>
          <TouchableOpacity onPress={handleAutoTheme} style={[styles.themeTool, { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor }]}>
            <Feather name="zap" size={15} color={theme.accentColor} />
            <Text style={[styles.themeToolText, { color: theme.textColor }]}>{detectingTheme ? "Choosing…" : "Auto Theme"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={applySuggestedStyle} style={[styles.themeTool, { backgroundColor: theme.backgroundColor, borderColor: theme.borderColor }]}>
            <Feather name="heart" size={15} color={theme.accentColor} />
            <Text style={[styles.themeToolText, { color: theme.textColor }]}>Suggested Style</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <MoodPicker
        visible={moodPickerVisible}
        current={mood}
        onSelect={m => { setMood(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        onClose={() => setMoodPickerVisible(false)}
      />
      <ThemeSelectorSheet
        visible={themePickerVisible}
        currentThemeId={themeId}
        autoTheme={autoTheme}
        onClose={() => setThemePickerVisible(false)}
        onApply={selected => {
          setThemeId(selected);
          setAutoTheme(false);
          setThemePickerVisible(false);
        }}
      />
      <PageCustomizationSheet
        visible={customizationVisible}
        value={customization}
        onChange={setCustomization}
        onClose={() => setCustomizationVisible(false)}
        onOpenTheme={() => {
          setCustomizationVisible(false);
          setThemePickerVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  diaryPill: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },
  diaryName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  savedText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  page: { paddingHorizontal: 28, paddingTop: 4, position: "relative", minHeight: 620 },
  pageHeader: { paddingVertical: 16, borderBottomWidth: 1, marginBottom: 16 },
  pageDate: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  pageTime: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  titleInput: {
    fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5,
    marginBottom: 16, minHeight: 36,
  },
  bodyInput: {
    fontSize: 17, fontFamily: "Inter_400Regular", lineHeight: 28,
    minHeight: 300,
  },
  attachments: { gap: 9, marginTop: 20, marginBottom: 8 },
  attachmentLabel: { fontSize: 9, letterSpacing: 0.9, fontFamily: "Inter_700Bold" },
  themePreview: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 14, padding: 11, marginBottom: 18 },
  themeSwatch: { width: 36, height: 42, borderRadius: 5, borderWidth: 1 },
  themeNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  themeName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  themeDescription: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 3 },
  autoPill: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  autoPillText: { fontSize: 7, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  themeTools: { position: "absolute", left: 20, right: 20, flexDirection: "row", gap: 8 },
  themeTool: { flex: 1, height: 40, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  themeToolText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  editorLines: { ...StyleSheet.absoluteFillObject, paddingTop: 190, gap: 28 },
  editorLine: { height: 1, opacity: 0.42 },
  editorMargin: { position: "absolute", top: 0, bottom: 0, left: 22, width: 1, opacity: 0.28 },
  toolbar: {
    flexDirection: "row", paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: 1, gap: 4,
  },
  toolBtn: {
    flex: 1, height: 44, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 4,
  },
  toolDisabled: { opacity: 0.55 },
  toolLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
