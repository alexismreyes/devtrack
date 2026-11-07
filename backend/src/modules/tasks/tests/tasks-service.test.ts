import { describe, expect, it } from "vitest";
import {
  MembershipForbiddenError,
  MembershipProjectNotFoundError,
} from "../../project-members/domain/errors";
import { ImmediateUnitOfWork } from "../../projects/access/unit-of-work";
import { TaskNotFoundError, TaskParentArchivedError } from "../domain/errors";
import { calendarDateFromString, Task } from "../domain/task";
import { TasksService } from "../service/tasks-service";
import { FakeProjectAccessPort } from "./fake-project-access-port";
import { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryAttachmentsRepository } from "./in-memory-attachments-repository";
import { InMemoryLabelsRepository } from "./in-memory-labels-repository";
import { InMemoryStatusesRepository } from "./in-memory-statuses-repository";
import { InMemoryTaskLabelsRepository } from "./in-memory-task-labels-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const EMPTY_OWNER_ID = "33333333-3333-4333-8333-333333333333";
const EDITOR_ID = "44444444-4444-4444-8444-444444444444";
const VIEWER_ID = "55555555-5555-4555-8555-555555555555";
const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

function seedBoth(
  projects: FakeProjectAccessPort,
  authorization: FakeTaskAuthorizationPort,
  snapshot: {
    id: string;
    ownerUserId: string;
    name: string;
    archivedAt: Date | null;
  },
) {
  projects.seed(snapshot);
  authorization.seed(snapshot);
}

async function createService(archivedAt: Date | null = null) {
  const labels = new InMemoryLabelsRepository();
  const taskLabels = new InMemoryTaskLabelsRepository(labels);
  const tasks = new InMemoryTasksRepository(taskLabels.joins);
  const statuses = new InMemoryStatusesRepository(tasks);
  const projects = new FakeProjectAccessPort();
  const authorization = new FakeTaskAuthorizationPort();
  const activity = new InMemoryActivityRepository();
  seedBoth(projects, authorization, {
    id: PROJECT_ID,
    ownerUserId: OWNER_ID,
    name: "Roadmap",
    archivedAt,
  });
  seedBoth(projects, authorization, {
    id: OTHER_PROJECT_ID,
    ownerUserId: OTHER_ID,
    name: "Other",
    archivedAt: null,
  });
  await statuses.seedDefaultsForProject(PROJECT_ID);
  await statuses.seedDefaultsForProject(OTHER_PROJECT_ID);
  return {
    service: new TasksService(
      tasks,
      projects,
      authorization,
      activity,
      taskLabels,
      new InMemoryAttachmentsRepository(tasks),
      statuses,
      new ImmediateUnitOfWork(),
    ),
    tasks,
    projects,
    authorization,
    activity,
    labels,
    taskLabels,
    statuses,
  };
}

describe("TasksService", () => {
  it("creates a task associated with the owned project and applies defaults", async () => {
    const { service } = await createService();

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
    const { service } = await createService();

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
    const { service, tasks } = await createService(
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

  it("rejects non-members and missing projects without leaking another user's tasks", async () => {
    const { service, tasks } = await createService();
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
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(service.getById(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    await expect(
      service.update(OTHER_ID, created.id, { title: "Hacked" }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(service.listByProject(OTHER_ID, PROJECT_ID)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    await expect(service.softDelete(OTHER_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    await expect(
      service.listByProject(OWNER_ID, MISSING_ID),
    ).rejects.toBeInstanceOf(MembershipProjectNotFoundError);

    const unchanged = await service.getById(OWNER_ID, created.id);
    expect(unchanged.title).toBe("Private");
    expect(tasks.tasksById.get(created.id)?.title).toBe("Private");
  });

  it("returns an owned live task including when the parent is archived", async () => {
    const { service, projects, authorization } = await createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: null,
      dueDate: null,
    });
    seedBoth(projects, authorization, {
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt: new Date("2026-10-29T12:00:00.000Z"),
    });

    const found = await service.getById(OWNER_ID, created.id);
    const listed = await service.listByProject(OWNER_ID, PROJECT_ID);

    expect(found.id).toBe(created.id);
    expect(listed.map((task) => task.id)).toEqual([created.id]);
  });

  it("treats missing and deleted tasks as not found before ownership", async () => {
    const { service, tasks } = await createService();
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
    const { service, tasks } = await createService();
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
    const { service } = await createService();
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
    const { service, projects, authorization, tasks } = await createService();
    const created = await service.create(OWNER_ID, PROJECT_ID, {
      title: "Write spec",
      description: "First",
      dueDate: null,
    });
    seedBoth(projects, authorization, {
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
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
    const { service, tasks } = await createService();
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

  it("returns zeros for an owner with no active projects", async () => {
    const { service } = await createService();
    const now = new Date("2026-10-31T15:00:00.000Z");

    const summary = await service.getDashboard(EMPTY_OWNER_ID, now);

    expect(summary).toEqual({
      projectCount: 0,
      taskCount: 0,
      pendingCount: 0,
      completedCount: 0,
      overdueCount: 0,
      projects: [],
    });
  });

  it("lists an active owned project with zero live tasks", async () => {
    const { service } = await createService();
    const now = new Date("2026-10-31T15:00:00.000Z");

    const summary = await service.getDashboard(OWNER_ID, now);

    expect(summary).toEqual({
      projectCount: 1,
      taskCount: 0,
      pendingCount: 0,
      completedCount: 0,
      overdueCount: 0,
      projects: [
        {
          id: PROJECT_ID,
          name: "Roadmap",
          taskCount: 0,
          pendingCount: 0,
          completedCount: 0,
          overdueCount: 0,
        },
      ],
    });
  });

  it("aggregates owner-scoped pending, completed, and overdue counts", async () => {
    const { service, tasks, projects, authorization } = await createService();
    const now = new Date("2026-10-31T15:00:00.000Z");
    const emptyProjectId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const archivedProjectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    seedBoth(projects, authorization, {
      id: emptyProjectId,
      ownerUserId: OWNER_ID,
      name: "Empty",
      archivedAt: null,
    });
    seedBoth(projects, authorization, {
      id: archivedProjectId,
      ownerUserId: OWNER_ID,
      name: "Archived",
      archivedAt: new Date("2026-10-29T12:00:00.000Z"),
    });

    await service.create(OWNER_ID, PROJECT_ID, {
      title: "Past todo",
      description: null,
      status: "TODO",
      dueDate: calendarDateFromString("2026-10-30"),
    });
    await service.create(OWNER_ID, PROJECT_ID, {
      title: "Today progress",
      description: null,
      status: "IN_PROGRESS",
      dueDate: calendarDateFromString("2026-10-31"),
    });
    const nullDue = await service.create(OWNER_ID, PROJECT_ID, {
      title: "No due",
      description: null,
      dueDate: null,
    });
    await service.create(OWNER_ID, PROJECT_ID, {
      title: "Done past",
      description: null,
      status: "DONE",
      dueDate: calendarDateFromString("2026-10-01"),
    });
    const otherOwned = await service.create(OTHER_ID, OTHER_PROJECT_ID, {
      title: "Other overdue",
      description: null,
      dueDate: calendarDateFromString("2026-10-01"),
    });
    const archivedTask = Task.create(
      archivedProjectId,
      "Archived overdue",
      null,
      "TODO",
      "MEDIUM",
      calendarDateFromString("2026-10-01"),
    );
    tasks.tasksById.set(archivedTask.id, archivedTask);
    await service.softDelete(OWNER_ID, nullDue.id);

    const summary = await service.getDashboard(OWNER_ID, now);
    const otherSummary = await service.getDashboard(OTHER_ID, now);

    expect(summary.projectCount).toBe(2);
    expect(summary.taskCount).toBe(3);
    expect(summary.pendingCount).toBe(2);
    expect(summary.completedCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.pendingCount + summary.completedCount).toBe(summary.taskCount);
    expect(summary.projects.map((project) => project.id)).toEqual([
      PROJECT_ID,
      emptyProjectId,
    ]);
    expect(summary.projects[0]).toEqual({
      id: PROJECT_ID,
      name: "Roadmap",
      taskCount: 3,
      pendingCount: 2,
      completedCount: 1,
      overdueCount: 1,
    });
    expect(summary.projects[1]).toEqual({
      id: emptyProjectId,
      name: "Empty",
      taskCount: 0,
      pendingCount: 0,
      completedCount: 0,
      overdueCount: 0,
    });
    expect(otherSummary.projects.map((project) => project.id)).toEqual([
      OTHER_PROJECT_ID,
    ]);
    expect(otherSummary.taskCount).toBe(1);
    expect(otherSummary.overdueCount).toBe(1);
    expect(otherSummary.projects[0]?.id).not.toBe(PROJECT_ID);
    expect(tasks.tasksById.get(nullDue.id)?.deletedAt).not.toBeNull();
    expect(tasks.tasksById.has(archivedTask.id)).toBe(true);
    expect(tasks.tasksById.has(otherOwned.id)).toBe(true);
    expect(summary.projects.some((project) => project.id === archivedProjectId)).toBe(
      false,
    );
  });

  it("drops an archived project and restores it after unarchive", async () => {
    const { service, projects } = await createService();
    const now = new Date("2026-10-31T15:00:00.000Z");
    await service.create(OWNER_ID, PROJECT_ID, {
      title: "Live",
      description: null,
      dueDate: null,
    });

    const before = await service.getDashboard(OWNER_ID, now);
    projects.seed({
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt: new Date("2026-10-31T12:00:00.000Z"),
    });
    const archived = await service.getDashboard(OWNER_ID, now);
    projects.seed({
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt: null,
    });
    const restored = await service.getDashboard(OWNER_ID, now);

    expect(before.projectCount).toBe(1);
    expect(before.taskCount).toBe(1);
    expect(archived).toEqual({
      projectCount: 0,
      taskCount: 0,
      pendingCount: 0,
      completedCount: 0,
      overdueCount: 0,
      projects: [],
    });
    expect(restored.projectCount).toBe(1);
    expect(restored.taskCount).toBe(1);
  });

  it("lets OWNER and EDITOR write tasks and VIEWER only read them", async () => {
    const { service, authorization, tasks } = await createService();
    authorization.addMember(PROJECT_ID, EDITOR_ID, "EDITOR");
    authorization.addMember(PROJECT_ID, VIEWER_ID, "VIEWER");

    const asEditor = await service.create(EDITOR_ID, PROJECT_ID, {
      title: "Editor task",
      description: null,
      dueDate: null,
    });
    const listed = await service.listByProject(VIEWER_ID, PROJECT_ID);
    const found = await service.getById(VIEWER_ID, asEditor.id);

    await expect(
      service.create(VIEWER_ID, PROJECT_ID, {
        title: "Viewer write",
        description: null,
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      service.update(VIEWER_ID, asEditor.id, { title: "Nope" }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(service.softDelete(VIEWER_ID, asEditor.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );

    expect(asEditor.title).toBe("Editor task");
    expect(listed.map((task) => task.id)).toEqual([asEditor.id]);
    expect(found.id).toBe(asEditor.id);
    expect(tasks.tasksById.size).toBe(1);
  });

  it("returns 403-equivalent for non-owner members on an archived parent and 409 for ownerUserId writes", async () => {
    const { service, projects, authorization } = await createService();
    authorization.addMember(PROJECT_ID, EDITOR_ID, "EDITOR");
    const created = await service.create(EDITOR_ID, PROJECT_ID, {
      title: "Live",
      description: null,
      dueDate: null,
    });
    seedBoth(projects, authorization, {
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt: new Date("2026-10-29T12:00:00.000Z"),
    });
    authorization.addMember(PROJECT_ID, EDITOR_ID, "EDITOR");

    await expect(
      service.listByProject(EDITOR_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(service.getById(EDITOR_ID, created.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    await expect(
      service.create(EDITOR_ID, PROJECT_ID, {
        title: "Blocked",
        description: null,
        dueDate: null,
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      service.update(OWNER_ID, created.id, { title: "Blocked" }),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);

    const asOwner = await service.getById(OWNER_ID, created.id);
    expect(asOwner.title).toBe("Live");
  });

  it("does not include member-only projects in owner-scoped dashboard counts", async () => {
    const { service, authorization } = await createService();
    authorization.addMember(PROJECT_ID, EDITOR_ID, "EDITOR");
    await service.create(EDITOR_ID, PROJECT_ID, {
      title: "Shared work",
      description: null,
      dueDate: null,
    });

    const editorDashboard = await service.getDashboard(
      EDITOR_ID,
      new Date("2026-10-31T15:00:00.000Z"),
    );
    const ownerDashboard = await service.getDashboard(
      OWNER_ID,
      new Date("2026-10-31T15:00:00.000Z"),
    );

    expect(editorDashboard.projectCount).toBe(0);
    expect(editorDashboard.taskCount).toBe(0);
    expect(ownerDashboard.projectCount).toBe(1);
    expect(ownerDashboard.taskCount).toBe(1);
  });
});
