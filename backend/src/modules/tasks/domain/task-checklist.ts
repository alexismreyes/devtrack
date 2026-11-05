import { randomUUID } from "node:crypto";
import {
  InvalidChecklistItemTextError,
  InvalidChecklistNameError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CHECKLIST_NAME_MAX_LENGTH = 80;
export const CHECKLIST_ITEM_TEXT_MAX_LENGTH = 200;

export function normalizeChecklistName(name: string): string {
  const normalized = name.trim();
  if (
    normalized.length < 1 ||
    normalized.length > CHECKLIST_NAME_MAX_LENGTH
  ) {
    throw new InvalidChecklistNameError();
  }
  return normalized;
}

export function normalizeChecklistItemText(text: string): string {
  const normalized = text.trim();
  if (
    normalized.length < 1 ||
    normalized.length > CHECKLIST_ITEM_TEXT_MAX_LENGTH
  ) {
    throw new InvalidChecklistItemTextError();
  }
  return normalized;
}

export class TaskChecklistItem {
  readonly id: string;
  readonly checklistId: string;
  readonly text: string;
  readonly checked: boolean;
  readonly createdAt: Date;

  private constructor(
    id: string,
    checklistId: string,
    text: string,
    checked: boolean,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Checklist item id must be a UUID");
    }
    if (!UUID_PATTERN.test(checklistId)) {
      throw new Error("Checklist item checklist id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Checklist item created time must be a valid date");
    }

    this.id = id;
    this.checklistId = checklistId;
    this.text = text;
    this.checked = checked;
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static create(
    checklistId: string,
    text: string,
    now: Date = new Date(),
  ): TaskChecklistItem {
    return new TaskChecklistItem(
      randomUUID(),
      checklistId,
      normalizeChecklistItemText(text),
      false,
      now,
    );
  }

  static rehydrate(
    id: string,
    checklistId: string,
    text: string,
    checked: boolean,
    createdAt: Date,
  ): TaskChecklistItem {
    return new TaskChecklistItem(
      id,
      checklistId,
      normalizeChecklistItemText(text),
      checked,
      createdAt,
    );
  }

  withText(text: string): TaskChecklistItem {
    return new TaskChecklistItem(
      this.id,
      this.checklistId,
      normalizeChecklistItemText(text),
      this.checked,
      this.createdAt,
    );
  }

  withChecked(checked: boolean): TaskChecklistItem {
    return new TaskChecklistItem(
      this.id,
      this.checklistId,
      this.text,
      checked,
      this.createdAt,
    );
  }
}

export class TaskChecklist {
  readonly id: string;
  readonly taskId: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly items: readonly TaskChecklistItem[];

  private constructor(
    id: string,
    taskId: string,
    name: string,
    createdAt: Date,
    items: readonly TaskChecklistItem[],
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Checklist id must be a UUID");
    }
    if (!UUID_PATTERN.test(taskId)) {
      throw new Error("Checklist task id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Checklist created time must be a valid date");
    }

    this.id = id;
    this.taskId = taskId;
    this.name = name;
    this.createdAt = new Date(createdAt.getTime());
    this.items = Object.freeze(
      sortChecklistItemsOldestFirst(
        items.filter((item) => item.checklistId === id),
      ),
    );
    Object.freeze(this);
  }

  static create(
    taskId: string,
    name: string,
    now: Date = new Date(),
  ): TaskChecklist {
    return new TaskChecklist(
      randomUUID(),
      taskId,
      normalizeChecklistName(name),
      now,
      [],
    );
  }

  static rehydrate(
    id: string,
    taskId: string,
    name: string,
    createdAt: Date,
    items: readonly TaskChecklistItem[] = [],
  ): TaskChecklist {
    return new TaskChecklist(
      id,
      taskId,
      normalizeChecklistName(name),
      createdAt,
      items,
    );
  }

  withName(name: string): TaskChecklist {
    return new TaskChecklist(
      this.id,
      this.taskId,
      normalizeChecklistName(name),
      this.createdAt,
      this.items,
    );
  }

  withItems(items: readonly TaskChecklistItem[]): TaskChecklist {
    return new TaskChecklist(
      this.id,
      this.taskId,
      this.name,
      this.createdAt,
      items,
    );
  }
}

export function sortChecklistsOldestFirst(
  checklists: readonly TaskChecklist[],
): TaskChecklist[] {
  return checklists
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function sortChecklistItemsOldestFirst(
  items: readonly TaskChecklistItem[],
): TaskChecklistItem[] {
  return items
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
