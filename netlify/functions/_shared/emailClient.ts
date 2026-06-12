import { BackendError } from "./backendError";
import { requiredEnv } from "./env";
import type { FutureEmailDeliveryRow } from "./supabaseAdmin";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function sendFutureMemoryEmail(delivery: FutureEmailDeliveryRow) {
  if (!EMAIL.test(delivery.recipient_email)) throw new BackendError("Recipient email is invalid", 400);
  const sender = delivery.sender_name || "someone who cares about you";
  const date = new Date(delivery.delivery_date).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short", timeZone: delivery.timezone || "UTC" });
  const text = `Dear ${delivery.recipient_name},\n\n${delivery.message_text}\n\nScheduled for ${date}.\n\nThis memory was scheduled by the sender in Amanat Diary.`;
  const html = `<!doctype html><html><body style="margin:0;background:#fbf6ec;color:#493b30;font-family:Georgia,serif;padding:28px">
    <div style="max-width:620px;margin:auto;background:#fffaf0;border:1px solid #eadbc5;border-radius:20px;padding:38px">
      <div style="color:#a47d55;font-size:12px;letter-spacing:2px;text-transform:uppercase">Amanat Diary</div>
      <h1 style="font-size:28px;line-height:1.3;margin:18px 0">A future memory from ${escapeHtml(sender)}</h1>
      <p style="color:#8a6847">Dear ${escapeHtml(delivery.recipient_name)},</p>
      <div style="white-space:pre-wrap;font-size:17px;line-height:1.8;margin:28px 0">${escapeHtml(delivery.message_text)}</div>
      <p style="font-size:12px;color:#8a6847;border-top:1px solid #eadbc5;padding-top:18px">Scheduled for ${escapeHtml(date)}.<br>This memory was scheduled by the sender in Amanat Diary.</p>
    </div></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: requiredEnv("EMAIL_FROM"), to: [delivery.recipient_email], subject: delivery.subject, html, text }),
  });
  if (!response.ok) throw new BackendError("Email provider rejected the delivery", 502);
  const result = await response.json() as { id?: unknown };
  if (typeof result.id !== "string") throw new BackendError("Email provider returned an invalid response", 502);
  return result.id;
}
