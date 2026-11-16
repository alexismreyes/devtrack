import type { FeedCursor } from "../domain/feed-cursor";
import type {
  TaskChecklist,
  TaskChecklistItem,
} from "../domain/task-checklist";

export type CreateChecklistInput = {
  taskId: string;
  name: string;
};

export type CreateChecklistItemInput = {
  checklistId: string;
  text: string;
};

export type UpdateChecklistItemInput = {
  text?: string;
  checked?: boolean;
};

/** Snapshot returned by hard-delete for activity preview (name before delete). */
export type DeletedChecklistSnapshot = {
  id: string;
  taskId: string;
  name: string;
  createdAt: Date;
};

export type ChecklistItemTallyByTask = {
  taskId: string;
  totalItems: number;
  checkedItems: number;
};

export type ChecklistItemTallyByChecklist = {
  checklistId: string;
  totalItems: number;
  checkedItems: number;
};

export type ListChecklistItemsPageInput = {
  checklistId: string;
  limit: number;
  cursor: FeedCursor | null;
};

export type ChecklistItemsPageResult = {
  items: TaskChecklistItem[];
  nextCursor: FeedCursor | null;
};

export interface ChecklistsRepository {
  create(input: CreateChecklistInput): Promise<TaskChecklist>;
  /** Lists checklists for a task without nested items (empty items arrays). */
  listByTaskId(taskId: string): Promise<TaskChecklist[]>;
  findByIdInTask(
    taskId: string,
    checklistId: string,
  ): Promise<TaskChecklist | null>;
  updateName(checklistId: string, name: string): Promise<TaskChecklist>;
  /** Hard-deletes checklist and cascaded items; returns deleted name snapshot. */
  delete(checklistId: string): Promise<DeletedChecklistSnapshot>;

  createItem(input: CreateChecklistItemInput): Promise<TaskChecklistItem>;
  findItemByIdInChecklist(
    checklistId: string,
    itemId: string,
  ): Promise<TaskChecklistItem | null>;
  updateItem(
    itemId: string,
    input: UpdateChecklistItemInput,
  ): Promise<TaskChecklistItem>;
  deleteItem(itemId: string): Promise<void>;
  listItemsPage(
    input: ListChecklistItemsPageInput,
  ): Promise<ChecklistItemsPageResult>;
  /**
   * Item tallies for the given checklist ids.
   * Checklists with zero items are omitted (caller treats missing as 0/0).
   */
  countItemTalliesByChecklistIds(
    checklistIds: string[],
  ): Promise<ChecklistItemTallyByChecklist[]>;
  /**
   * Item tallies for the given task ids.
   * Tasks with zero items are omitted (caller treats missing as 0/0).
   */
  countItemTalliesByTaskIds(
    taskIds: string[],
  ): Promise<ChecklistItemTallyByTask[]>;
}
