import { describe, expect, it } from "vitest";
import { MembershipForbiddenError } from "../../project-members/domain/errors";
import {
  ImmediateUnitOfWork,
  type UnitOfWork,
} from "../../projects/access/unit-of-work";
import { TaskNotFoundError } from "../domain/errors";
import type { TaskActivityEvent } from "../domain/task-activity";
import type { ActivityRepository } from "../repository/activity-repository";
import { ActivityService } from "../service/activity-service";
import { CommentsService } from "../service/comments-service";
import { TasksService } from "../service/tasks-service";
import { FakeProjectAccessPort } from "./fake-project-access-port";
import { FakeProjectMembershipQueryPort } from "./fake-project-membership-query-port";
import { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";
import { FakeUsersIdentityPort } from "./fake-users-identity-port";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryAttachmentsRepository } from "./in-memory-attachments-repository";
import { InMemoryChecklistsRepository } from "./in-memory-checklists-repository";
import { InMemoryCommentsRepository } from "./in-memory-comments-repository";
import { InMemoryLabelsRepository } from "./in-memory-labels-repository";
import { InMemoryStatusesRepository } from "./in-memory-statuses-repository";
import { InMemoryTaskLabelsRepository } from "./in-memory-task-labels-repository";
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
    private readonly tasks: InMemoryTasksRepository,
    private readonly comments: InMemoryCommentsRepository,
    private readonly activity: ActivityRepository & {
      eventsById: Map<string, TaskActivityEvent>;
    },
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const taskSnap = new Map(this.tasks.tasksById);
    const commentSnap = new Map(this.comments.commentsById);
    const activitySnap = new Map(this.activity.eventsById);
    try {
      return await work();
    } catch (error) {
      this.tasks.tasksById.clear();
      for (const [id, task] of taskSnap) {
        this.tasks.tasksById.set(id, task);
      }
      this.comments.commentsById.clear();
      for (const [id, comment] of commentSnap) {
        this.comments.commentsById.set(id, comment);
      }
      this.activity.eventsById.clear();
      for (const [id, event] of activitySnap) {
        this.activity.eventsById.set(id, event);
      }
      throw error;
    }
  }
}

function seedAuthz(authorization: FakeTaskAuthorizationPort) {
  authorization.seed(
    {
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt: null,
    },
    {
      [OWNER_ID]: "OWNER",
      [EDITOR_ID]: "EDITOR",
      [VIEWER_ID]: "VIEWER",
    },
  );
}

function seedIdentities(identities: FakeUsersIdentityPort) {
  for (const [id, displayName] of [
    [OWNER_ID, "Owner"],
    [EDITOR_ID, "Editor"],
    [VIEWER_ID, "Viewer"],
    [STRANGER_ID, "Stranger"],
  ] as const) {
    identities.seed({
      id,
      email: `${displayName.toLowerCase()}@example.com`,
      displayName,
    });
  }
}

async function createHarness(activity: ActivityRepository = new InMemoryActivityRepository()) {
  const tasks = new InMemoryTasksRepository();
  const comments = new InMemoryCommentsRepository();
  const projects = new FakeProjectAccessPort();
  const authorization = new FakeTaskAuthorizationPort();
  const identities = new FakeUsersIdentityPort();
  seedAuthz(authorization);
  seedIdentities(identities);
  projects.seed({
    id: PROJECT_ID,
    ownerUserId: OWNER_ID,
    name: "Roadmap",
    archivedAt: null,
  });

  const unitOfWork =
    activity instanceof InMemoryActivityRepository ||
    activity instanceof FailingActivityRepository
      ? new SnapshotUnitOfWork(
          tasks,
          comments,
          activity as ActivityRepository & {
            eventsById: Map<string, TaskActivityEvent>;
          },
        )
      : new ImmediateUnitOfWork();

  const labels = new InMemoryLabelsRepository();
  const taskLabels = new InMemoryTaskLabelsRepository(labels);
  const statuses = new InMemoryStatusesRepository(tasks);
  await statuses.seedDefaultsForProject(PROJECT_ID);
  const tasksService = new TasksService(
    tasks,
    projects,
    new FakeProjectMembershipQueryPort(projects, authorization),
    authorization,
    activity,
    taskLabels,
    new InMemoryAttachmentsRepository(tasks),
    statuses,
    new InMemoryChecklistsRepository(),
    unitOfWork,
  );
  const commentsService = new CommentsService(
    comments,
    tasks,
    authorization,
    identities,
    activity,
    unitOfWork,
  );
  const activityService = new ActivityService(
    activity,
    tasks,
    authorization,
    identities,
  );

  return {
    tasks,
    comments,
    activity,
    tasksService,
    commentsService,
    activityService,
  };
}

describe("ActivityService and emission", () => {
  it("emits TASK_CREATED on create and lists with actor display name (AC-001, AC-008)", async () => {
    const { tasksService, activityService, activity } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Write",
      description: null,
      dueDate: null,
    });

    const listed = await activityService.listByTask(VIEWER_ID, task.id);
    expect(listed.activity).toHaveLength(1);
    expect(listed.nextCursor).toBeNull();
    expect(listed.activity[0]).toMatchObject({
      taskId: task.id,
      kind: "TASK_CREATED",
      actorUserId: OWNER_ID,
      actorDisplayName: "Owner",
      payload: {},
    });
    expect(
      activity instanceof InMemoryActivityRepository
        ? activity.eventsById.size
        : 1,
    ).toBe(1);
  });

  it("emits one TASK_FIELDS_CHANGED event with old/new and skips no-op (AC-002, AC-014)", async () => {
    const { tasksService, activityService } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Write",
      description: null,
      dueDate: null,
    });

    await tasksService.update(EDITOR_ID, task.id, {
      title: "  Write  ",
      status: "TODO",
    });
    let listed = await activityService.listByTask(OWNER_ID, task.id);
    expect(
      listed.activity.filter((e) => e.kind === "TASK_FIELDS_CHANGED"),
    ).toHaveLength(0);

    await tasksService.update(EDITOR_ID, task.id, {
      title: "Revised",
      status: "DONE",
      priority: "HIGH",
    });
    listed = await activityService.listByTask(OWNER_ID, task.id);
    const changes = listed.activity.filter(
      (e) => e.kind === "TASK_FIELDS_CHANGED",
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]?.payload).toEqual({
      changes: [
        { field: "title", oldValue: "Write", newValue: "Revised" },
        { field: "status", oldValue: "TODO", newValue: "DONE" },
        { field: "priority", oldValue: "MEDIUM", newValue: "HIGH" },
      ],
    });
    expect(changes[0]?.actorUserId).toBe(EDITOR_ID);
  });

  it("emits TASK_SOFT_DELETED and hides list after soft-delete (AC-003)", async () => {
    const { tasksService, activityService, activity } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Write",
      description: null,
      dueDate: null,
    });
    await tasksService.softDelete(OWNER_ID, task.id);

    expect(
      [...(activity as InMemoryActivityRepository).eventsById.values()].some(
        (event) => event.kind === "TASK_SOFT_DELETED",
      ),
    ).toBe(true);
    await expect(
      activityService.listByTask(OWNER_ID, task.id),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("emits COMMENT_ADDED on create only, not edit/delete (AC-004)", async () => {
    const { tasksService, commentsService, activityService, activity } =
      await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Write",
      description: null,
      dueDate: null,
    });
    const comment = await commentsService.create(
      EDITOR_ID,
      task.id,
      "Hello thread",
    );
    await commentsService.updateBody(
      EDITOR_ID,
      task.id,
      comment.id,
      "Revised body",
    );
    await commentsService.softDelete(EDITOR_ID, task.id, comment.id);

    const listed = await activityService.listByTask(VIEWER_ID, task.id);
    const commentEvents = listed.activity.filter(
      (e) => e.kind === "COMMENT_ADDED",
    );
    expect(commentEvents).toHaveLength(1);
    expect(commentEvents[0]?.payload).toEqual({
      commentId: comment.id,
      bodyPreview: "Hello thread",
    });
    expect(
      [...(activity as InMemoryActivityRepository).eventsById.values()].filter(
        (event) => event.kind === "COMMENT_ADDED",
      ),
    ).toHaveLength(1);
  });

});

describe("ActivityService list authz", () => {
  it("returns empty list for live task with no events and enforces authz", async () => {
    const tasks = new InMemoryTasksRepository();
    const activity = new InMemoryActivityRepository();
    const authorization = new FakeTaskAuthorizationPort();
    const identities = new FakeUsersIdentityPort();
    seedAuthz(authorization);
    seedIdentities(identities);
    const task = await tasks.create({
      projectId: PROJECT_ID,
      title: "Bare",
      description: null,
      dueDate: null,
    });
    const activityService = new ActivityService(
      activity,
      tasks,
      authorization,
      identities,
    );

    await expect(activityService.listByTask(VIEWER_ID, task.id)).resolves.toEqual(
      { activity: [], nextCursor: null },
    );
    await expect(
      activityService.listByTask(STRANGER_ID, task.id),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      activityService.listByTask(OWNER_ID, MISSING_ID),
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    await tasks.softDelete(task.id);
    await expect(
      activityService.listByTask(OWNER_ID, task.id),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("returns newest-first pages with default limit and cursor (supersedes AC-016)", async () => {
    const { tasksService, commentsService, activityService } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Write",
      description: null,
      dueDate: null,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await tasksService.update(OWNER_ID, task.id, { status: "IN_PROGRESS" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await commentsService.create(EDITOR_ID, task.id, "Note");

    const listed = await activityService.listByTask(VIEWER_ID, task.id);
    expect(listed.activity.map((event) => event.kind)).toEqual([
      "COMMENT_ADDED",
      "TASK_FIELDS_CHANGED",
      "TASK_CREATED",
    ]);
    expect(listed.nextCursor).toBeNull();

    for (let i = 0; i < 4; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      await tasksService.update(OWNER_ID, task.id, {
        title: `Write ${i}`,
      });
    }

    const firstPage = await activityService.listByTask(VIEWER_ID, task.id);
    expect(firstPage.activity).toHaveLength(5);
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = await activityService.listByTask(VIEWER_ID, task.id, {
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.activity.length).toBeGreaterThan(0);
    const ids = [
      ...firstPage.activity.map((e) => e.id),
      ...secondPage.activity.map((e) => e.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fails the write when activity insert fails in the same unit of work (AC-015)", async () => {
    const failing = new FailingActivityRepository();
    const { tasksService, tasks } = await createHarness(failing);

    await expect(
      tasksService.create(OWNER_ID, PROJECT_ID, {
        title: "Write",
        description: null,
        dueDate: null,
      }),
    ).rejects.toThrow(/activity insert failed/i);
    expect(tasks.tasksById.size).toBe(0);
  });
});
