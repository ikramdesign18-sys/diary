import { detectTheme } from "../../artifacts/api-server/src/services/aiEndpoints";
import { methodNotAllowed, options, readJson, safeError, json } from "./_shared/http";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "POST") return methodNotAllowed();
  try {
    return json(await detectTheme(await readJson(request)));
  } catch (error) {
    return safeError(error);
  }
};

export const config = { path: "/api/ai/theme-detect" };
