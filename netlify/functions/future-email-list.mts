import { json, methodNotAllowed, options, safeError } from "./_shared/http";
import { requireAuthUser, serviceSelect, type FutureEmailDeliveryRow } from "./_shared/supabaseAdmin";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "GET") return methodNotAllowed();
  try {
    const user = await requireAuthUser(request);
    const deliveries = await serviceSelect<FutureEmailDeliveryRow>(
      "future_email_deliveries",
      `select=*&user_id=eq.${encodeURIComponent(user.id)}&order=delivery_date.desc`,
    );
    return json({ deliveries });
  } catch (error) {
    return safeError(error);
  }
};

export const config = { path: "/api/future-email/list" };
