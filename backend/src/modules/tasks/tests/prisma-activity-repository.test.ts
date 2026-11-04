import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { TaskActivityEvent } from "../domain/task-activity";
import { PrismaActivityRepository } from "../repository/prisma-activity-repository";
import { PrismaTasksRepository } from "../repository/prisma-tasks-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaActivityRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let users: PrismaUsersRepository | null = null;
  let projects: PrismaProjectsRepository | null = null;
  let tasks: PrismaTasksRepository | null = null;
  let activity: PrismaActivityRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    users = new PrismaUsersRepository(prisma);
    projects = new PrismaProjectsRepository(prisma);
    tasks = new PrismaTasksRepository(prisma);
    activity = new PrismaActivityRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "persists activity and lists newest createdAt first",
    async () => {
      if (!users || !projects || !tasks || !activity) {
        return;
      }

      const owner = await users.create({
        email: `activity-owner-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const project = await projects.create({
        ownerUserId: owner.id,
        name: "Roadmap",
        description: null,
      });
      const task = await tasks.create({
        projectId: project.id,
        title: "Track me",
        description: null,
        dueDate: null,
      });

      const older = TaskActivityEvent.taskCreated(
        task.id,
        owner.id,
        new Date("2026-11-01T10:00:00.000Z"),
      );
      const newer = TaskActivityEvent.taskFieldsChanged(
        task.id,
        owner.id,
        [
          {
            field: "status",
            oldValue: "TODO",
            newValue: "DONE",
          },
        ],
        new Date("2026-11-03T10:00:00.000Z"),
      );

      await activity.create(older);
      await activity.create(newer);

      const listed = await activity.listByTaskId(task.id);
      expect(listed.map((event) => event.id)).toEqual([newer.id, older.id]);
      expect(listed[0]?.kind).toBe("TASK_FIELDS_CHANGED");
      expect(listed[0]?.payload).toEqual({
        changes: [
          {
            field: "status",
            oldValue: "TODO",
            newValue: "DONE",
          },
        ],
      });
    },
  );
});
