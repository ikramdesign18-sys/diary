import { json, safeError } from "./_shared/http";
import { processFutureEmails } from "./_shared/processFutureEmails";

export default async () => {
  try {
    return json(await processFutureEmails());
  } catch (error) {
    return safeError(error);
  }
};

export const config = { schedule: "@hourly" };
