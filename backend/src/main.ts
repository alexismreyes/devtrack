import { loadConfig } from "./config/config";
import { loadEnvFiles } from "./config/env";
import { createApp } from "./app";
import { createPrismaClient } from "./infrastructure/prisma/client";
import { PrismaUnitOfWork } from "./infrastructure/prisma/prisma-unit-of-work";
import { PrismaAuthRepository } from "./modules/auth/repository/prisma-auth-repository";
import { PrismaProjectMembersRepository } from "./modules/project-members/repository/prisma-project-members-repository";
import { PrismaProjectsRepository } from "./modules/projects/repository/prisma-projects-repository";
import { PrismaSystemRepository } from "./modules/system/repository/prisma-system-repository";
import { PrismaActivityRepository } from "./modules/tasks/repository/prisma-activity-repository";
import { PrismaAttachmentsRepository } from "./modules/tasks/repository/prisma-attachments-repository";
import { PrismaChecklistsRepository } from "./modules/tasks/repository/prisma-checklists-repository";
import { PrismaCommentsRepository } from "./modules/tasks/repository/prisma-comments-repository";
import { PrismaLabelsRepository } from "./modules/tasks/repository/prisma-labels-repository";
import { PrismaTaskLabelsRepository } from "./modules/tasks/repository/prisma-task-labels-repository";
import { PrismaTasksRepository } from "./modules/tasks/repository/prisma-tasks-repository";
import { FilesystemAttachmentStorage } from "./modules/tasks/storage/filesystem-attachment-storage";
import { PrismaUsersRepository } from "./modules/users/repository/prisma-users-repository";

loadEnvFiles();

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const systemRepository = new PrismaSystemRepository(prisma);
const usersRepository = new PrismaUsersRepository(prisma);
const authRepository = new PrismaAuthRepository(prisma);
const projectsRepository = new PrismaProjectsRepository(prisma);
const tasksRepository = new PrismaTasksRepository(prisma);
const commentsRepository = new PrismaCommentsRepository(prisma);
const activityRepository = new PrismaActivityRepository(prisma);
const checklistsRepository = new PrismaChecklistsRepository(prisma);
const attachmentsRepository = new PrismaAttachmentsRepository(prisma);
const attachmentStorage = new FilesystemAttachmentStorage(
  config.attachmentsRoot,
);
const labelsRepository = new PrismaLabelsRepository(prisma);
const taskLabelsRepository = new PrismaTaskLabelsRepository(prisma);
const projectMembersRepository = new PrismaProjectMembersRepository(prisma);
const app = createApp({
  corsOrigin: config.corsOrigin,
  systemRepository,
  usersRepository,
  authRepository,
  projectsRepository,
  tasksRepository,
  commentsRepository,
  activityRepository,
  checklistsRepository,
  attachmentsRepository,
  attachmentStorage,
  labelsRepository,
  taskLabelsRepository,
  projectMembersRepository,
  unitOfWork: new PrismaUnitOfWork(prisma),
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`DevTrack API listening on port ${config.port}`);
});
