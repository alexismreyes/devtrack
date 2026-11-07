import {
  AttachmentNotFoundError,
  InvalidCoverAttachmentError,
} from "../domain/errors";
import {
  isCoverImageContentType,
  sortAttachmentsOldestFirst,
  TaskAttachment,
} from "../domain/task-attachment";
import type {
  AttachmentsRepository,
  CreateAttachmentInput,
  DeletedAttachmentSnapshot,
  TaskCoverSummaryRow,
} from "../repository/attachments-repository";
import type { InMemoryTasksRepository } from "./in-memory-tasks-repository";

export class InMemoryAttachmentsRepository implements AttachmentsRepository {
  readonly attachmentsById = new Map<string, TaskAttachment>();

  constructor(private readonly tasks: InMemoryTasksRepository) {}

  async create(input: CreateAttachmentInput): Promise<TaskAttachment> {
    this.attachmentsById.set(input.attachment.id, input.attachment);
    return input.attachment;
  }

  async listByTaskId(taskId: string): Promise<TaskAttachment[]> {
    return sortAttachmentsOldestFirst(
      [...this.attachmentsById.values()].filter(
        (attachment) => attachment.taskId === taskId,
      ),
    );
  }

  async countByTaskId(taskId: string): Promise<number> {
    return [...this.attachmentsById.values()].filter(
      (attachment) => attachment.taskId === taskId,
    ).length;
  }

  async findByIdInTask(
    taskId: string,
    attachmentId: string,
  ): Promise<TaskAttachment | null> {
    const attachment = this.attachmentsById.get(attachmentId);
    if (attachment === undefined || attachment.taskId !== taskId) {
      return null;
    }
    return attachment;
  }

  async delete(attachmentId: string): Promise<DeletedAttachmentSnapshot> {
    const existing = this.attachmentsById.get(attachmentId);
    if (existing === undefined) {
      throw new AttachmentNotFoundError();
    }
    const task = await this.tasks.findById(existing.taskId);
    const clearedCover =
      task !== null && task.coverAttachmentId === attachmentId;
    if (clearedCover && task !== null) {
      this.tasks.tasksById.set(
        task.id,
        task.withCoverAttachmentId(null),
      );
    }
    this.attachmentsById.delete(attachmentId);
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
  }

  async getCoverAttachmentId(taskId: string): Promise<string | null> {
    const task = await this.tasks.findById(taskId);
    return task?.coverAttachmentId ?? null;
  }

  async setCover(taskId: string, attachmentId: string): Promise<void> {
    const task = await this.tasks.findById(taskId);
    if (task === null) {
      throw new AttachmentNotFoundError();
    }
    const attachment = await this.findByIdInTask(taskId, attachmentId);
    if (attachment === null || !isCoverImageContentType(attachment.contentType)) {
      throw new InvalidCoverAttachmentError();
    }
    this.tasks.tasksById.set(taskId, task.withCoverAttachmentId(attachmentId));
  }

  async clearCover(taskId: string): Promise<void> {
    const task = await this.tasks.findById(taskId);
    if (task === null) {
      return;
    }
    this.tasks.tasksById.set(taskId, task.withCoverAttachmentId(null));
  }

  async listCoverSummariesForTaskIds(
    taskIds: string[],
  ): Promise<TaskCoverSummaryRow[]> {
    if (taskIds.length === 0) {
      return [];
    }
    const allowed = new Set(taskIds);
    const rows: TaskCoverSummaryRow[] = [];
    for (const task of this.tasks.tasksById.values()) {
      if (!allowed.has(task.id) || task.coverAttachmentId === null) {
        continue;
      }
      const attachment = this.attachmentsById.get(task.coverAttachmentId);
      if (attachment === undefined) {
        continue;
      }
      rows.push({
        taskId: task.id,
        attachmentId: attachment.id,
        contentType: attachment.contentType,
      });
    }
    return rows;
  }
}
