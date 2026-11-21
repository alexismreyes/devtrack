export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project was not found");
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectForbiddenError extends Error {
  constructor() {
    super("Not allowed to access this project");
    this.name = "ProjectForbiddenError";
  }
}

export class ProjectArchivedError extends Error {
  constructor() {
    super("Archived projects cannot be updated");
    this.name = "ProjectArchivedError";
  }
}

export class InvalidProjectNameError extends Error {
  constructor() {
    super("Project name is required");
    this.name = "InvalidProjectNameError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is unavailable");
    this.name = "DatabaseUnavailableError";
  }
}

export class ProjectCoverNotFoundError extends Error {
  constructor() {
    super("Project cover was not found");
    this.name = "ProjectCoverNotFoundError";
  }
}

export class InvalidProjectCoverFilenameError extends Error {
  constructor() {
    super("Project cover filename is invalid");
    this.name = "InvalidProjectCoverFilenameError";
  }
}

export class InvalidProjectCoverContentTypeError extends Error {
  constructor() {
    super("Project cover content type is not allowed");
    this.name = "InvalidProjectCoverContentTypeError";
  }
}

export class ProjectCoverSizeExceededError extends Error {
  constructor() {
    super("Project cover exceeds the maximum allowed size");
    this.name = "ProjectCoverSizeExceededError";
  }
}

export class ProjectCoverStorageError extends Error {
  constructor(message = "Project cover storage operation failed") {
    super(message);
    this.name = "ProjectCoverStorageError";
  }
}

export class ProjectBoardBackgroundNotFoundError extends Error {
  constructor() {
    super("Project board background was not found");
    this.name = "ProjectBoardBackgroundNotFoundError";
  }
}

export class InvalidProjectBoardBackgroundFilenameError extends Error {
  constructor() {
    super("Project board background filename is invalid");
    this.name = "InvalidProjectBoardBackgroundFilenameError";
  }
}

export class InvalidProjectBoardBackgroundContentTypeError extends Error {
  constructor() {
    super("Project board background content type is not allowed");
    this.name = "InvalidProjectBoardBackgroundContentTypeError";
  }
}

export class ProjectBoardBackgroundSizeExceededError extends Error {
  constructor() {
    super("Project board background exceeds the maximum allowed size");
    this.name = "ProjectBoardBackgroundSizeExceededError";
  }
}

export class ProjectBoardBackgroundStorageError extends Error {
  constructor(message = "Project board background storage operation failed") {
    super(message);
    this.name = "ProjectBoardBackgroundStorageError";
  }
}
