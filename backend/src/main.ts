import { loadConfig } from "./config/config";
import { loadEnvFiles } from "./config/env";
import { createApp } from "./app";
import { createPrismaClient } from "./infrastructure/prisma/client";
import { PrismaAuthRepository } from "./modules/auth/repository/prisma-auth-repository";
import { PrismaProjectsRepository } from "./modules/projects/repository/prisma-projects-repository";
import { PrismaSystemRepository } from "./modules/system/repository/prisma-system-repository";
import { PrismaTasksRepository } from "./modules/tasks/repository/prisma-tasks-repository";
import { PrismaUsersRepository } from "./modules/users/repository/prisma-users-repository";

loadEnvFiles();

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const systemRepository = new PrismaSystemRepository(prisma);
const usersRepository = new PrismaUsersRepository(prisma);
const authRepository = new PrismaAuthRepository(prisma);
const projectsRepository = new PrismaProjectsRepository(prisma);
const tasksRepository = new PrismaTasksRepository(prisma);
const app = createApp({
  corsOrigin: config.corsOrigin,
  systemRepository,
  usersRepository,
  authRepository,
  projectsRepository,
  tasksRepository,
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`DevTrack API listening on port ${config.port}`);
});
