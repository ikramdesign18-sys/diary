import { AiServiceError } from "../../../artifacts/api-server/src/services/groqClient";
import { ValidationError } from "../../../artifacts/api-server/src/utils/validateAiRequest";

const headers = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers });
}

export function options() {
  return new Response(null, { status: 204, headers });
}

export function methodNotAllowed() {
  return json({ error: "Method not allowed", fallbackAllowed: true }, 405);
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}

export function safeError(error: unknown) {
  if (error instanceof ValidationError) return json({ error: error.message, fallbackAllowed: true }, error.status);
  if (error instanceof AiServiceError) return json({ error: error.message, fallbackAllowed: error.fallbackAllowed }, error.status);
  return json({ error: "AI request failed safely", fallbackAllowed: true }, 500);
}
