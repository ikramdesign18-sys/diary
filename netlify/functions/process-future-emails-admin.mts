import { BackendError } from "./_shared/backendError";
import { requiredEnv } from "./_shared/env";
import { json, methodNotAllowed, options, safeError } from "./_shared/http";
import { processFutureEmails } from "./_shared/processFutureEmails";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return methodNotAllowed();
  try {
    if (request.headers.get("x-cron-secret") !== requiredEnv("CRON_SECRET")) throw new BackendError("Not authorized", 401);
    return json(await processFutureEmails());
  } catch (error) {
    return safeError(error);
  }
};

export const config = { path: "/api/process-future-emails" };
