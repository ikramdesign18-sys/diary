import { BackendError } from "./backendError";
import { requiredEnv } from "./env";

export interface AuthUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
}

export interface FutureEmailDeliveryRow {
  id: string;
  user_id: string;
  recipient_name: string;
  recipient_email: string;
  sender_name: string | null;
  subject: string;
  message_text: string;
  delivery_date: string;
  timezone: string | null;
  status: "scheduled" | "processing" | "delivered" | "failed" | "cancelled";
  consent_confirmed: boolean;
  delivery_attempts: number;
  last_attempt_at: string | null;
  delivered_at: string | null;
  last_error: string | null;
  resend_email_id: string | null;
  created_at: string;
  updated_at: string;
}

const url = () => requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
const serviceKey = () => requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const serviceHeaders = (extra?: HeadersInit) => ({
  apikey: serviceKey(),
  Authorization: `Bearer ${serviceKey()}`,
  "Content-Type": "application/json",
  ...extra,
});

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = response.status >= 500 ? "Cloud delivery service is unavailable" : "Cloud delivery request was rejected";
    throw new BackendError(message, response.status);
  }
  return await response.json() as T;
}

export async function requireAuthUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) throw new BackendError("Login required", 401);
  const response = await fetch(`${url()}/auth/v1/user`, {
    headers: { apikey: serviceKey(), Authorization: authorization },
  });
  const user = await responseJson<AuthUser>(response);
  if (!user.id) throw new BackendError("Login required", 401);
  if (!user.email_confirmed_at) throw new BackendError("Verify your email before scheduling automatic delivery", 403);
  return user;
}

export async function serviceSelect<T>(table: string, query: string) {
  return responseJson<T[]>(await fetch(`${url()}/rest/v1/${table}?${query}`, {
    headers: serviceHeaders({ Accept: "application/json" }),
  }));
}

export async function serviceInsert<T>(table: string, body: unknown) {
  const rows = await responseJson<T[]>(await fetch(`${url()}/rest/v1/${table}`, {
    method: "POST",
    headers: serviceHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(body),
  }));
  return rows[0];
}

export async function servicePatch<T>(table: string, query: string, body: unknown) {
  return responseJson<T[]>(await fetch(`${url()}/rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: serviceHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(body),
  }));
}
