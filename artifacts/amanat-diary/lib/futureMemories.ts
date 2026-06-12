import type { FutureMessage } from "@/types";

export function futureUnlockDate(message: FutureMessage) {
  return message.unlockDate ?? message.deliveryDate;
}

export function isFutureMessageReady(message: FutureMessage) {
  return new Date(futureUnlockDate(message)).getTime() <= Date.now();
}

export function activeEntryLock(messages: FutureMessage[], entryId: string) {
  return messages.find(message =>
    message.entryId === entryId &&
    message.deliveryType === "unlock-later" &&
    message.status === "scheduled" &&
    !isFutureMessageReady(message),
  );
}

export function formatFutureDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
