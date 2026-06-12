import { BackendError } from "./_shared/backendError";
import { validateUpdateEmail } from "./_shared/futureEmailValidation";
import { json, methodNotAllowed, options, readJson, safeError } from "./_shared/http";
import { requireAuthUser, servicePatch, type FutureEmailDeliveryRow } from "./_shared/supabaseAdmin";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return methodNotAllowed();
  try {
    const user = await requireAuthUser(request);
    const { id, future_message_id, diary_id, entry_id, ...updates } = validateUpdateEmail(await readJson(request));
    const subject = `A future memory from ${updates.sender_name || "someone who cares about you"}`;
    const deliveries = await servicePatch<FutureEmailDeliveryRow>(
      "future_email_deliveries",
      `id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&status=eq.scheduled`,
      { ...updates, subject, updated_at: new Date().toISOString(), last_error: null },
    );
    if (deliveries.length !== 1) throw new BackendError("Only your scheduled deliveries can be updated", 409);
    return json({ delivery: deliveries[0] });
  } catch (error) {
    return safeError(error);
  }
};

export const config = { path: "/api/future-email/update" };
