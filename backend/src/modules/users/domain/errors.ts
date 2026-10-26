export class DuplicateEmailError extends Error {
  constructor() {
    super("Email is already registered");
    this.name = "DuplicateEmailError";
  }
}

export class ProfileForbiddenError extends Error {
  constructor() {
    super("Not allowed to access this profile");
    this.name = "ProfileForbiddenError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User was not found");
    this.name = "UserNotFoundError";
  }
}

export class InvalidUserEmailError extends Error {
  constructor() {
    super("Email is required");
    this.name = "InvalidUserEmailError";
  }
}

export class InvalidDisplayNameError extends Error {
  constructor() {
    super("Display name is required");
    this.name = "InvalidDisplayNameError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is unavailable");
    this.name = "DatabaseUnavailableError";
  }
}
