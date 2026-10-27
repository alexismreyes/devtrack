import { describe, expect, it } from "vitest";
import {
  ProjectArchivedError,
  ProjectForbiddenError,
  ProjectNotFoundError,
} from "../domain/errors";
import { ProjectsService } from "../service/projects-service";
import { InMemoryProjectsRepository } from "./in-memory-projects-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

describe("ProjectsService", () => {
  it("creates a project owned by the actor", async () => {
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);

    const created = await service.create(OWNER_ID, "Roadmap", "Q1");

    expect(created.ownerUserId).toBe(OWNER_ID);
    expect(created.name).toBe("Roadmap");
    expect(created.description).toBe("Q1");
    expect(created.archivedAt).toBeNull();
  });

  it("returns an owned project including after archive", async () => {
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);
    const created = await service.create(OWNER_ID, "Roadmap", null);
    const archived = await service.archive(OWNER_ID, created.id);

    const found = await service.getById(OWNER_ID, created.id);

    expect(found.id).toBe(created.id);
    expect(found.archivedAt).not.toBeNull();
    expect(archived.archivedAt).not.toBeNull();
  });

  it("rejects non-owners and does not change the project", async () => {
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);
    const created = await service.create(OWNER_ID, "Roadmap", null);

    await expect(service.getById(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      ProjectForbiddenError,
    );
    await expect(
      service.update(OTHER_ID, created.id, { name: "Hacked" }),
    ).rejects.toBeInstanceOf(ProjectForbiddenError);
    await expect(service.archive(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      ProjectForbiddenError,
    );
    await expect(service.unarchive(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      ProjectForbiddenError,
    );

    const unchanged = await service.getById(OWNER_ID, created.id);
    expect(unchanged.name).toBe("Roadmap");
    expect(unchanged.archivedAt).toBeNull();
  });

  it("throws not found for a missing project instead of forbidden", async () => {
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);

    await expect(
      service.getById(OWNER_ID, "99999999-9999-4999-8999-999999999999"),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("lists only the actor's active projects, newest first", async () => {
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);
    const older = await service.create(OWNER_ID, "Older", null);
    const newer = await service.create(OWNER_ID, "Newer", null);
    await service.create(OTHER_ID, "Other", null);
    await service.archive(OWNER_ID, older.id);

    const listed = await service.listOwned(OWNER_ID);
    const empty = await service.listOwned(
      "33333333-3333-4333-8333-333333333333",
    );

    expect(listed.map((project) => project.id)).toEqual([newer.id]);
    expect(empty).toEqual([]);
  });

  it("updates name and description without changing owner", async () => {
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);
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
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);
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
    const projects = new InMemoryProjectsRepository();
    const service = new ProjectsService(projects);
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
