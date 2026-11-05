import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { DuplicateLabelNameError } from "../domain/errors";
import { PrismaLabelsRepository } from "../repository/prisma-labels-repository";
import { PrismaTaskLabelsRepository } from "../repository/prisma-task-labels-repository";
import { PrismaTasksRepository } from "../repository/prisma-tasks-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaLabelsRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let users: PrismaUsersRepository | null = null;
  let projects: PrismaProjectsRepository | null = null;
  let tasks: PrismaTasksRepository | null = null;
  let labels: PrismaLabelsRepository | null = null;
  let taskLabels: PrismaTaskLabelsRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    users = new PrismaUsersRepository(prisma);
    projects = new PrismaProjectsRepository(prisma);
    tasks = new PrismaTasksRepository(prisma);
    labels = new PrismaLabelsRepository(prisma);
    taskLabels = new PrismaTaskLabelsRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "enforces unique nameKey, filters tasks by labelId, and cascades join cleanup",
    async () => {
      if (!users || !projects || !tasks || !labels || !taskLabels) {
        return;
      }

      const owner = await users.create({
        email: `label-owner-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const project = await projects.create({
        ownerUserId: owner.id,
        name: "Roadmap",
        description: null,
      });
      const task = await tasks.create({
        projectId: project.id,
        title: "Work",
        description: null,
        dueDate: null,
      });
      const other = await tasks.create({
        projectId: project.id,
        title: "Other",
        description: null,
        dueDate: null,
      });

      const bug = await labels.create({
        projectId: project.id,
        name: "Bug",
        color: "RED",
      });
      await expect(
        labels.create({
          projectId: project.id,
          name: "bug",
          color: "BLUE",
        }),
      ).rejects.toBeInstanceOf(DuplicateLabelNameError);

      await taskLabels.replaceSetForTask(task.id, [bug.id]);
      const filtered = await tasks.listByProjectId(project.id, {
        labelId: bug.id,
      });
      expect(filtered.map((row) => row.id)).toEqual([task.id]);

      await labels.delete(bug.id);
      const after = await taskLabels.listForTaskIds([task.id, other.id]);
      expect(after.get(task.id)).toEqual([]);
      expect(after.get(other.id)).toEqual([]);
    },
  );
});
