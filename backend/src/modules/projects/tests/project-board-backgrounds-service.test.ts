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
  InvalidProjectBoardBackgroundContentTypeError,
  ProjectArchivedError,
  ProjectBoardBackgroundNotFoundError,
  ProjectNotFoundError,
} from "../domain/errors";
import { ProjectBoardBackgroundsService } from "../service/project-board-backgrounds-service";
import { InMemoryProjectBoardBackgroundStorage } from "./in-memory-project-board-background-storage";
import { InMemoryProjectBoardBackgroundsRepository } from "./in-memory-project-board-backgrounds-repository";
import { InMemoryProjectsRepository } from "./in-memory-projects-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const STRANGER_ID = "44444444-4444-4444-8444-444444444444";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

function createHarness() {
  const projects = new InMemoryProjectsRepository();
  const boardBackgrounds = new InMemoryProjectBoardBackgroundsRepository();
  const storage = new InMemoryProjectBoardBackgroundStorage();
  const members = new InMemoryProjectMembersRepository();
  const snapshots = new ProjectSnapshotAdapter(projects);
  const membership = new ProjectMembershipAccessAdapter(members, snapshots);
  const ownerWrite = new OwnerMembershipWriteAdapter(members);
  const service = new ProjectBoardBackgroundsService(
    boardBackgrounds,
    projects,
    membership,
    storage,
    new ImmediateUnitOfWork(),
  );
  return { service, projects, boardBackgrounds, storage, members, ownerWrite };
}

async function seedProject(
  harness: ReturnType<typeof createHarness>,
  archivedAt: Date | null = null,
) {
  const project = await harness.projects.create({
    ownerUserId: OWNER_ID,
    name: "Roadmap",
    description: null,
  });
  await harness.ownerWrite.insertCreatingOwner(project.id, OWNER_ID);
  await harness.members.create({
    projectId: project.id,
    userId: EDITOR_ID,
    role: "EDITOR",
  });
  await harness.members.create({
    projectId: project.id,
    userId: VIEWER_ID,
    role: "VIEWER",
  });
  if (archivedAt !== null) {
    await harness.projects.archive(project.id);
  }
  return project;
}

describe("ProjectBoardBackgroundsService", () => {
  it("uploads, replaces, clears, and serves content", async () => {
    const harness = createHarness();
    const project = await seedProject(harness);

    const uploaded = await harness.service.upload(EDITOR_ID, project.id, {
      originalFilename: "board.png",
      clientContentType: "image/png",
      bytes: pngBytes(),
    });
    expect(uploaded.contentType).toBe("image/png");
    expect(
      await harness.storage.exists(`${project.id}/${uploaded.id}`),
    ).toBe(true);

    const content = await harness.service.getContent(VIEWER_ID, project.id);
    expect(content.bytes).toEqual(pngBytes());

    const replaced = await harness.service.upload(OWNER_ID, project.id, {
      originalFilename: "next.png",
      clientContentType: "image/png",
      bytes: pngBytes(),
    });
    expect(replaced.id).not.toBe(uploaded.id);
    expect(
      await harness.storage.exists(`${project.id}/${uploaded.id}`),
    ).toBe(false);
    expect(
      await harness.storage.exists(`${project.id}/${replaced.id}`),
    ).toBe(true);

    await harness.service.clear(OWNER_ID, project.id);
    expect(await harness.boardBackgrounds.findByProjectId(project.id)).toBeNull();
    expect(
      await harness.storage.exists(`${project.id}/${replaced.id}`),
    ).toBe(false);
    await expect(
      harness.service.getContent(OWNER_ID, project.id),
    ).rejects.toBeInstanceOf(ProjectBoardBackgroundNotFoundError);
  });

  it("enforces authz and archived mutate mapping", async () => {
    const harness = createHarness();
    const project = await seedProject(harness);
    await harness.service.upload(OWNER_ID, project.id, {
      originalFilename: "a.png",
      clientContentType: "image/png",
      bytes: pngBytes(),
    });

    await expect(
      harness.service.getContent(STRANGER_ID, project.id),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      harness.service.upload(VIEWER_ID, project.id, {
        originalFilename: "b.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      harness.service.upload(OWNER_ID, MISSING_ID, {
        originalFilename: "c.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    await harness.projects.archive(project.id);
    await expect(
      harness.service.upload(OWNER_ID, project.id, {
        originalFilename: "d.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(ProjectArchivedError);
    await expect(
      harness.service.upload(EDITOR_ID, project.id, {
        originalFilename: "e.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
  });

  it("rejects disallowed content types without persisting", async () => {
    const harness = createHarness();
    const project = await seedProject(harness);
    await expect(
      harness.service.upload(OWNER_ID, project.id, {
        originalFilename: "bad.exe",
        clientContentType: "application/octet-stream",
        bytes: new Uint8Array([0x4d, 0x5a, 0x90, 0x00]),
      }),
    ).rejects.toBeInstanceOf(InvalidProjectBoardBackgroundContentTypeError);
    expect(await harness.boardBackgrounds.findByProjectId(project.id)).toBeNull();
    expect(harness.storage.blobs.size).toBe(0);
  });
});
