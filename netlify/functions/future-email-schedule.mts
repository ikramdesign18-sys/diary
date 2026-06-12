import { json, methodNotAllowed, options, readJson, safeError } from "./_shared/http";
import { validateScheduleEmail } from "./_shared/futureEmailValidation";
import { requireAuthUser, serviceInsert, type FutureEmailDeliveryRow } from "./_shared/supabaseAdmin";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return methodNotAllowed();
  try {
    const user = await requireAuthUser(request);
    const value = validateScheduleEmail(await readJson(request));
    const subject = `A future memory from ${value.sender_name || "someone who cares about you"}`;
    const delivery = await serviceInsert<FutureEmailDeliveryRow>("future_email_deliveries", {
      ...value,
      subject,
      user_id: user.id,
      status: "scheduled",
      delivery_attempts: 0,
    });
    return json({ delivery }, 201);
  } catch (error) {
    return safeError(error);
  }
};

export const config = { path: "/api/future-email/schedule" };
