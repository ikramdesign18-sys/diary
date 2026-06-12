import { json, methodNotAllowed, options, safeError } from "./_shared/http";
import { transcribeAudio } from "./_shared/transcribeAudio";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return methodNotAllowed();
  try {
    return json(await transcribeAudio(request));
  } catch (error) {
    return safeError(error);
  }
};

export const config = { path: "/api/ai/transcribe-audio" };
