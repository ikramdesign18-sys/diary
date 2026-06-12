import { sendFutureMemoryEmail } from "./emailClient";
import { servicePatch, serviceSelect, type FutureEmailDeliveryRow } from "./supabaseAdmin";

const TABLE = "future_email_deliveries";
const safeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Delivery failed";
  return message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b(?:Bearer\s+)?eyJ[\w.-]+/g, "[token]")
    .replace(/\b(?:re_|gsk_)[A-Za-z0-9_-]+/g, "[key]")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email]")
    .slice(0, 300);
};

export interface DeliverySummary {
  processed: number;
  delivered: number;
  failed: number;
  retried: number;
}

export async function processFutureEmails(): Promise<DeliverySummary> {
  const now = new Date().toISOString();
  const due = await serviceSelect<FutureEmailDeliveryRow>(
    TABLE,
    `select=*&status=eq.scheduled&consent_confirmed=eq.true&delivery_date=lte.${encodeURIComponent(now)}&order=delivery_date.asc&limit=25`,
  );
  const summary: DeliverySummary = { processed: 0, delivered: 0, failed: 0, retried: 0 };

  for (const delivery of due) {
    const attempts = delivery.delivery_attempts + 1;
    const claimed = await servicePatch<FutureEmailDeliveryRow>(
      TABLE,
      `id=eq.${encodeURIComponent(delivery.id)}&status=eq.scheduled&consent_confirmed=eq.true`,
      { status: "processing", delivery_attempts: attempts, last_attempt_at: now, updated_at: now, last_error: null },
    );
    if (claimed.length !== 1) continue;
    summary.processed++;
    console.info("[future-email]", { id: delivery.id, status: "processing" });

    try {
      const resendId = await sendFutureMemoryEmail(claimed[0]);
      await servicePatch(TABLE, `id=eq.${encodeURIComponent(delivery.id)}&status=eq.processing`, {
        status: "delivered",
        delivered_at: new Date().toISOString(),
        resend_email_id: resendId,
        updated_at: new Date().toISOString(),
        last_error: null,
      });
      summary.delivered++;
      console.info("[future-email]", { id: delivery.id, status: "delivered" });
    } catch (error) {
      const terminal = attempts >= 3;
      await servicePatch(TABLE, `id=eq.${encodeURIComponent(delivery.id)}&status=eq.processing`, {
        status: terminal ? "failed" : "scheduled",
        updated_at: new Date().toISOString(),
        last_error: safeError(error),
      });
      if (terminal) summary.failed++;
      else summary.retried++;
      console.info("[future-email]", { id: delivery.id, status: terminal ? "failed" : "retry_scheduled" });
    }
  }
  return summary;
}
