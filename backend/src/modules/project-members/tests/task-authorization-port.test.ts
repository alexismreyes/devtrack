import { describe, expect, it } from "vitest";
import { FakeTaskAuthorizationPort } from "../../tasks/tests/fake-task-authorization-port";
import { MembershipForbiddenError } from "../domain/errors";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const STRANGER_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("TaskAuthorizationPort requireProjectOwner", () => {
  function createPort(archivedAt: Date | null = null) {
    const port = new FakeTaskAuthorizationPort();
    port.seed(
      {
        id: PROJECT_ID,
        ownerUserId: OWNER_ID,
        name: "Roadmap",
        archivedAt,
      },
      {
        [OWNER_ID]: "OWNER",
        [EDITOR_ID]: "EDITOR",
        [VIEWER_ID]: "VIEWER",
      },
    );
    return port;
  }

  it("allows effective OWNER including ownerUserId grant", async () => {
    const port = createPort();
    const snapshot = await port.requireProjectOwner(OWNER_ID, PROJECT_ID);
    expect(snapshot.id).toBe(PROJECT_ID);
    expect(snapshot.ownerUserId).toBe(OWNER_ID);
  });

  it("rejects EDITOR, VIEWER, and non-members", async () => {
    const port = createPort();
    await expect(
      port.requireProjectOwner(EDITOR_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      port.requireProjectOwner(VIEWER_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      port.requireProjectOwner(STRANGER_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
  });

  it("allows ownerUserId on archived projects and rejects other members", async () => {
    const port = createPort(new Date("2026-11-04T12:00:00.000Z"));
    await expect(
      port.requireProjectOwner(OWNER_ID, PROJECT_ID),
    ).resolves.toMatchObject({ id: PROJECT_ID });
    await expect(
      port.requireProjectOwner(EDITOR_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
  });
});
