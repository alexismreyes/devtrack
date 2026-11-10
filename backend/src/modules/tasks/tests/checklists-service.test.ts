import { describe, expect, it } from "vitest";
import { MembershipForbiddenError } from "../../project-members/domain/errors";
import {
  ImmediateUnitOfWork,
  type UnitOfWork,
} from "../../projects/access/unit-of-work";
import {
  ChecklistItemNotFoundError,
  ChecklistNotFoundError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import type { TaskActivityEvent } from "../domain/task-activity";
import type { ActivityRepository } from "../repository/activity-repository";
import { ChecklistsService } from "../service/checklists-service";
import { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryChecklistsRepository } from "./in-memory-checklists-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const STRANGER_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

class FailingActivityRepository implements ActivityRepository {
  readonly eventsById = new Map<string, TaskActivityEvent>();

  async create(): Promise<TaskActivityEvent> {
    throw new Error("activity insert failed");
  }

  async listPage() {
    return { items: [], nextCursor: null };
  }
}

class SnapshotUnitOfWork implements UnitOfWork {
  constructor(
    private readonly checklists: InMemoryChecklistsRepository,
    private readonly activity: ActivityRepository & {
      eventsById: Map<string, TaskActivityEvent>;
    },
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const checklistSnap = new Map(this.checklists.checklistsById);
    const itemSnap = new Map(this.checklists.itemsById);
    const activitySnap = new Map(this.activity.eventsById);
    try {
      return await work();
    } catch (error) {
      this.checklists.checklistsById.clear();
      for (const [id, checklist] of checklistSnap) {
        this.checklists.checklistsById.set(id, checklist);
      }
      this.checklists.itemsById.clear();
      for (const [id, item] of itemSnap) {
        this.checklists.itemsById.set(id, item);
      }
      this.activity.eventsById.clear();
      for (const [id, event] of activitySnap) {
        this.activity.eventsById.set(id, event);
      }
      throw error;
    }
  }
}

function createHarness(
  archivedAt: Date | null = null,
  activity: ActivityRepository = new InMemoryActivityRepository(),
  unitOfWork: UnitOfWork = new ImmediateUnitOfWork(),
) {
  const checklists = new InMemoryChecklistsRepository();
  const tasks = new InMemoryTasksRepository();
  const authorization = new FakeTaskAuthorizationPort();
  authorization.seed(
    {
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt,
    },
    {
      [OWNER_ID]: "OWNER",
      [EDITOR_ID]: "EDITOR",
      [VIEWER_ID]: "VIEWER",
    },
  );
  const service = new ChecklistsService(
    checklists,
    tasks,
    authorization,
    activity,
    unitOfWork,
  );
  return { service, checklists, tasks, activity, authorization };
}

async function seedLiveTask(tasks: InMemoryTasksRepository) {
  return tasks.create({
    projectId: PROJECT_ID,
    title: "Ship",
    description: null,
    dueDate: null,
  });
}

describe("ChecklistsService", () => {
  it("creates and lists checklists for writers/readers (AC-001/AC-002/AC-004)", async () => {
    const { service, tasks, activity } = createHarness();
    const task = await seedLiveTask(tasks);

    const first = await service.create(EDITOR_ID, task.id, "  Alpha  ");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await service.create(OWNER_ID, task.id, "Beta");

    expect(first.name).toBe("Alpha");
    expect(first.items).toEqual([]);
    const listed = await service.listByTask(VIEWER_ID, task.id);
    expect(listed.map((entry) => entry.id)).toEqual([first.id, second.id]);

    const events = [...(activity as InMemoryActivityRepository).eventsById.values()];
    expect(events.filter((e) => e.kind === "CHECKLIST_ADDED")).toHaveLength(2);
  });

  it("adds items checked false without activity; toggles emit complete/uncomplete", async () => {
    const { service, tasks, activity } = createHarness();
    const task = await seedLiveTask(tasks);
    const checklist = await service.create(OWNER_ID, task.id, "List");
    const before = (activity as InMemoryActivityRepository).eventsById.size;

    const item = await service.createItem(
      EDITOR_ID,
      task.id,
      checklist.id,
      "  Do thing  ",
    );
    expect(item.checked).toBe(false);
    expect(item.text).toBe("Do thing");
    expect((activity as InMemoryActivityRepository).eventsById.size).toBe(
      before,
    );

    const completed = await service.updateItem(
      EDITOR_ID,
      task.id,
      checklist.id,
      item.id,
      { checked: true },
    );
    expect(completed.checked).toBe(true);
    const noop = await service.updateItem(
      EDITOR_ID,
      task.id,
      checklist.id,
      item.id,
      { checked: true },
    );
    expect(noop.checked).toBe(true);
    const renamed = await service.updateItem(
      EDITOR_ID,
      task.id,
      checklist.id,
      item.id,
      { text: "Renamed" },
    );
    expect(renamed.text).toBe("Renamed");
    const uncompleted = await service.updateItem(
      EDITOR_ID,
      task.id,
      checklist.id,
      item.id,
      { checked: false },
    );
    expect(uncompleted.checked).toBe(false);

    const kinds = [...(activity as InMemoryActivityRepository).eventsById.values()]
      .filter((e) => e.kind.startsWith("CHECKLIST_ITEM_"))
      .map((e) => e.kind);
    expect(kinds).toEqual([
      "CHECKLIST_ITEM_COMPLETED",
      "CHECKLIST_ITEM_UNCOMPLETED",
    ]);
  });

  it("renames without activity and deletes checklist with CHECKLIST_REMOVED only", async () => {
    const { service, tasks, activity, checklists } = createHarness();
    const task = await seedLiveTask(tasks);
    const checklist = await service.create(OWNER_ID, task.id, "Temp");
    await service.createItem(OWNER_ID, task.id, checklist.id, "One");
    const beforeDelete = [...(activity as InMemoryActivityRepository).eventsById.values()]
      .filter((e) => e.kind !== "CHECKLIST_ADDED")
      .length;

    await service.updateName(OWNER_ID, task.id, checklist.id, "Renamed");
    expect(
      [...(activity as InMemoryActivityRepository).eventsById.values()].filter(
        (e) => e.kind !== "CHECKLIST_ADDED",
      ),
    ).toHaveLength(beforeDelete);

    await service.delete(OWNER_ID, task.id, checklist.id);
    expect(await checklists.findByIdInTask(task.id, checklist.id)).toBeNull();
    const removed = [...(activity as InMemoryActivityRepository).eventsById.values()].filter(
      (e) => e.kind === "CHECKLIST_REMOVED",
    );
    expect(removed).toHaveLength(1);
    expect(removed[0]?.payload).toEqual({
      checklistId: checklist.id,
      namePreview: "Renamed",
    });
  });

  it("deletes item without activity and keeps empty checklist", async () => {
    const { service, tasks, activity } = createHarness();
    const task = await seedLiveTask(tasks);
    const checklist = await service.create(OWNER_ID, task.id, "Keep");
    const item = await service.createItem(
      OWNER_ID,
      task.id,
      checklist.id,
      "Temp",
    );
    const before = (activity as InMemoryActivityRepository).eventsById.size;
    await service.deleteItem(OWNER_ID, task.id, checklist.id, item.id);
    expect((activity as InMemoryActivityRepository).eventsById.size).toBe(
      before,
    );
    const listed = await service.listByTask(OWNER_ID, task.id);
    expect(listed[0]?.items).toEqual([]);
  });

  it("enforces authz, soft-delete 404, and archived 409/403", async () => {
    const live = createHarness();
    const task = await seedLiveTask(live.tasks);
    const checklist = await live.service.create(OWNER_ID, task.id, "List");

    await expect(
      live.service.listByTask(STRANGER_ID, task.id),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      live.service.create(VIEWER_ID, task.id, "Nope"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      live.service.create(OWNER_ID, MISSING_ID, "Nope"),
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    await live.tasks.softDelete(task.id);
    await expect(
      live.service.listByTask(OWNER_ID, task.id),
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    const archived = createHarness(new Date("2026-11-01T00:00:00.000Z"));
    const archivedTask = await seedLiveTask(archived.tasks);
    await expect(
      archived.service.create(OWNER_ID, archivedTask.id, "Blocked"),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
    await expect(
      archived.service.create(EDITOR_ID, archivedTask.id, "Blocked"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      archived.service.listByTask(OWNER_ID, archivedTask.id),
    ).resolves.toEqual([]);

    await expect(
      live.service.updateName(OWNER_ID, task.id, checklist.id, "X"),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("returns 404 for wrong-task checklist/item ids", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);
    const other = await tasks.create({
      projectId: PROJECT_ID,
      title: "Other",
      description: null,
      dueDate: null,
    });
    const checklist = await service.create(OWNER_ID, task.id, "List");
    const item = await service.createItem(
      OWNER_ID,
      task.id,
      checklist.id,
      "Item",
    );

    await expect(
      service.updateName(OWNER_ID, other.id, checklist.id, "X"),
    ).rejects.toBeInstanceOf(ChecklistNotFoundError);
    await expect(
      service.updateItem(OWNER_ID, task.id, checklist.id, MISSING_ID, {
        checked: true,
      }),
    ).rejects.toBeInstanceOf(ChecklistItemNotFoundError);
    await expect(
      service.deleteItem(OWNER_ID, other.id, checklist.id, item.id),
    ).rejects.toBeInstanceOf(ChecklistNotFoundError);
  });

  it("fails the write when activity insert fails in the same unit of work", async () => {
    const failing = new FailingActivityRepository();
    const checklists = new InMemoryChecklistsRepository();
    const tasks = new InMemoryTasksRepository();
    const authorization = new FakeTaskAuthorizationPort();
    authorization.seed(
      {
        id: PROJECT_ID,
        ownerUserId: OWNER_ID,
        name: "Roadmap",
        archivedAt: null,
      },
      { [OWNER_ID]: "OWNER" },
    );
    const service = new ChecklistsService(
      checklists,
      tasks,
      authorization,
      failing,
      new SnapshotUnitOfWork(checklists, failing),
    );
    const task = await seedLiveTask(tasks);

    await expect(
      service.create(OWNER_ID, task.id, "Will fail"),
    ).rejects.toThrow(/activity insert failed/);
    expect(await checklists.listByTaskId(task.id)).toEqual([]);
  });
});
