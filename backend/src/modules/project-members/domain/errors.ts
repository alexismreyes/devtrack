export class DuplicateMembershipError extends Error {
  constructor() {
    super("Member already exists on this project");
    this.name = "DuplicateMembershipError";
  }
}

export class MemberUserNotFoundError extends Error {
  constructor() {
    super("User was not found");
    this.name = "MemberUserNotFoundError";
  }
}

export class MembershipNotFoundError extends Error {
  constructor() {
    super("Member was not found");
    this.name = "MembershipNotFoundError";
  }
}

export class MembershipProjectNotFoundError extends Error {
  constructor() {
    super("Project was not found");
    this.name = "MembershipProjectNotFoundError";
  }
}

export class MembershipForbiddenError extends Error {
  constructor() {
    super("Not allowed to access this project");
    this.name = "MembershipForbiddenError";
  }
}

export class OwnerMembershipConflictError extends Error {
  constructor() {
    super("Cannot remove or demote the project owner");
    this.name = "OwnerMembershipConflictError";
  }
}

export class InvalidProjectMemberRoleError extends Error {
  constructor() {
    super("Invalid member role");
    this.name = "InvalidProjectMemberRoleError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is unavailable");
    this.name = "DatabaseUnavailableError";
  }
}
