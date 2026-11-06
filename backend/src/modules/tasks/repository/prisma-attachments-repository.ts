import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import {
  AttachmentNotFoundError,
  DatabaseUnavailableError,
  InvalidCoverAttachmentError,
} from "../domain/errors";
import {
  isCoverImageContentType,
  TaskAttachment,
} from "../domain/task-attachment";
import type {
  AttachmentsRepository,
  CreateAttachmentInput,
  DeletedAttachmentSnapshot,
  TaskCoverSummaryRow,
} from "./attachments-repository";

const ATTACHMENT_SELECT = {
  id: true,
  taskId: true,
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
    err instanceof AttachmentNotFoundError ||
    err instanceof InvalidCoverAttachmentError
  ) {
    throw err;
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toAttachment(row: {
  id: string;
  taskId: string;
  uploadedByUserId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
}): TaskAttachment {
  return TaskAttachment.rehydrate(
    row.id,
    row.taskId,
    row.uploadedByUserId,
    row.originalFilename,
    row.contentType,
    row.sizeBytes,
    row.storageKey,
    row.createdAt,
  );
}

export class PrismaAttachmentsRepository implements AttachmentsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateAttachmentInput): Promise<TaskAttachment> {
    const attachment = input.attachment;
    try {
      const row = await this.client().taskAttachment.create({
        data: {
          id: attachment.id,
          taskId: attachment.taskId,
          uploadedByUserId: attachment.uploadedByUserId,
          originalFilename: attachment.originalFilename,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
          storageKey: attachment.storageKey,
          createdAt: attachment.createdAt,
        },
        select: ATTACHMENT_SELECT,
      });
      return toAttachment(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByTaskId(taskId: string): Promise<TaskAttachment[]> {
    try {
      const rows = await this.client().taskAttachment.findMany({
        where: { taskId },
        orderBy: { createdAt: "asc" },
        select: ATTACHMENT_SELECT,
      });
      return rows.map(toAttachment);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async countByTaskId(taskId: string): Promise<number> {
    try {
      return await this.client().taskAttachment.count({ where: { taskId } });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByIdInTask(
    taskId: string,
    attachmentId: string,
  ): Promise<TaskAttachment | null> {
    try {
      const row = await this.client().taskAttachment.findFirst({
        where: { id: attachmentId, taskId },
        select: ATTACHMENT_SELECT,
      });
      return row === null ? null : toAttachment(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async delete(attachmentId: string): Promise<DeletedAttachmentSnapshot> {
    try {
      const existing = await this.client().taskAttachment.findUnique({
        where: { id: attachmentId },
        select: {
          ...ATTACHMENT_SELECT,
          coveredTask: { select: { id: true } },
        },
      });
      if (existing === null) {
        throw new AttachmentNotFoundError();
      }
      const clearedCover = existing.coveredTask !== null;
      await this.client().taskAttachment.delete({
        where: { id: attachmentId },
      });
      return {
        id: existing.id,
        taskId: existing.taskId,
        originalFilename: existing.originalFilename,
        contentType: existing.contentType,
        sizeBytes: existing.sizeBytes,
        storageKey: existing.storageKey,
        createdAt: existing.createdAt,
        uploadedByUserId: existing.uploadedByUserId,
        clearedCover,
      };
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async getCoverAttachmentId(taskId: string): Promise<string | null> {
    try {
      const row = await this.client().task.findUnique({
        where: { id: taskId },
        select: { coverAttachmentId: true },
      });
      return row?.coverAttachmentId ?? null;
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async setCover(taskId: string, attachmentId: string): Promise<void> {
    try {
      const attachment = await this.client().taskAttachment.findFirst({
        where: { id: attachmentId, taskId },
        select: { id: true, contentType: true },
      });
      if (
        attachment === null ||
        !isCoverImageContentType(attachment.contentType)
      ) {
        throw new InvalidCoverAttachmentError();
      }
      await this.client().task.update({
        where: { id: taskId },
        data: { coverAttachmentId: attachmentId },
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async clearCover(taskId: string): Promise<void> {
    try {
      await this.client().task.update({
        where: { id: taskId },
        data: { coverAttachmentId: null },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return;
      }
      rethrowMapped(err);
    }
  }

  async listCoverSummariesForTaskIds(
    taskIds: string[],
  ): Promise<TaskCoverSummaryRow[]> {
    if (taskIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().task.findMany({
        where: {
          id: { in: taskIds },
          coverAttachmentId: { not: null },
        },
        select: {
          id: true,
          coverAttachment: {
            select: { id: true, contentType: true },
          },
        },
      });
      const summaries: TaskCoverSummaryRow[] = [];
      for (const row of rows) {
        if (row.coverAttachment === null) {
          continue;
        }
        summaries.push({
          taskId: row.id,
          attachmentId: row.coverAttachment.id,
          contentType: row.coverAttachment.contentType,
        });
      }
      return summaries;
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
