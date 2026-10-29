import { describe, expect, it } from "vitest";
import {
  ProjectForbiddenError,
  ProjectNotFoundError,
} from "../../projects/domain/errors";
import { TaskNotFoundError, TaskParentArchivedError } from "../domain/errors";
import { calendarDateFromString, Task } from "../domain/task";
import { TasksService } from "../service/tasks-service";
import { FakeProjectAccessPort } from "./fake-project-access-port";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

function createService(archivedAt: Date | null = null) {
  const tasks = new InMemoryTasksRepository();
  const projects = new FakeProjectAccessPort();
  projects.seed({
    id: PROJECT_ID,
    ownerUserId: OWNER_ID,
    archivedAt,
  });
  projects.seed({
    id: OTHER_PROJECT_ID,
    ownerUserId: OTHER_ID,
    archivedAt: null,
  });
  return { service: new TasksService(tasks, projects), tasks, projects };
}

describe("TasksService", () => {
  it("creates a task associated with the owned project and applies defaults", async () => {
    const { service } = createService();

    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: "Draft",
      dueDate: null,
    });

    expect(created.projectId).toBe(PROJECT_ID);
    expect(created.title).toBe("Write spec");
    expect(created.description).toBe("Draft");
    expect(created.status).toBe("TODO");
    expect(created.priority).toBe("MEDIUM");
    expect(created.deletedAt).toBeNull();
  });

  it("creates with supplied status and priority and allows duplicate titles", async () => {
    const { service } = createService();

    const first = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Shared",
      description: null,
      status: "DONE",
      priority: "LOW",
      dueDate: calendarDateFromString("2020-01-02"),
    });
    const second = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Shared",
      description: null,
      dueDate: null,
    });

    expect(first.status).toBe("DONE");
    expect(first.priority).toBe("LOW");
    expect(first.dueDate?.toISOString().slice(0, 10)).toBe("2020-01-02");
    expect(second.id).not.toBe(first.id);
    expect(second.title).toBe("Shared");
  });

  it("rejects create on an archived parent and does not persist", async () => {
    const { service, tasks } = createService(
      new Date("2026-10-29T12:00:00.000Z"),
    );

    await expect(
      service.create(OWNER_ID, PROJECT_ID, {
        title: "Blocked",
        description: null,
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
    expect(tasks.tasksById.size).toBe(0);
  });

  it("rejects non-owners and missing projects without leaking another user's tasks", async () => {
    const { service, tasks } = createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Private",
      description: null,
      dueDate: null,
    });

    await expect(
      service.create(OTHER_ID, PROJECT_ID, {
        title: "Hacked",
        description: null,
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(ProjectForbiddenError);
    await expect(service.getById(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      ProjectForbiddenError,
    );
    await expect(
      service.update(OTHER_ID, created.id, { title: "Hacked" }),
    ).rejects.toBeInstanceOf(ProjectForbiddenError);
    await expect(service.listByProject(OTHER_ID, PROJECT_ID)).rejects.toBeInstanceOf(
      ProjectForbiddenError,
    );
    await expect(service.softDelete(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      ProjectForbiddenError,
    );
    await expect(
      service.listByProject(OWNER_ID, MISSING_ID),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    const unchanged = await service.getById(OWNER_ID, created.id);
    expect(unchanged.title).toBe("Private");
    expect(tasks.tasksById.get(created.id)?.title).toBe("Private");
  });

  it("returns an owned live task including when the parent is archived", async () => {
    const { service, projects } = createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: null,
      dueDate: null,
    });
    projects.seed({
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      archivedAt: new Date("2026-10-29T12:00:00.000Z"),
    });

    const found = await service.getById(OWNER_ID, created.id);
    const listed = await service.listByProject(OWNER_ID, PROJECT_ID);

    expect(found.id).toBe(created.id);
    expect(listed.map((task) => task.id)).toEqual([created.id]);
  });

  it("treats missing and deleted tasks as not found before ownership", async () => {
    const { service, tasks } = createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: null,
      dueDate: null,
    });
    await service.softDelete(OWNER_ID, created.id);

    await expect(service.getById(OWNER_ID, created.id)).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    await expect(service.getById(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    await expect(
      service.update(OWNER_ID, created.id, { title: "Nope" }),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    await expect(service.softDelete(OWNER_ID, created.id)).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    await expect(service.getById(OWNER_ID, MISSING_ID)).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
    expect(tasks.tasksById.get(created.id)?.deletedAt).not.toBeNull();
  });

  it("lists only that project's non-deleted tasks, newest first, with optional filters", async () => {
    const { service, tasks } = createService();
    const older = Task.create(
      PROJECT_ID,
      "Older",
      null,
      "TODO",
      "LOW",
      null,
      new Date("2026-10-28T12:00:00.000Z"),
    );
    const newer = Task.create(
      PROJECT_ID,
      "Newer",
      null,
      "DONE",
      "HIGH",
      null,
      new Date("2026-10-29T12:00:00.000Z"),
    );
    tasks.tasksById.set(older.id, older);
    tasks.tasksById.set(newer.id, newer);
    const other = await service.create(OTHER_ID, OTHER_PROJECT_ID, {
      title: "Other",
      description: null,
      dueDate: null,
    });
    await service.softDelete(OWNER_ID, older.id);

    const listed = await service.listByProject(OWNER_ID, PROJECT_ID);
    const filtered = await service.listByProject(OWNER_ID, PROJECT_ID, {
      status: "DONE",
      priority: "HIGH",
    });
    const emptyMatch = await service.listByProject(OWNER_ID, PROJECT_ID, {
      status: "TODO",
    });

    expect(listed.map((task) => task.id)).toEqual([newer.id]);
    expect(filtered.map((task) => task.id)).toEqual([newer.id]);
    expect(emptyMatch).toEqual([]);
    expect(listed.some((task) => task.id === other.id)).toBe(false);
  });

  it("updates allowed fields without changing identity or projectId", async () => {
    const { service } = createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: "First",
      dueDate: null,
    });

    const updated = await service.update(OWNER_ID, created.id, {
      title: "Review spec",
      description: "Second",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: calendarDateFromString("2026-12-01"),
    });

    expect(updated.title).toBe("Review spec");
    expect(updated.description).toBe("Second");
    expect(updated.status).toBe("IN_PROGRESS");
    expect(updated.priority).toBe("HIGH");
    expect(updated.dueDate?.toISOString().slice(0, 10)).toBe("2026-12-01");
    expect(updated.id).toBe(created.id);
    expect(updated.projectId).toBe(PROJECT_ID);
    expect(updated.createdAt.toISOString()).toBe(created.createdAt.toISOString());
    expect(updated.deletedAt).toBeNull();
  });

  it("rejects update and soft-delete when the parent is archived", async () => {
    const { service, projects, tasks } = createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: "First",
      dueDate: null,
    });
    projects.seed({
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      archivedAt: new Date("2026-10-29T12:00:00.000Z"),
    });

    await expect(
      service.update(OWNER_ID, created.id, { title: "Blocked" }),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
    await expect(service.softDelete(OWNER_ID, created.id)).rejects.toBeInstanceOf(
      TaskParentArchivedError,
    );

    const stored = tasks.tasksById.get(created.id);
    expect(stored?.title).toBe("Write spec");
    expect(stored?.deletedAt).toBeNull();
  });

  it("soft-deletes by setting deletedAt without removing the row", async () => {
    const { service, tasks } = createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: null,
      dueDate: null,
    });

    const deleted = await service.softDelete(OWNER_ID, created.id);
    const listed = await service.listByProject(OWNER_ID, PROJECT_ID);

    expect(deleted.deletedAt).not.toBeNull();
    expect(tasks.tasksById.get(created.id)?.deletedAt).not.toBeNull();
    expect(listed).toEqual([]);
  });
});
