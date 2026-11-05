import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { PrismaChecklistsRepository } from "../repository/prisma-checklists-repository";
import { PrismaTasksRepository } from "../repository/prisma-tasks-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaChecklistsRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let users: PrismaUsersRepository | null = null;
  let projects: PrismaProjectsRepository | null = null;
  let tasks: PrismaTasksRepository | null = null;
  let checklists: PrismaChecklistsRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    users = new PrismaUsersRepository(prisma);
    projects = new PrismaProjectsRepository(prisma);
    tasks = new PrismaTasksRepository(prisma);
    checklists = new PrismaChecklistsRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "lists nested items by createdAt and cascades hard-delete",
    async () => {
      if (!users || !projects || !tasks || !checklists) {
        return;
      }

      const owner = await users.create({
        email: `checklist-owner-${randomUUID()}@example.com`,
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

      const first = await checklists.create({
        taskId: task.id,
        name: "First",
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const second = await checklists.create({
        taskId: task.id,
        name: "Second",
      });
      const itemA = await checklists.createItem({
        checklistId: first.id,
        text: "A",
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      const itemB = await checklists.createItem({
        checklistId: first.id,
        text: "B",
      });

      const listed = await checklists.listByTaskId(task.id);
      expect(listed.map((entry) => entry.id)).toEqual([first.id, second.id]);
      expect(listed[0]?.items.map((item) => item.id)).toEqual([
        itemA.id,
        itemB.id,
      ]);
      expect(itemA.checked).toBe(false);

      const snapshot = await checklists.delete(first.id);
      expect(snapshot.name).toBe("First");
      expect(await checklists.findByIdInTask(task.id, first.id)).toBeNull();
      expect(
        await checklists.findItemByIdInChecklist(first.id, itemA.id),
      ).toBeNull();
      expect(await checklists.listByTaskId(task.id)).toHaveLength(1);
    },
  );
});
