import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import {
  DatabaseUnavailableError,
  DuplicateMembershipError,
  MembershipNotFoundError,
} from "../domain/errors";
import {
  ProjectMember,
  type ProjectMemberRole,
} from "../domain/project-member";
import type {
  CreateMembershipInput,
  ProjectMembersRepository,
} from "./project-members-repository";

const MEMBER_SELECT = {
  id: true,
  projectId: true,
  userId: true,
  role: true,
  createdAt: true,
} as const;

const CONNECTION_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1009",
  "P1010",
  "P1011",
  "P1017",
  "P2024",
]);

function isConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_CODES.has(err.code)
  ) {
    return true;
  }
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (
      CONNECTION_CODES.has(code) ||
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND"
    ) {
      return true;
    }
  }
  return false;
}

function isMembershipUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

function isRecordNotFound(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025"
  );
}

function rethrowMapped(err: unknown): never {
  if (
    err instanceof DatabaseUnavailableError ||
    err instanceof DuplicateMembershipError ||
    err instanceof MembershipNotFoundError
  ) {
    throw err;
  }
  if (isMembershipUniqueViolation(err)) {
    throw new DuplicateMembershipError();
  }
  if (isRecordNotFound(err)) {
    throw new MembershipNotFoundError();
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toMember(row: {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: Date;
}): ProjectMember {
  return ProjectMember.rehydrate(
    row.id,
    row.projectId,
    row.userId,
    row.role,
    row.createdAt,
  );
}

export class PrismaProjectMembersRepository implements ProjectMembersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateMembershipInput): Promise<ProjectMember> {
    const member = ProjectMember.create(
      input.projectId,
      input.userId,
      input.role,
    );
    try {
      const row = await this.client().projectMember.create({
        data: {
          id: member.id,
          projectId: member.projectId,
          userId: member.userId,
          role: member.role,
          createdAt: member.createdAt,
        },
        select: MEMBER_SELECT,
      });
      return toMember(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByProjectId(projectId: string): Promise<ProjectMember[]> {
    try {
      const rows = await this.client().projectMember.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: MEMBER_SELECT,
      });
      return rows.map(toMember);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    try {
      const row = await this.client().projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId },
        },
        select: MEMBER_SELECT,
      });
      return row === null ? null : toMember(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listProjectIdsByUserId(userId: string): Promise<string[]> {
    try {
      const rows = await this.client().projectMember.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { projectId: true },
      });
      return rows.map((row) => row.projectId);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listDistinctUserIdsByProjectIds(
    projectIds: string[],
  ): Promise<string[]> {
    if (projectIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().projectMember.findMany({
        where: { projectId: { in: projectIds } },
        distinct: ["userId"],
        select: { userId: true },
      });
      return rows.map((row) => row.userId);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async deleteByProjectAndUser(
    projectId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.client().projectMember.delete({
        where: {
          projectId_userId: { projectId, userId },
        },
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async updateRole(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
  ): Promise<ProjectMember> {
    try {
      const row = await this.client().projectMember.update({
        where: {
          projectId_userId: { projectId, userId },
        },
        data: { role },
        select: MEMBER_SELECT,
      });
      return toMember(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
