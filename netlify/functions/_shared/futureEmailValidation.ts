import { BackendError } from "./backendError";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BackendError("Request body must be a JSON object", 400);
  return value as Record<string, unknown>;
}

function text(value: unknown, name: string, max: number, required = true) {
  if (value === undefined || value === null) {
    if (required) throw new BackendError(`${name} is required`, 400);
    return "";
  }
  if (typeof value !== "string") throw new BackendError(`${name} must be text`, 400);
  const clean = value.trim();
  if (required && !clean) throw new BackendError(`${name} is required`, 400);
  if (clean.length > max) throw new BackendError(`${name} is too long`, 400);
  return clean;
}

function date(value: unknown) {
  const clean = text(value, "deliveryDate", 80);
  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) throw new BackendError("deliveryDate is invalid", 400);
  if (parsed.getTime() <= Date.now()) throw new BackendError("deliveryDate must be in the future", 400);
  return parsed.toISOString();
}

function optionalUuid(value: unknown) {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function timezone(value: unknown) {
  const clean = text(value, "timezone", 100, false);
  if (!clean) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: clean }).format();
  } catch {
    throw new BackendError("timezone is invalid", 400);
  }
  return clean;
}

export function validateScheduleEmail(input: unknown) {
  const value = object(input);
  const recipientEmail = text(value.recipientEmail, "recipientEmail", 320).toLowerCase();
  if (!EMAIL.test(recipientEmail)) throw new BackendError("recipientEmail is invalid", 400);
  if (value.consentConfirmed !== true) throw new BackendError("Consent is required before scheduling email delivery", 400);
  return {
    future_message_id: optionalUuid(value.futureMessageId),
    diary_id: optionalUuid(value.diaryId),
    entry_id: optionalUuid(value.entryId),
    recipient_name: text(value.recipientName, "recipientName", 120),
    recipient_email: recipientEmail,
    sender_name: text(value.senderName, "senderName", 120, false) || null,
    subject: text(value.subject, "subject", 200),
    message_text: text(value.messageText, "messageText", 20_000),
    delivery_date: date(value.deliveryDate),
    timezone: timezone(value.timezone),
    consent_confirmed: true,
  };
}

export function validateDeliveryId(input: unknown) {
  const id = text(object(input).id, "id", 80);
  if (!UUID.test(id)) throw new BackendError("id is invalid", 400);
  return id;
}

export function validateUpdateEmail(input: unknown) {
  const value = object(input);
  const id = validateDeliveryId(value);
  const schedule = validateScheduleEmail({ ...value, consentConfirmed: true });
  return { id, ...schedule };
}
