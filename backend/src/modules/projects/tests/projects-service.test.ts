import { describe, expect, it } from "vitest";
import {
  OwnerMembershipWriteAdapter,
  ProjectMembershipAccessAdapter,
} from "../../project-members/access/project-membership-access-adapter";
import { MembershipForbiddenError } from "../../project-members/domain/errors";
import { InMemoryProjectMembersRepository } from "../../project-members/tests/in-memory-project-members-repository";
import { ProjectSnapshotAdapter } from "../access/project-snapshot-adapter";
import { ImmediateUnitOfWork } from "../access/unit-of-work";
import {
  ProjectArchivedError,
  ProjectNotFoundError,
} from "../domain/errors";
import { ProjectsService } from "../service/projects-service";
import { ProjectStatusSeedAdapter } from "../../tasks/access/project-status-seed-adapter";
import { InMemoryStatusesRepository } from "../../tasks/tests/in-memory-statuses-repository";
import { InMemoryProjectsRepository } from "./in-memory-projects-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_ID = "44444444-4444-4444-8444-444444444444";

function createService() {
  const projects = new InMemoryProjectsRepository();
  const members = new InMemoryProjectMembersRepository();
  const statuses = new InMemoryStatusesRepository();
  const snapshots = new ProjectSnapshotAdapter(projects);
  const service = new ProjectsService(
    projects,
    new ProjectMembershipAccessAdapter(members, snapshots),
    new OwnerMembershipWriteAdapter(members),
    new ImmediateUnitOfWork(),
    new ProjectStatusSeedAdapter(statuses),
  );
  return { service, projects, members, statuses };
}

describe("ProjectsService", () => {
  it("creates a project owned by the actor and inserts an OWNER membership", async () => {
    const { service, members, statuses } = createService();

    const created = await service.create(OWNER_ID, "Roadmap", "Q1");
    const membership = await members.findByProjectAndUser(
      created.id,
      OWNER_ID,
    );
    const seeded = await statuses.listByProjectId(created.id);

    expect(created.ownerUserId).toBe(OWNER_ID);
    expect(created.name).toBe("Roadmap");
    expect(created.description).toBe("Q1");
    expect(created.archivedAt).toBeNull();
    expect(membership?.role).toBe("OWNER");
    expect(membership?.userId).toBe(OWNER_ID);
    expect(seeded.map((status) => status.key)).toEqual([
      "TODO",
      "IN_PROGRESS",
      "DONE",
    ]);
  });

  it("returns an owned project including after archive", async () => {
    const { service } = createService();
    const created = await service.create(OWNER_ID, "Roadmap", null);
    const archived = await service.archive(OWNER_ID, created.id);

    const found = await service.getById(OWNER_ID, created.id);

    expect(found.id).toBe(created.id);
    expect(found.archivedAt).not.toBeNull();
    expect(archived.archivedAt).not.toBeNull();
  });

  it("rejects non-members and does not change the project", async () => {
    const { service } = createService();
    const created = await service.create(OWNER_ID, "Roadmap", null);

    await expect(service.getById(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    await expect(
      service.update(OTHER_ID, created.id, { name: "Hacked" }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(service.archive(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    await expect(service.unarchive(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );

    const unchanged = await service.getById(OWNER_ID, created.id);
    expect(unchanged.name).toBe("Roadmap");
    expect(unchanged.archivedAt).toBeNull();
  });

  it("lets an EDITOR GET and PATCH but not archive, and a VIEWER GET only", async () => {
    const { service, members } = createService();
    const created = await service.create(OWNER_ID, "Roadmap", "Mine");
    await members.create({
      projectId: created.id,
      userId: EDITOR_ID,
      role: "EDITOR",
    });
    await members.create({
      projectId: created.id,
      userId: VIEWER_ID,
      role: "VIEWER",
    });

    const asEditor = await service.getById(EDITOR_ID, created.id);
    const patched = await service.update(EDITOR_ID, created.id, {
      name: "Shared",
    });
    await expect(service.archive(EDITOR_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );

    const asViewer = await service.getById(VIEWER_ID, created.id);
    await expect(
      service.update(VIEWER_ID, created.id, { name: "Nope" }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(service.archive(VIEWER_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );

    expect(asEditor.id).toBe(created.id);
    expect(patched.name).toBe("Shared");
    expect(asViewer.name).toBe("Shared");
    expect((await service.getById(OWNER_ID, created.id)).archivedAt).toBeNull();
  });

  it("grants OWNER access from ownerUserId even without a membership row", async () => {
    const { service, projects } = createService();
    const created = await projects.create({
      ownerUserId: OWNER_ID,
      name: "Legacy",
      description: null,
    });

    const found = await service.getById(OWNER_ID, created.id);
    const listed = await service.listAuthorized(OWNER_ID);
    const updated = await service.update(OWNER_ID, created.id, {
      name: "Still owned",
    });

    expect(found.id).toBe(created.id);
    expect(listed.map((project) => project.id)).toEqual([created.id]);
    expect(updated.name).toBe("Still owned");
  });

  it("throws not found for a missing project instead of forbidden", async () => {
    const { service } = createService();

    await expect(
      service.getById(OWNER_ID, "99999999-9999-4999-8999-999999999999"),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("lists active projects the actor is authorized to see, newest first", async () => {
    const { service, members } = createService();
    const older = await service.create(OWNER_ID, "Older", null);
    const newer = await service.create(OWNER_ID, "Newer", null);
    const shared = await service.create(OTHER_ID, "Shared", null);
    await service.create(OTHER_ID, "Secret", null);
    await service.archive(OWNER_ID, older.id);
    await members.create({
      projectId: shared.id,
      userId: OWNER_ID,
      role: "VIEWER",
    });

    const listed = await service.listAuthorized(OWNER_ID);
    const empty = await service.listAuthorized(
      "55555555-5555-4555-8555-555555555555",
    );

    expect(listed.map((project) => project.id).sort()).toEqual(
      [shared.id, newer.id].sort(),
    );
    expect(listed).toHaveLength(2);
    expect(empty).toEqual([]);
  });

  it("forbids non-owner members from GET of an archived project", async () => {
    const { service, members } = createService();
    const created = await service.create(OWNER_ID, "Roadmap", null);
    await members.create({
      projectId: created.id,
      userId: EDITOR_ID,
      role: "EDITOR",
    });
    await service.archive(OWNER_ID, created.id);

    await expect(service.getById(EDITOR_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    const asOwner = await service.getById(OWNER_ID, created.id);
    expect(asOwner.archivedAt).not.toBeNull();
    expect((await service.listAuthorized(EDITOR_ID)).map((p) => p.id)).toEqual(
      [],
    );
  });

  it("updates name and description without changing owner", async () => {
    const { service } = createService();
    const created = await service.create(OWNER_ID, "Roadmap", "First");

    const updated = await service.update(OWNER_ID, created.id, {
      name: "Platform",
      description: "Second",
    });

    expect(updated.name).toBe("Platform");
    expect(updated.description).toBe("Second");
    expect(updated.ownerUserId).toBe(OWNER_ID);
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt.toISOString()).toBe(created.createdAt.toISOString());
  });

  it("rejects PATCH while archived and allows it after unarchive", async () => {
    const { service } = createService();
    const created = await service.create(OWNER_ID, "Roadmap", "First");
    const archived = await service.archive(OWNER_ID, created.id);

    await expect(
      service.update(OWNER_ID, created.id, { name: "Blocked" }),
    ).rejects.toBeInstanceOf(ProjectArchivedError);

    const stillArchived = await service.getById(OWNER_ID, created.id);
    expect(stillArchived.name).toBe("Roadmap");
    expect(stillArchived.archivedAt?.toISOString()).toBe(
      archived.archivedAt?.toISOString(),
    );

    const restored = await service.unarchive(OWNER_ID, created.id);
    const updated = await service.update(OWNER_ID, created.id, {
      description: "After",
    });

    expect(restored.archivedAt).toBeNull();
    expect(updated.name).toBe("Roadmap");
    expect(updated.description).toBe("After");
  });

  it("treats archive and unarchive as idempotent", async () => {
    const { service } = createService();
    const created = await service.create(OWNER_ID, "Roadmap", null);
    const firstArchive = await service.archive(OWNER_ID, created.id);
    const secondArchive = await service.archive(OWNER_ID, created.id);
    const firstUnarchive = await service.unarchive(OWNER_ID, created.id);
    const secondUnarchive = await service.unarchive(OWNER_ID, created.id);

    expect(secondArchive.archivedAt?.toISOString()).toBe(
      firstArchive.archivedAt?.toISOString(),
    );
    expect(firstUnarchive.archivedAt).toBeNull();
    expect(secondUnarchive.archivedAt).toBeNull();
  });
});
