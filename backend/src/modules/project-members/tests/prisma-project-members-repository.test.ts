import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { DuplicateMembershipError } from "../domain/errors";
import { PrismaProjectMembersRepository } from "../repository/prisma-project-members-repository";

loadEnvFiles();
process.env.CORS_ORIGIN ??= "http://localhost:5173";
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe("PrismaProjectMembersRepository", () => {
  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let users: PrismaUsersRepository | null = null;
  let projects: PrismaProjectsRepository | null = null;
  let members: PrismaProjectMembersRepository | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    users = new PrismaUsersRepository(prisma);
    projects = new PrismaProjectsRepository(prisma);
    members = new PrismaProjectMembersRepository(prisma);
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "maps Prisma rows to domain members, enforces uniqueness, and lists by project and user",
    async () => {
      if (!users || !projects || !members || !prisma) {
        return;
      }

      const owner = await users.create({
        email: `member-owner-${randomUUID()}@example.com`,
        displayName: "Ada",
      });
      const editor = await users.create({
        email: `member-editor-${randomUUID()}@example.com`,
        displayName: "Grace",
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

      const created = await members.create({
        projectId: project.id,
        userId: owner.id,
        role: "OWNER",
      });
      const second = await members.create({
        projectId: project.id,
        userId: editor.id,
        role: "EDITOR",
      });
      await members.create({
        projectId: otherProject.id,
        userId: editor.id,
        role: "VIEWER",
      });

      await expect(
        members.create({
          projectId: project.id,
          userId: editor.id,
          role: "VIEWER",
        }),
      ).rejects.toBeInstanceOf(DuplicateMembershipError);

      await expect(
        prisma.user.delete({ where: { id: editor.id } }),
      ).rejects.toThrow();

      const found = await members.findByProjectAndUser(project.id, editor.id);
      const listed = await members.listByProjectId(project.id);
      const projectIds = await members.listProjectIdsByUserId(editor.id);
      const updated = await members.updateRole(project.id, editor.id, "VIEWER");
      await members.deleteByProjectAndUser(project.id, editor.id);
      const afterDelete = await members.findByProjectAndUser(
        project.id,
        editor.id,
      );

      expect(created.userId).toBe(owner.id);
      expect(created.role).toBe("OWNER");
      expect(found?.id).toBe(second.id);
      expect(listed.map((member) => member.id)).toEqual([second.id, created.id]);
      expect(projectIds).toEqual([otherProject.id, project.id]);
      expect(updated.role).toBe("VIEWER");
      expect(afterDelete).toBeNull();
      expect(found).not.toHaveProperty("project");
      expect(found).not.toHaveProperty("user");
    },
  );
});
