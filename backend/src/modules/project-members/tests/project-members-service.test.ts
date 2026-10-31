import { describe, expect, it } from "vitest";
import type {
  ProjectSnapshot,
  ProjectSnapshotPort,
} from "../../projects/access/project-snapshot-port";
import { UsersIdentityAdapter } from "../../users/identity/users-identity-adapter";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import {
  DuplicateMembershipError,
  MembershipForbiddenError,
  MembershipNotFoundError,
  MembershipProjectNotFoundError,
  MemberUserNotFoundError,
  OwnerMembershipConflictError,
} from "../domain/errors";
import { ProjectMembersService } from "../service/project-members-service";
import { InMemoryProjectMembersRepository } from "./in-memory-project-members-repository";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

class FakeProjectSnapshotPort implements ProjectSnapshotPort {
  readonly byId = new Map<string, ProjectSnapshot>();

  seed(snapshot: ProjectSnapshot): void {
    this.byId.set(snapshot.id, snapshot);
  }

  async findById(id: string): Promise<ProjectSnapshot | null> {
    return this.byId.get(id) ?? null;
  }

  async listActiveIdsByOwnerId(ownerUserId: string): Promise<string[]> {
    return [...this.byId.values()]
      .filter(
        (project) =>
          project.ownerUserId === ownerUserId && project.archivedAt === null,
      )
      .map((project) => project.id);
  }

  async listActiveIds(ids: string[]): Promise<string[]> {
    const wanted = new Set(ids);
    return [...this.byId.values()]
      .filter(
        (project) => wanted.has(project.id) && project.archivedAt === null,
      )
      .map((project) => project.id);
  }
}

async function setup() {
  const users = new InMemoryUsersRepository();
  const identities = new UsersIdentityAdapter(users);
  const snapshots = new FakeProjectSnapshotPort();
  const members = new InMemoryProjectMembersRepository();
  const service = new ProjectMembersService(members, identities, snapshots);
  const owner = await users.create({
    email: "ada@example.com",
    displayName: "Ada",
  });
  const editor = await users.create({
    email: "grace@example.com",
    displayName: "Grace",
  });
  const viewer = await users.create({
    email: "alan@example.com",
    displayName: "Alan",
  });
  snapshots.seed({
    id: PROJECT_ID,
    ownerUserId: owner.id,
    archivedAt: null,
  });
  return { service, members, snapshots, owner, editor, viewer };
}

describe("ProjectMembersService", () => {
  it("adds an existing user by canonical email without creating a user", async () => {
    const { service, owner, editor } = await setup();

    const added = await service.addByEmail(
      owner.id,
      PROJECT_ID,
      "  Grace@Example.COM ",
      "EDITOR",
    );
    const listed = await service.listByProject(owner.id, PROJECT_ID);

    expect(added.userId).toBe(editor.id);
    expect(added.email).toBe("grace@example.com");
    expect(added.displayName).toBe("Grace");
    expect(added.role).toBe("EDITOR");
    expect(listed.map((member) => member.userId)).toEqual([editor.id]);
  });

  it("returns not found for an unknown email and does not persist a membership", async () => {
    const { service, members, owner } = await setup();

    await expect(
      service.addByEmail(
        owner.id,
        PROJECT_ID,
        "missing@example.com",
        "VIEWER",
      ),
    ).rejects.toBeInstanceOf(MemberUserNotFoundError);
    expect(await members.listByProjectId(PROJECT_ID)).toEqual([]);
  });

  it("rejects a duplicate membership", async () => {
    const { service, owner, editor } = await setup();
    await service.addByEmail(owner.id, PROJECT_ID, editor.email, "EDITOR");

    await expect(
      service.addByEmail(owner.id, PROJECT_ID, editor.email, "VIEWER"),
    ).rejects.toBeInstanceOf(DuplicateMembershipError);
  });

  it("allows ownerUserId to manage members even without a membership row", async () => {
    const { service, owner, editor } = await setup();

    const added = await service.addByEmail(
      owner.id,
      PROJECT_ID,
      editor.email,
      "EDITOR",
    );

    expect(added.role).toBe("EDITOR");
  });

  it("forbids non-OWNER membership admin and does not persist the change", async () => {
    const { service, members, owner, editor, viewer } = await setup();
    await service.addByEmail(owner.id, PROJECT_ID, editor.email, "EDITOR");

    await expect(
      service.addByEmail(editor.id, PROJECT_ID, viewer.email, "VIEWER"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      service.changeRole(editor.id, PROJECT_ID, editor.id, "VIEWER"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      service.remove(editor.id, PROJECT_ID, editor.id),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    expect(await members.listByProjectId(PROJECT_ID)).toHaveLength(1);
  });

  it("lists members for any authorized actor and forbids strangers", async () => {
    const { service, owner, editor, viewer } = await setup();
    await service.addByEmail(owner.id, PROJECT_ID, editor.email, "EDITOR");
    await service.addByEmail(owner.id, PROJECT_ID, viewer.email, "VIEWER");

    const asViewer = await service.listByProject(viewer.id, PROJECT_ID);
    expect(asViewer.map((member) => member.email).sort()).toEqual([
      "alan@example.com",
      "grace@example.com",
    ]);

    await expect(
      service.listByProject(MISSING_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
  });

  it("changes role and removes a non-owner member", async () => {
    const { service, owner, editor } = await setup();
    await service.addByEmail(owner.id, PROJECT_ID, editor.email, "EDITOR");

    const updated = await service.changeRole(
      owner.id,
      PROJECT_ID,
      editor.id,
      "VIEWER",
    );
    expect(updated.role).toBe("VIEWER");
    expect(updated.email).toBe("grace@example.com");

    await service.remove(owner.id, PROJECT_ID, editor.id);
    const listed = await service.listByProject(owner.id, PROJECT_ID);
    expect(listed).toEqual([]);
  });

  it("cannot remove or demote ownerUserId", async () => {
    const { service, members, owner, editor } = await setup();
    await members.create({
      projectId: PROJECT_ID,
      userId: owner.id,
      role: "OWNER",
    });
    await service.addByEmail(owner.id, PROJECT_ID, editor.email, "OWNER");

    await expect(
      service.remove(owner.id, PROJECT_ID, owner.id),
    ).rejects.toBeInstanceOf(OwnerMembershipConflictError);
    await expect(
      service.changeRole(owner.id, PROJECT_ID, owner.id, "EDITOR"),
    ).rejects.toBeInstanceOf(OwnerMembershipConflictError);

    const stillOwner = await members.findByProjectAndUser(
      PROJECT_ID,
      owner.id,
    );
    expect(stillOwner?.role).toBe("OWNER");
  });

  it("cannot remove ownerUserId even when no membership row exists", async () => {
    const { service, owner } = await setup();

    await expect(
      service.remove(owner.id, PROJECT_ID, owner.id),
    ).rejects.toBeInstanceOf(OwnerMembershipConflictError);
  });

  it("returns not found for a missing project before authorization", async () => {
    const { service, owner } = await setup();

    await expect(
      service.listByProject(owner.id, MISSING_ID),
    ).rejects.toBeInstanceOf(MembershipProjectNotFoundError);
    await expect(
      service.addByEmail(owner.id, MISSING_ID, "grace@example.com", "EDITOR"),
    ).rejects.toBeInstanceOf(MembershipProjectNotFoundError);
  });

  it("returns not found when the target user is not a member", async () => {
    const { service, owner, editor } = await setup();

    await expect(
      service.changeRole(owner.id, PROJECT_ID, editor.id, "VIEWER"),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
    await expect(
      service.remove(owner.id, PROJECT_ID, editor.id),
    ).rejects.toBeInstanceOf(MembershipNotFoundError);
  });

  it("forbids non-owner members from membership calls on an archived project", async () => {
    const { service, snapshots, owner, editor } = await setup();
    await service.addByEmail(owner.id, PROJECT_ID, editor.email, "EDITOR");
    snapshots.seed({
      id: PROJECT_ID,
      ownerUserId: owner.id,
      archivedAt: new Date("2026-10-31T00:00:00.000Z"),
    });

    await expect(
      service.listByProject(editor.id, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    const asOwner = await service.listByProject(owner.id, PROJECT_ID);
    expect(asOwner).toHaveLength(1);
  });
});
