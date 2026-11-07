import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UnitOfWork } from "../../projects/access/unit-of-work";
import {
  AttachmentNotFoundError,
  AttachmentStorageError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import { TaskActivityEvent } from "../domain/task-activity";
import {
  assertAttachmentCountAllowed,
  assertCoverEligibleContentType,
  isCoverImageContentType,
  resolveAttachmentContentType,
  TaskAttachment,
  type AttachmentContentType,
  type TaskCoverSummary,
} from "../domain/task-attachment";
import type { ActivityRepository } from "../repository/activity-repository";
import type { AttachmentsRepository } from "../repository/attachments-repository";
import type { TasksRepository } from "../repository/tasks-repository";
import type { AttachmentStoragePort } from "../storage/attachment-storage-port";

export type AttachmentView = {
  id: string;
  taskId: string;
  originalFilename: string;
  contentType: AttachmentContentType;
  sizeBytes: number;
  createdAt: Date;
  uploadedByUserId: string;
  isCover: boolean;
};

export type AttachmentContentView = {
  bytes: Uint8Array;
  contentType: AttachmentContentType;
  originalFilename: string;
  sizeBytes: number;
};

export type UploadAttachmentCommand = {
  originalFilename: string;
  clientContentType: string | undefined;
  bytes: Uint8Array;
};

export class AttachmentsService {
  constructor(
    private readonly attachments: AttachmentsRepository,
    private readonly tasks: TasksRepository,
    private readonly authorization: TaskAuthorizationPort,
    private readonly activity: ActivityRepository,
    private readonly storage: AttachmentStoragePort,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async listByTask(actorId: string, taskId: string): Promise<AttachmentView[]> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const listed = await this.attachments.listByTaskId(task.id);
    const coverId = task.coverAttachmentId;
    return listed.map((attachment) =>
      this.toView(attachment, coverId === attachment.id),
    );
  }

  async getById(
    actorId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<AttachmentView> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const attachment = await this.requireAttachmentInTask(task.id, attachmentId);
    return this.toView(attachment, task.coverAttachmentId === attachment.id);
  }

  async upload(
    actorId: string,
    taskId: string,
    command: UploadAttachmentCommand,
  ): Promise<AttachmentView> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);

    const count = await this.attachments.countByTaskId(task.id);
    assertAttachmentCountAllowed(count);

    const contentType = resolveAttachmentContentType(
      command.bytes,
      command.clientContentType,
    );
    const attachment = TaskAttachment.create({
      taskId: task.id,
      projectId: task.projectId,
      uploadedByUserId: actorId,
      originalFilename: command.originalFilename,
      contentType,
      sizeBytes: command.bytes.byteLength,
    });

    // Prefer write blob then insert metadata; compensate blob on DB failure.
    await this.storage.write(attachment.storageKey, command.bytes);
    try {
      const created = await this.unitOfWork.run(async () => {
        const saved = await this.attachments.create({ attachment });
        await this.activity.create(
          TaskActivityEvent.attachmentAdded(
            task.id,
            actorId,
            saved.id,
            saved.originalFilename,
          ),
        );
        return saved;
      });
      return this.toView(created, false);
    } catch (err) {
      try {
        await this.storage.delete(attachment.storageKey);
      } catch {
        // Best-effort compensation; surface original failure.
      }
      throw err;
    }
  }

  async getContent(
    actorId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<AttachmentContentView> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const attachment = await this.requireAttachmentInTask(task.id, attachmentId);
    try {
      const bytes = await this.storage.read(attachment.storageKey);
      return {
        bytes,
        contentType: attachment.contentType,
        originalFilename: attachment.originalFilename,
        sizeBytes: attachment.sizeBytes,
      };
    } catch (err) {
      if (err instanceof AttachmentStorageError) {
        throw new AttachmentNotFoundError();
      }
      throw err;
    }
  }

  async delete(
    actorId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<void> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    await this.requireAttachmentInTask(task.id, attachmentId);

    const deleted = await this.unitOfWork.run(async () => {
      const snapshotDeleted = await this.attachments.delete(attachmentId);
      await this.activity.create(
        TaskActivityEvent.attachmentRemoved(
          task.id,
          actorId,
          snapshotDeleted.id,
          snapshotDeleted.originalFilename,
        ),
      );
      if (snapshotDeleted.clearedCover) {
        await this.activity.create(
          TaskActivityEvent.coverChanged(task.id, actorId, null, null),
        );
      }
      return snapshotDeleted;
    });

    try {
      await this.storage.delete(deleted.storageKey);
    } catch {
      // Metadata already removed; orphan blob is acceptable without GC (Q-132).
    }
  }

  async setCover(
    actorId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<TaskCoverSummary | null> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);
    const attachment = await this.requireAttachmentInTask(task.id, attachmentId);
    const contentType = attachment.contentType;
    assertCoverEligibleContentType(contentType);

    if (task.coverAttachmentId === attachment.id) {
      return {
        attachmentId: attachment.id,
        contentType,
      };
    }

    return this.unitOfWork.run(async () => {
      await this.attachments.setCover(task.id, attachment.id);
      await this.activity.create(
        TaskActivityEvent.coverChanged(
          task.id,
          actorId,
          attachment.id,
          attachment.originalFilename,
        ),
      );
      return {
        attachmentId: attachment.id,
        contentType,
      };
    });
  }

  async clearCover(
    actorId: string,
    taskId: string,
  ): Promise<TaskCoverSummary | null> {
    const task = await this.requireLiveTask(taskId);
    const snapshot = await this.authorization.requireTaskWrite(
      actorId,
      task.projectId,
    );
    this.assertParentWritable(snapshot.archivedAt);

    if (task.coverAttachmentId === null) {
      return null;
    }

    await this.unitOfWork.run(async () => {
      await this.attachments.clearCover(task.id);
      await this.activity.create(
        TaskActivityEvent.coverChanged(task.id, actorId, null, null),
      );
    });
    return null;
  }

  async getCover(
    actorId: string,
    taskId: string,
  ): Promise<TaskCoverSummary | null> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    if (task.coverAttachmentId === null) {
      return null;
    }
    const attachment = await this.attachments.findByIdInTask(
      task.id,
      task.coverAttachmentId,
    );
    if (attachment === null) {
      return null;
    }
    const contentType = attachment.contentType;
    if (!isCoverImageContentType(contentType)) {
      return null;
    }
    return {
      attachmentId: attachment.id,
      contentType,
    };
  }

  private async requireLiveTask(taskId: string) {
    const task = await this.tasks.findById(taskId);
    if (task === null || task.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    return task;
  }

  private async requireAttachmentInTask(taskId: string, attachmentId: string) {
    const attachment = await this.attachments.findByIdInTask(
      taskId,
      attachmentId,
    );
    if (attachment === null) {
      throw new AttachmentNotFoundError();
    }
    return attachment;
  }

  private assertParentWritable(archivedAt: Date | null): void {
    if (archivedAt !== null) {
      throw new TaskParentArchivedError();
    }
  }

  private toView(attachment: TaskAttachment, isCover: boolean): AttachmentView {
    return {
      id: attachment.id,
      taskId: attachment.taskId,
      originalFilename: attachment.originalFilename,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
      uploadedByUserId: attachment.uploadedByUserId,
      isCover,
    };
  }
}
