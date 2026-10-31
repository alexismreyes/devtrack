import { randomUUID } from "node:crypto";
import {
  DuplicateMembershipError,
  InvalidProjectMemberRoleError,
  MemberUserNotFoundError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PROJECT_MEMBER_ROLES = ["OWNER", "EDITOR", "VIEWER"] as const;

export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export function isProjectMemberRole(value: string): value is ProjectMemberRole {
  return (PROJECT_MEMBER_ROLES as readonly string[]).includes(value);
}

export function canonicalizeMemberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertExistingMemberUser<T>(
  user: T | null,
): asserts user is T {
  if (user === null) {
    throw new MemberUserNotFoundError();
  }
}

export function assertMembershipAvailable(
  existing: ProjectMember | null,
): void {
  if (existing !== null) {
    throw new DuplicateMembershipError();
  }
}

export class ProjectMember {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  readonly role: ProjectMemberRole;
  readonly createdAt: Date;

  private constructor(
    id: string,
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Membership id must be a UUID");
    }
    if (!UUID_PATTERN.test(projectId)) {
      throw new Error("Membership project id must be a UUID");
    }
    if (!UUID_PATTERN.test(userId)) {
      throw new Error("Membership user id must be a UUID");
    }
    if (!isProjectMemberRole(role)) {
      throw new InvalidProjectMemberRoleError();
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Membership created time must be a valid date");
    }

    this.id = id;
    this.projectId = projectId;
    this.userId = userId;
    this.role = role;
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static create(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
    now: Date = new Date(),
  ): ProjectMember {
    return new ProjectMember(randomUUID(), projectId, userId, role, now);
  }

  static rehydrate(
    id: string,
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
    createdAt: Date,
  ): ProjectMember {
    return new ProjectMember(id, projectId, userId, role, createdAt);
  }

  withRole(role: ProjectMemberRole): ProjectMember {
    return new ProjectMember(
      this.id,
      this.projectId,
      this.userId,
      role,
      this.createdAt,
    );
  }
}
