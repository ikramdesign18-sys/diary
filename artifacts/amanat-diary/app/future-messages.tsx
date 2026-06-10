import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useDiary } from "@/context/DiaryContext";
import { useColors } from "@/hooks/useColors";
import type { FutureMessage } from "@/types";

export default function FutureMessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { futureMessages, createFutureMessage, deleteFutureMessage } = useDiary();
  const [showCreate, setShowCreate] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [body, setBody] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleCreate = async () => {
    if (!body.trim() || !deliveryDate.trim()) return;
    await createFutureMessage({
      title: `To: ${recipientName || "Future Me"}`,
      body: body.trim(),
      recipientName: recipientName.trim() || "Future Me",
      recipientEmail: recipientEmail.trim() || undefined,
      deliveryDate,
      deliveryType: "text",
      status: "scheduled",
    });
    setShowCreate(false);
    setBody(""); setRecipientName(""); setRecipientEmail(""); setDeliveryDate("");
  };

  const statusColor = (s: FutureMessage["status"]) => {
    if (s === "scheduled") return colors.accent;
    if (s === "delivered") return "#5A8A6A";
    if (s === "failed") return colors.destructive;
    return colors.mutedForeground;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Future Messages</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={futureMessages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: botPad + 24, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
              <Text style={[styles.cardTo, { color: colors.mutedForeground }]}>To: {item.recipientName}</Text>
              <Text style={[styles.cardStatus, { color: statusColor(item.status) }]}>{item.status}</Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.foreground }]} numberOfLines={2}>{item.body}</Text>
            <View style={styles.cardFooter}>
              <Feather name="calendar" size={13} color={colors.mutedForeground} />
              <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{item.deliveryDate}</Text>
              <TouchableOpacity onPress={() => Alert.alert("Delete", "Cancel this future message?", [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteFutureMessage(item.id) },
              ])}>
                <Feather name="trash-2" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            icon="clock"
            title="No future messages"
            subtitle="Schedule a memory for your future self or someone you love."
          />
        )}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { paddingTop: Platform.OS === "web" ? 67 : 24 }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Future Message</Text>
            <TouchableOpacity onPress={handleCreate} disabled={!body.trim() || !deliveryDate.trim()}>
              <Text style={[styles.modalSave, { color: colors.primary, opacity: (!body.trim() || !deliveryDate.trim()) ? 0.4 : 1 }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>RECIPIENT NAME</Text>
              <TextInput value={recipientName} onChangeText={setRecipientName}
                style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="Future Me" placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EMAIL (OPTIONAL)</Text>
              <TextInput value={recipientEmail} onChangeText={setRecipientEmail}
                style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="email@example.com" placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DELIVERY DATE</Text>
              <TextInput value={deliveryDate} onChangeText={setDeliveryDate}
                style={[styles.fieldInput, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="2027-01-01" placeholderTextColor={colors.mutedForeground} />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>YOUR MESSAGE</Text>
              <TextInput value={body} onChangeText={setBody}
                style={[styles.fieldTextarea, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="Dear future me..." placeholderTextColor={colors.mutedForeground}
                multiline textAlignVertical="top" />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 24, paddingBottom: 20,
  },
  title: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTo: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  cardStatus: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardDate: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingBottom: 16,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSave: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalContent: { padding: 24, gap: 20 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  fieldInput: { height: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, fontFamily: "Inter_400Regular" },
  fieldTextarea: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, fontFamily: "Inter_400Regular", minHeight: 160 },
});
