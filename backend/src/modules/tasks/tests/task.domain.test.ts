import { describe, expect, it } from "vitest";
import {
  InvalidTaskDueDateError,
  InvalidTaskPriorityError,
  InvalidTaskStatusError,
  InvalidTaskTitleError,
} from "../domain/errors";
import {
  calendarDateFromString,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  Task,
} from "../domain/task";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PROJECT_ID = "22222222-2222-4222-8222-222222222222";

describe("tasks domain", () => {
  it("assigns a UUID identity, created time, project association, and null deletedAt on create", () => {
    const before = Date.now();
    const task = Task.create(PROJECT_ID, "Write spec", "Draft the API");
    const after = Date.now();

    expect(task.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(task.projectId).toBe(PROJECT_ID);
    expect(task.title).toBe("Write spec");
    expect(task.description).toBe("Draft the API");
    expect(task.deletedAt).toBeNull();
    expect(task.isDeleted).toBe(false);
    expect(task.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(task.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("defaults omitted status to TODO and omitted priority to MEDIUM", () => {
    const task = Task.create(PROJECT_ID, "Write spec");

    expect(task.status).toBe(DEFAULT_TASK_STATUS);
    expect(task.status).toBe("TODO");
    expect(task.priority).toBe(DEFAULT_TASK_PRIORITY);
    expect(task.priority).toBe("MEDIUM");
    expect(task.dueDate).toBeNull();
  });

  it("persists supplied status and priority instead of defaults", () => {
    const task = Task.create(
      PROJECT_ID,
      "Write spec",
      null,
      "IN_PROGRESS",
      "HIGH",
    );

    expect(task.status).toBe("IN_PROGRESS");
    expect(task.priority).toBe("HIGH");
  });

  it("allows any status without a workflow sequence", () => {
    const created = Task.create(PROJECT_ID, "Write spec", null, "TODO", "LOW");
    const jumped = created.withDetails({ status: "DONE" });

    expect(jumped.status).toBe("DONE");
    expect(jumped.priority).toBe("LOW");
  });

  it("requires a non-empty title after trim and stores blank description as null", () => {
    expect(() => Task.create(PROJECT_ID, "   ")).toThrow(InvalidTaskTitleError);
    expect(Task.create(PROJECT_ID, " Write spec ").description).toBeNull();
    expect(Task.create(PROJECT_ID, "Write spec", "   ").description).toBeNull();
    expect(Task.create(PROJECT_ID, "Write spec", null).description).toBeNull();
  });

  it("does not require titles to be unique per project or globally", () => {
    const first = Task.create(PROJECT_ID, "Shared");
    const second = Task.create(PROJECT_ID, "Shared");
    const otherProject = Task.create(OTHER_PROJECT_ID, "Shared");

    expect(first.title).toBe("Shared");
    expect(second.title).toBe("Shared");
    expect(otherProject.title).toBe("Shared");
    expect(first.id).not.toBe(second.id);
  });

  it("keeps identity, created time, projectId, and deletedAt immutable when details change", () => {
    const createdAt = new Date("2026-10-29T12:00:00.000Z");
    const task = Task.create(
      PROJECT_ID,
      "Write spec",
      "First",
      "TODO",
      "MEDIUM",
      calendarDateFromString("2026-11-01"),
      createdAt,
    );
    const updated = task.withDetails({
      title: " Review spec ",
      description: " Second ",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: calendarDateFromString("2020-01-02"),
    });

    expect(updated.id).toBe(task.id);
    expect(updated.projectId).toBe(PROJECT_ID);
    expect(updated.createdAt.toISOString()).toBe("2026-10-29T12:00:00.000Z");
    expect(updated.deletedAt).toBeNull();
    expect(updated.title).toBe("Review spec");
    expect(updated.description).toBe("Second");
    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.priority).toBe("HIGH");
    expect(updated.dueDate?.toISOString().slice(0, 10)).toBe("2020-01-02");
    expect(task.title).toBe("Write spec");
    expect(Object.isFrozen(task)).toBe(true);
  });

  it("allows an optional calendar due date including dates in the past and clearing it", () => {
    const withDate = Task.create(
      PROJECT_ID,
      "Write spec",
      null,
      undefined,
      undefined,
      calendarDateFromString("2020-01-02"),
    );
    const cleared = withDate.withDetails({ dueDate: null });

    expect(withDate.dueDate?.toISOString().slice(0, 10)).toBe("2020-01-02");
    expect(cleared.dueDate).toBeNull();
    expect(() => calendarDateFromString("2026-02-31")).toThrow(
      InvalidTaskDueDateError,
    );
  });

  it("rejects unknown status and priority values", () => {
    expect(() =>
      Task.create(PROJECT_ID, "Write spec", null, "BLOCKED" as never),
    ).toThrow(InvalidTaskStatusError);
    expect(() =>
      Task.create(PROJECT_ID, "Write spec", null, "TODO", "URGENT" as never),
    ).toThrow(InvalidTaskPriorityError);
  });

  it("soft-deletes by setting deletedAt and does not restore it", () => {
    const task = Task.create(PROJECT_ID, "Write spec");
    const deletedAt = new Date("2026-10-29T15:00:00.000Z");
    const deleted = task.softDelete(deletedAt);
    const deletedAgain = deleted.softDelete(
      new Date("2026-10-29T16:00:00.000Z"),
    );

    expect(task.deletedAt).toBeNull();
    expect(deleted.deletedAt?.toISOString()).toBe("2026-10-29T15:00:00.000Z");
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.id).toBe(task.id);
    expect(deleted.projectId).toBe(PROJECT_ID);
    expect(deletedAgain.deletedAt?.toISOString()).toBe(
      "2026-10-29T15:00:00.000Z",
    );
    expect(deleted.withDetails({ title: "Still associated" }).projectId).toBe(
      PROJECT_ID,
    );
  });

  it("rehydrates persisted identity, association, enumerations, due date, and deletion state", () => {
    const id = "33333333-3333-4333-8333-333333333333";
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    const deletedAt = new Date("2026-02-03T04:05:06.000Z");
    const dueDate = calendarDateFromString("2026-03-04");
    const task = Task.rehydrate(
      id,
      PROJECT_ID,
      "Write spec",
      "Notes",
      "DONE",
      "LOW",
      dueDate,
      createdAt,
      deletedAt,
    );

    expect(task.id).toBe(id);
    expect(task.projectId).toBe(PROJECT_ID);
    expect(task.title).toBe("Write spec");
    expect(task.description).toBe("Notes");
    expect(task.status).toBe("DONE");
    expect(task.priority).toBe("LOW");
    expect(task.dueDate?.toISOString().slice(0, 10)).toBe("2026-03-04");
    expect(task.createdAt.toISOString()).toBe("2026-01-02T03:04:05.000Z");
    expect(task.deletedAt?.toISOString()).toBe("2026-02-03T04:05:06.000Z");
  });
});
