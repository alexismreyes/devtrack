import { describe, expect, it } from "vitest";
import { InvalidCommentBodyError } from "../domain/errors";
import {
  sortLiveCommentsOldestFirst,
  TaskComment,
} from "../domain/task-comment";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TASK_ID = "22222222-2222-4222-8222-222222222222";
const AUTHOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("task comment domain", () => {
  it("assigns UUID identity, created time, task and author binding, and null deletedAt", () => {
    const before = Date.now();
    const comment = TaskComment.create(TASK_ID, AUTHOR_ID, "Hello thread");
    const after = Date.now();

    expect(comment.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(comment.taskId).toBe(TASK_ID);
    expect(comment.authorUserId).toBe(AUTHOR_ID);
    expect(comment.body).toBe("Hello thread");
    expect(comment.deletedAt).toBeNull();
    expect(comment.isDeleted).toBe(false);
    expect(comment.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(comment.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("requires a non-empty body after trim", () => {
    expect(() => TaskComment.create(TASK_ID, AUTHOR_ID, "   ")).toThrow(
      InvalidCommentBodyError,
    );
    expect(TaskComment.create(TASK_ID, AUTHOR_ID, "  Hello  ").body).toBe(
      "Hello",
    );
  });

  it("keeps taskId immutable across body updates and soft-delete", () => {
    const comment = TaskComment.create(TASK_ID, AUTHOR_ID, "Original");
    const updated = comment.withBody("Revised");
    const deleted = updated.softDelete(
      new Date("2026-11-04T12:00:00.000Z"),
    );

    expect(updated.taskId).toBe(TASK_ID);
    expect(updated.authorUserId).toBe(AUTHOR_ID);
    expect(updated.id).toBe(comment.id);
    expect(updated.createdAt.getTime()).toBe(comment.createdAt.getTime());
    expect(updated.body).toBe("Revised");
    expect(deleted.taskId).toBe(TASK_ID);
    expect(deleted.deletedAt?.toISOString()).toBe("2026-11-04T12:00:00.000Z");
    expect(deleted.isDeleted).toBe(true);
  });

  it("allows edit only for the live author", () => {
    const comment = TaskComment.create(TASK_ID, AUTHOR_ID, "Mine");
    expect(comment.canBeEditedBy(AUTHOR_ID)).toBe(true);
    expect(comment.canBeEditedBy(OTHER_USER_ID)).toBe(false);

    const deleted = comment.softDelete();
    expect(deleted.canBeEditedBy(AUTHOR_ID)).toBe(false);
  });

  it("allows soft-delete for author or effective owner only while live", () => {
    const comment = TaskComment.create(TASK_ID, AUTHOR_ID, "Mine");
    expect(comment.canBeSoftDeletedBy(AUTHOR_ID, false)).toBe(true);
    expect(comment.canBeSoftDeletedBy(OTHER_USER_ID, true)).toBe(true);
    expect(comment.canBeSoftDeletedBy(OTHER_USER_ID, false)).toBe(false);

    const deleted = comment.softDelete();
    expect(deleted.canBeSoftDeletedBy(AUTHOR_ID, true)).toBe(false);
  });

  it("softDelete is idempotent on already-deleted comments", () => {
    const now = new Date("2026-11-04T12:00:00.000Z");
    const deleted = TaskComment.create(TASK_ID, AUTHOR_ID, "Gone").softDelete(
      now,
    );
    const again = deleted.softDelete(new Date("2026-11-05T12:00:00.000Z"));
    expect(again.deletedAt?.toISOString()).toBe(now.toISOString());
  });

  it("sorts live comments oldest-first and omits soft-deleted rows", () => {
    const older = TaskComment.rehydrate(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      TASK_ID,
      AUTHOR_ID,
      "First",
      new Date("2026-11-01T10:00:00.000Z"),
      null,
    );
    const newer = TaskComment.rehydrate(
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      TASK_ID,
      AUTHOR_ID,
      "Second",
      new Date("2026-11-02T10:00:00.000Z"),
      null,
    );
    const deleted = TaskComment.rehydrate(
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      TASK_ID,
      AUTHOR_ID,
      "Hidden",
      new Date("2026-11-01T09:00:00.000Z"),
      new Date("2026-11-03T10:00:00.000Z"),
    );
    const otherTask = TaskComment.create(OTHER_TASK_ID, AUTHOR_ID, "Other");

    const ordered = sortLiveCommentsOldestFirst([
      newer,
      deleted,
      older,
      otherTask,
    ]);
    expect(ordered.map((c) => c.body)).toEqual(["First", "Second", "Other"]);
  });

  it("rejects empty body on withBody", () => {
    const comment = TaskComment.create(TASK_ID, AUTHOR_ID, "Original");
    expect(() => comment.withBody("  ")).toThrow(InvalidCommentBodyError);
  });
});
