import { loadConfig } from "./config/config";
import { loadEnvFiles } from "./config/env";
import { createApp } from "./app";
import { createPrismaClient } from "./infrastructure/prisma/client";
import { PrismaSystemRepository } from "./modules/system/repository/prisma-system-repository";

loadEnvFiles();

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const systemRepository = new PrismaSystemRepository(prisma);
const app = createApp({
  corsOrigin: config.corsOrigin,
  systemRepository,
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`DevTrack API listening on port ${config.port}`);
});
