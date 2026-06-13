import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { FramedPhotos, PageBackgroundDecorations } from "@/components/PageCustomizationElements";
import { PageStickerCanvas } from "@/components/PageStickerCanvas";
import { ThemeSelectorSheet } from "@/components/ThemeSelectorSheet";
import { PinConfirmModal } from "@/components/PinConfirmModal";
import { VoicePlayer } from "@/components/VoicePlayer";
import { getDiaryTheme } from "@/constants/diaryThemes";
import { getPageBackground, getPageFont, getTextStyle } from "@/constants/pageCustomization";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import { entryMatchesQuery, formatEntryShareText, shareEntry, sortEntriesByPage } from "@/lib/diary";
import { exportEntriesPdf } from "@/services/pdfExportService";
import { activeEntryLock, formatFutureDate } from "@/lib/futureMemories";
import { cancelFutureNotification } from "@/services/futureNotificationService";
import type { Entry } from "@/types";

function ReaderPage({
  entry,
  total,
  width,
  controlsVisible,
  onToggleControls,
  onLongPress,
  lockedUntil,
}: {
  entry: Entry;
  total: number;
  width: number;
  controlsVisible: boolean;
  onToggleControls: () => void;
  onLongPress: () => void;
  lockedUntil?: string;
}) {
  const colors = useColors();
  const theme = getDiaryTheme(entry.themeId);
  const customBackground = getPageBackground(entry.backgroundKey);
  const customFont = getPageFont(entry.fontKey);
  const customText = getTextStyle(entry.textStyleKey);
  const paper = entry.backgroundKey && entry.backgroundKey !== "theme" ? customBackground.paper : theme.paperColor;
  const accent = entry.backgroundKey && entry.backgroundKey !== "theme" ? customBackground.accent : theme.accentColor;
  const date = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const time = new Date(entry.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  return (
    <View style={{ width, flex: 1, paddingHorizontal: width > 700 ? 80 : 14, paddingVertical: controlsVisible ? 8 : 18 }}>
      <Pressable onPress={onToggleControls} onLongPress={onLongPress} delayLongPress={450} style={[styles.paper, { backgroundColor: paper }]}>
        {entry.backgroundKey && entry.backgroundKey !== "theme"
          ? <PageBackgroundDecorations backgroundKey={entry.backgroundKey} accent={accent} />
          : theme.lineStyle !== "none" && theme.lineStyle !== "dotted" && (
          <View pointerEvents="none" style={styles.pageLines}>
            {Array.from({ length: 24 }).map((_, line) => (
              <View
                key={line}
                style={[
                  styles.pageLine,
                  { backgroundColor: theme.borderColor, opacity: theme.lineStyle === "dotted" ? 0.35 : 0.48 },
                ]}
              />
            ))}
          </View>
        )}
        {(!entry.backgroundKey || entry.backgroundKey === "theme") && theme.patternType === "dots" && (
          <View pointerEvents="none" style={styles.dotGrid}>
            {Array.from({ length: 96 }).map((_, dot) => <View key={dot} style={[styles.pageDot, { backgroundColor: theme.borderColor }]} />)}
          </View>
        )}
        {(!entry.backgroundKey || entry.backgroundKey === "theme") && (theme.patternType === "letter" || theme.patternType === "postcard") && (
          <View pointerEvents="none" style={[styles.insetBorder, { borderColor: theme.borderColor, borderStyle: theme.patternType === "postcard" ? "dashed" : "solid" }]} />
        )}
        {(!entry.backgroundKey || entry.backgroundKey === "theme") && theme.decorationStyle === "margin" && <View pointerEvents="none" style={[styles.marginRule, { backgroundColor: accent }]} />}
        {(!entry.backgroundKey || entry.backgroundKey === "theme") && theme.decorationStyle !== "none" && (
          <View pointerEvents="none" style={[styles.pageDecoration, { borderColor: accent, opacity: theme.decorationStyle === "halo" ? 0.12 : 0.2 }]} />
        )}
        {lockedUntil ? (
          <View style={styles.lockedPage}>
            <View style={[styles.lockedSeal, { backgroundColor: accent }]}><Feather name="lock" size={28} color="#FFFDF9" /></View>
            <Text style={[styles.lockedTitle, { color: theme.textColor }]}>This memory is sealed</Text>
            <Text style={[styles.lockedCopy, { color: theme.secondaryTextColor }]}>This memory will open on{"\n"}{formatFutureDate(lockedUntil)}.</Text>
            <Text style={[styles.lockedHint, { color: accent }]}>Long press for private options</Text>
          </View>
        ) : <ScrollView
          nestedScrollEnabled
          directionalLockEnabled
          style={styles.paperScroll}
          contentContainerStyle={styles.paperContent}
          showsVerticalScrollIndicator={false}
        >
          <PageStickerCanvas stickers={entry.stickers} accent={accent} />
          <View style={[
            styles.pageHeader,
            { borderBottomColor: accent + "35" },
            theme.headerStyle === "chapter" && styles.chapterHeader,
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.date, { color: accent }]}>{date}</Text>
              <Text style={[styles.time, { color: theme.secondaryTextColor }]}>{time}</Text>
            </View>
            <View style={[styles.mood, { backgroundColor: accent + "18" }]}>
              <Text style={[styles.moodText, { color: accent }]}>{entry.mood}</Text>
            </View>
          </View>

          <Text style={[styles.pageEyebrow, { color: accent }]}>PAGE {entry.pageNumber} OF {total}</Text>
          {!!entry.title && (
            <Text style={[
              styles.title,
              { color: theme.textColor },
              theme.typographyStyle === "poetry" && styles.poetryTitle,
              theme.typographyStyle === "chapter" && styles.chapterTitle,
              theme.typographyStyle === "letter" && styles.letterTitle,
              { fontFamily: customFont.title },
            ]}>{entry.title}</Text>
          )}

          {entry.hasVoice && <VoicePlayer uri={entry.voiceUri} duration={entry.voiceDuration} accent={accent} muted={theme.secondaryTextColor} />}

          {!!(entry.bodyPolished || entry.body) && <Text style={[styles.body, { color: theme.textColor, fontFamily: customFont.body, fontSize: customText.size, lineHeight: customText.lineHeight, textAlign: customText.align }, theme.typographyStyle === "letter" && styles.letterBody, theme.typographyStyle === "academic" && styles.academicBody]}>{entry.bodyPolished || entry.body}</Text>}
          {!entry.bodyPolished && !entry.body && !!entry.voiceTranscript && <Text style={[styles.body, { color: theme.textColor, fontFamily: customFont.body, fontSize: customText.size, lineHeight: customText.lineHeight, textAlign: customText.align }, theme.typographyStyle === "letter" && styles.letterBody]}>{entry.voiceTranscript}</Text>}
          {!entry.bodyPolished && !entry.body && !entry.voiceTranscript && <Text style={[styles.body, { color: theme.secondaryTextColor }]}>A quiet page.</Text>}

          <FramedPhotos photos={entry.photos} frameKey={entry.photoFrameKey} accent={accent} />

          {!!entry.tags?.length && (
            <View style={styles.tags}>
              {entry.tags.map(tag => (
                <View key={tag} style={[styles.tag, { backgroundColor: accent + "12", borderColor: accent + "25" }]}>
                  <Text style={[styles.tagText, { color: accent }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={[styles.paperFooter, { borderTopColor: accent + "25" }]}>
            <Feather name="feather" size={13} color={accent} />
            <Text style={[styles.paperFooterText, { color: accent }]}>Page {entry.pageNumber}</Text>
          </View>
        </ScrollView>}
      </Pressable>
    </View>
  );
}

export default function DiaryViewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId?: string }>();
  const { diaries, futureMessages, getEntries, updateEntry, unlockFutureMessage } = useDiary();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [unlockTargetId, setUnlockTargetId] = useState<string | null>(null);
  const listRef = useRef<FlatList<Entry>>(null);
  const diary = diaries.find(item => item.id === id);
  const topPad = Platform.OS === "web" ? 42 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom;
  const current = entries[currentIndex];
  const currentLock = current ? activeEntryLock(futureMessages, current.id) : undefined;

  const jumpTo = useCallback((index: number, animated = true) => {
    if (index < 0 || index >= entries.length) return;
    listRef.current?.scrollToIndex({ index, animated });
    setCurrentIndex(index);
    if (id) AsyncStorage.setItem(`@amanat/last_page_${id}`, entries[index].id);
  }, [entries, id]);

  const load = useCallback(async () => {
    if (!id) return;
    const loaded = sortEntriesByPage(await getEntries(id));
    setEntries(loaded);
    if (!loaded.length) return;

    const remembered = await AsyncStorage.getItem(`@amanat/last_page_${id}`);
    const targetId = entryId || remembered;
    const index = Math.max(0, loaded.findIndex(entry => entry.id === targetId));
    setCurrentIndex(index);
    setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 50);
  }, [entryId, getEntries, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const searchResults = useMemo(
    () => query.trim() ? entries.filter(entry => !activeEntryLock(futureMessages, entry.id) && entryMatchesQuery(entry, query)) : entries,
    [entries, futureMessages, query],
  );

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index >= 0 && index < entries.length) {
      setCurrentIndex(index);
      if (id) AsyncStorage.setItem(`@amanat/last_page_${id}`, entries[index].id);
    }
  };

  const showPageActions = (entry: Entry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const lock = activeEntryLock(futureMessages, entry.id);
    if (lock) {
      Alert.alert("This memory is sealed", `It will open on ${formatFutureDate(lock.unlockDate ?? lock.deliveryDate)}.`, [
        { text: "Keep Sealed", style: "cancel" },
        { text: "Unlock Early with PIN", onPress: () => setUnlockTargetId(lock.id) },
      ]);
      return;
    }
    Alert.alert(entry.title || `Page ${entry.pageNumber}`, "Quick actions", [
      { text: "Share page as text", onPress: () => shareEntry(entry, diary?.title) },
      { text: "Export page as PDF", onPress: () => exportPagePdf(entry) },
      { text: "Schedule for Future", onPress: () => router.push(`/future-messages?entryId=${entry.id}&diaryId=${entry.diaryId}` as any) },
      { text: "Lock Until Date", onPress: () => router.push(`/future-messages?entryId=${entry.id}&diaryId=${entry.diaryId}&mode=unlock` as any) },
      {
        text: entry.isFavorite ? "Remove favorite" : "Favorite",
        onPress: async () => {
          await updateEntry(entry.diaryId, entry.id, { isFavorite: !entry.isFavorite });
          load();
        },
      },
      { text: "Change page theme", onPress: () => setThemePickerVisible(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const copyText = async () => {
    const text = current ? formatEntryShareText(current, diary?.title) : "";
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Page text copied to your clipboard.");
  };

  const exportPagePdf = async (entry: Entry) => {
    if (!diary) return;
    try { await exportEntriesPdf(diary, [entry]); } catch (error) { Alert.alert("Unable to export PDF", error instanceof Error ? error.message : "Please try again."); }
  };

  const showShareMenu = () => current && (currentLock ? showPageActions(current) : Alert.alert("Share page", "Choose a format.", [
    { text: "Share page as text", onPress: () => shareEntry(current, diary?.title) },
    { text: "Export page as PDF", onPress: () => exportPagePdf(current) },
    { text: "Copy text", onPress: copyText },
    { text: "Cancel", style: "cancel" },
  ]));

  if (!entries.length) {
    return (
      <View style={[styles.emptyScreen, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: botPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.emptyBack}><Feather name="x" size={23} color={colors.foreground} /></TouchableOpacity>
        <EmptyState icon="book-open" title="Your first page is waiting." subtitle="Write it, then come back to swipe through your diary." />
        <TouchableOpacity onPress={() => router.push({ pathname: "/write", params: { diaryId: id, returnTo: "reader" } })} style={[styles.writeFirst, { backgroundColor: colors.primary }]}>
          <Text style={[styles.writeFirstText, { color: colors.primaryForeground }]}>Write First Page</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#EDE5D9" }]}>
      {controlsVisible && (
        <View style={[styles.topBar, { paddingTop: topPad + 6, backgroundColor: colors.paper + "F2" }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
          <View style={styles.topTitle}>
            <Text style={[styles.diaryTitle, { color: colors.foreground }]} numberOfLines={1}>{diary?.title}</Text>
            <Text style={[styles.pageCount, { color: colors.mutedForeground }]}>Page {currentIndex + 1} of {entries.length}</Text>
          </View>
          <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.iconBtn}><Feather name="search" size={19} color={colors.foreground} /></TouchableOpacity>
          <TouchableOpacity onPress={showShareMenu} style={styles.iconBtn}><Feather name="share-2" size={19} color={colors.foreground} /></TouchableOpacity>
          <TouchableOpacity onPress={() => current && showPageActions(current)} style={styles.iconBtn}><Feather name="more-horizontal" size={20} color={colors.foreground} /></TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={entries}
        keyExtractor={entry => entry.id}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        directionalLockEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScrollToIndexFailed={({ index }) => setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 100)}
        renderItem={({ item }) => (
          <ReaderPage
            entry={item}
            total={entries.length}
            width={width}
            controlsVisible={controlsVisible}
            onToggleControls={() => setControlsVisible(visible => !visible)}
            onLongPress={() => showPageActions(item)}
            lockedUntil={activeEntryLock(futureMessages, item.id)?.unlockDate ?? activeEntryLock(futureMessages, item.id)?.deliveryDate}
          />
        )}
      />

      {controlsVisible && (
        <View style={[styles.bottomBar, { paddingBottom: botPad + 7, backgroundColor: colors.paper + "F5" }]}>
          <TouchableOpacity disabled={currentIndex === 0} onPress={() => jumpTo(currentIndex - 1)} style={[styles.navBtn, { opacity: currentIndex === 0 ? 0.3 : 1 }]}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.bottomCount, { color: colors.foreground }]}>{currentIndex + 1} / {entries.length}</Text>
          <TouchableOpacity disabled={currentIndex === entries.length - 1} onPress={() => jumpTo(currentIndex + 1)} style={[styles.navBtn, { opacity: currentIndex === entries.length - 1 ? 0.3 : 1 }]}>
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.barDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={() => current && (currentLock ? showPageActions(current) : router.push({ pathname: "/write", params: { diaryId: id, entryId: current.id, returnTo: "reader" } }))}
            style={styles.actionBtn}
          >
            <Feather name="edit-3" size={18} color={colors.foreground} /><Text style={[styles.actionLabel, { color: colors.foreground }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showShareMenu} style={styles.actionBtn}>
            <Feather name="share-2" size={18} color={colors.foreground} /><Text style={[styles.actionLabel, { color: colors.foreground }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push({ pathname: "/voice", params: { diaryId: id } })} style={styles.actionBtn}>
            <Feather name="mic" size={18} color={colors.foreground} /><Text style={[styles.actionLabel, { color: colors.foreground }]}>Voice</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push({ pathname: "/write", params: { diaryId: id, returnTo: "reader" } })} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={searchVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSearchVisible(false)}>
        <View style={[styles.searchSheet, { backgroundColor: colors.background, paddingTop: Platform.OS === "web" ? 32 : insets.top + 8 }]}>
          <View style={styles.searchHeader}>
            <Text style={[styles.searchTitle, { color: colors.foreground }]}>Find a page</Text>
            <TouchableOpacity onPress={() => setSearchVisible(false)} style={styles.iconBtn}><Feather name="x" size={21} color={colors.foreground} /></TouchableOpacity>
          </View>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput value={query} onChangeText={setQuery} autoFocus placeholder="Search pages, moods, tags…" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} />
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={entry => entry.id}
            contentContainerStyle={styles.searchResults}
            renderItem={({ item }) => {
              const lock = activeEntryLock(futureMessages, item.id);
              return (
              <TouchableOpacity
                onPress={() => {
                  const index = entries.findIndex(entry => entry.id === item.id);
                  setSearchVisible(false);
                  setTimeout(() => jumpTo(index, false), 200);
                }}
                style={[styles.searchResult, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.searchPage, { color: colors.primary }]}>{lock ? "SEALED MEMORY" : `PAGE ${item.pageNumber} · ${item.mood}`}</Text>
                <Text style={[styles.searchResultTitle, { color: colors.foreground }]} numberOfLines={1}>{lock ? "This memory is sealed" : item.title || "Untitled page"}</Text>
                <Text style={[styles.searchPreview, { color: colors.mutedForeground }]} numberOfLines={2}>{lock ? `Opens ${formatFutureDate(lock.unlockDate ?? lock.deliveryDate)}` : item.body || item.voiceTranscript || "A quiet page."}</Text>
              </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<EmptyState icon="search" title="No matching pages found" subtitle="Try another word, date, mood, or tag." />}
          />
        </View>
      </Modal>
      {current && (
        <ThemeSelectorSheet
          visible={themePickerVisible}
          currentThemeId={current.themeId ?? "classic-cream-diary"}
          autoTheme={!current.userOverriddenTheme}
          onClose={() => setThemePickerVisible(false)}
          onApply={async themeId => {
            await updateEntry(current.diaryId, current.id, { themeId, userOverriddenTheme: true });
            setThemePickerVisible(false);
            load();
          }}
        />
      )}
      <PinConfirmModal
        visible={!!unlockTargetId}
        title="Unlock this memory early?"
        subtitle="Enter your PIN to break the seal."
        onCancel={() => setUnlockTargetId(null)}
        onConfirmed={async () => {
          const message = futureMessages.find(item => item.id === unlockTargetId);
          if (message) {
            await cancelFutureNotification(message.notificationId);
            await unlockFutureMessage(message.id);
          }
          setUnlockTargetId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 7, shadowColor: "#3A2718", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, zIndex: 2 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, paddingLeft: 4 },
  diaryTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pageCount: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  paper: { flex: 1, maxWidth: 780, width: "100%", alignSelf: "center", borderRadius: 7, overflow: "hidden", shadowColor: "#3A2718", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 13, elevation: 5 },
  paperScroll: { flex: 1 },
  pageLines: { ...StyleSheet.absoluteFillObject, paddingTop: 126, gap: 28 },
  pageLine: { height: 1 },
  dotGrid: { ...StyleSheet.absoluteFillObject, flexDirection: "row", flexWrap: "wrap", gap: 22, padding: 18, opacity: 0.42 },
  pageDot: { width: 2, height: 2, borderRadius: 1 },
  insetBorder: { ...StyleSheet.absoluteFillObject, margin: 11, borderWidth: 1, borderRadius: 3 },
  marginRule: { position: "absolute", top: 0, bottom: 0, left: 20, width: 1, opacity: 0.35 },
  pageDecoration: { position: "absolute", width: 150, height: 150, borderWidth: 1, borderRadius: 75, right: -75, top: -75 },
  paperContent: { paddingHorizontal: 26, paddingTop: 24, paddingBottom: 72, minHeight: "100%", position: "relative" },
  pageHeader: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingBottom: 14, marginBottom: 22 },
  chapterHeader: { justifyContent: "center", paddingTop: 8, borderBottomWidth: 0 },
  date: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.25 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  mood: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 15 },
  moodText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pageEyebrow: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginBottom: 10 },
  title: { fontSize: 25, lineHeight: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.6, marginBottom: 18 },
  poetryTitle: { textAlign: "center", fontSize: 23, lineHeight: 34, marginVertical: 10 },
  chapterTitle: { textAlign: "center", textTransform: "uppercase", fontSize: 20, lineHeight: 30, letterSpacing: 2, marginVertical: 14 },
  letterTitle: { fontSize: 23, fontFamily: "Inter_500Medium", letterSpacing: 0.2 },
  body: { fontSize: 17, lineHeight: 29, fontFamily: "Inter_400Regular" },
  letterBody: { fontSize: 18, lineHeight: 31 },
  academicBody: { fontSize: 16, lineHeight: 28 },
  voiceCard: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 20 },
  voicePlay: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  voiceTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  voiceMeta: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 26 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  paperFooter: { marginTop: 38, borderTopWidth: 1, paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  paperFooterText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  bottomBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingTop: 7, shadowColor: "#3A2718", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  navBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  bottomCount: { width: 44, textAlign: "center", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  barDivider: { width: 1, height: 22, marginHorizontal: 4 },
  actionBtn: { minWidth: 48, height: 42, alignItems: "center", justifyContent: "center", gap: 1 },
  actionLabel: { fontSize: 8, fontFamily: "Inter_500Medium" },
  addBtn: { marginLeft: 5, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  searchSheet: { flex: 1, paddingHorizontal: 18 },
  searchHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  searchTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  searchBar: { height: 48, borderWidth: 1, borderRadius: 24, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  searchResults: { paddingVertical: 16, gap: 10, flexGrow: 1 },
  searchResult: { borderWidth: 1, borderRadius: 16, padding: 14 },
  searchPage: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.7, marginBottom: 5 },
  searchResultTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  searchPreview: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  emptyScreen: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  emptyBack: { position: "absolute", top: 58, left: 18, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  writeFirst: { alignSelf: "center", height: 48, borderRadius: 24, paddingHorizontal: 26, alignItems: "center", justifyContent: "center", marginTop: 12 },
  writeFirstText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  lockedPage: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  lockedSeal: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  lockedTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  lockedCopy: { fontSize: 14, lineHeight: 23, textAlign: "center", marginTop: 12 },
  lockedHint: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.6, marginTop: 24, textTransform: "uppercase" },
});
