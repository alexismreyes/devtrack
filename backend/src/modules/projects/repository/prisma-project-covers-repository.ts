import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import {
  DatabaseUnavailableError,
  InvalidProjectCoverContentTypeError,
  ProjectCoverNotFoundError,
} from "../domain/errors";
import {
  isAllowedProjectCoverContentType,
  ProjectCover,
} from "../domain/project-cover";
import type {
  CreateProjectCoverInput,
  DeletedProjectCoverSnapshot,
  ProjectCoverSummaryRow,
  ProjectCoversRepository,
} from "./project-covers-repository";

const COVER_SELECT = {
  id: true,
  projectId: true,
  uploadedByUserId: true,
  originalFilename: true,
  contentType: true,
  sizeBytes: true,
  storageKey: true,
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

function rethrowMapped(err: unknown): never {
  if (
    err instanceof DatabaseUnavailableError ||
    err instanceof ProjectCoverNotFoundError ||
    err instanceof InvalidProjectCoverContentTypeError
  ) {
    throw err;
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toCover(row: {
  id: string;
  projectId: string;
  uploadedByUserId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}): ProjectCover {
  return ProjectCover.rehydrate(
    row.id,
    row.projectId,
    row.uploadedByUserId,
    row.originalFilename,
    row.contentType,
    row.sizeBytes,
    row.storageKey,
    row.createdAt,
  );
}

function toDeletedSnapshot(row: {
  id: string;
  projectId: string;
  uploadedByUserId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}): DeletedProjectCoverSnapshot {
  return {
    id: row.id,
    projectId: row.projectId,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    createdAt: row.createdAt,
    uploadedByUserId: row.uploadedByUserId,
  };
}

export class PrismaProjectCoversRepository implements ProjectCoversRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateProjectCoverInput): Promise<ProjectCover> {
    const cover = input.cover;
    try {
      const row = await this.client().projectCover.create({
        data: {
          id: cover.id,
          projectId: cover.projectId,
          uploadedByUserId: cover.uploadedByUserId,
          originalFilename: cover.originalFilename,
          contentType: cover.contentType,
          sizeBytes: cover.sizeBytes,
          storageKey: cover.storageKey,
          createdAt: cover.createdAt,
        },
        select: COVER_SELECT,
      });
      return toCover(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByProjectId(projectId: string): Promise<ProjectCover | null> {
    try {
      const row = await this.client().projectCover.findUnique({
        where: { projectId },
        select: COVER_SELECT,
      });
      return row === null ? null : toCover(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async deleteByProjectId(
    projectId: string,
  ): Promise<DeletedProjectCoverSnapshot | null> {
    try {
      const existing = await this.client().projectCover.findUnique({
        where: { projectId },
        select: COVER_SELECT,
      });
      if (existing === null) {
        return null;
      }
      await this.client().projectCover.delete({
        where: { projectId },
      });
      return toDeletedSnapshot(existing);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async replaceForProject(
    projectId: string,
    cover: ProjectCover,
  ): Promise<{
    saved: ProjectCover;
    previous: DeletedProjectCoverSnapshot | null;
  }> {
    if (cover.projectId !== projectId) {
      throw new Error("Cover project id mismatch");
    }
    try {
      const previousRow = await this.client().projectCover.findUnique({
        where: { projectId },
        select: COVER_SELECT,
      });
      if (previousRow !== null) {
        await this.client().projectCover.delete({
          where: { projectId },
        });
      }
      const row = await this.client().projectCover.create({
        data: {
          id: cover.id,
          projectId: cover.projectId,
          uploadedByUserId: cover.uploadedByUserId,
          originalFilename: cover.originalFilename,
          contentType: cover.contentType,
          sizeBytes: cover.sizeBytes,
          storageKey: cover.storageKey,
          createdAt: cover.createdAt,
        },
        select: COVER_SELECT,
      });
      return {
        saved: toCover(row),
        previous:
          previousRow === null ? null : toDeletedSnapshot(previousRow),
      };
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listSummariesForProjectIds(
    projectIds: string[],
  ): Promise<ProjectCoverSummaryRow[]> {
    if (projectIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().projectCover.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, contentType: true },
      });
      const summaries: ProjectCoverSummaryRow[] = [];
      for (const row of rows) {
        if (!isAllowedProjectCoverContentType(row.contentType)) {
          continue;
        }
        summaries.push({
          projectId: row.projectId,
          coverId: row.id,
          contentType: row.contentType,
        });
      }
      return summaries;
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
