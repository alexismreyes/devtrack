import { describe, expect, it } from "vitest";
import {
  InvalidChecklistItemTextError,
  InvalidChecklistNameError,
} from "../domain/errors";
import {
  CHECKLIST_ITEM_TEXT_MAX_LENGTH,
  CHECKLIST_NAME_MAX_LENGTH,
  normalizeChecklistItemText,
  normalizeChecklistName,
  sortChecklistItemsOldestFirst,
  sortChecklistsOldestFirst,
  TaskChecklist,
  TaskChecklistItem,
} from "../domain/task-checklist";
import {
  COMMENT_BODY_PREVIEW_MAX_LENGTH,
  TaskActivityEvent,
  truncateCommentBodyPreview,
} from "../domain/task-activity";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const ACTOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CHECKLIST_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ITEM_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("task checklist domain", () => {
  it("creates named checklist with system id/createdAt and empty items", () => {
    const before = Date.now();
    const checklist = TaskChecklist.create(TASK_ID, "  Launch prep  ");
    const after = Date.now();

    expect(checklist.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(checklist.taskId).toBe(TASK_ID);
    expect(checklist.name).toBe("Launch prep");
    expect(checklist.items).toEqual([]);
    expect(checklist.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(checklist.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("rejects empty/oversized checklist names and item text", () => {
    expect(() => normalizeChecklistName("")).toThrow(InvalidChecklistNameError);
    expect(() => normalizeChecklistName("   ")).toThrow(
      InvalidChecklistNameError,
    );
    expect(() =>
      normalizeChecklistName("x".repeat(CHECKLIST_NAME_MAX_LENGTH + 1)),
    ).toThrow(InvalidChecklistNameError);
    expect(normalizeChecklistName("x".repeat(CHECKLIST_NAME_MAX_LENGTH))).toBe(
      "x".repeat(CHECKLIST_NAME_MAX_LENGTH),
    );

    expect(() => normalizeChecklistItemText("")).toThrow(
      InvalidChecklistItemTextError,
    );
    expect(() =>
      normalizeChecklistItemText("y".repeat(CHECKLIST_ITEM_TEXT_MAX_LENGTH + 1)),
    ).toThrow(InvalidChecklistItemTextError);
  });

  it("creates items with checked false and allows empty checklists", () => {
    const item = TaskChecklistItem.create(CHECKLIST_ID, "  Ship docs  ");
    expect(item.checklistId).toBe(CHECKLIST_ID);
    expect(item.text).toBe("Ship docs");
    expect(item.checked).toBe(false);

    const checklist = TaskChecklist.create(TASK_ID, "Empty ok");
    expect(checklist.items).toEqual([]);
    expect(checklist.withItems([]).items).toEqual([]);
  });

  it("supports rename and checked/text updates without soft-delete fields", () => {
    const checklist = TaskChecklist.create(TASK_ID, "Before");
    expect(checklist.withName("After").name).toBe("After");
    expect(checklist).not.toHaveProperty("deletedAt");

    const item = TaskChecklistItem.create(CHECKLIST_ID, "Task");
    expect(item.withChecked(true).checked).toBe(true);
    expect(item.withText("Revised").text).toBe("Revised");
    expect(item).not.toHaveProperty("deletedAt");
  });

  it("sorts checklists and items by createdAt ascending", () => {
    const olderChecklist = TaskChecklist.rehydrate(
      "11111111-1111-4111-8111-111111111101",
      TASK_ID,
      "A",
      new Date("2026-11-01T10:00:00.000Z"),
    );
    const newerChecklist = TaskChecklist.rehydrate(
      "11111111-1111-4111-8111-111111111102",
      TASK_ID,
      "B",
      new Date("2026-11-02T10:00:00.000Z"),
    );
    expect(
      sortChecklistsOldestFirst([newerChecklist, olderChecklist]).map(
        (entry) => entry.id,
      ),
    ).toEqual([olderChecklist.id, newerChecklist.id]);

    const olderItem = TaskChecklistItem.rehydrate(
      "22222222-2222-4222-8222-222222222201",
      CHECKLIST_ID,
      "one",
      false,
      new Date("2026-11-01T10:00:00.000Z"),
    );
    const newerItem = TaskChecklistItem.rehydrate(
      "22222222-2222-4222-8222-222222222202",
      CHECKLIST_ID,
      "two",
      true,
      new Date("2026-11-03T10:00:00.000Z"),
    );
    expect(
      sortChecklistItemsOldestFirst([newerItem, olderItem]).map(
        (entry) => entry.id,
      ),
    ).toEqual([olderItem.id, newerItem.id]);
  });

  it("builds checklist activity payloads with truncated previews", () => {
    const longName = "n".repeat(COMMENT_BODY_PREVIEW_MAX_LENGTH + 5);
    const added = TaskActivityEvent.checklistAdded(
      TASK_ID,
      ACTOR_ID,
      CHECKLIST_ID,
      longName,
    );
    expect(added.kind).toBe("CHECKLIST_ADDED");
    expect(added.payload).toEqual({
      checklistId: CHECKLIST_ID,
      namePreview: truncateCommentBodyPreview(longName),
    });

    const removed = TaskActivityEvent.checklistRemoved(
      TASK_ID,
      ACTOR_ID,
      CHECKLIST_ID,
      "Done list",
    );
    expect(removed.kind).toBe("CHECKLIST_REMOVED");
    expect(removed.payload).toEqual({
      checklistId: CHECKLIST_ID,
      namePreview: "Done list",
    });

    const longText = "t".repeat(COMMENT_BODY_PREVIEW_MAX_LENGTH + 3);
    const completed = TaskActivityEvent.checklistItemCompleted(
      TASK_ID,
      ACTOR_ID,
      CHECKLIST_ID,
      ITEM_ID,
      longText,
    );
    expect(completed.kind).toBe("CHECKLIST_ITEM_COMPLETED");
    expect(completed.payload).toEqual({
      checklistId: CHECKLIST_ID,
      itemId: ITEM_ID,
      textPreview: truncateCommentBodyPreview(longText),
    });

    const uncompleted = TaskActivityEvent.checklistItemUncompleted(
      TASK_ID,
      ACTOR_ID,
      CHECKLIST_ID,
      ITEM_ID,
      "Undo",
    );
    expect(uncompleted.kind).toBe("CHECKLIST_ITEM_UNCOMPLETED");
    expect(uncompleted.payload).toEqual({
      checklistId: CHECKLIST_ID,
      itemId: ITEM_ID,
      textPreview: "Undo",
    });
  });

  it("rehydrates checklist activity kinds", () => {
    const event = TaskActivityEvent.checklistAdded(
      TASK_ID,
      ACTOR_ID,
      CHECKLIST_ID,
      "List",
    );
    const rehydrated = TaskActivityEvent.rehydrate(
      event.id,
      event.taskId,
      event.actorUserId,
      event.kind,
      event.payload,
      event.createdAt,
    );
    expect(rehydrated.kind).toBe("CHECKLIST_ADDED");
    expect(rehydrated.payload).toEqual(event.payload);
  });
});
