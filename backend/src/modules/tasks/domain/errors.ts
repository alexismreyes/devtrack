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
