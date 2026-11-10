export class InvalidPasswordError extends Error {
  constructor() {
    super("Password is required");
    this.name = "InvalidPasswordError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCurrentPasswordError";
  }
}

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordPolicyError";
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "UnauthenticatedError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is unavailable");
    this.name = "DatabaseUnavailableError";
  }
}

export class SessionNotFoundError extends Error {
  constructor() {
    super("Session was not found");
    this.name = "SessionNotFoundError";
  }
}
