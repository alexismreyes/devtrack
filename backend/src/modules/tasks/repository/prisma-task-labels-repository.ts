import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import { DatabaseUnavailableError } from "../domain/errors";
import { ProjectLabel, sortLabelsByNameAsc } from "../domain/project-label";
import type { TaskLabelsRepository } from "./task-labels-repository";

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

function rethrowMapped(err: unknown): never {
  if (err instanceof DatabaseUnavailableError) {
    throw err;
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

export class PrismaTaskLabelsRepository implements TaskLabelsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async replaceSetForTask(taskId: string, labelIds: string[]): Promise<void> {
    const now = new Date();
    try {
      const client = this.client();
      await client.taskLabel.deleteMany({ where: { taskId } });
      if (labelIds.length === 0) {
        return;
      }
      await client.taskLabel.createMany({
        data: labelIds.map((labelId) => ({
          taskId,
          labelId,
          createdAt: now,
        })),
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listForTaskIds(
    taskIds: string[],
  ): Promise<Map<string, ProjectLabel[]>> {
    const result = new Map<string, ProjectLabel[]>();
    for (const taskId of taskIds) {
      result.set(taskId, []);
    }
    if (taskIds.length === 0) {
      return result;
    }
    try {
      const rows = await this.client().taskLabel.findMany({
        where: { taskId: { in: taskIds } },
        select: {
          taskId: true,
          label: { select: LABEL_SELECT },
        },
      });
      const grouped = new Map<string, ProjectLabel[]>();
      for (const row of rows) {
        const list = grouped.get(row.taskId) ?? [];
        list.push(toLabel(row.label));
        grouped.set(row.taskId, list);
      }
      for (const taskId of taskIds) {
        result.set(taskId, sortLabelsByNameAsc(grouped.get(taskId) ?? []));
      }
      return result;
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async deleteByLabelId(labelId: string): Promise<void> {
    try {
      await this.client().taskLabel.deleteMany({ where: { labelId } });
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
