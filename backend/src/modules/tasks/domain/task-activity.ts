import { randomUUID } from "node:crypto";
import {
  formatCalendarDate,
  type Task,
  type TaskDetailsChange,
} from "./task";
import { truncateAttachmentFilenamePreview } from "./task-attachment";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const TASK_ACTIVITY_KINDS = [
  "TASK_CREATED",
  "TASK_FIELDS_CHANGED",
  "TASK_SOFT_DELETED",
  "COMMENT_ADDED",
  "CHECKLIST_ADDED",
  "CHECKLIST_REMOVED",
  "CHECKLIST_ITEM_COMPLETED",
  "CHECKLIST_ITEM_UNCOMPLETED",
  "ATTACHMENT_ADDED",
  "ATTACHMENT_REMOVED",
  "COVER_CHANGED",
] as const;

export type TaskActivityKind = (typeof TASK_ACTIVITY_KINDS)[number];

export const TASK_ACTIVITY_CHANGE_FIELDS = [
  "title",
  "description",
  "status",
  "priority",
  "dueDate",
] as const;

export type TaskActivityChangeField =
  (typeof TASK_ACTIVITY_CHANGE_FIELDS)[number];

export type TaskActivityFieldValue = string | null;

export type TaskActivityFieldChange = {
  field: TaskActivityChangeField;
  oldValue: TaskActivityFieldValue;
  newValue: TaskActivityFieldValue;
};

export type TaskCreatedPayload = Record<string, never>;
export type TaskFieldsChangedPayload = {
  changes: TaskActivityFieldChange[];
};
export type TaskSoftDeletedPayload = Record<string, never>;
export type CommentAddedPayload = {
  commentId: string;
  bodyPreview: string;
};
export type ChecklistAddedPayload = {
  checklistId: string;
  namePreview: string;
};
export type ChecklistRemovedPayload = {
  checklistId: string;
  namePreview: string;
};
export type ChecklistItemCompletedPayload = {
  checklistId: string;
  itemId: string;
  textPreview: string;
};
export type ChecklistItemUncompletedPayload = {
  checklistId: string;
  itemId: string;
  textPreview: string;
};
export type AttachmentAddedPayload = {
  attachmentId: string;
  filenamePreview: string;
};
export type AttachmentRemovedPayload = {
  attachmentId: string;
  filenamePreview: string;
};
export type CoverChangedPayload = {
  attachmentId: string | null;
  filenamePreview: string | null;
};

export type TaskActivityPayload =
  | TaskCreatedPayload
  | TaskFieldsChangedPayload
  | TaskSoftDeletedPayload
  | CommentAddedPayload
  | ChecklistAddedPayload
  | ChecklistRemovedPayload
  | ChecklistItemCompletedPayload
  | ChecklistItemUncompletedPayload
  | AttachmentAddedPayload
  | AttachmentRemovedPayload
  | CoverChangedPayload;

/** Short plain-text preview length for COMMENT_ADDED and checklist previews (Q-075 / Q-124). */
export const COMMENT_BODY_PREVIEW_MAX_LENGTH = 120;

export function parseTaskActivityKind(value: string): TaskActivityKind {
  if ((TASK_ACTIVITY_KINDS as readonly string[]).includes(value)) {
    return value as TaskActivityKind;
  }
  throw new Error(`Unknown task activity kind: ${value}`);
}

export function serializeTaskFieldValue(
  field: TaskActivityChangeField,
  task: Task,
): TaskActivityFieldValue {
  switch (field) {
    case "title":
      return task.title;
    case "description":
      return task.description;
    case "status":
      return task.status;
    case "priority":
      return task.priority;
    case "dueDate":
      return task.dueDate === null ? null : formatCalendarDate(task.dueDate);
  }
}

/**
 * Builds field-change entries for mutable fields that actually change after
 * normalization (Q-070, Q-071, Q-072). Returns an empty array for no-ops.
 */
export function buildTaskFieldChanges(
  before: Task,
  change: TaskDetailsChange,
): TaskActivityFieldChange[] {
  const after = before.withDetails(change);
  const changes: TaskActivityFieldChange[] = [];
  for (const field of TASK_ACTIVITY_CHANGE_FIELDS) {
    const oldValue = serializeTaskFieldValue(field, before);
    const newValue = serializeTaskFieldValue(field, after);
    if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue });
    }
  }
  return changes;
}

export function truncateCommentBodyPreview(
  body: string,
  maxLength: number = COMMENT_BODY_PREVIEW_MAX_LENGTH,
): string {
  if (maxLength < 1) {
    throw new Error("Comment body preview max length must be at least 1");
  }
  if (body.length <= maxLength) {
    return body;
  }
  return `${body.slice(0, maxLength)}…`;
}

export class TaskActivityEvent {
  readonly id: string;
  readonly taskId: string;
  readonly actorUserId: string;
  readonly kind: TaskActivityKind;
  readonly payload: TaskActivityPayload;
  readonly createdAt: Date;

  private constructor(
    id: string,
    taskId: string,
    actorUserId: string,
    kind: TaskActivityKind,
    payload: TaskActivityPayload,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Activity event id must be a UUID");
    }
    if (!UUID_PATTERN.test(taskId)) {
      throw new Error("Activity event task id must be a UUID");
    }
    if (!UUID_PATTERN.test(actorUserId)) {
      throw new Error("Activity event actor id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Activity event created time must be a valid date");
    }

    this.id = id;
    this.taskId = taskId;
    this.actorUserId = actorUserId;
    this.kind = kind;
    this.payload = freezePayload(kind, payload);
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static taskCreated(
    taskId: string,
    actorUserId: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "TASK_CREATED",
      {},
      now,
    );
  }

  static taskFieldsChanged(
    taskId: string,
    actorUserId: string,
    changes: TaskActivityFieldChange[],
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (changes.length === 0) {
      throw new Error("Field-change activity requires at least one change");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "TASK_FIELDS_CHANGED",
      { changes: changes.map((entry) => ({ ...entry })) },
      now,
    );
  }

  static taskSoftDeleted(
    taskId: string,
    actorUserId: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "TASK_SOFT_DELETED",
      {},
      now,
    );
  }

  static commentAdded(
    taskId: string,
    actorUserId: string,
    commentId: string,
    body: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (!UUID_PATTERN.test(commentId)) {
      throw new Error("Comment id must be a UUID");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "COMMENT_ADDED",
      {
        commentId,
        bodyPreview: truncateCommentBodyPreview(body),
      },
      now,
    );
  }

  static checklistAdded(
    taskId: string,
    actorUserId: string,
    checklistId: string,
    name: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (!UUID_PATTERN.test(checklistId)) {
      throw new Error("Checklist id must be a UUID");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "CHECKLIST_ADDED",
      {
        checklistId,
        namePreview: truncateCommentBodyPreview(name),
      },
      now,
    );
  }

  static checklistRemoved(
    taskId: string,
    actorUserId: string,
    checklistId: string,
    name: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (!UUID_PATTERN.test(checklistId)) {
      throw new Error("Checklist id must be a UUID");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "CHECKLIST_REMOVED",
      {
        checklistId,
        namePreview: truncateCommentBodyPreview(name),
      },
      now,
    );
  }

  static checklistItemCompleted(
    taskId: string,
    actorUserId: string,
    checklistId: string,
    itemId: string,
    text: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (!UUID_PATTERN.test(checklistId)) {
      throw new Error("Checklist id must be a UUID");
    }
    if (!UUID_PATTERN.test(itemId)) {
      throw new Error("Checklist item id must be a UUID");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "CHECKLIST_ITEM_COMPLETED",
      {
        checklistId,
        itemId,
        textPreview: truncateCommentBodyPreview(text),
      },
      now,
    );
  }

  static checklistItemUncompleted(
    taskId: string,
    actorUserId: string,
    checklistId: string,
    itemId: string,
    text: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (!UUID_PATTERN.test(checklistId)) {
      throw new Error("Checklist id must be a UUID");
    }
    if (!UUID_PATTERN.test(itemId)) {
      throw new Error("Checklist item id must be a UUID");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "CHECKLIST_ITEM_UNCOMPLETED",
      {
        checklistId,
        itemId,
        textPreview: truncateCommentBodyPreview(text),
      },
      now,
    );
  }

  static attachmentAdded(
    taskId: string,
    actorUserId: string,
    attachmentId: string,
    originalFilename: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (!UUID_PATTERN.test(attachmentId)) {
      throw new Error("Attachment id must be a UUID");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "ATTACHMENT_ADDED",
      {
        attachmentId,
        filenamePreview: truncateAttachmentFilenamePreview(originalFilename),
      },
      now,
    );
  }

  static attachmentRemoved(
    taskId: string,
    actorUserId: string,
    attachmentId: string,
    originalFilename: string,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (!UUID_PATTERN.test(attachmentId)) {
      throw new Error("Attachment id must be a UUID");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "ATTACHMENT_REMOVED",
      {
        attachmentId,
        filenamePreview: truncateAttachmentFilenamePreview(originalFilename),
      },
      now,
    );
  }

  static coverChanged(
    taskId: string,
    actorUserId: string,
    attachmentId: string | null,
    originalFilename: string | null,
    now: Date = new Date(),
  ): TaskActivityEvent {
    if (attachmentId !== null && !UUID_PATTERN.test(attachmentId)) {
      throw new Error("Attachment id must be a UUID");
    }
    if ((attachmentId === null) !== (originalFilename === null)) {
      throw new Error("Cover-changed payload requires matching id and filename");
    }
    return new TaskActivityEvent(
      randomUUID(),
      taskId,
      actorUserId,
      "COVER_CHANGED",
      {
        attachmentId,
        filenamePreview:
          originalFilename === null
            ? null
            : truncateAttachmentFilenamePreview(originalFilename),
      },
      now,
    );
  }

  static rehydrate(
    id: string,
    taskId: string,
    actorUserId: string,
    kind: string,
    payload: unknown,
    createdAt: Date,
  ): TaskActivityEvent {
    const parsedKind = parseTaskActivityKind(kind);
    return new TaskActivityEvent(
      id,
      taskId,
      actorUserId,
      parsedKind,
      normalizePayload(parsedKind, payload),
      createdAt,
    );
  }
}

export function sortActivityNewestFirst(
  events: readonly TaskActivityEvent[],
): TaskActivityEvent[] {
  return events
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function freezePayload(
  kind: TaskActivityKind,
  payload: TaskActivityPayload,
): TaskActivityPayload {
  return Object.freeze(normalizePayload(kind, payload));
}

function normalizePayload(
  kind: TaskActivityKind,
  payload: unknown,
): TaskActivityPayload {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Activity payload must be an object");
  }
  const record = payload as Record<string, unknown>;

  switch (kind) {
    case "TASK_CREATED":
    case "TASK_SOFT_DELETED":
      return {};
    case "TASK_FIELDS_CHANGED": {
      if (!Array.isArray(record.changes)) {
        throw new Error("Field-change payload requires changes array");
      }
      const changes: TaskActivityFieldChange[] = record.changes.map((entry) => {
        if (
          entry === null ||
          typeof entry !== "object" ||
          Array.isArray(entry)
        ) {
          throw new Error("Invalid field-change entry");
        }
        const item = entry as Record<string, unknown>;
        if (
          typeof item.field !== "string" ||
          !(TASK_ACTIVITY_CHANGE_FIELDS as readonly string[]).includes(
            item.field,
          )
        ) {
          throw new Error("Invalid field-change field name");
        }
        if (
          typeof item.oldValue !== "string" &&
          item.oldValue !== null
        ) {
          throw new Error("Invalid field-change oldValue");
        }
        if (
          typeof item.newValue !== "string" &&
          item.newValue !== null
        ) {
          throw new Error("Invalid field-change newValue");
        }
        return {
          field: item.field as TaskActivityChangeField,
          oldValue: item.oldValue,
          newValue: item.newValue,
        };
      });
      if (changes.length === 0) {
        throw new Error("Field-change activity requires at least one change");
      }
      return { changes };
    }
    case "COMMENT_ADDED": {
      if (typeof record.commentId !== "string") {
        throw new Error("Comment-added payload requires commentId");
      }
      if (typeof record.bodyPreview !== "string") {
        throw new Error("Comment-added payload requires bodyPreview");
      }
      if (!UUID_PATTERN.test(record.commentId)) {
        throw new Error("Comment id must be a UUID");
      }
      return {
        commentId: record.commentId,
        bodyPreview: record.bodyPreview,
      };
    }
    case "CHECKLIST_ADDED":
    case "CHECKLIST_REMOVED": {
      if (typeof record.checklistId !== "string") {
        throw new Error("Checklist activity payload requires checklistId");
      }
      if (typeof record.namePreview !== "string") {
        throw new Error("Checklist activity payload requires namePreview");
      }
      if (!UUID_PATTERN.test(record.checklistId)) {
        throw new Error("Checklist id must be a UUID");
      }
      return {
        checklistId: record.checklistId,
        namePreview: record.namePreview,
      };
    }
    case "CHECKLIST_ITEM_COMPLETED":
    case "CHECKLIST_ITEM_UNCOMPLETED": {
      if (typeof record.checklistId !== "string") {
        throw new Error("Checklist item activity requires checklistId");
      }
      if (typeof record.itemId !== "string") {
        throw new Error("Checklist item activity requires itemId");
      }
      if (typeof record.textPreview !== "string") {
        throw new Error("Checklist item activity requires textPreview");
      }
      if (!UUID_PATTERN.test(record.checklistId)) {
        throw new Error("Checklist id must be a UUID");
      }
      if (!UUID_PATTERN.test(record.itemId)) {
        throw new Error("Checklist item id must be a UUID");
      }
      return {
        checklistId: record.checklistId,
        itemId: record.itemId,
        textPreview: record.textPreview,
      };
    }
    case "ATTACHMENT_ADDED":
    case "ATTACHMENT_REMOVED": {
      if (typeof record.attachmentId !== "string") {
        throw new Error("Attachment activity payload requires attachmentId");
      }
      if (typeof record.filenamePreview !== "string") {
        throw new Error("Attachment activity payload requires filenamePreview");
      }
      if (!UUID_PATTERN.test(record.attachmentId)) {
        throw new Error("Attachment id must be a UUID");
      }
      return {
        attachmentId: record.attachmentId,
        filenamePreview: record.filenamePreview,
      };
    }
    case "COVER_CHANGED": {
      if (record.attachmentId !== null && typeof record.attachmentId !== "string") {
        throw new Error("Cover-changed payload requires attachmentId or null");
      }
      if (
        record.filenamePreview !== null &&
        typeof record.filenamePreview !== "string"
      ) {
        throw new Error("Cover-changed payload requires filenamePreview or null");
      }
      if ((record.attachmentId === null) !== (record.filenamePreview === null)) {
        throw new Error("Cover-changed payload requires matching id and filename");
      }
      if (
        typeof record.attachmentId === "string" &&
        !UUID_PATTERN.test(record.attachmentId)
      ) {
        throw new Error("Attachment id must be a UUID");
      }
      return {
        attachmentId: record.attachmentId,
        filenamePreview: record.filenamePreview,
      };
    }
  }
}
