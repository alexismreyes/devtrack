import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import {
  DatabaseUnavailableError,
  DuplicateStatusNameError,
  StatusNotFoundError,
} from "../domain/errors";
import {
  applyStatusReorder,
  nextCustomStatusPosition,
  ProjectStatus,
  SEEDED_STATUS_DEFINITIONS,
  sortStatusesByPositionAsc,
} from "../domain/project-status";
import type {
  CreateStatusInput,
  StatusesRepository,
  UpdateStatusInput,
} from "./statuses-repository";

const STATUS_SELECT = {
  id: true,
  projectId: true,
  key: true,
  name: true,
  nameKey: true,
  color: true,
  isSystem: true,
  isCompleted: true,
  position: true,
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

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

function rethrowMapped(err: unknown): never {
  if (
    err instanceof DatabaseUnavailableError ||
    err instanceof StatusNotFoundError ||
    err instanceof DuplicateStatusNameError
  ) {
    throw err;
  }
  if (isUniqueViolation(err)) {
    throw new DuplicateStatusNameError();
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toStatus(row: {
  id: string;
  projectId: string;
  key: string;
  name: string;
  color: string;
  isSystem: boolean;
  isCompleted: boolean;
  position: number;
  createdAt: Date;
}): ProjectStatus {
  return ProjectStatus.rehydrate(
    row.id,
    row.projectId,
    row.key,
    row.name,
    row.color,
    row.isSystem,
    row.isCompleted,
    row.position,
    row.createdAt,
  );
}

export class PrismaStatusesRepository implements StatusesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateStatusInput): Promise<ProjectStatus> {
    const existing = await this.listByProjectId(input.projectId);
    const status = ProjectStatus.createCustom(
      input.projectId,
      input.name,
      input.color,
      nextCustomStatusPosition(existing),
      input.isCompleted ?? false,
    );
    try {
      const row = await this.client().projectStatus.create({
        data: {
          id: status.id,
          projectId: status.projectId,
          key: status.key,
          name: status.name,
          nameKey: status.nameKey,
          color: status.color,
          isSystem: status.isSystem,
          isCompleted: status.isCompleted,
          position: status.position,
          createdAt: status.createdAt,
        },
        select: STATUS_SELECT,
      });
      return toStatus(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByIdInProject(
    projectId: string,
    statusId: string,
  ): Promise<ProjectStatus | null> {
    try {
      const row = await this.client().projectStatus.findFirst({
        where: { id: statusId, projectId },
        select: STATUS_SELECT,
      });
      return row === null ? null : toStatus(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByKeyInProject(
    projectId: string,
    key: string,
  ): Promise<ProjectStatus | null> {
    try {
      const row = await this.client().projectStatus.findFirst({
        where: { projectId, key },
        select: STATUS_SELECT,
      });
      return row === null ? null : toStatus(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByProjectId(projectId: string): Promise<ProjectStatus[]> {
    try {
      const rows = await this.client().projectStatus.findMany({
        where: { projectId },
        select: STATUS_SELECT,
        orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      });
      return rows.map(toStatus);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByProjectIds(projectIds: string[]): Promise<ProjectStatus[]> {
    if (projectIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().projectStatus.findMany({
        where: { projectId: { in: projectIds } },
        select: STATUS_SELECT,
        orderBy: [
          { projectId: "asc" },
          { position: "asc" },
          { createdAt: "asc" },
          { id: "asc" },
        ],
      });
      return rows.map(toStatus);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async update(id: string, input: UpdateStatusInput): Promise<ProjectStatus> {
    const existing = await this.findByIdOnly(id);
    if (existing === null) {
      throw new StatusNotFoundError();
    }
    const updated = existing.withDetails(input);
    try {
      const row = await this.client().projectStatus.update({
        where: { id },
        data: {
          name: updated.name,
          nameKey: updated.nameKey,
          color: updated.color,
          isCompleted: updated.isCompleted,
        },
        select: STATUS_SELECT,
      });
      return toStatus(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client().projectStatus.delete({
        where: { id },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        throw new StatusNotFoundError();
      }
      rethrowMapped(err);
    }
  }

  async reorder(
    projectId: string,
    orderedIds: string[],
  ): Promise<ProjectStatus[]> {
    const existing = await this.listByProjectId(projectId);
    const reordered = applyStatusReorder(existing, orderedIds);
    try {
      // Two-phase write avoids unique (projectId, position) collisions mid-update.
      // Both phases share one transaction so mid-failure cannot leave mixed positions.
      const offset = existing.length + 1000;
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < reordered.length; i += 1) {
          await tx.projectStatus.update({
            where: { id: reordered[i]!.id },
            data: { position: offset + i },
          });
        }
        for (const status of reordered) {
          await tx.projectStatus.update({
            where: { id: status.id },
            data: { position: status.position },
          });
        }
      });
      return sortStatusesByPositionAsc(reordered);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async countLiveTasksByStatusKey(
    projectId: string,
    key: string,
  ): Promise<number> {
    try {
      return await this.client().task.count({
        where: {
          projectId,
          status: key,
          deletedAt: null,
        },
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async countNonCompleted(projectId: string): Promise<number> {
    try {
      return await this.client().projectStatus.count({
        where: { projectId, isCompleted: false },
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async seedDefaultsForProject(projectId: string): Promise<ProjectStatus[]> {
    const seeded = SEEDED_STATUS_DEFINITIONS.map((definition) =>
      ProjectStatus.createSeeded(projectId, definition),
    );
    try {
      await this.client().projectStatus.createMany({
        data: seeded.map((status) => ({
          id: status.id,
          projectId: status.projectId,
          key: status.key,
          name: status.name,
          nameKey: status.nameKey,
          color: status.color,
          isSystem: status.isSystem,
          isCompleted: status.isCompleted,
          position: status.position,
          createdAt: status.createdAt,
        })),
      });
      return seeded;
    } catch (err) {
      rethrowMapped(err);
    }
  }

  private async findByIdOnly(id: string): Promise<ProjectStatus | null> {
    try {
      const row = await this.client().projectStatus.findUnique({
        where: { id },
        select: STATUS_SELECT,
      });
      return row === null ? null : toStatus(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
