import { getDatabase } from "@/db/database";
import { futureMessageFromRow } from "@/db/mappers";
import type { FutureMessage } from "@/types";

export async function upsertFutureMessage(message: FutureMessage) {
  const db = getDatabase();
  if (!db) return;
  const updatedAt = message.updatedAt ?? message.createdAt;
  await db.runAsync(
    `INSERT INTO future_messages (id,entryId,diaryId,title,body,voiceNoteId,recipientName,recipientEmail,deliveryDate,deliveryType,status,notificationId,unlockDate,emailDeliveryId,emailDeliveryStatus,emailDeliveryMode,consentConfirmed,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET entryId=excluded.entryId,diaryId=excluded.diaryId,title=excluded.title,body=excluded.body,
     voiceNoteId=excluded.voiceNoteId,recipientName=excluded.recipientName,recipientEmail=excluded.recipientEmail,deliveryDate=excluded.deliveryDate,
     deliveryType=excluded.deliveryType,status=excluded.status,notificationId=excluded.notificationId,unlockDate=excluded.unlockDate,
     emailDeliveryId=excluded.emailDeliveryId,emailDeliveryStatus=excluded.emailDeliveryStatus,emailDeliveryMode=excluded.emailDeliveryMode,
     consentConfirmed=excluded.consentConfirmed,updatedAt=excluded.updatedAt`,
    message.id, message.entryId ?? null, message.diaryId ?? null, message.title, message.body, message.voiceNoteId ?? null,
    message.recipientName, message.recipientEmail ?? null, message.deliveryDate, message.deliveryType, message.status,
    message.notificationId ?? null, message.unlockDate ?? null, message.emailDeliveryId ?? null, message.emailDeliveryStatus ?? null,
    message.emailDeliveryMode ?? null, message.consentConfirmed ? 1 : 0, message.createdAt, updatedAt,
  );
}

export async function listFutureMessages() {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>("SELECT * FROM future_messages ORDER BY deliveryDate")).map(futureMessageFromRow);
}

export async function getFutureMessageById(id: string) {
  const db = getDatabase();
  if (!db) return null;
  const row = await db.getFirstAsync<any>("SELECT * FROM future_messages WHERE id=?", id);
  return row ? futureMessageFromRow(row) : null;
}

export async function listUpcomingFutureMessages() {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>("SELECT * FROM future_messages WHERE status='scheduled' AND deliveryDate>? ORDER BY deliveryDate", new Date().toISOString())).map(futureMessageFromRow);
}

export async function listUnlockedFutureMessages() {
  const db = getDatabase();
  if (!db) return [];
  return (await db.getAllAsync<any>("SELECT * FROM future_messages WHERE status='unlocked' OR (status='scheduled' AND COALESCE(unlockDate,deliveryDate)<=?) ORDER BY deliveryDate DESC", new Date().toISOString())).map(futureMessageFromRow);
}

export async function updateFutureMessage(message: FutureMessage) {
  await upsertFutureMessage({ ...message, updatedAt: new Date().toISOString() });
}

export async function cancelFutureMessage(id: string) {
  const db = getDatabase();
  if (db) await db.runAsync("UPDATE future_messages SET status='canceled',updatedAt=? WHERE id=?", new Date().toISOString(), id);
}

export async function markFutureMessageUnlocked(id: string) {
  const db = getDatabase();
  if (db) await db.runAsync("UPDATE future_messages SET status='unlocked',updatedAt=? WHERE id=?", new Date().toISOString(), id);
}

export async function attachNotificationId(id: string, notificationId: string | null) {
  const db = getDatabase();
  if (db) await db.runAsync("UPDATE future_messages SET notificationId=?,updatedAt=? WHERE id=?", notificationId, new Date().toISOString(), id);
}
