import { describe, expect, it } from "vitest";
import {
  ChecklistItemNotFoundError,
  ChecklistNotFoundError,
} from "../domain/errors";
import { InMemoryChecklistsRepository } from "./in-memory-checklists-repository";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TASK_ID = "22222222-2222-4222-8222-222222222222";

describe("InMemoryChecklistsRepository", () => {
  it("creates and lists checklists without nested items; pages items oldest-first", async () => {
    const repo = new InMemoryChecklistsRepository();
    const first = await repo.create({ taskId: TASK_ID, name: "First" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await repo.create({ taskId: TASK_ID, name: "Second" });
    await repo.create({ taskId: OTHER_TASK_ID, name: "Other" });

    const olderItem = await repo.createItem({
      checklistId: first.id,
      text: "A",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const newerItem = await repo.createItem({
      checklistId: first.id,
      text: "B",
    });

    const listed = await repo.listByTaskId(TASK_ID);
    expect(listed.map((entry) => entry.id)).toEqual([first.id, second.id]);
    expect(listed[0]?.items).toEqual([]);
    expect(listed[1]?.items).toEqual([]);

    const page = await repo.listItemsPage({
      checklistId: first.id,
      limit: 10,
      cursor: null,
    });
    expect(page.items.map((item) => item.id)).toEqual([
      olderItem.id,
      newerItem.id,
    ]);
    expect(page.nextCursor).toBeNull();

    const tallies = await repo.countItemTalliesByChecklistIds([
      first.id,
      second.id,
    ]);
    expect(tallies).toEqual([
      {
        checklistId: first.id,
        totalItems: 2,
        checkedItems: 0,
      },
    ]);
  });

  it("hard-deletes checklist cascading items and returns name snapshot", async () => {
    const repo = new InMemoryChecklistsRepository();
    const checklist = await repo.create({
      taskId: TASK_ID,
      name: "Remove me",
    });
    const item = await repo.createItem({
      checklistId: checklist.id,
      text: "Gone",
    });

    const snapshot = await repo.delete(checklist.id);
    expect(snapshot).toEqual({
      id: checklist.id,
      taskId: TASK_ID,
      name: "Remove me",
      createdAt: checklist.createdAt,
    });
    expect(await repo.findByIdInTask(TASK_ID, checklist.id)).toBeNull();
    expect(
      await repo.findItemByIdInChecklist(checklist.id, item.id),
    ).toBeNull();
  });

  it("deletes item only and leaves empty checklist", async () => {
    const repo = new InMemoryChecklistsRepository();
    const checklist = await repo.create({ taskId: TASK_ID, name: "Keep" });
    const item = await repo.createItem({
      checklistId: checklist.id,
      text: "Temp",
    });

    await repo.deleteItem(item.id);
    const listed = await repo.listByTaskId(TASK_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.items).toEqual([]);
  });

  it("scopes find to task and rejects missing updates/deletes", async () => {
    const repo = new InMemoryChecklistsRepository();
    const checklist = await repo.create({ taskId: TASK_ID, name: "Scoped" });
    const item = await repo.createItem({
      checklistId: checklist.id,
      text: "Item",
    });

    expect(await repo.findByIdInTask(OTHER_TASK_ID, checklist.id)).toBeNull();
    expect(
      await repo.findItemByIdInChecklist(checklist.id, item.id),
    ).not.toBeNull();
    expect(
      await repo.findItemByIdInChecklist(
        "99999999-9999-4999-8999-999999999999",
        item.id,
      ),
    ).toBeNull();

    await expect(repo.updateName("99999999-9999-4999-8999-999999999999", "X")).rejects.toBeInstanceOf(
      ChecklistNotFoundError,
    );
    await expect(
      repo.delete("99999999-9999-4999-8999-999999999999"),
    ).rejects.toBeInstanceOf(ChecklistNotFoundError);
    await expect(
      repo.updateItem("99999999-9999-4999-8999-999999999999", {
        checked: true,
      }),
    ).rejects.toBeInstanceOf(ChecklistItemNotFoundError);
    await expect(
      repo.deleteItem("99999999-9999-4999-8999-999999999999"),
    ).rejects.toBeInstanceOf(ChecklistItemNotFoundError);
  });
});
