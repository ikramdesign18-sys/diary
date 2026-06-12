import { Platform } from "react-native";

import type { FutureMessage } from "@/types";

async function notifications() {
  if (Platform.OS === "web") return null;
  return import("expo-notifications");
}

export async function getNotificationPermissionStatus() {
  const Notifications = await notifications();
  if (!Notifications) return "unavailable";
  return (await Notifications.getPermissionsAsync()).status;
}

export async function scheduleFutureNotification(message: FutureMessage) {
  const Notifications = await notifications();
  const date = new Date(message.deliveryDate);
  if (!Notifications || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return undefined;
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return undefined;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("future-memories", {
      name: "Future memories",
      description: "Amanat Diary sends reminders for future letters and diary memories.",
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
  return Notifications.scheduleNotificationAsync({
    content: {
      title: message.deliveryType === "unlock-later" ? "A memory is ready to open." : "Your future letter is waiting.",
      body: message.entryId ? "A diary page from your past is ready today." : "Open Amanat Diary to read it privately.",
      data: { futureMessageId: message.id, entryId: message.entryId, diaryId: message.diaryId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: Platform.OS === "android" ? "future-memories" : undefined },
  });
}

export async function cancelFutureNotification(notificationId?: string) {
  const Notifications = await notifications();
  if (Notifications && notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
}
