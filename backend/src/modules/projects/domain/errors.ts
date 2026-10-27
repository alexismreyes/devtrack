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
