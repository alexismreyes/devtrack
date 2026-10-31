import { describe, expect, it } from "vitest";
import {
  assertAuthorizedForOperation,
  isAuthorizedForOperation,
  resolveEffectiveRole,
  type AuthorizationContext,
  type ProjectOperation,
} from "../domain/authorization";
import {
  DuplicateMembershipError,
  InvalidProjectMemberRoleError,
  MembershipForbiddenError,
  MemberUserNotFoundError,
  OwnerMembershipConflictError,
} from "../domain/errors";
import {
  assertCanChangeMemberRole,
  assertCanRemoveMember,
  projectHasOwner,
} from "../domain/owner-invariants";
import {
  assertExistingMemberUser,
  assertMembershipAvailable,
  canonicalizeMemberEmail,
  isProjectMemberRole,
  ProjectMember,
  type ProjectMemberRole,
} from "../domain/project-member";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const STRANGER_ID = "44444444-4444-4444-8444-444444444444";
const MEMBER_ID = "55555555-5555-4555-8555-555555555555";

function context(input: {
  actorId: string;
  membershipRole: ProjectMemberRole | null;
  archived?: boolean;
}): AuthorizationContext {
  return {
    actorId: input.actorId,
    ownerUserId: OWNER_ID,
    archivedAt: input.archived ? new Date("2026-10-31T00:00:00.000Z") : null,
    membershipRole: input.membershipRole,
  };
}

describe("project-members domain", () => {
  it("assigns a UUID identity, associations, role, and created time", () => {
    const before = Date.now();
    const member = ProjectMember.create(PROJECT_ID, EDITOR_ID, "EDITOR");
    const after = Date.now();

    expect(member.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(member.projectId).toBe(PROJECT_ID);
    expect(member.userId).toBe(EDITOR_ID);
    expect(member.role).toBe("EDITOR");
    expect(member.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(member.createdAt.getTime()).toBeLessThanOrEqual(after);
    expect(Object.isFrozen(member)).toBe(true);
  });

  it("accepts only OWNER, EDITOR, and VIEWER", () => {
    expect(isProjectMemberRole("OWNER")).toBe(true);
    expect(isProjectMemberRole("EDITOR")).toBe(true);
    expect(isProjectMemberRole("VIEWER")).toBe(true);
    expect(isProjectMemberRole("ADMIN")).toBe(false);
    expect(
      ProjectMember.rehydrate(
        MEMBER_ID,
        PROJECT_ID,
        OWNER_ID,
        "VIEWER",
        new Date("2026-10-31T12:00:00.000Z"),
      ).role,
    ).toBe("VIEWER");
    expect(() =>
      ProjectMember.rehydrate(
        MEMBER_ID,
        PROJECT_ID,
        OWNER_ID,
        "ADMIN" as ProjectMemberRole,
        new Date("2026-10-31T12:00:00.000Z"),
      ),
    ).toThrow(InvalidProjectMemberRoleError);
  });

  it("keeps identity immutable when the role changes", () => {
    const createdAt = new Date("2026-10-31T12:00:00.000Z");
    const member = ProjectMember.create(
      PROJECT_ID,
      EDITOR_ID,
      "EDITOR",
      createdAt,
    );
    const updated = member.withRole("VIEWER");

    expect(updated.id).toBe(member.id);
    expect(updated.projectId).toBe(PROJECT_ID);
    expect(updated.userId).toBe(EDITOR_ID);
    expect(updated.createdAt.toISOString()).toBe("2026-10-31T12:00:00.000Z");
    expect(updated.role).toBe("VIEWER");
    expect(member.role).toBe("EDITOR");
  });

  it("rejects a second membership for the same user on the same project", () => {
    const existing = ProjectMember.create(PROJECT_ID, EDITOR_ID, "EDITOR");

    expect(() => assertMembershipAvailable(existing)).toThrow(
      DuplicateMembershipError,
    );
    expect(() => assertMembershipAvailable(null)).not.toThrow();
  });

  it("requires an existing user and does not treat missing identity as an invite", () => {
    expect(() => assertExistingMemberUser(null)).toThrow(MemberUserNotFoundError);
    expect(() =>
      assertExistingMemberUser({ id: EDITOR_ID, email: "ada@example.com" }),
    ).not.toThrow();
    expect(canonicalizeMemberEmail("  Ada@Example.COM ")).toBe(
      "ada@example.com",
    );
  });

  it("grants OWNER when actor id equals ownerUserId even without a membership row", () => {
    expect(resolveEffectiveRole(OWNER_ID, OWNER_ID, null)).toBe("OWNER");
    expect(resolveEffectiveRole(OWNER_ID, OWNER_ID, "VIEWER")).toBe("OWNER");
    expect(resolveEffectiveRole(EDITOR_ID, OWNER_ID, "EDITOR")).toBe("EDITOR");
    expect(resolveEffectiveRole(STRANGER_ID, OWNER_ID, null)).toBeNull();
  });

  it("does not treat a session identity as authorization by itself", () => {
    const authenticatedStranger = context({
      actorId: STRANGER_ID,
      membershipRole: null,
    });

    expect(
      isAuthorizedForOperation(authenticatedStranger, "read_project"),
    ).toBe(false);
    expect(() =>
      assertAuthorizedForOperation(authenticatedStranger, "read_project"),
    ).toThrow(MembershipForbiddenError);
  });
});

describe("project-members permission matrix", () => {
  const operations: ProjectOperation[] = [
    "read_project",
    "patch_project",
    "archive_project",
    "unarchive_project",
    "read_task",
    "write_task",
    "list_members",
    "manage_members",
  ];

  it("allows OWNER (role or ownerUserId grant) every operation on an active project", () => {
    const grant = context({ actorId: OWNER_ID, membershipRole: null });
    const ownerRow = context({
      actorId: EDITOR_ID,
      membershipRole: "OWNER",
    });

    for (const operation of operations) {
      expect(isAuthorizedForOperation(grant, operation)).toBe(true);
      expect(isAuthorizedForOperation(ownerRow, operation)).toBe(true);
    }
  });

  it("allows EDITOR to view, patch name/description, and write tasks, but not archive or membership admin", () => {
    const editor = context({ actorId: EDITOR_ID, membershipRole: "EDITOR" });

    expect(isAuthorizedForOperation(editor, "read_project")).toBe(true);
    expect(isAuthorizedForOperation(editor, "list_members")).toBe(true);
    expect(isAuthorizedForOperation(editor, "read_task")).toBe(true);
    expect(isAuthorizedForOperation(editor, "patch_project")).toBe(true);
    expect(isAuthorizedForOperation(editor, "write_task")).toBe(true);
    expect(isAuthorizedForOperation(editor, "archive_project")).toBe(false);
    expect(isAuthorizedForOperation(editor, "unarchive_project")).toBe(false);
    expect(isAuthorizedForOperation(editor, "manage_members")).toBe(false);
  });

  it("allows VIEWER to read and list only", () => {
    const viewer = context({ actorId: VIEWER_ID, membershipRole: "VIEWER" });

    expect(isAuthorizedForOperation(viewer, "read_project")).toBe(true);
    expect(isAuthorizedForOperation(viewer, "list_members")).toBe(true);
    expect(isAuthorizedForOperation(viewer, "read_task")).toBe(true);
    expect(isAuthorizedForOperation(viewer, "patch_project")).toBe(false);
    expect(isAuthorizedForOperation(viewer, "write_task")).toBe(false);
    expect(isAuthorizedForOperation(viewer, "archive_project")).toBe(false);
    expect(isAuthorizedForOperation(viewer, "unarchive_project")).toBe(false);
    expect(isAuthorizedForOperation(viewer, "manage_members")).toBe(false);
  });

  it("allows archived GET and membership reads only for ownerUserId", () => {
    const owner = context({
      actorId: OWNER_ID,
      membershipRole: null,
      archived: true,
    });
    const extraOwner = context({
      actorId: EDITOR_ID,
      membershipRole: "OWNER",
      archived: true,
    });
    const editor = context({
      actorId: EDITOR_ID,
      membershipRole: "EDITOR",
      archived: true,
    });
    const viewer = context({
      actorId: VIEWER_ID,
      membershipRole: "VIEWER",
      archived: true,
    });

    expect(isAuthorizedForOperation(owner, "read_project")).toBe(true);
    expect(isAuthorizedForOperation(owner, "list_members")).toBe(true);
    expect(isAuthorizedForOperation(owner, "manage_members")).toBe(true);
    expect(isAuthorizedForOperation(extraOwner, "read_project")).toBe(false);
    expect(isAuthorizedForOperation(extraOwner, "list_members")).toBe(false);
    expect(isAuthorizedForOperation(extraOwner, "manage_members")).toBe(false);
    expect(isAuthorizedForOperation(editor, "read_task")).toBe(false);
    expect(isAuthorizedForOperation(viewer, "read_project")).toBe(false);
  });
});

describe("project-members owner-row invariants", () => {
  const members = [
    { userId: OWNER_ID, role: "OWNER" as const },
    { userId: EDITOR_ID, role: "OWNER" as const },
    { userId: VIEWER_ID, role: "VIEWER" as const },
  ];

  it("cannot remove or demote ownerUserId", () => {
    expect(() =>
      assertCanRemoveMember({
        targetUserId: OWNER_ID,
        ownerUserId: OWNER_ID,
        members,
      }),
    ).toThrow(OwnerMembershipConflictError);
    expect(() =>
      assertCanChangeMemberRole({
        targetUserId: OWNER_ID,
        ownerUserId: OWNER_ID,
        nextRole: "EDITOR",
        members,
      }),
    ).toThrow(OwnerMembershipConflictError);
  });

  it("allows removing or demoting an additional OWNER while ownerUserId remains", () => {
    expect(() =>
      assertCanRemoveMember({
        targetUserId: EDITOR_ID,
        ownerUserId: OWNER_ID,
        members,
      }),
    ).not.toThrow();
    expect(() =>
      assertCanChangeMemberRole({
        targetUserId: EDITOR_ID,
        ownerUserId: OWNER_ID,
        nextRole: "VIEWER",
        members,
      }),
    ).not.toThrow();
    expect(() =>
      assertCanChangeMemberRole({
        targetUserId: OWNER_ID,
        ownerUserId: OWNER_ID,
        nextRole: "OWNER",
        members,
      }),
    ).not.toThrow();
  });

  it("cannot leave a project with no OWNER when the ownerUserId grant is absent", () => {
    const onlyOwnerRow = [{ userId: EDITOR_ID, role: "OWNER" as const }];

    expect(projectHasOwner("", onlyOwnerRow)).toBe(true);
    expect(() =>
      assertCanRemoveMember({
        targetUserId: EDITOR_ID,
        ownerUserId: "",
        members: onlyOwnerRow,
      }),
    ).toThrow(OwnerMembershipConflictError);
    expect(() =>
      assertCanChangeMemberRole({
        targetUserId: EDITOR_ID,
        ownerUserId: "",
        nextRole: "VIEWER",
        members: onlyOwnerRow,
      }),
    ).toThrow(OwnerMembershipConflictError);
    expect(projectHasOwner(OWNER_ID, [])).toBe(true);
  });
});
