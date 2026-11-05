import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import {
  DatabaseUnavailableError,
  DuplicateLabelNameError,
  LabelNotFoundError,
} from "../domain/errors";
import { ProjectLabel, sortLabelsByNameAsc } from "../domain/project-label";
import type {
  CreateLabelInput,
  LabelsRepository,
  UpdateLabelInput,
} from "./labels-repository";

const LABEL_SELECT = {
  id: true,
  projectId: true,
  name: true,
  nameKey: true,
  color: true,
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
    err instanceof LabelNotFoundError ||
    err instanceof DuplicateLabelNameError
  ) {
    throw err;
  }
  if (isUniqueViolation(err)) {
    throw new DuplicateLabelNameError();
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toLabel(row: {
  id: string;
  projectId: string;
  name: string;
  color: string;
  createdAt: Date;
}): ProjectLabel {
  return ProjectLabel.rehydrate(
    row.id,
    row.projectId,
    row.name,
    row.color,
    row.createdAt,
  );
}

export class PrismaLabelsRepository implements LabelsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateLabelInput): Promise<ProjectLabel> {
    const label = ProjectLabel.create(
      input.projectId,
      input.name,
      input.color,
    );
    try {
      const row = await this.client().projectLabel.create({
        data: {
          id: label.id,
          projectId: label.projectId,
          name: label.name,
          nameKey: label.nameKey,
          color: label.color,
          createdAt: label.createdAt,
        },
        select: LABEL_SELECT,
      });
      return toLabel(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByIdInProject(
    projectId: string,
    labelId: string,
  ): Promise<ProjectLabel | null> {
    try {
      const row = await this.client().projectLabel.findFirst({
        where: { id: labelId, projectId },
        select: LABEL_SELECT,
      });
      return row === null ? null : toLabel(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByIdsInProject(
    projectId: string,
    labelIds: string[],
  ): Promise<ProjectLabel[]> {
    if (labelIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().projectLabel.findMany({
        where: {
          projectId,
          id: { in: labelIds },
        },
        select: LABEL_SELECT,
      });
      return rows.map(toLabel);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByProjectId(projectId: string): Promise<ProjectLabel[]> {
    try {
      const rows = await this.client().projectLabel.findMany({
        where: { projectId },
        select: LABEL_SELECT,
      });
      return sortLabelsByNameAsc(rows.map(toLabel));
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async update(id: string, input: UpdateLabelInput): Promise<ProjectLabel> {
    const existing = await this.findByIdOnly(id);
    if (existing === null) {
      throw new LabelNotFoundError();
    }
    const updated = existing.withDetails(input);
    try {
      const row = await this.client().projectLabel.update({
        where: { id },
        data: {
          name: updated.name,
          nameKey: updated.nameKey,
          color: updated.color,
        },
        select: LABEL_SELECT,
      });
      return toLabel(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client().projectLabel.delete({
        where: { id },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        throw new LabelNotFoundError();
      }
      rethrowMapped(err);
    }
  }

  private async findByIdOnly(id: string): Promise<ProjectLabel | null> {
    try {
      const row = await this.client().projectLabel.findUnique({
        where: { id },
        select: LABEL_SELECT,
      });
      return row === null ? null : toLabel(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
