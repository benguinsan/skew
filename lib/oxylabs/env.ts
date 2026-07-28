import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOxylabsUsername(): string {
  return requireEnv("OXY_WSA_USERNAME");
}

export function getOxylabsPassword(): string {
  return requireEnv("OXY_WSA_PASSWORD");
}
