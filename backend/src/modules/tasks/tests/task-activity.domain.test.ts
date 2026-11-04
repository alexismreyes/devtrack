import { describe, expect, it } from "vitest";
import {
  buildTaskFieldChanges,
  COMMENT_BODY_PREVIEW_MAX_LENGTH,
  sortActivityNewestFirst,
  TaskActivityEvent,
  truncateCommentBodyPreview,
} from "../domain/task-activity";
import { calendarDateFromString, Task } from "../domain/task";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMMENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROJECT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("task activity domain", () => {
  it("creates TASK_CREATED with empty payload and system identity", () => {
    const before = Date.now();
    const event = TaskActivityEvent.taskCreated(TASK_ID, ACTOR_ID);
    const after = Date.now();

    expect(event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(event.taskId).toBe(TASK_ID);
    expect(event.actorUserId).toBe(ACTOR_ID);
    expect(event.kind).toBe("TASK_CREATED");
    expect(event.payload).toEqual({});
    expect(event.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(event.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("builds one field-change payload with old/new for changed fields only", () => {
    const task = Task.create(
      PROJECT_ID,
      "Title",
      "Desc",
      "TODO",
      "MEDIUM",
      calendarDateFromString("2026-01-01"),
    );

    const changes = buildTaskFieldChanges(task, {
      title: "Title",
      status: "DONE",
      priority: "HIGH",
      dueDate: calendarDateFromString("2026-02-01"),
    });

    expect(changes).toEqual([
      { field: "status", oldValue: "TODO", newValue: "DONE" },
      { field: "priority", oldValue: "MEDIUM", newValue: "HIGH" },
      {
        field: "dueDate",
        oldValue: "2026-01-01",
        newValue: "2026-02-01",
      },
    ]);

    const event = TaskActivityEvent.taskFieldsChanged(
      task.id,
      ACTOR_ID,
      changes,
    );
    expect(event.kind).toBe("TASK_FIELDS_CHANGED");
    expect(event.payload).toEqual({ changes });
  });

  it("detects no-op PATCH after normalization (Q-072)", () => {
    const task = Task.create(PROJECT_ID, "Title", null, "TODO", "MEDIUM", null);

    expect(
      buildTaskFieldChanges(task, {
        title: "  Title  ",
        description: null,
        status: "TODO",
        priority: "MEDIUM",
        dueDate: null,
      }),
    ).toEqual([]);
  });

  it("rejects empty field-change events", () => {
    expect(() =>
      TaskActivityEvent.taskFieldsChanged(TASK_ID, ACTOR_ID, []),
    ).toThrow(/at least one change/i);
  });

  it("creates soft-delete and comment-added events with expected payloads", () => {
    const soft = TaskActivityEvent.taskSoftDeleted(TASK_ID, ACTOR_ID);
    expect(soft.kind).toBe("TASK_SOFT_DELETED");
    expect(soft.payload).toEqual({});

    const longBody = "x".repeat(COMMENT_BODY_PREVIEW_MAX_LENGTH + 10);
    const comment = TaskActivityEvent.commentAdded(
      TASK_ID,
      ACTOR_ID,
      COMMENT_ID,
      longBody,
    );
    expect(comment.kind).toBe("COMMENT_ADDED");
    expect(comment.payload).toEqual({
      commentId: COMMENT_ID,
      bodyPreview: truncateCommentBodyPreview(longBody),
    });
    expect(
      (comment.payload as { bodyPreview: string }).bodyPreview.length,
    ).toBe(COMMENT_BODY_PREVIEW_MAX_LENGTH + 1);
  });

  it("truncates comment body preview consistently", () => {
    expect(truncateCommentBodyPreview("short")).toBe("short");
    const long = "a".repeat(130);
    expect(truncateCommentBodyPreview(long)).toBe(
      `${"a".repeat(COMMENT_BODY_PREVIEW_MAX_LENGTH)}…`,
    );
  });

  it("sorts activity newest createdAt first", () => {
    const older = TaskActivityEvent.taskCreated(
      TASK_ID,
      ACTOR_ID,
      new Date("2026-11-01T10:00:00.000Z"),
    );
    const newer = TaskActivityEvent.commentAdded(
      TASK_ID,
      ACTOR_ID,
      COMMENT_ID,
      "Hi",
      new Date("2026-11-02T10:00:00.000Z"),
    );

    expect(sortActivityNewestFirst([older, newer]).map((e) => e.id)).toEqual([
      newer.id,
      older.id,
    ]);
  });

  it("rehydrates known kinds and rejects unknown kinds", () => {
    const created = TaskActivityEvent.taskCreated(TASK_ID, ACTOR_ID);
    const rehydrated = TaskActivityEvent.rehydrate(
      created.id,
      created.taskId,
      created.actorUserId,
      created.kind,
      created.payload,
      created.createdAt,
    );
    expect(rehydrated.kind).toBe("TASK_CREATED");
    expect(() =>
      TaskActivityEvent.rehydrate(
        created.id,
        created.taskId,
        created.actorUserId,
        "LABEL_ADDED",
        {},
        created.createdAt,
      ),
    ).toThrow(/Unknown task activity kind/);
  });
});
