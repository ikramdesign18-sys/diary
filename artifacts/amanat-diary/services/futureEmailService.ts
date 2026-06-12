import { supabase } from "@/lib/supabase";

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

export type FutureEmailStatus = "scheduled" | "processing" | "delivered" | "failed" | "cancelled";

export interface FutureEmailDelivery {
  id: string;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  delivery_date: string;
  status: FutureEmailStatus;
  delivery_attempts: number;
  delivered_at?: string | null;
  last_error?: string | null;
}

export interface FutureEmailInput {
  futureMessageId?: string;
  diaryId?: string;
  entryId?: string;
  recipientName: string;
  recipientEmail: string;
  senderName?: string;
  subject: string;
  messageText: string;
  deliveryDate: string;
  timezone?: string;
  consentConfirmed: true;
}

async function authenticatedRequest<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  if (!apiBaseUrl || !supabase) throw new Error("Automatic email delivery is not configured.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Login is required for automatic email delivery.");
  if (!data.session.user.email_confirmed_at) throw new Error("Verify your email before scheduling automatic delivery.");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Automatic email delivery is unavailable.");
  return payload as T;
}

export async function scheduleFutureEmail(input: FutureEmailInput) {
  return authenticatedRequest<{ delivery: FutureEmailDelivery }>("/api/future-email/schedule", "POST", input);
}

export async function updateFutureEmail(id: string, input: FutureEmailInput) {
  return authenticatedRequest<{ delivery: FutureEmailDelivery }>("/api/future-email/update", "POST", { id, ...input });
}

export async function cancelFutureEmail(id: string) {
  return authenticatedRequest<{ delivery: FutureEmailDelivery }>("/api/future-email/cancel", "POST", { id });
}

export async function listFutureEmails() {
  return authenticatedRequest<{ deliveries: FutureEmailDelivery[] }>("/api/future-email/list", "GET");
}
