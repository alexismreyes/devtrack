import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { InMemoryAuthRepository } from "../../auth/tests/in-memory-auth-repository";
import { InMemoryProjectMembersRepository } from "../../project-members/tests/in-memory-project-members-repository";
import { InMemoryProjectsRepository } from "../../projects/tests/in-memory-projects-repository";
import { InMemoryProjectCoverStorage } from "../../projects/tests/in-memory-project-cover-storage";
import { InMemoryProjectCoversRepository } from "../../projects/tests/in-memory-project-covers-repository";
import { InMemoryProjectBoardBackgroundsRepository } from "../../projects/tests/in-memory-project-board-backgrounds-repository";
import { InMemoryProjectBoardBackgroundStorage } from "../../projects/tests/in-memory-project-board-background-storage";
import { DatabaseUnavailableError } from "../../system/domain/errors";
import { SystemProbe } from "../../system/domain/system-probe";
import type { SystemRepository } from "../../system/repository/system-repository";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryAttachmentStorage } from "./in-memory-attachment-storage";
import { InMemoryAttachmentsRepository } from "./in-memory-attachments-repository";
import { InMemoryChecklistsRepository } from "./in-memory-checklists-repository";
import { InMemoryCommentsRepository } from "./in-memory-comments-repository";
import { InMemoryLabelsRepository } from "./in-memory-labels-repository";
import { InMemoryStatusesRepository } from "./in-memory-statuses-repository";
import { InMemoryTaskLabelsRepository } from "./in-memory-task-labels-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

class FakeSystemRepository implements SystemRepository {
  probes: SystemProbe[] = [];
  reachable = true;

  async createProbe(): Promise<SystemProbe> {
    if (!this.reachable) {
      throw new DatabaseUnavailableError();
    }
    const probe = SystemProbe.record();
    this.probes.unshift(probe);
    return probe;
  }

  async listProbes(): Promise<SystemProbe[]> {
    if (!this.reachable) {
      throw new DatabaseUnavailableError();
    }
    return [...this.probes];
  }

  async isDatabaseReachable(): Promise<boolean> {
    return this.reachable;
  }
}

function createActivityApp() {
  const usersRepository = new InMemoryUsersRepository();
  const authRepository = new InMemoryAuthRepository(usersRepository);
  const systemRepository = new FakeSystemRepository();
  const projectsRepository = new InMemoryProjectsRepository();
  const labelsRepository = new InMemoryLabelsRepository();
  const taskLabelsRepository = new InMemoryTaskLabelsRepository(labelsRepository);
  const tasksRepository = new InMemoryTasksRepository(taskLabelsRepository.joins);
  const statusesRepository = new InMemoryStatusesRepository(tasksRepository);
  const commentsRepository = new InMemoryCommentsRepository();
  const activityRepository = new InMemoryActivityRepository();
  const projectMembersRepository = new InMemoryProjectMembersRepository();
  const app = createApp({
    corsOrigin: "http://localhost:5173",
    systemRepository,
    usersRepository,
    authRepository,
    projectsRepository,
    projectCoversRepository: new InMemoryProjectCoversRepository(),
    projectCoverStorage: new InMemoryProjectCoverStorage(),
    projectBoardBackgroundsRepository: new InMemoryProjectBoardBackgroundsRepository(),
    projectBoardBackgroundStorage: new InMemoryProjectBoardBackgroundStorage(),
    tasksRepository,
    commentsRepository,
    activityRepository,
    checklistsRepository: new InMemoryChecklistsRepository(),
    attachmentsRepository: new InMemoryAttachmentsRepository(tasksRepository),
    attachmentStorage: new InMemoryAttachmentStorage(),
    labelsRepository,
    taskLabelsRepository,
    statusesRepository,
    projectMembersRepository,
  });
  return { app, activityRepository, commentsRepository };
}

async function registerAgent(
  app: ReturnType<typeof createApp>,
  email = `owner-${randomUUID()}@example.com`,
  displayName = "Ada",
) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    email,
    password: "secret-pass",
    displayName,
  });
  expect(response.status).toBe(201);
  return {
    agent,
    user: response.body as { id: string; email: string; displayName: string },
  };
}

async function createOwnedProject(
  agent: ReturnType<typeof request.agent>,
  name = "Roadmap",
) {
  const response = await agent.post("/api/projects").send({ name });
  expect(response.status).toBe(201);
  return response.body as { id: string; name: string };
}

async function createTask(
  agent: ReturnType<typeof request.agent>,
  projectId: string,
  title = "Discuss",
) {
  const response = await agent
    .post(`/api/projects/${projectId}/tasks`)
    .send({ title });
  expect(response.status).toBe(201);
  return response.body as { id: string };
}

function envelope(code: string) {
  return {
    error: {
      code,
    },
  };
}

function assertNoSecrets(body: unknown): void {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/passwordHash/i);
  expect(serialized).not.toMatch(/\$argon2/i);
  expect(serialized).not.toMatch(/Bearer /i);
  expect(serialized).not.toMatch(/postgresql:\/\//i);
  expect(serialized).not.toMatch(/DATABASE_URL/i);
  expect(serialized).not.toMatch(/\bat\s+\w+\s+\(/);
  if (body !== null && typeof body === "object") {
    expect(body).not.toHaveProperty("token");
    expect(body).not.toHaveProperty("accessToken");
    expect(body).not.toHaveProperty("sessionId");
    expect(body).not.toHaveProperty("password");
    expect(body).not.toHaveProperty("passwordHash");
  }
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("task activity HTTP API", () => {
  it("lists TASK_CREATED after create with actor attribution (AC-001, AC-008)", async () => {
    const { app } = createActivityApp();
    const { agent, user } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const response = await agent.get(`/api/tasks/${task.id}/activity`);
    expect(response.status).toBe(200);
    expect(response.body.activity).toHaveLength(1);
    expect(response.body.activity[0]).toEqual({
      id: expect.any(String),
      taskId: task.id,
      kind: "TASK_CREATED",
      actorUserId: user.id,
      actorDisplayName: "Ada",
      createdAt: expect.any(String),
      payload: {},
    });
    assertNoSecrets(response.body);
  });

  it("emits one field-change event with old/new and forbids non-members (AC-002)", async () => {
    const { app } = createActivityApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: stranger } = await registerAgent(
      app,
      `stranger-${randomUUID()}@example.com`,
    );
    const project = await createOwnedProject(owner);
    const task = await createTask(owner, project.id);

    const patched = await owner.patch(`/api/tasks/${task.id}`).send({
      title: "Renamed",
      status: "DONE",
    });
    expect(patched.status).toBe(200);

    const listed = await owner.get(`/api/tasks/${task.id}/activity`);
    expect(listed.status).toBe(200);
    const fieldEvents = listed.body.activity.filter(
      (event: { kind: string }) => event.kind === "TASK_FIELDS_CHANGED",
    );
    expect(fieldEvents).toHaveLength(1);
    expect(fieldEvents[0].payload).toEqual({
      changes: [
        { field: "title", oldValue: "Discuss", newValue: "Renamed" },
        { field: "status", oldValue: "TODO", newValue: "DONE" },
      ],
    });

    const forbidden = await stranger.get(`/api/tasks/${task.id}/activity`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject(envelope("FORBIDDEN"));
  });

  it("emits soft-delete activity and returns 404 for list afterward (AC-003)", async () => {
    const { app, activityRepository } = createActivityApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const deleted = await agent.delete(`/api/tasks/${task.id}`);
    expect(deleted.status).toBe(204);
    expect(
      [...activityRepository.eventsById.values()].some(
        (event) => event.kind === "TASK_SOFT_DELETED" && event.taskId === task.id,
      ),
    ).toBe(true);

    const listed = await agent.get(`/api/tasks/${task.id}/activity`);
    expect(listed.status).toBe(404);
    expect(listed.body).toMatchObject(envelope("NOT_FOUND"));
  });

  it("emits COMMENT_ADDED without changing comments create contract; no emit on edit/delete (AC-004)", async () => {
    const { app, activityRepository } = createActivityApp();
    const { agent, user } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const created = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "  Hello thread  " });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      taskId: task.id,
      authorUserId: user.id,
      authorDisplayName: "Ada",
      body: "Hello thread",
      createdAt: expect.any(String),
    });
    expect(created.body).not.toHaveProperty("deletedAt");
    expect(created.body).not.toHaveProperty("activity");

    await agent
      .patch(`/api/tasks/${task.id}/comments/${created.body.id}`)
      .send({ body: "Edited" });
    await agent.delete(`/api/tasks/${task.id}/comments/${created.body.id}`);

    const listed = await agent.get(`/api/tasks/${task.id}/activity`);
    const commentEvents = listed.body.activity.filter(
      (event: { kind: string }) => event.kind === "COMMENT_ADDED",
    );
    expect(commentEvents).toHaveLength(1);
    expect(commentEvents[0].payload).toEqual({
      commentId: created.body.id,
      bodyPreview: "Hello thread",
    });
    expect(
      [...activityRepository.eventsById.values()].filter(
        (event) => event.kind === "COMMENT_ADDED",
      ),
    ).toHaveLength(1);
  });

  it("returns empty activity, 401, VIEWER 200, and non-member 403 (AC-005)", async () => {
    const { app, activityRepository } = createActivityApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: viewer, user: viewerUser } = await registerAgent(
      app,
      `viewer-${randomUUID()}@example.com`,
      "Vic",
    );
    const { agent: stranger } = await registerAgent(
      app,
      `stranger-${randomUUID()}@example.com`,
    );
    const project = await createOwnedProject(owner);
    await owner.post(`/api/projects/${project.id}/members`).send({
      email: viewerUser.email,
      role: "VIEWER",
    });

    // Create task then clear activity to simulate forward-only empty list.
    const task = await createTask(owner, project.id);
    activityRepository.eventsById.clear();

    const empty = await viewer.get(`/api/tasks/${task.id}/activity`);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ activity: [], nextCursor: null });

    const unauth = await request(app).get(`/api/tasks/${task.id}/activity`);
    expect(unauth.status).toBe(401);
    expect(unauth.body).toMatchObject(envelope("UNAUTHENTICATED"));

    const forbidden = await stranger.get(`/api/tasks/${task.id}/activity`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body).toMatchObject(envelope("FORBIDDEN"));
  });

  it("returns 404 for missing or soft-deleted task for every caller (AC-006)", async () => {
    const { app } = createActivityApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: stranger } = await registerAgent(
      app,
      `stranger-${randomUUID()}@example.com`,
    );
    const project = await createOwnedProject(owner);
    const task = await createTask(owner, project.id);

    const missingOwner = await owner.get(`/api/tasks/${missingId}/activity`);
    const missingStranger = await stranger.get(
      `/api/tasks/${missingId}/activity`,
    );
    expect(missingOwner.status).toBe(404);
    expect(missingStranger.status).toBe(404);

    await owner.delete(`/api/tasks/${task.id}`);
    const deletedOwner = await owner.get(`/api/tasks/${task.id}/activity`);
    const deletedStranger = await stranger.get(
      `/api/tasks/${task.id}/activity`,
    );
    expect(deletedOwner.status).toBe(404);
    expect(deletedStranger.status).toBe(404);
  });

  it("has no public activity write routes (AC-007)", async () => {
    const { app } = createActivityApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const post = await agent
      .post(`/api/tasks/${task.id}/activity`)
      .send({ kind: "TASK_CREATED" });
    const patch = await agent
      .patch(`/api/tasks/${task.id}/activity/${missingId}`)
      .send({ kind: "TASK_CREATED" });
    const del = await agent.delete(
      `/api/tasks/${task.id}/activity/${missingId}`,
    );

    expect(post.status).toBe(404);
    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
  });

  it("does not emit field-change on no-op PATCH (AC-014)", async () => {
    const { app, activityRepository } = createActivityApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const before = activityRepository.eventsById.size;

    const response = await agent
      .patch(`/api/tasks/${task.id}`)
      .send({ title: "Discuss", status: "TODO" });
    expect(response.status).toBe(200);
    expect(activityRepository.eventsById.size).toBe(before);
  });

  it("lists newest first with nextCursor pagination (AC-002, AC-003; supersedes AC-016)", async () => {
    const { app } = createActivityApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    await agent.patch(`/api/tasks/${task.id}`).send({ status: "IN_PROGRESS" });
    await agent.post(`/api/tasks/${task.id}/comments`).send({ body: "Note" });

    const listed = await agent.get(`/api/tasks/${task.id}/activity`);
    expect(listed.status).toBe(200);
    expect(listed.body.activity.map((event: { kind: string }) => event.kind)).toEqual(
      ["COMMENT_ADDED", "TASK_FIELDS_CHANGED", "TASK_CREATED"],
    );
    expect(listed.body.nextCursor).toBeNull();
    expect(listed.body).not.toHaveProperty("page");
    assertNoSecrets(listed.body);

    for (let i = 0; i < 4; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      await agent.patch(`/api/tasks/${task.id}`).send({ title: `Discuss ${i}` });
    }

    const firstPage = await agent.get(`/api/tasks/${task.id}/activity`);
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.activity).toHaveLength(5);
    expect(typeof firstPage.body.nextCursor).toBe("string");

    const secondPage = await agent
      .get(`/api/tasks/${task.id}/activity`)
      .query({ cursor: firstPage.body.nextCursor });
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.activity.length).toBeGreaterThan(0);
    const ids = [
      ...firstPage.body.activity.map((e: { id: string }) => e.id),
      ...secondPage.body.activity.map((e: { id: string }) => e.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(secondPage.body.nextCursor).toBeNull();
  });

  it("rejects invalid activity pagination query (AC-004)", async () => {
    const { app } = createActivityApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const zero = await agent
      .get(`/api/tasks/${task.id}/activity`)
      .query({ limit: 0 });
    const overMax = await agent
      .get(`/api/tasks/${task.id}/activity`)
      .query({ limit: 51 });
    const badCursor = await agent
      .get(`/api/tasks/${task.id}/activity`)
      .query({ cursor: "%%%" });
    const unknown = await agent
      .get(`/api/tasks/${task.id}/activity`)
      .query({ page: 2 });

    expect(zero.status).toBe(400);
    expect(zero.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(overMax.status).toBe(400);
    expect(badCursor.status).toBe(400);
    expect(unknown.status).toBe(400);
  });

  it("rejects invalid task id with 400", async () => {
    const { app } = createActivityApp();
    const { agent } = await registerAgent(app);
    const response = await agent.get("/api/tasks/not-a-uuid/activity");
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });
});
