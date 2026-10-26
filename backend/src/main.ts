import { loadConfig } from "./config/config";
import { loadEnvFiles } from "./config/env";
import { createApp } from "./app";
import { createPrismaClient } from "./infrastructure/prisma/client";
import { PrismaAuthRepository } from "./modules/auth/repository/prisma-auth-repository";
import { PrismaSystemRepository } from "./modules/system/repository/prisma-system-repository";
import { PrismaUsersRepository } from "./modules/users/repository/prisma-users-repository";

loadEnvFiles();

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const systemRepository = new PrismaSystemRepository(prisma);
const usersRepository = new PrismaUsersRepository(prisma);
const authRepository = new PrismaAuthRepository(prisma);
const app = createApp({
  corsOrigin: config.corsOrigin,
  systemRepository,
  usersRepository,
  authRepository,
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`DevTrack API listening on port ${config.port}`);
});
