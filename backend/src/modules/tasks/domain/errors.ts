export class TaskNotFoundError extends Error {
  constructor() {
    super("Task was not found");
    this.name = "TaskNotFoundError";
  }
}

export class TaskParentArchivedError extends Error {
  constructor() {
    super("Cannot modify tasks on an archived project");
    this.name = "TaskParentArchivedError";
  }
}

export class InvalidTaskTitleError extends Error {
  constructor() {
    super("Task title is required");
    this.name = "InvalidTaskTitleError";
  }
}

export class InvalidTaskStatusError extends Error {
  constructor() {
    super("Task status is invalid");
    this.name = "InvalidTaskStatusError";
  }
}

export class StatusNotFoundError extends Error {
  constructor() {
    super("Status was not found");
    this.name = "StatusNotFoundError";
  }
}

export class InvalidStatusNameError extends Error {
  constructor() {
    super("Status name must be 1–40 characters after trim");
    this.name = "InvalidStatusNameError";
  }
}

export class InvalidStatusColorError extends Error {
  constructor() {
    super("Status color is invalid");
    this.name = "InvalidStatusColorError";
  }
}

export class DuplicateStatusNameError extends Error {
  constructor() {
    super("A status with this name already exists in the project");
    this.name = "DuplicateStatusNameError";
  }
}

export class StatusInUseError extends Error {
  constructor() {
    super("Cannot delete a status that is assigned to live tasks");
    this.name = "StatusInUseError";
  }
}

export class LastStatusError extends Error {
  constructor() {
    super("Cannot delete the last remaining status in the project");
    this.name = "LastStatusError";
  }
}

export class LastNonCompletedStatusError extends Error {
  constructor() {
    super("Project must keep at least one non-completed status");
    this.name = "LastNonCompletedStatusError";
  }
}

export class StatusKeyImmutableError extends Error {
  constructor() {
    super("Status key cannot be changed");
    this.name = "StatusKeyImmutableError";
  }
}

export class InvalidStatusReorderError extends Error {
  constructor() {
    super("Status reorder must include each project status id exactly once");
    this.name = "InvalidStatusReorderError";
  }
}

export class InvalidStatusKeyError extends Error {
  constructor() {
    super("Status key is invalid");
    this.name = "InvalidStatusKeyError";
  }
}

export class InvalidTaskPriorityError extends Error {
  constructor() {
    super("Task priority is invalid");
    this.name = "InvalidTaskPriorityError";
  }
}

export class InvalidTaskDueDateError extends Error {
  constructor() {
    super("Task due date is invalid");
    this.name = "InvalidTaskDueDateError";
  }
}

export class InvalidTaskReorderError extends Error {
  constructor() {
    super(
      "Task reorder must include each live task id for the status exactly once",
    );
    this.name = "InvalidTaskReorderError";
  }
}

export class InvalidTaskPositionError extends Error {
  constructor() {
    super("Task position must be a non-negative integer");
    this.name = "InvalidTaskPositionError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is unavailable");
    this.name = "DatabaseUnavailableError";
  }
}

export class CommentNotFoundError extends Error {
  constructor() {
    super("Comment was not found");
    this.name = "CommentNotFoundError";
  }
}

export class InvalidCommentBodyError extends Error {
  constructor() {
    super("Comment body is required");
    this.name = "InvalidCommentBodyError";
  }
}

export class CommentForbiddenError extends Error {
  constructor() {
    super("Not allowed to modify this comment");
    this.name = "CommentForbiddenError";
  }
}

export class LabelNotFoundError extends Error {
  constructor() {
    super("Label was not found");
    this.name = "LabelNotFoundError";
  }
}

export class InvalidLabelNameError extends Error {
  constructor() {
    super("Label name must be 1–40 characters after trim");
    this.name = "InvalidLabelNameError";
  }
}

export class InvalidLabelColorError extends Error {
  constructor() {
    super("Label color is invalid");
    this.name = "InvalidLabelColorError";
  }
}

export class DuplicateLabelNameError extends Error {
  constructor() {
    super("A label with this name already exists in the project");
    this.name = "DuplicateLabelNameError";
  }
}

export class ChecklistNotFoundError extends Error {
  constructor() {
    super("Checklist was not found");
    this.name = "ChecklistNotFoundError";
  }
}

export class ChecklistItemNotFoundError extends Error {
  constructor() {
    super("Checklist item was not found");
    this.name = "ChecklistItemNotFoundError";
  }
}

export class InvalidChecklistNameError extends Error {
  constructor() {
    super("Checklist name must be 1–80 characters after trim");
    this.name = "InvalidChecklistNameError";
  }
}

export class InvalidChecklistItemTextError extends Error {
  constructor() {
    super("Checklist item text must be 1–200 characters after trim");
    this.name = "InvalidChecklistItemTextError";
  }
}

export class AttachmentNotFoundError extends Error {
  constructor() {
    super("Attachment was not found");
    this.name = "AttachmentNotFoundError";
  }
}

export class InvalidAttachmentFilenameError extends Error {
  constructor() {
    super("Attachment filename is invalid");
    this.name = "InvalidAttachmentFilenameError";
  }
}

export class InvalidAttachmentContentTypeError extends Error {
  constructor() {
    super("Attachment content type is not allowed");
    this.name = "InvalidAttachmentContentTypeError";
  }
}

export class AttachmentSizeExceededError extends Error {
  constructor() {
    super("Attachment exceeds the maximum allowed size");
    this.name = "AttachmentSizeExceededError";
  }
}

export class AttachmentCountExceededError extends Error {
  constructor() {
    super("Task already has the maximum number of attachments");
    this.name = "AttachmentCountExceededError";
  }
}

export class InvalidCoverAttachmentError extends Error {
  constructor() {
    super("Cover must be an image attachment on the same task");
    this.name = "InvalidCoverAttachmentError";
  }
}

export class AttachmentStorageError extends Error {
  constructor(message = "Attachment storage operation failed") {
    super(message);
    this.name = "AttachmentStorageError";
  }
}
