import { json, methodNotAllowed, options } from "./_shared/http";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return methodNotAllowed();
  return json({ error: "Audio transcription backend is not configured yet", fallbackAllowed: true }, 501);
};

export const config = { path: "/api/ai/transcribe-audio" };
