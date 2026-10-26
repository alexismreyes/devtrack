export type AppConfig = {
  port: number;
  corsOrigin: string;
  databaseUrl: string;
};

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const corsOrigin = required(env, "CORS_ORIGIN");
  const databaseUrl = required(env, "DATABASE_URL");
  const portRaw = env.PORT ?? "3000";
  const port = Number(portRaw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return { port, corsOrigin, databaseUrl };
}
