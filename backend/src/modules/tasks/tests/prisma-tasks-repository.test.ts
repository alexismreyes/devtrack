import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { calendarDateFromString } from "../domain/task";
import { PrismaTasksRepository } from "../repository/prisma-tasks-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaTasksRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let users: PrismaUsersRepository | null = null;
  let projects: PrismaProjectsRepository | null = null;
  let tasks: PrismaTasksRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    users = new PrismaUsersRepository(prisma);
    projects = new PrismaProjectsRepository(prisma);
    tasks = new PrismaTasksRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "maps Prisma rows to domain tasks, lists non-deleted rows, and filters",
    async () => {
      if (!users || !projects || !tasks) {
        return;
      }

      const owner = await users.create({
        email: `task-owner-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const project = await projects.create({
        ownerUserId: owner.id,
        name: "Roadmap",
        description: null,
      });
      const otherProject = await projects.create({
        ownerUserId: owner.id,
        name: "Other",
        description: null,
      });

      const created = await tasks.create({
        projectId: project.id,
        title: "Shared",
        description: "One",
        status: "DONE",
        priority: "HIGH",
        dueDate: calendarDateFromString("2020-01-02"),
      });
      const duplicate = await tasks.create({
        projectId: project.id,
        title: "Shared",
        description: null,
        dueDate: null,
      });
      await tasks.create({
        projectId: otherProject.id,
        title: "Shared",
        description: null,
        dueDate: null,
      });
      await tasks.softDelete(created.id);

      const foundDeleted = await tasks.findById(created.id);
      const listed = await tasks.listByProjectId(project.id);
      const filtered = await tasks.listByProjectId(project.id, {
        status: "TODO",
        priority: "MEDIUM",
      });

      expect(foundDeleted?.id).toBe(created.id);
      expect(foundDeleted?.deletedAt).not.toBeNull();
      expect(foundDeleted?.projectId).toBe(project.id);
      expect(listed.map((task) => task.id)).toEqual([duplicate.id]);
      expect(filtered.map((task) => task.id)).toEqual([duplicate.id]);
      expect(foundDeleted).not.toHaveProperty("project");
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "soft-deletes by setting deletedAt and does not remove the row",
    async () => {
      if (!users || !projects || !tasks || !prisma) {
        return;
      }

      const owner = await users.create({
        email: `task-delete-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const project = await projects.create({
        ownerUserId: owner.id,
        name: "Roadmap",
        description: null,
      });
      const created = await tasks.create({
        projectId: project.id,
        title: "Write spec",
        description: null,
        dueDate: null,
      });
      const deleted = await tasks.softDelete(created.id);
      const row = await prisma.task.findUnique({
        where: { id: created.id },
      });

      expect(deleted.deletedAt).not.toBeNull();
      expect(row).not.toBeNull();
      expect(row?.deletedAt).not.toBeNull();
      expect(row?.title).toBe("Write spec");
    },
  );
});
