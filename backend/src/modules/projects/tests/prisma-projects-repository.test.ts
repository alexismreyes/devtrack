import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { ProjectArchivedError } from "../domain/errors";
import { PrismaProjectsRepository } from "../repository/prisma-projects-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaProjectsRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let users: PrismaUsersRepository | null = null;
  let projects: PrismaProjectsRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    users = new PrismaUsersRepository(prisma);
    projects = new PrismaProjectsRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "maps Prisma rows to domain projects and lists active owned rows only",
    async () => {
      if (!users || !projects) {
        return;
      }

      const owner = await users.create({
        email: `proj-owner-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const other = await users.create({
        email: `proj-other-${randomUUID()}@example.com`,
        displayName: "Grace",
      });

      const created = await projects.create({
        ownerUserId: owner.id,
        name: "Roadmap",
        description: "Q1",
      });
      const duplicate = await projects.create({
        ownerUserId: owner.id,
        name: "Roadmap",
        description: null,
      });
      await projects.create({
        ownerUserId: other.id,
        name: "Roadmap",
        description: null,
      });
      await projects.archive(created.id);

      const found = await projects.findById(created.id);
      const listed = await projects.listByOwnerId(owner.id);

      expect(found?.id).toBe(created.id);
      expect(found?.ownerUserId).toBe(owner.id);
      expect(found?.archivedAt).not.toBeNull();
      expect(listed.map((project) => project.id)).toEqual([duplicate.id]);
      expect(found).not.toHaveProperty("owner");
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "rejects update of an archived project and clears archivedAt on unarchive",
    async () => {
      if (!users || !projects) {
        return;
      }

      const owner = await users.create({
        email: `proj-archive-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const created = await projects.create({
        ownerUserId: owner.id,
        name: "Roadmap",
        description: "First",
      });
      const archived = await projects.archive(created.id);
      const archivedAgain = await projects.archive(created.id);

      await expect(
        projects.update(created.id, { name: "Blocked" }),
      ).rejects.toBeInstanceOf(ProjectArchivedError);

      const unarchived = await projects.unarchive(created.id);
      const updated = await projects.update(created.id, {
        description: "After",
      });

      expect(archivedAgain.archivedAt?.toISOString()).toBe(
        archived.archivedAt?.toISOString(),
      );
      expect(unarchived.archivedAt).toBeNull();
      expect(updated.name).toBe("Roadmap");
      expect(updated.description).toBe("After");
      expect(updated.ownerUserId).toBe(owner.id);
    },
  );
});
