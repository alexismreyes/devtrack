import { describe, expect, it } from "vitest";
import {
  MembershipForbiddenError,
} from "../../project-members/domain/errors";
import {
  CommentForbiddenError,
  CommentNotFoundError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import { ImmediateUnitOfWork } from "../../projects/access/unit-of-work";
import { CommentsService } from "../service/comments-service";
import { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";
import { FakeUsersIdentityPort } from "./fake-users-identity-port";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryCommentsRepository } from "./in-memory-comments-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const STRANGER_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

function createHarness(archivedAt: Date | null = null) {
  const comments = new InMemoryCommentsRepository();
  const tasks = new InMemoryTasksRepository();
  const activity = new InMemoryActivityRepository();
  const authorization = new FakeTaskAuthorizationPort();
  const identities = new FakeUsersIdentityPort();
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
  const service = new CommentsService(
    comments,
    tasks,
    authorization,
    identities,
    activity,
    new ImmediateUnitOfWork(),
  );
  return { service, comments, tasks, activity, authorization, identities };
}

async function seedLiveTask(tasks: InMemoryTasksRepository) {
  return tasks.create({
    projectId: PROJECT_ID,
    title: "Discuss",
    description: null,
    dueDate: null,
  });
}

describe("CommentsService", () => {
  it("creates a comment with session author and display name", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);

    const created = await service.create(EDITOR_ID, task.id, "  Hello  ");

    expect(created.taskId).toBe(task.id);
    expect(created.authorUserId).toBe(EDITOR_ID);
    expect(created.authorDisplayName).toBe("Editor");
    expect(created.body).toBe("Hello");
  });

  it("lists live comments newest-first for readers including VIEWER", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);
    const first = await service.create(OWNER_ID, task.id, "First");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await service.create(EDITOR_ID, task.id, "Second");

    const listed = await service.listByTask(VIEWER_ID, task.id);
    expect(listed.comments.map((c) => c.id)).toEqual([second.id, first.id]);
    expect(listed.nextCursor).toBeNull();
  });

  it("paginates comments with default limit 5 and cursor continuation", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);
    const created = [];
    for (let i = 0; i < 6; i += 1) {
      created.push(await service.create(OWNER_ID, task.id, `Comment ${i}`));
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const firstPage = await service.listByTask(VIEWER_ID, task.id);
    expect(firstPage.comments).toHaveLength(5);
    expect(firstPage.nextCursor).not.toBeNull();
    expect(firstPage.comments.map((c) => c.id)).toEqual(
      [...created].reverse().slice(0, 5).map((c) => c.id),
    );

    const secondPage = await service.listByTask(VIEWER_ID, task.id, {
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.comments.map((c) => c.id)).toEqual([created[0]!.id]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("rejects VIEWER create and stranger create/list", async () => {
    const { service, tasks, comments } = createHarness();
    const task = await seedLiveTask(tasks);

    await expect(
      service.create(VIEWER_ID, task.id, "Nope"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      service.create(STRANGER_ID, task.id, "Nope"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      service.listByTask(STRANGER_ID, task.id),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    expect(comments.commentsById.size).toBe(0);
  });

  it("returns not found for missing or soft-deleted tasks", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);
    await tasks.softDelete(task.id);

    await expect(
      service.create(OWNER_ID, MISSING_ID, "Nope"),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    await expect(
      service.listByTask(OWNER_ID, task.id),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("allows author PATCH and rejects non-author PATCH", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);
    const created = await service.create(EDITOR_ID, task.id, "Mine");

    const updated = await service.updateBody(
      EDITOR_ID,
      task.id,
      created.id,
      "Revised",
    );
    expect(updated.body).toBe("Revised");
    expect(updated.authorUserId).toBe(EDITOR_ID);

    await expect(
      service.updateBody(OWNER_ID, task.id, created.id, "Hijack"),
    ).rejects.toBeInstanceOf(CommentForbiddenError);
  });

  it("soft-deletes by author or OWNER and rejects EDITOR non-author", async () => {
    const { service, tasks, comments } = createHarness();
    const task = await seedLiveTask(tasks);
    const mine = await service.create(EDITOR_ID, task.id, "Mine");
    const owners = await service.create(OWNER_ID, task.id, "Owner note");

    await service.softDelete(EDITOR_ID, task.id, mine.id);
    expect((await comments.findById(mine.id))?.deletedAt).not.toBeNull();

    const another = await service.create(EDITOR_ID, task.id, "Another");
    await service.softDelete(OWNER_ID, task.id, another.id);
    expect((await comments.findById(another.id))?.deletedAt).not.toBeNull();

    await expect(
      service.softDelete(EDITOR_ID, task.id, owners.id),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    expect((await comments.findById(owners.id))?.deletedAt).toBeNull();
  });

  it("treats soft-deleted and mismatched comments as not found", async () => {
    const { service, tasks, comments } = createHarness();
    const task = await seedLiveTask(tasks);
    const otherTask = await tasks.create({
      projectId: PROJECT_ID,
      title: "Other",
      description: null,
      dueDate: null,
    });
    const created = await service.create(OWNER_ID, task.id, "Live");
    await comments.softDelete(created.id);

    await expect(
      service.updateBody(OWNER_ID, task.id, created.id, "Nope"),
    ).rejects.toBeInstanceOf(CommentNotFoundError);
    await expect(
      service.softDelete(OWNER_ID, task.id, created.id),
    ).rejects.toBeInstanceOf(CommentNotFoundError);

    const live = await service.create(OWNER_ID, otherTask.id, "Elsewhere");
    await expect(
      service.updateBody(OWNER_ID, task.id, live.id, "Nope"),
    ).rejects.toBeInstanceOf(CommentNotFoundError);
  });

  it("applies archived parent 409 for ownerUserId and 403 for members", async () => {
    const { service, tasks, comments } = createHarness(
      new Date("2026-11-04T12:00:00.000Z"),
    );
    const task = await seedLiveTask(tasks);
    const seeded = await comments.create({
      taskId: task.id,
      authorUserId: EDITOR_ID,
      body: "Prior",
    });

    await expect(
      service.create(OWNER_ID, task.id, "Blocked"),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
    await expect(
      service.create(EDITOR_ID, task.id, "Blocked"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(service.listByTask(EDITOR_ID, task.id)).rejects.toBeInstanceOf(
      MembershipForbiddenError,
    );
    await expect(
      service.updateBody(EDITOR_ID, task.id, seeded.id, "Nope"),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      service.softDelete(OWNER_ID, task.id, seeded.id),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
  });

  it("omits soft-deleted comments from list", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);
    const kept = await service.create(OWNER_ID, task.id, "Keep");
    const gone = await service.create(OWNER_ID, task.id, "Gone");
    await service.softDelete(OWNER_ID, task.id, gone.id);

    const listed = await service.listByTask(OWNER_ID, task.id);
    expect(listed.comments.map((c) => c.id)).toEqual([kept.id]);
    expect(listed.nextCursor).toBeNull();
  });
});
