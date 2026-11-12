import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import {
  DatabaseUnavailableError,
  InvalidProjectBoardBackgroundContentTypeError,
  ProjectBoardBackgroundNotFoundError,
} from "../domain/errors";
import {
  isAllowedProjectBoardBackgroundContentType,
  ProjectBoardBackground,
} from "../domain/project-board-background";
import type {
  CreateProjectBoardBackgroundInput,
  DeletedProjectBoardBackgroundSnapshot,
  ProjectBoardBackgroundSummaryRow,
  ProjectBoardBackgroundsRepository,
} from "./project-board-backgrounds-repository";

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
    err instanceof ProjectBoardBackgroundNotFoundError ||
    err instanceof InvalidProjectBoardBackgroundContentTypeError
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
}): ProjectBoardBackground {
  return ProjectBoardBackground.rehydrate(
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
}): DeletedProjectBoardBackgroundSnapshot {
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

export class PrismaProjectBoardBackgroundsRepository implements ProjectBoardBackgroundsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateProjectBoardBackgroundInput): Promise<ProjectBoardBackground> {
    const boardBackground = input.boardBackground;
    try {
      const row = await this.client().projectBoardBackground.create({
        data: {
          id: boardBackground.id,
          projectId: boardBackground.projectId,
          uploadedByUserId: boardBackground.uploadedByUserId,
          originalFilename: boardBackground.originalFilename,
          contentType: boardBackground.contentType,
          sizeBytes: boardBackground.sizeBytes,
          storageKey: boardBackground.storageKey,
          createdAt: boardBackground.createdAt,
        },
        select: COVER_SELECT,
      });
      return toCover(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByProjectId(projectId: string): Promise<ProjectBoardBackground | null> {
    try {
      const row = await this.client().projectBoardBackground.findUnique({
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
  ): Promise<DeletedProjectBoardBackgroundSnapshot | null> {
    try {
      const existing = await this.client().projectBoardBackground.findUnique({
        where: { projectId },
        select: COVER_SELECT,
      });
      if (existing === null) {
        return null;
      }
      await this.client().projectBoardBackground.delete({
        where: { projectId },
      });
      return toDeletedSnapshot(existing);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async replaceForProject(
    projectId: string,
    boardBackground: ProjectBoardBackground,
  ): Promise<{
    saved: ProjectBoardBackground;
    previous: DeletedProjectBoardBackgroundSnapshot | null;
  }> {
    if (boardBackground.projectId !== projectId) {
      throw new Error("BoardBackground project id mismatch");
    }
    try {
      const previousRow = await this.client().projectBoardBackground.findUnique({
        where: { projectId },
        select: COVER_SELECT,
      });
      if (previousRow !== null) {
        await this.client().projectBoardBackground.delete({
          where: { projectId },
        });
      }
      const row = await this.client().projectBoardBackground.create({
        data: {
          id: boardBackground.id,
          projectId: boardBackground.projectId,
          uploadedByUserId: boardBackground.uploadedByUserId,
          originalFilename: boardBackground.originalFilename,
          contentType: boardBackground.contentType,
          sizeBytes: boardBackground.sizeBytes,
          storageKey: boardBackground.storageKey,
          createdAt: boardBackground.createdAt,
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
  ): Promise<ProjectBoardBackgroundSummaryRow[]> {
    if (projectIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().projectBoardBackground.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, contentType: true },
      });
      const summaries: ProjectBoardBackgroundSummaryRow[] = [];
      for (const row of rows) {
        if (!isAllowedProjectBoardBackgroundContentType(row.contentType)) {
          continue;
        }
        summaries.push({
          projectId: row.projectId,
          boardBackgroundId: row.id,
          contentType: row.contentType,
        });
      }
      return summaries;
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
