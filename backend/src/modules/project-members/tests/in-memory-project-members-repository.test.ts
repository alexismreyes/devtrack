import { describe, expect, it } from "vitest";
import {
  DuplicateMembershipError,
  MembershipNotFoundError,
} from "../domain/errors";
import { InMemoryProjectMembersRepository } from "./in-memory-project-members-repository";

const PROJECT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PROJECT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

describe("InMemoryProjectMembersRepository", () => {
  it("creates, finds, lists by project newest first, and lists project ids by user", async () => {
    const members = new InMemoryProjectMembersRepository();
    const older = await members.create({
      projectId: PROJECT_A,
      userId: USER_A,
      role: "OWNER",
    });
    const newer = await members.create({
      projectId: PROJECT_A,
      userId: USER_B,
      role: "EDITOR",
    });
    await members.create({
      projectId: PROJECT_B,
      userId: USER_A,
      role: "VIEWER",
    });

    const found = await members.findByProjectAndUser(PROJECT_A, USER_B);
    const listed = await members.listByProjectId(PROJECT_A);
    const projectIds = await members.listProjectIdsByUserId(USER_A);

    expect(found?.id).toBe(newer.id);
    expect(listed.map((member) => member.id)).toEqual([newer.id, older.id]);
    expect(projectIds).toEqual([PROJECT_B, PROJECT_A]);
  });

  it("rejects a duplicate membership for the same project and user", async () => {
    const members = new InMemoryProjectMembersRepository();
    await members.create({
      projectId: PROJECT_A,
      userId: USER_A,
      role: "EDITOR",
    });

    await expect(
      members.create({
        projectId: PROJECT_A,
        userId: USER_A,
        role: "VIEWER",
      }),
    ).rejects.toBeInstanceOf(DuplicateMembershipError);
  });

  it("updates role and removes a membership row", async () => {
    const members = new InMemoryProjectMembersRepository();
    const created = await members.create({
      projectId: PROJECT_A,
      userId: USER_A,
      role: "VIEWER",
    });

    const updated = await members.updateRole(PROJECT_A, USER_A, "EDITOR");
    expect(updated.id).toBe(created.id);
    expect(updated.role).toBe("EDITOR");
    expect(updated.userId).toBe(USER_A);

    await members.deleteByProjectAndUser(PROJECT_A, USER_A);
    expect(await members.findByProjectAndUser(PROJECT_A, USER_A)).toBeNull();
    expect(await members.listByProjectId(PROJECT_A)).toEqual([]);
  });

  it("throws not found when updating or removing a missing membership", async () => {
    const members = new InMemoryProjectMembersRepository();

    await expect(
      members.updateRole(PROJECT_A, USER_A, "EDITOR"),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
    await expect(
      members.deleteByProjectAndUser(PROJECT_A, USER_A),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });
});
