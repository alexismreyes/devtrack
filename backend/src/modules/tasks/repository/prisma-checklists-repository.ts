import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import {
  ChecklistItemNotFoundError,
  ChecklistNotFoundError,
  DatabaseUnavailableError,
} from "../domain/errors";
import {
  TaskChecklist,
  TaskChecklistItem,
} from "../domain/task-checklist";
import type {
  ChecklistItemTallyByTask,
  ChecklistsRepository,
  CreateChecklistInput,
  CreateChecklistItemInput,
  DeletedChecklistSnapshot,
  UpdateChecklistItemInput,
} from "./checklists-repository";

const CHECKLIST_SELECT = {
  id: true,
  taskId: true,
  name: true,
  createdAt: true,
} as const;

const ITEM_SELECT = {
  id: true,
  checklistId: true,
  text: true,
  checked: true,
  createdAt: true,
} as const;

const CONNECTION_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1009",
  "P1010",
  "P1011",
  "P1017",
  "P2024",
]);

function isConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_CODES.has(err.code)
  ) {
    return true;
  }
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (
      CONNECTION_CODES.has(code) ||
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND"
    ) {
      return true;
    }
  }
  return false;
}

function rethrowMapped(err: unknown): never {
  if (
    err instanceof DatabaseUnavailableError ||
    err instanceof ChecklistNotFoundError ||
    err instanceof ChecklistItemNotFoundError
  ) {
    throw err;
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toItem(row: {
  id: string;
  checklistId: string;
  text: string;
  checked: boolean;
  createdAt: Date;
}): TaskChecklistItem {
  return TaskChecklistItem.rehydrate(
    row.id,
    row.checklistId,
    row.text,
    row.checked,
    row.createdAt,
  );
}

function toChecklist(
  row: {
    id: string;
    taskId: string;
    name: string;
    createdAt: Date;
  },
  items: readonly TaskChecklistItem[] = [],
): TaskChecklist {
  return TaskChecklist.rehydrate(
    row.id,
    row.taskId,
    row.name,
    row.createdAt,
    items,
  );
}

export class PrismaChecklistsRepository implements ChecklistsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(input: CreateChecklistInput): Promise<TaskChecklist> {
    const checklist = TaskChecklist.create(input.taskId, input.name);
    try {
      const row = await this.client().taskChecklist.create({
        data: {
          id: checklist.id,
          taskId: checklist.taskId,
          name: checklist.name,
          createdAt: checklist.createdAt,
        },
        select: CHECKLIST_SELECT,
      });
      return toChecklist(row, []);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByTaskId(taskId: string): Promise<TaskChecklist[]> {
    try {
      const rows = await this.client().taskChecklist.findMany({
        where: { taskId },
        orderBy: { createdAt: "asc" },
        select: {
          ...CHECKLIST_SELECT,
          items: {
            orderBy: { createdAt: "asc" },
            select: ITEM_SELECT,
          },
        },
      });
      return rows.map((row) =>
        toChecklist(row, row.items.map(toItem)),
      );
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByIdInTask(
    taskId: string,
    checklistId: string,
  ): Promise<TaskChecklist | null> {
    try {
      const row = await this.client().taskChecklist.findFirst({
        where: { id: checklistId, taskId },
        select: {
          ...CHECKLIST_SELECT,
          items: {
            orderBy: { createdAt: "asc" },
            select: ITEM_SELECT,
          },
        },
      });
      if (row === null) {
        return null;
      }
      return toChecklist(row, row.items.map(toItem));
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async updateName(checklistId: string, name: string): Promise<TaskChecklist> {
    const existing = await this.client().taskChecklist.findUnique({
      where: { id: checklistId },
      select: {
        ...CHECKLIST_SELECT,
        items: {
          orderBy: { createdAt: "asc" },
          select: ITEM_SELECT,
        },
      },
    }).catch(rethrowMapped);
    if (existing === null) {
      throw new ChecklistNotFoundError();
    }
    const updated = toChecklist(existing, existing.items.map(toItem)).withName(
      name,
    );
    try {
      const row = await this.client().taskChecklist.update({
        where: { id: checklistId },
        data: { name: updated.name },
        select: {
          ...CHECKLIST_SELECT,
          items: {
            orderBy: { createdAt: "asc" },
            select: ITEM_SELECT,
          },
        },
      });
      return toChecklist(row, row.items.map(toItem));
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async delete(checklistId: string): Promise<DeletedChecklistSnapshot> {
    try {
      const existing = await this.client().taskChecklist.findUnique({
        where: { id: checklistId },
        select: CHECKLIST_SELECT,
      });
      if (existing === null) {
        throw new ChecklistNotFoundError();
      }
      await this.client().taskChecklist.delete({
        where: { id: checklistId },
      });
      return {
        id: existing.id,
        taskId: existing.taskId,
        name: existing.name,
        createdAt: existing.createdAt,
      };
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async createItem(
    input: CreateChecklistItemInput,
  ): Promise<TaskChecklistItem> {
    const parent = await this.client().taskChecklist.findUnique({
      where: { id: input.checklistId },
      select: { id: true },
    }).catch(rethrowMapped);
    if (parent === null) {
      throw new ChecklistNotFoundError();
    }
    const item = TaskChecklistItem.create(input.checklistId, input.text);
    try {
      const row = await this.client().taskChecklistItem.create({
        data: {
          id: item.id,
          checklistId: item.checklistId,
          text: item.text,
          checked: item.checked,
          createdAt: item.createdAt,
        },
        select: ITEM_SELECT,
      });
      return toItem(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findItemByIdInChecklist(
    checklistId: string,
    itemId: string,
  ): Promise<TaskChecklistItem | null> {
    try {
      const row = await this.client().taskChecklistItem.findFirst({
        where: { id: itemId, checklistId },
        select: ITEM_SELECT,
      });
      return row === null ? null : toItem(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async updateItem(
    itemId: string,
    input: UpdateChecklistItemInput,
  ): Promise<TaskChecklistItem> {
    const existingRow = await this.client().taskChecklistItem.findUnique({
      where: { id: itemId },
      select: ITEM_SELECT,
    }).catch(rethrowMapped);
    if (existingRow === null) {
      throw new ChecklistItemNotFoundError();
    }
    let updated = toItem(existingRow);
    if (input.text !== undefined) {
      updated = updated.withText(input.text);
    }
    if (input.checked !== undefined) {
      updated = updated.withChecked(input.checked);
    }
    try {
      const row = await this.client().taskChecklistItem.update({
        where: { id: itemId },
        data: {
          text: updated.text,
          checked: updated.checked,
        },
        select: ITEM_SELECT,
      });
      return toItem(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async deleteItem(itemId: string): Promise<void> {
    try {
      const existing = await this.client().taskChecklistItem.findUnique({
        where: { id: itemId },
        select: { id: true },
      });
      if (existing === null) {
        throw new ChecklistItemNotFoundError();
      }
      await this.client().taskChecklistItem.delete({
        where: { id: itemId },
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async countItemTalliesByTaskIds(
    taskIds: string[],
  ): Promise<ChecklistItemTallyByTask[]> {
    if (taskIds.length === 0) {
      return [];
    }
    try {
      const rows = await this.client().taskChecklistItem.findMany({
        where: {
          checklist: { taskId: { in: taskIds } },
        },
        select: {
          checked: true,
          checklist: { select: { taskId: true } },
        },
      });
      const byTask = new Map<
        string,
        { totalItems: number; checkedItems: number }
      >();
      for (const row of rows) {
        const taskId = row.checklist.taskId;
        const tally = byTask.get(taskId) ?? {
          totalItems: 0,
          checkedItems: 0,
        };
        tally.totalItems += 1;
        if (row.checked) {
          tally.checkedItems += 1;
        }
        byTask.set(taskId, tally);
      }
      return [...byTask.entries()].map(([taskId, tally]) => ({
        taskId,
        totalItems: tally.totalItems,
        checkedItems: tally.checkedItems,
      }));
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
