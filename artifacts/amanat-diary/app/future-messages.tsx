import { Feather } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { PinConfirmModal } from "@/components/PinConfirmModal";
import { useDiary } from "@/context/DiaryContext";
import { useAppLock } from "@/context/AppLockContext";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { activeEntryLock, formatFutureDate, futureUnlockDate, isFutureMessageReady } from "@/lib/futureMemories";
import { cancelFutureNotification, getNotificationPermissionStatus, scheduleFutureNotification } from "@/services/futureNotificationService";
import { exportEntriesPdf } from "@/services/pdfExportService";
import { cancelFutureEmail, listFutureEmails, scheduleFutureEmail, updateFutureEmail, type FutureEmailInput } from "@/services/futureEmailService";
import type { Entry, FutureMessage } from "@/types";

type FutureType = "future-self" | "loved-one" | "unlock-later" | "reminder-only";
type LovedOneDelivery = "local" | "email" | "manual";
type DateOption = "tomorrow" | "month" | "year" | "custom";
const TYPES: Array<{ id: FutureType; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: "future-self", label: "Future Self", icon: "user" },
  { id: "loved-one", label: "Loved One", icon: "heart" },
  { id: "unlock-later", label: "Unlock Later", icon: "lock" },
  { id: "reminder-only", label: "Reminder Only", icon: "bell" },
];
const DATE_OPTIONS: Array<{ id: DateOption; label: string }> = [
  { id: "tomorrow", label: "Tomorrow" },
  { id: "month", label: "1 month" },
  { id: "year", label: "1 year" },
  { id: "custom", label: "Custom date" },
];

function dateFromPreset(months = 0, years = 0, days = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setMonth(date.getMonth() + months);
  date.setFullYear(date.getFullYear() + years);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

function friendlyDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Choose a future date";
  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} • ${time}`;
}

export default function FutureMessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ entryId?: string; diaryId?: string; mode?: string; futureMessageId?: string }>();
  const { diaries, futureMessages, getEntries, createFutureMessage, updateFutureMessage, cancelFutureMessage, unlockFutureMessage } = useDiary();
  const { hasPin } = useAppLock();
  const { account, configured, isLoggedIn } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [pinAction, setPinAction] = useState<"save" | "unlock" | "edit" | null>(null);
  const [editing, setEditing] = useState<FutureMessage | null>(null);
  const [type, setType] = useState<FutureType>("future-self");
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipientName, setRecipientName] = useState("Future Me");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [lovedOneDelivery, setLovedOneDelivery] = useState<LovedOneDelivery>("local");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(dateFromPreset(0, 0, 1));
  const [dateOption, setDateOption] = useState<DateOption>("tomorrow");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customDateDraft, setCustomDateDraft] = useState(new Date(deliveryDate));
  const [dateError, setDateError] = useState("");
  const [preview, setPreview] = useState<FutureMessage | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<FutureMessage | null>(null);
  const [editTarget, setEditTarget] = useState<FutureMessage | null>(null);
  const [permissionStatus, setPermissionStatus] = useState("not requested");
  const topPad = Platform.OS === "web" ? 56 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const automaticEmailAvailable = configured && isLoggedIn && !!account?.isVerified;

  const upcoming = useMemo(() => futureMessages.filter(message => message.status === "scheduled" && !isFutureMessageReady(message)), [futureMessages]);
  const displayed = useMemo(() => [...futureMessages].sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()), [futureMessages]);

  const reset = () => {
    setEditing(null); setSelectedEntry(null); setType("future-self"); setTitle(""); setBody("");
    setRecipientName("Future Me"); setRecipientEmail(""); setDeliveryDate(dateFromPreset(0, 0, 1));
    setDateOption("tomorrow"); setShowCustomDate(false); setDateError("");
    setLovedOneDelivery("local"); setConsentConfirmed(false);
  };

  const openCreate = (entry?: Entry, forcedType?: FutureType) => {
    reset();
    if (entry) {
      setSelectedEntry(entry);
      setTitle(entry.title || `Diary page ${entry.pageNumber}`);
      setBody(entry.body || entry.voiceTranscript || "");
    }
    if (forcedType) setType(forcedType);
    setShowCreate(true);
  };

  useEffect(() => {
    if (!params.entryId || !params.diaryId) return;
    getEntries(params.diaryId).then(entries => {
      const entry = entries.find(item => item.id === params.entryId);
      if (entry) openCreate(entry, params.mode === "unlock" ? "unlock-later" : "future-self");
    });
  }, [params.diaryId, params.entryId, params.mode]);

  useEffect(() => {
    futureMessages.filter(message => message.status === "scheduled" && isFutureMessageReady(message)).forEach(message => unlockFutureMessage(message.id));
    getNotificationPermissionStatus().then(setPermissionStatus);
  }, []);

  useEffect(() => {
    if (!automaticEmailAvailable) return;
    listFutureEmails().then(async ({ deliveries }) => {
      const byId = new Map(deliveries.map(delivery => [delivery.id, delivery]));
      for (const message of futureMessages) {
        const delivery = message.emailDeliveryId ? byId.get(message.emailDeliveryId) : undefined;
        if (delivery && delivery.status !== message.emailDeliveryStatus) {
          await updateFutureMessage({ ...message, emailDeliveryStatus: delivery.status });
        }
      }
    }).catch(() => {});
  }, [automaticEmailAvailable]);

  const chooseExistingPage = () => {
    if (!diaries.length) return Alert.alert("No diary pages yet", "Write a diary page first, then schedule it for the future.");
    Alert.alert("Choose diary", "Select the diary holding your memory.", [
      ...diaries.slice(0, 8).map(diary => ({
        text: diary.title,
        onPress: async () => {
          const entries = (await getEntries(diary.id)).filter(entry => !activeEntryLock(futureMessages, entry.id));
          if (!entries.length) return Alert.alert("No pages yet", "This diary does not have a page to schedule.");
          Alert.alert("Choose page", diary.title, [
            ...entries.slice(-8).reverse().map(entry => ({ text: `Page ${entry.pageNumber} · ${entry.title || "Untitled"}`, onPress: () => openCreate(entry) })),
            { text: "Cancel", style: "cancel" },
          ]);
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const valid = title.trim() && deliveryDate && (type === "reminder-only" || body.trim()) &&
    (type !== "loved-one" || (recipientName.trim() && (lovedOneDelivery !== "email" || (recipientEmail.trim() && consentConfirmed))));
  const shareText = (messageTitle = title, messageBody = body, recipient = recipientName) =>
    [`For ${recipient || "someone special"}`, messageTitle.trim(), messageBody.trim(), "Shared manually from Amanat Diary"].filter(Boolean).join("\n\n");

  const shareNow = async () => {
    await Share.share({ title: title.trim() || "A future memory", message: shareText() });
  };

  const copyMessage = async () => {
    await Clipboard.setStringAsync(shareText());
    Alert.alert("Message copied", "You can paste and share it wherever you choose.");
  };

  const shareSaved = async (message: FutureMessage) => Share.share({ title: message.title, message: shareText(message.title, message.body, message.recipientName) });
  const copySaved = async (message: FutureMessage) => {
    await Clipboard.setStringAsync(shareText(message.title, message.body, message.recipientName));
    Alert.alert("Message copied", "You can paste and share it wherever you choose.");
  };

  const exportDraftPdf = async () => {
    try {
      const diary = diaries.find(item => item.id === selectedEntry?.diaryId) ?? {
        id: "future-letter", title: `For ${recipientName.trim() || "someone special"}`, subtitle: "Shared manually from Amanat Diary",
        category: "Future Letters" as const, coverStyle: "classic" as const, accentColor: "#B58A5B", isLocked: false,
        defaultMood: "Hopeful" as const, entryCount: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      const entry = selectedEntry ?? {
        id: "future-letter-preview", diaryId: diary.id, pageNumber: 1, title: title.trim(), body: body.trim(), mood: "Hopeful" as const,
        tags: ["future-letter"], isFavorite: false, isLocked: false, hasVoice: false, photos: [], date: new Date().toISOString(),
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await exportEntriesPdf(diary, [entry]);
    } catch (error) {
      Alert.alert("Unable to export PDF", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const requirePin = (action: "save" | "unlock" | "edit") => {
    if (hasPin) {
      setPinAction(action);
      return;
    }
    Alert.alert("Create a PIN first", "Sealed future memories require a PIN so early unlock stays private.", [
      { text: "Not now", style: "cancel" },
      { text: "Create PIN", onPress: () => router.push("/(onboarding)/pin-setup?returnTo=home" as any) },
    ]);
  };

  const requestSave = () => {
    const selectedTime = new Date(deliveryDate).getTime();
    if (!Number.isFinite(selectedTime) || selectedTime <= Date.now()) {
      setDateError("Please choose a future date.");
      Alert.alert("Please choose a future date.");
      return;
    }
    if (type === "loved-one" && lovedOneDelivery === "email" && !automaticEmailAvailable) {
      Alert.alert("Cloud login required", "Automatic email delivery needs cloud backup/login. You can still save locally or share manually.");
      return;
    }
    requirePin("save");
  };

  const selectDateOption = (option: DateOption) => {
    if (option === "custom") {
      const current = new Date(deliveryDate);
      setCustomDateDraft(Number.isNaN(current.getTime()) ? new Date() : current);
      setShowCustomDate(true);
      return;
    }
    const next = option === "tomorrow" ? dateFromPreset(0, 0, 1) : option === "month" ? dateFromPreset(1) : dateFromPreset(0, 1);
    setDeliveryDate(next);
    setDateOption(option);
    setDateError("");
  };

  const applyCustomDate = (date: Date) => {
    if (date.getTime() <= Date.now()) {
      setDateError("Please choose a future date.");
      Alert.alert("Please choose a future date.");
      return false;
    }
    setDeliveryDate(date.toISOString());
    setDateOption("custom");
    setDateError("");
    return true;
  };

  const onCustomDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowCustomDate(false);
      if (event.type !== "dismissed" && date) applyCustomDate(date);
      return;
    }
    if (date) setCustomDateDraft(date);
  };

  const emailInput = (message: FutureMessage): FutureEmailInput => ({
    futureMessageId: message.id,
    diaryId: message.diaryId,
    entryId: message.entryId,
    recipientName: message.recipientName,
    recipientEmail: message.recipientEmail ?? "",
    subject: "A future memory from someone who cares about you",
    messageText: message.body,
    deliveryDate: message.deliveryDate,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    consentConfirmed: true,
  });

  const save = async () => {
    const diaryId = selectedEntry?.diaryId ?? editing?.diaryId;
    const draft = {
      entryId: selectedEntry?.id ?? editing?.entryId,
      diaryId,
      title: title.trim(),
      body: body.trim(),
      recipientName: type === "loved-one" ? recipientName.trim() : "Future Me",
      recipientEmail: recipientEmail.trim() || undefined,
      deliveryDate,
      unlockDate: type === "unlock-later" ? deliveryDate : undefined,
      deliveryType: type,
      status: "scheduled" as const,
      notificationId: editing?.notificationId,
      emailDeliveryId: editing?.emailDeliveryId,
      emailDeliveryStatus: editing?.emailDeliveryStatus,
      emailDeliveryMode: type === "loved-one" ? lovedOneDelivery : undefined,
      consentConfirmed: type === "loved-one" && lovedOneDelivery === "email" ? consentConfirmed : false,
      updatedAt: new Date().toISOString(),
    };
    const candidate = { ...(editing ?? { id: "", createdAt: new Date().toISOString() }), ...draft } as FutureMessage;
    let remoteDelivery: { id: string; status: FutureMessage["emailDeliveryStatus"] } | null = null;
    let newScheduleFailed = false;
    try {
      if (editing?.emailDeliveryId && (type !== "loved-one" || lovedOneDelivery !== "email")) {
        const result = await cancelFutureEmail(editing.emailDeliveryId);
        remoteDelivery = { id: result.delivery.id, status: result.delivery.status };
      } else if (type === "loved-one" && lovedOneDelivery === "email") {
        const result = editing?.emailDeliveryId
          ? await updateFutureEmail(editing.emailDeliveryId, emailInput(candidate))
          : await scheduleFutureEmail(emailInput(candidate));
        remoteDelivery = { id: result.delivery.id, status: result.delivery.status };
      }
    } catch (error) {
      if (editing?.emailDeliveryId) {
        setPinAction(null);
        Alert.alert("Cloud delivery not changed", `Your existing scheduled email is unchanged. ${error instanceof Error ? error.message : "Please try again online."}`);
        return;
      }
      newScheduleFailed = type === "loved-one" && lovedOneDelivery === "email";
    }

    const localDraft = {
      ...draft,
      emailDeliveryId: remoteDelivery?.id ?? draft.emailDeliveryId,
      emailDeliveryStatus: remoteDelivery?.status ?? (newScheduleFailed ? "failed" as const : draft.emailDeliveryStatus),
    };
    let message: FutureMessage;
    if (editing) {
      await cancelFutureNotification(editing.notificationId);
      message = { ...editing, ...localDraft };
      const notificationId = await scheduleFutureNotification(message);
      message = { ...message, notificationId };
      await updateFutureMessage(message);
    } else {
      message = await createFutureMessage(localDraft);
      const notificationId = await scheduleFutureNotification(message);
      if (notificationId) {
        message = { ...message, notificationId };
        await updateFutureMessage(message);
      }
    }
    setPinAction(null); setShowCreate(false); reset();
    if (newScheduleFailed) {
      Alert.alert("Saved locally", "Automatic email delivery could not be scheduled right now.");
    } else {
      Alert.alert(message.emailDeliveryStatus === "scheduled" ? "Email delivery scheduled" : "Memory scheduled", message.emailDeliveryStatus === "scheduled" ? "This memory will be sent automatically on the selected date." : "Local reminders work on this device. Keep backups enabled so future memories stay safe.");
    }
  };

  const editMessage = (message: FutureMessage) => {
    if (message.emailDeliveryMode === "email" && message.emailDeliveryStatus && message.emailDeliveryStatus !== "scheduled" && message.emailDeliveryStatus !== "failed") {
      Alert.alert("Email can no longer be edited", `This delivery is ${message.emailDeliveryStatus}.`);
      return;
    }
    if (message.status === "scheduled" && !isFutureMessageReady(message)) {
      setEditTarget(message);
      requirePin("edit");
      return;
    }
    openEditMessage(message);
  };

  const openEditMessage = (message: FutureMessage) => {
    setEditing(message); setType((TYPES.some(item => item.id === message.deliveryType) ? message.deliveryType : "future-self") as FutureType);
    setTitle(message.title); setBody(message.body); setRecipientName(message.recipientName); setRecipientEmail(message.recipientEmail ?? "");
    setDeliveryDate(message.deliveryDate); setDateOption("custom"); setDateError(""); setLovedOneDelivery(message.emailDeliveryMode ?? "local"); setConsentConfirmed(!!message.consentConfirmed); setShowCreate(true);
  };

  const cancelMessage = (message: FutureMessage) => Alert.alert("Cancel future memory?", "The memory will remain stored locally but its reminder will be canceled.", [
    { text: "Keep Scheduled", style: "cancel" },
    { text: "Cancel Memory", style: "destructive", onPress: async () => {
      if (message.emailDeliveryId && message.emailDeliveryStatus === "scheduled") {
        try {
          await cancelFutureEmail(message.emailDeliveryId);
        } catch (error) {
          Alert.alert("Email delivery not cancelled", error instanceof Error ? error.message : "Connect to the internet and try again.");
          return;
        }
        await updateFutureMessage({ ...message, emailDeliveryStatus: "cancelled" });
      } else if (message.emailDeliveryMode === "email" && message.emailDeliveryStatus && !["failed", "cancelled"].includes(message.emailDeliveryStatus)) {
        Alert.alert("Email delivery cannot be cancelled", `This delivery is ${message.emailDeliveryStatus}.`);
        return;
      }
      await cancelFutureNotification(message.notificationId);
      await cancelFutureMessage(message.id);
    } },
  ]);

  const openPreview = (message: FutureMessage) => {
    if (message.status === "scheduled" && !isFutureMessageReady(message)) {
      return Alert.alert("This memory is sealed", `This memory will open on ${formatFutureDate(futureUnlockDate(message))}.`, [
        { text: "Keep Sealed", style: "cancel" },
        { text: "Open Early with PIN", onPress: () => { setUnlockTarget(message); requirePin("unlock"); } },
      ]);
    }
    setPreview(message);
  };

  useEffect(() => {
    if (!params.futureMessageId) return;
    const message = futureMessages.find(item => item.id === params.futureMessageId);
    if (message) openPreview(message);
  }, [params.futureMessageId]);

  const cardStatus = (message: FutureMessage) => message.status === "scheduled" && isFutureMessageReady(message) ? "unlocked" : message.status;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.foreground }]}>Future Letters</Text><Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{upcoming.length} upcoming memories</Text></View>
        <TouchableOpacity onPress={() => openCreate()} style={[styles.addBtn, { backgroundColor: colors.primary }]}><Feather name="plus" size={18} color={colors.primaryForeground} /></TouchableOpacity>
      </View>

      <FlatList
        data={displayed}
        keyExtractor={message => message.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 30, gap: 12, flexGrow: 1 }}
        ListHeaderComponent={<View style={[styles.safety, { backgroundColor: "#F7EEDC", borderColor: "#E5D2AF" }]}><Feather name="bell" size={17} color="#8A6847" /><Text style={styles.safetyText}>Local reminders work on this device. Notification permission: {permissionStatus}. Automatic email is optional and requires a verified cloud login.</Text></View>}
        renderItem={({ item }) => {
          const locked = cardStatus(item) === "scheduled" && !isFutureMessageReady(item);
          const diary = diaries.find(value => value.id === item.diaryId);
          return (
            <View style={[styles.card, { backgroundColor: locked ? "#FFF8EC" : colors.card, borderColor: locked ? "#D9BA8A" : colors.border }]}>
              <View style={styles.cardTop}><View style={[styles.seal, { backgroundColor: locked ? "#B58A5B" : colors.secondary }]}><Feather name={locked ? "lock" : "mail"} size={17} color={locked ? "#FFF9EF" : colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{locked ? "Sealed memory" : item.title}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{locked ? "Private until its scheduled date" : `${item.recipientName} · ${item.deliveryType.replaceAll("-", " ")}`}</Text>{item.deliveryType === "loved-one" && <Text style={styles.localBadge}>{item.emailDeliveryMode === "email" ? "AUTOMATIC EMAIL" : "LOCAL REMINDER ONLY"}</Text>}</View><Text style={[styles.status, { color: locked ? "#A47142" : colors.primary }]}>{item.emailDeliveryMode === "email" ? item.emailDeliveryStatus ?? "saved locally" : item.deliveryType === "loved-one" && item.status === "scheduled" ? "Scheduled locally" : cardStatus(item)}</Text></View>
              <Text style={[styles.date, { color: colors.foreground }]}>{locked ? "Sealed until " : "Ready on "}{formatFutureDate(futureUnlockDate(item))}</Text>
              {item.emailDeliveryMode === "email" && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.recipientEmail} · Status: {item.emailDeliveryStatus ?? "saved locally"}</Text>}
              {!!diary && !locked && <Text style={[styles.meta, { color: colors.mutedForeground }]}>{diary.title}{item.entryId ? " · Linked diary page" : ""}</Text>}
              <View style={styles.actions}><TouchableOpacity onPress={() => openPreview(item)}><Text style={[styles.action, { color: colors.primary }]}>Preview</Text></TouchableOpacity>{item.deliveryType === "loved-one" && <TouchableOpacity onPress={() => shareSaved(item)}><Text style={[styles.action, { color: colors.primary }]}>Share now</Text></TouchableOpacity>}{item.deliveryType === "loved-one" && <TouchableOpacity onPress={() => copySaved(item)}><Text style={[styles.action, { color: colors.primary }]}>Copy</Text></TouchableOpacity>}{item.status !== "canceled" && <TouchableOpacity onPress={() => editMessage(item)}><Text style={[styles.action, { color: colors.primary }]}>Edit</Text></TouchableOpacity>}{item.status === "scheduled" && <TouchableOpacity onPress={() => cancelMessage(item)}><Text style={[styles.action, { color: colors.destructive }]}>Cancel</Text></TouchableOpacity>}</View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><EmptyState icon="mail" title="Write a memory for your future self." subtitle="Seal a private letter, schedule a diary page, or leave yourself a gentle reminder." /><TouchableOpacity onPress={() => openCreate()} style={[styles.primary, { backgroundColor: colors.primary }]}><Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Create Future Letter</Text></TouchableOpacity><TouchableOpacity onPress={chooseExistingPage} style={[styles.secondary, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.primary }]}>Schedule Existing Page</Text></TouchableOpacity></View>}
      />

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.form, { paddingTop: Platform.OS === "web" ? 38 : insets.top + 10, paddingBottom: botPad + 30 }]}>
          <View style={styles.formHeader}><TouchableOpacity onPress={() => { setShowCreate(false); reset(); }}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity><Text style={[styles.formTitle, { color: colors.foreground }]}>{editing ? "Edit Future Memory" : "Create Future Memory"}</Text><View style={{ width: 22 }} /></View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>1 · CHOOSE TYPE</Text>
          <View style={styles.typeGrid}>{TYPES.map(item => <TouchableOpacity key={item.id} onPress={() => setType(item.id)} style={[styles.typeCard, { backgroundColor: type === item.id ? "#F3E5CF" : colors.card, borderColor: type === item.id ? "#B58A5B" : colors.border }]}><Feather name={item.icon} size={18} color={type === item.id ? "#8A6847" : colors.primary} /><Text style={[styles.typeText, { color: colors.foreground }]}>{item.label}</Text></TouchableOpacity>)}</View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>2 · CHOOSE CONTENT</Text>
          {selectedEntry ? <View style={[styles.linked, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="book-open" size={17} color={colors.primary} /><Text style={[styles.linkedText, { color: colors.foreground }]}>Page {selectedEntry.pageNumber} · {selectedEntry.title || "Untitled page"}</Text></View> : <TouchableOpacity onPress={chooseExistingPage} style={[styles.linked, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="plus" size={17} color={colors.primary} /><Text style={[styles.linkedText, { color: colors.primary }]}>Select existing diary page</Text></TouchableOpacity>}
          {!selectedEntry && <TouchableOpacity onPress={() => { setShowCreate(false); router.push("/voice"); }} style={[styles.linked, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="mic" size={17} color={colors.primary} /><Text style={[styles.linkedText, { color: colors.primary }]}>Record a voice diary page first</Text></TouchableOpacity>}
          <TextInput value={title} onChangeText={setTitle} placeholder="Letter title" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
          {type !== "reminder-only" && <TextInput value={body} onChangeText={setBody} multiline textAlignVertical="top" placeholder="Dear future me…" placeholderTextColor={colors.mutedForeground} style={[styles.bodyInput, { color: colors.foreground, borderColor: colors.border }]} />}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>3 · CHOOSE DATE</Text>
          <View style={styles.presets}>{DATE_OPTIONS.map(option => {
            const selected = dateOption === option.id;
            return <TouchableOpacity key={option.id} onPress={() => selectDateOption(option.id)} style={[styles.preset, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : colors.card }]}><Feather name={selected ? "check-circle" : option.id === "custom" ? "calendar" : "clock"} size={14} color={selected ? colors.primaryForeground : colors.primary} /><Text style={[styles.presetText, { color: selected ? colors.primaryForeground : colors.primary }]}>{option.label}</Text></TouchableOpacity>;
          })}</View>
          <TouchableOpacity onPress={() => selectDateOption("custom")} style={[styles.dateDisplay, { backgroundColor: colors.card, borderColor: dateError ? colors.destructive : colors.border }]}>
            <View style={[styles.dateIcon, { backgroundColor: colors.secondary }]}><Feather name="calendar" size={17} color={colors.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.dateDisplayLabel, { color: colors.mutedForeground }]}>SELECTED DELIVERY DATE</Text><Text style={[styles.dateDisplayValue, { color: colors.foreground }]}>{friendlyDate(deliveryDate)}</Text></View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          {!!dateError && <Text style={[styles.dateError, { color: colors.destructive }]}>{dateError}</Text>}
          {Platform.OS === "android" && showCustomDate && <DateTimePicker value={customDateDraft} mode="date" display="calendar" onChange={onCustomDateChange} />}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>4 · RECIPIENT</Text>
          {type === "loved-one" ? <><View style={styles.deliveryOptions}>{([["local", "Save locally / remind me"], ["email", "Send automatically by email"], ["manual", "Share manually now"]] as Array<[LovedOneDelivery, string]>).map(([value, label]) => <TouchableOpacity key={value} onPress={() => setLovedOneDelivery(value)} style={[styles.deliveryOption, { borderColor: lovedOneDelivery === value ? colors.primary : colors.border, backgroundColor: lovedOneDelivery === value ? colors.secondary : colors.card }]}><Feather name={lovedOneDelivery === value ? "check-circle" : "circle"} size={15} color={lovedOneDelivery === value ? colors.primary : colors.mutedForeground} /><Text style={[styles.deliveryOptionText, { color: colors.foreground }]}>{label}</Text></TouchableOpacity>)}</View><TextInput value={recipientName} onChangeText={setRecipientName} placeholder="Recipient name" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} /><TextInput value={recipientEmail} onChangeText={setRecipientEmail} placeholder={lovedOneDelivery === "email" ? "Recipient email required" : "Email optional"} placeholderTextColor={colors.mutedForeground} autoCapitalize="none" keyboardType="email-address" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />{lovedOneDelivery === "email" ? <><View style={styles.emailConfirm}><Text style={styles.emailConfirmTitle}>Automatic email confirmation</Text><Text style={styles.emailConfirmText}>Recipient: {recipientName || "Not entered"}{"\n"}Email: {recipientEmail || "Not entered"}{"\n"}Delivery: {formatFutureDate(deliveryDate)}{"\n"}Preview: {body.trim().slice(0, 140) || "No message entered"}</Text><Text style={styles.emailWarning}>This email will be sent automatically on the selected date if cloud delivery is enabled.</Text></View><TouchableOpacity onPress={() => setConsentConfirmed(value => !value)} style={styles.consent}><Feather name={consentConfirmed ? "check-square" : "square"} size={19} color={colors.primary} /><Text style={[styles.note, { color: colors.foreground }]}>I confirm I want Amanat Diary to send this memory by email on the selected date.</Text></TouchableOpacity>{!automaticEmailAvailable && <Text style={[styles.note, { color: colors.destructive }]}>Automatic email delivery needs cloud backup/login. You can still save locally or share manually.</Text>}</> : <View style={styles.localNotice}><Text style={styles.localBadge}>LOCAL REMINDER ONLY</Text><Text style={[styles.note, { color: colors.mutedForeground }]}>This memory is saved locally and can be shared manually.</Text></View>}<View style={styles.shareActions}><TouchableOpacity disabled={!body.trim()} onPress={shareNow} style={[styles.shareAction, { borderColor: colors.border }]}><Feather name="share-2" size={15} color={colors.primary} /><Text style={[styles.shareActionText, { color: colors.primary }]}>Share Now</Text></TouchableOpacity><TouchableOpacity disabled={!body.trim()} onPress={copyMessage} style={[styles.shareAction, { borderColor: colors.border }]}><Feather name="copy" size={15} color={colors.primary} /><Text style={[styles.shareActionText, { color: colors.primary }]}>Copy Message</Text></TouchableOpacity><TouchableOpacity disabled={!body.trim()} onPress={exportDraftPdf} style={[styles.shareAction, { borderColor: colors.border }]}><Feather name="file-text" size={15} color={colors.primary} /><Text style={[styles.shareActionText, { color: colors.primary }]}>Export as PDF</Text></TouchableOpacity></View></> : <Text style={[styles.note, { color: colors.mutedForeground }]}>{type === "unlock-later" ? "The linked memory stays private until this date." : "No email is required. This reminder stays on your device."}</Text>}
          <TouchableOpacity disabled={!valid} onPress={requestSave} style={[styles.primary, { backgroundColor: colors.primary, opacity: valid ? 1 : 0.4 }]}><Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{type === "loved-one" && lovedOneDelivery === "email" ? "Schedule Email" : type === "loved-one" ? "Save for Future" : "Confirm with PIN"}</Text></TouchableOpacity>
        </ScrollView>
      </Modal>

      {Platform.OS !== "android" && <Modal visible={showCustomDate} transparent animationType="fade" onRequestClose={() => setShowCustomDate(false)}>
        <View style={styles.datePickerOverlay}><View style={[styles.datePickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.datePickerTitle, { color: colors.foreground }]}>Choose a future date</Text>
          <DateTimePicker value={customDateDraft} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={onCustomDateChange} />
          <View style={styles.datePickerActions}><TouchableOpacity onPress={() => setShowCustomDate(false)} style={[styles.datePickerButton, { borderColor: colors.border }]}><Text style={[styles.datePickerButtonText, { color: colors.foreground }]}>Cancel</Text></TouchableOpacity><TouchableOpacity onPress={() => { if (applyCustomDate(customDateDraft)) setShowCustomDate(false); }} style={[styles.datePickerButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[styles.datePickerButtonText, { color: colors.primaryForeground }]}>Use this date</Text></TouchableOpacity></View>
        </View></View>
      </Modal>}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}><View style={styles.overlay}><View style={[styles.preview, { backgroundColor: "#FFF9EE", borderColor: "#D9BA8A" }]}><Feather name="mail" size={26} color="#A47142" /><Text style={styles.previewTitle}>{preview?.title}</Text><Text style={styles.previewDate}>{preview ? formatFutureDate(preview.deliveryDate) : ""}</Text><ScrollView><Text style={styles.previewBody}>{preview?.body || "A gentle reminder from your past."}</Text></ScrollView><TouchableOpacity onPress={() => setPreview(null)} style={styles.previewClose}><Text style={{ color: "#8A6847" }}>Close letter</Text></TouchableOpacity></View></View></Modal>

      <PinConfirmModal visible={pinAction === "save"} title="Confirm this future memory" subtitle="Enter your PIN before scheduling." onCancel={() => setPinAction(null)} onConfirmed={save} />
      <PinConfirmModal visible={pinAction === "unlock"} title="Unlock this memory early?" subtitle="Enter your PIN to break the seal." onCancel={() => { setPinAction(null); setUnlockTarget(null); }} onConfirmed={async () => { if (unlockTarget) { await cancelFutureNotification(unlockTarget.notificationId); await unlockFutureMessage(unlockTarget.id); setPreview({ ...unlockTarget, status: "unlocked" }); } setPinAction(null); setUnlockTarget(null); }} />
      <PinConfirmModal visible={pinAction === "edit"} title="Edit this sealed memory?" subtitle="Enter your PIN before changing its scheduled date." onCancel={() => { setPinAction(null); setEditTarget(null); }} onConfirmed={() => { if (editTarget) openEditMessage(editTarget); setPinAction(null); setEditTarget(null); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, header: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 20, paddingBottom: 16 }, title: { fontSize: 23, fontFamily: "Inter_700Bold" }, headerSub: { fontSize: 11, marginTop: 2 }, addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  safety: { flexDirection: "row", gap: 10, padding: 14, borderWidth: 1, borderRadius: 16, marginBottom: 4 }, safetyText: { flex: 1, color: "#694F37", fontSize: 11, lineHeight: 17 },
  card: { padding: 16, borderWidth: 1, borderRadius: 18, gap: 10 }, cardTop: { flexDirection: "row", alignItems: "center", gap: 10 }, seal: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" }, meta: { fontSize: 10, marginTop: 3, textTransform: "capitalize" }, status: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase" }, date: { fontSize: 12, fontFamily: "Inter_600SemiBold" }, actions: { flexDirection: "row", gap: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#D9C8B5", paddingTop: 10 }, action: { fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: { flex: 1, justifyContent: "center", paddingVertical: 35 }, primary: { minHeight: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 14 }, primaryText: { fontSize: 14, fontFamily: "Inter_700Bold" }, secondary: { minHeight: 48, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 10 }, secondaryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  form: { paddingHorizontal: 20, gap: 13 }, formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, formTitle: { fontSize: 20, fontFamily: "Inter_700Bold" }, label: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 8 }, typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, typeCard: { width: "48%", flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "center", gap: 8 }, typeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  linked: { borderWidth: 1, borderRadius: 13, padding: 13, flexDirection: "row", alignItems: "center", gap: 9 }, linkedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" }, input: { minHeight: 49, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, fontSize: 13 }, bodyInput: { minHeight: 145, borderWidth: 1, borderRadius: 13, padding: 14, fontSize: 14, lineHeight: 21 }, presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, preset: { width: "48%", flexGrow: 1, minHeight: 42, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 11, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" }, presetText: { fontSize: 11, fontFamily: "Inter_700Bold" }, dateDisplay: { minHeight: 64, borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 }, dateIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" }, dateDisplayLabel: { fontSize: 8, letterSpacing: 0.8, fontFamily: "Inter_700Bold" }, dateDisplayValue: { fontSize: 13, lineHeight: 19, marginTop: 2, fontFamily: "Inter_600SemiBold" }, dateError: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: -6 }, note: { fontSize: 11, lineHeight: 17 },
  localNotice: { backgroundColor: "#FFF7E9", borderColor: "#E5D2AF", borderWidth: 1, borderRadius: 13, padding: 12, gap: 7 }, localBadge: { alignSelf: "flex-start", color: "#8A6847", backgroundColor: "#F3E5CF", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.6, overflow: "hidden", marginTop: 4 }, shareActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, shareAction: { flexGrow: 1, minWidth: "30%", borderWidth: 1, borderRadius: 18, minHeight: 40, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, shareActionText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  deliveryOptions: { gap: 7 }, deliveryOption: { borderWidth: 1, borderRadius: 13, padding: 12, flexDirection: "row", alignItems: "center", gap: 9 }, deliveryOptionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  emailConfirm: { backgroundColor: "#FFF9EE", borderColor: "#D9BA8A", borderWidth: 1, borderRadius: 14, padding: 13, gap: 7 }, emailConfirmTitle: { color: "#594332", fontSize: 12, fontFamily: "Inter_700Bold" }, emailConfirmText: { color: "#694F37", fontSize: 11, lineHeight: 18 }, emailWarning: { color: "#A47142", fontSize: 10, lineHeight: 16, fontFamily: "Inter_600SemiBold" }, consent: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 4 },
  datePickerOverlay: { flex: 1, backgroundColor: "#2B201680", justifyContent: "center", padding: 24 }, datePickerCard: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 }, datePickerTitle: { fontSize: 17, textAlign: "center", fontFamily: "Inter_700Bold" }, datePickerActions: { flexDirection: "row", gap: 8 }, datePickerButton: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" }, datePickerButtonText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  overlay: { flex: 1, backgroundColor: "#2B2016AA", justifyContent: "center", padding: 24 }, preview: { maxHeight: "75%", padding: 25, borderRadius: 20, borderWidth: 1, alignItems: "center" }, previewTitle: { color: "#594332", fontSize: 23, fontFamily: "Inter_700Bold", marginTop: 15, textAlign: "center" }, previewDate: { color: "#A47142", fontSize: 11, marginVertical: 9 }, previewBody: { color: "#594332", fontSize: 15, lineHeight: 25, marginTop: 14 }, previewClose: { marginTop: 22, padding: 10 },
});
