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

export interface ChecklistsRepository {
  create(input: CreateChecklistInput): Promise<TaskChecklist>;
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
}
