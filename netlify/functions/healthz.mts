import { json, methodNotAllowed, options } from "./_shared/http";

export default async (request: Request) => {
  if (request.method === "OPTIONS") return options();
  if (request.method !== "GET") return methodNotAllowed();
  return json({ status: "ok" });
};

export const config = { path: "/api/healthz" };
