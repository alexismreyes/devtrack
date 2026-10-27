import { describe, expect, it } from "vitest";
import { assertProjectOwner } from "../domain/authorization";
import {
  InvalidProjectNameError,
  ProjectArchivedError,
  ProjectForbiddenError,
} from "../domain/errors";
import { Project } from "../domain/project";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

describe("projects domain", () => {
  it("assigns a UUID identity, created time, owner, and null archivedAt on create", () => {
    const before = Date.now();
    const project = Project.create(OWNER_ID, "Roadmap", "Q1 work");
    const after = Date.now();

    expect(project.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(project.ownerUserId).toBe(OWNER_ID);
    expect(project.name).toBe("Roadmap");
    expect(project.description).toBe("Q1 work");
    expect(project.archivedAt).toBeNull();
    expect(project.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(project.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("requires a non-empty name after trim and stores blank description as null", () => {
    expect(() => Project.create(OWNER_ID, "   ")).toThrow(InvalidProjectNameError);
    expect(Project.create(OWNER_ID, " Roadmap ").description).toBeNull();
    expect(Project.create(OWNER_ID, "Roadmap", "   ").description).toBeNull();
    expect(Project.create(OWNER_ID, "Roadmap", null).description).toBeNull();
  });

  it("does not require names to be unique", () => {
    const first = Project.create(OWNER_ID, "Shared");
    const second = Project.create(OWNER_ID, "Shared");
    const otherOwner = Project.create(OTHER_ID, "Shared");

    expect(first.name).toBe("Shared");
    expect(second.name).toBe("Shared");
    expect(otherOwner.name).toBe("Shared");
    expect(first.id).not.toBe(second.id);
  });

  it("keeps owner and identity immutable when details change", () => {
    const createdAt = new Date("2026-10-27T12:00:00.000Z");
    const project = Project.create(OWNER_ID, "Roadmap", "First", createdAt);
    const updated = project.withDetails({
      name: " Platform ",
      description: " Second ",
    });

    expect(updated.id).toBe(project.id);
    expect(updated.ownerUserId).toBe(OWNER_ID);
    expect(updated.createdAt.toISOString()).toBe("2026-10-27T12:00:00.000Z");
    expect(updated.name).toBe("Platform");
    expect(updated.description).toBe("Second");
    expect(project.name).toBe("Roadmap");
    expect(Object.isFrozen(project)).toBe(true);
  });

  it("authorizes access only when the actor is the owner", () => {
    expect(() => assertProjectOwner(OWNER_ID, OWNER_ID)).not.toThrow();
    expect(() => assertProjectOwner(OTHER_ID, OWNER_ID)).toThrow(
      ProjectForbiddenError,
    );
  });

  it("archives by setting archivedAt and unarchives by clearing it", () => {
    const project = Project.create(OWNER_ID, "Roadmap");
    const archivedAt = new Date("2026-10-27T15:00:00.000Z");
    const archived = project.archive(archivedAt);
    const unarchived = archived.unarchive();

    expect(project.archivedAt).toBeNull();
    expect(archived.archivedAt?.toISOString()).toBe("2026-10-27T15:00:00.000Z");
    expect(archived.id).toBe(project.id);
    expect(archived.ownerUserId).toBe(OWNER_ID);
    expect(unarchived.archivedAt).toBeNull();
  });

  it("treats archive and unarchive as idempotent", () => {
    const firstArchiveAt = new Date("2026-10-27T15:00:00.000Z");
    const project = Project.create(OWNER_ID, "Roadmap").archive(firstArchiveAt);
    const archivedAgain = project.archive(new Date("2026-10-27T16:00:00.000Z"));
    const active = Project.create(OWNER_ID, "Other");
    const unarchivedActive = active.unarchive();

    expect(archivedAgain.archivedAt?.toISOString()).toBe(
      "2026-10-27T15:00:00.000Z",
    );
    expect(unarchivedActive.archivedAt).toBeNull();
  });

  it("rejects detail changes while archived and allows them after unarchive", () => {
    const archived = Project.create(OWNER_ID, "Roadmap").archive(
      new Date("2026-10-27T15:00:00.000Z"),
    );

    expect(() => archived.withDetails({ name: "New" })).toThrow(
      ProjectArchivedError,
    );
    expect(archived.name).toBe("Roadmap");

    const restored = archived.unarchive().withDetails({ name: "New" });
    expect(restored.name).toBe("New");
    expect(restored.archivedAt).toBeNull();
  });

  it("rehydrates persisted identity, owner, and archive state without changing them", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    const archivedAt = new Date("2026-02-03T04:05:06.000Z");
    const project = Project.rehydrate(
      id,
      OWNER_ID,
      "Roadmap",
      "Notes",
      createdAt,
      archivedAt,
    );

    expect(project.id).toBe(id);
    expect(project.ownerUserId).toBe(OWNER_ID);
    expect(project.name).toBe("Roadmap");
    expect(project.description).toBe("Notes");
    expect(project.createdAt.toISOString()).toBe("2026-01-02T03:04:05.000Z");
    expect(project.archivedAt?.toISOString()).toBe("2026-02-03T04:05:06.000Z");
  });
});
