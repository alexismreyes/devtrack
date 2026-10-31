import { describe, expect, it } from "vitest";
import {
  canArchiveProject,
  canEditProject,
  canManageMembers,
  canWriteProjectTasks,
  resolveActorProjectRole,
} from "./projectRole";

describe("project role chrome", () => {
  it("grants OWNER when the actor is ownerUserId even without a membership row", () => {
    expect(
      resolveActorProjectRole({
        actorId: "user-1",
        ownerUserId: "user-1",
        membershipRole: null,
      }),
    ).toBe("OWNER");
  });

  it("uses the membership role when the actor is not ownerUserId", () => {
    expect(
      resolveActorProjectRole({
        actorId: "user-2",
        ownerUserId: "user-1",
        membershipRole: "EDITOR",
      }),
    ).toBe("EDITOR");
    expect(
      resolveActorProjectRole({
        actorId: "user-3",
        ownerUserId: "user-1",
        membershipRole: "VIEWER",
      }),
    ).toBe("VIEWER");
  });

  it("returns null when the actor has no membership and is not the owner", () => {
    expect(
      resolveActorProjectRole({
        actorId: "user-9",
        ownerUserId: "user-1",
        membershipRole: null,
      }),
    ).toBeNull();
  });

  it("matches OWNER, EDITOR, and VIEWER chrome from the permission matrix", () => {
    expect(canEditProject("OWNER")).toBe(true);
    expect(canArchiveProject("OWNER")).toBe(true);
    expect(canManageMembers("OWNER")).toBe(true);
    expect(canWriteProjectTasks("OWNER")).toBe(true);

    expect(canEditProject("EDITOR")).toBe(true);
    expect(canArchiveProject("EDITOR")).toBe(false);
    expect(canManageMembers("EDITOR")).toBe(false);
    expect(canWriteProjectTasks("EDITOR")).toBe(true);

    expect(canEditProject("VIEWER")).toBe(false);
    expect(canArchiveProject("VIEWER")).toBe(false);
    expect(canManageMembers("VIEWER")).toBe(false);
    expect(canWriteProjectTasks("VIEWER")).toBe(false);
  });
});
