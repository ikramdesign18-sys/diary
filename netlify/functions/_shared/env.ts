declare const process: {
  env: Record<string, string | undefined>;
};

export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value || value.includes("replace_with")) throw new Error(`${name} is not configured`);
  return value;
}
