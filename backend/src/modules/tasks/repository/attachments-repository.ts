import type { TaskAttachment } from "../domain/task-attachment";

export type CreateAttachmentInput = {
  attachment: TaskAttachment;
};

/** Snapshot returned by hard-delete for activity + blob cleanup. */
export type DeletedAttachmentSnapshot = {
  id: string;
  taskId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  storageKey: string;
  createdAt: Date;
  uploadedByUserId: string;
  /** True when this attachment was the task cover and cover was cleared. */
  clearedCover: boolean;
};

export type TaskCoverSummaryRow = {
  taskId: string;
  attachmentId: string;
  contentType: string;
};

export interface AttachmentsRepository {
  create(input: CreateAttachmentInput): Promise<TaskAttachment>;
  listByTaskId(taskId: string): Promise<TaskAttachment[]>;
  countByTaskId(taskId: string): Promise<number>;
  findByIdInTask(
    taskId: string,
    attachmentId: string,
  ): Promise<TaskAttachment | null>;
  /** Hard-deletes metadata; clears task cover when pointing here (SetNull). */
  delete(attachmentId: string): Promise<DeletedAttachmentSnapshot>;
  getCoverAttachmentId(taskId: string): Promise<string | null>;
  setCover(taskId: string, attachmentId: string): Promise<void>;
  clearCover(taskId: string): Promise<void>;
  listCoverSummariesForTaskIds(
    taskIds: string[],
  ): Promise<TaskCoverSummaryRow[]>;
}
