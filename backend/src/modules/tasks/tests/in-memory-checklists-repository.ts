import { takeOldestPage } from "../domain/feed-cursor";
import {
  ChecklistItemNotFoundError,
  ChecklistNotFoundError,
} from "../domain/errors";
import {
  sortChecklistItemsOldestFirst,
  sortChecklistsOldestFirst,
  TaskChecklist,
  TaskChecklistItem,
} from "../domain/task-checklist";
import type {
  ChecklistItemsPageResult,
  ChecklistItemTallyByChecklist,
  ChecklistItemTallyByTask,
  ChecklistsRepository,
  CreateChecklistInput,
  CreateChecklistItemInput,
  DeletedChecklistSnapshot,
  ListChecklistItemsPageInput,
  UpdateChecklistItemInput,
} from "../repository/checklists-repository";

export class InMemoryChecklistsRepository implements ChecklistsRepository {
  readonly checklistsById = new Map<string, TaskChecklist>();
  readonly itemsById = new Map<string, TaskChecklistItem>();

  async create(input: CreateChecklistInput): Promise<TaskChecklist> {
    const checklist = TaskChecklist.create(input.taskId, input.name);
    this.checklistsById.set(checklist.id, checklist);
    return checklist;
  }

  async listByTaskId(taskId: string): Promise<TaskChecklist[]> {
    const checklists = [...this.checklistsById.values()].filter(
      (checklist) => checklist.taskId === taskId,
    );
    return sortChecklistsOldestFirst(
      checklists.map((checklist) => checklist.withItems([])),
    );
  }

  async findByIdInTask(
    taskId: string,
    checklistId: string,
  ): Promise<TaskChecklist | null> {
    const checklist = this.checklistsById.get(checklistId);
    if (checklist === undefined || checklist.taskId !== taskId) {
      return null;
    }
    return checklist.withItems([]);
  }

  async updateName(checklistId: string, name: string): Promise<TaskChecklist> {
    const existing = this.checklistsById.get(checklistId);
    if (existing === undefined) {
      throw new ChecklistNotFoundError();
    }
    const updated = existing.withName(name).withItems([]);
    this.checklistsById.set(checklistId, updated);
    return updated;
  }

  async delete(checklistId: string): Promise<DeletedChecklistSnapshot> {
    const existing = this.checklistsById.get(checklistId);
    if (existing === undefined) {
      throw new ChecklistNotFoundError();
    }
    for (const [id, item] of this.itemsById) {
      if (item.checklistId === checklistId) {
        this.itemsById.delete(id);
      }
    }
    this.checklistsById.delete(checklistId);
    return {
      id: existing.id,
      taskId: existing.taskId,
      name: existing.name,
      createdAt: existing.createdAt,
    };
  }

  async createItem(
    input: CreateChecklistItemInput,
  ): Promise<TaskChecklistItem> {
    if (!this.checklistsById.has(input.checklistId)) {
      throw new ChecklistNotFoundError();
    }
    const item = TaskChecklistItem.create(input.checklistId, input.text);
    this.itemsById.set(item.id, item);
    return item;
  }

  async findItemByIdInChecklist(
    checklistId: string,
    itemId: string,
  ): Promise<TaskChecklistItem | null> {
    const item = this.itemsById.get(itemId);
    if (item === undefined || item.checklistId !== checklistId) {
      return null;
    }
    return item;
  }

  async updateItem(
    itemId: string,
    input: UpdateChecklistItemInput,
  ): Promise<TaskChecklistItem> {
    const existing = this.itemsById.get(itemId);
    if (existing === undefined) {
      throw new ChecklistItemNotFoundError();
    }
    let updated = existing;
    if (input.text !== undefined) {
      updated = updated.withText(input.text);
    }
    if (input.checked !== undefined) {
      updated = updated.withChecked(input.checked);
    }
    this.itemsById.set(itemId, updated);
    return updated;
  }

  async deleteItem(itemId: string): Promise<void> {
    if (!this.itemsById.has(itemId)) {
      throw new ChecklistItemNotFoundError();
    }
    this.itemsById.delete(itemId);
  }

  async listItemsPage(
    input: ListChecklistItemsPageInput,
  ): Promise<ChecklistItemsPageResult> {
    const items = sortChecklistItemsOldestFirst(
      [...this.itemsById.values()].filter(
        (item) => item.checklistId === input.checklistId,
      ),
    );
    return takeOldestPage(items, input.limit, input.cursor);
  }

  async countItemTalliesByChecklistIds(
    checklistIds: string[],
  ): Promise<ChecklistItemTallyByChecklist[]> {
    if (checklistIds.length === 0) {
      return [];
    }
    const idSet = new Set(checklistIds);
    const byChecklist = new Map<
      string,
      { totalItems: number; checkedItems: number }
    >();
    for (const item of this.itemsById.values()) {
      if (!idSet.has(item.checklistId)) {
        continue;
      }
      const tally = byChecklist.get(item.checklistId) ?? {
        totalItems: 0,
        checkedItems: 0,
      };
      tally.totalItems += 1;
      if (item.checked) {
        tally.checkedItems += 1;
      }
      byChecklist.set(item.checklistId, tally);
    }
    return [...byChecklist.entries()]
      .filter(([, tally]) => tally.totalItems > 0)
      .map(([checklistId, tally]) => ({
        checklistId,
        totalItems: tally.totalItems,
        checkedItems: tally.checkedItems,
      }));
  }

  async countItemTalliesByTaskIds(
    taskIds: string[],
  ): Promise<ChecklistItemTallyByTask[]> {
    if (taskIds.length === 0) {
      return [];
    }
    const idSet = new Set(taskIds);
    const byTask = new Map<
      string,
      { totalItems: number; checkedItems: number }
    >();
    for (const checklist of this.checklistsById.values()) {
      if (!idSet.has(checklist.taskId)) {
        continue;
      }
      const tally = byTask.get(checklist.taskId) ?? {
        totalItems: 0,
        checkedItems: 0,
      };
      for (const item of this.itemsById.values()) {
        if (item.checklistId !== checklist.id) {
          continue;
        }
        tally.totalItems += 1;
        if (item.checked) {
          tally.checkedItems += 1;
        }
      }
      byTask.set(checklist.taskId, tally);
    }
    return [...byTask.entries()]
      .filter(([, tally]) => tally.totalItems > 0)
      .map(([taskId, tally]) => ({
        taskId,
        totalItems: tally.totalItems,
        checkedItems: tally.checkedItems,
      }));
  }
}
