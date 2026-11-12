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

function createCommentsApp() {
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
  return { app, commentsRepository, tasksRepository };
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
    expect(body).not.toHaveProperty("deletedAt");
  }
}

function assertPublicComment(
  body: unknown,
  expected: {
    taskId: string;
    authorUserId: string;
    authorDisplayName: string;
    body: string;
  },
): asserts body is {
  id: string;
  taskId: string;
  authorUserId: string;
  authorDisplayName: string;
  body: string;
  createdAt: string;
} {
  expect(body).toEqual({
    id: expect.any(String),
    taskId: expected.taskId,
    authorUserId: expected.authorUserId,
    authorDisplayName: expected.authorDisplayName,
    body: expected.body,
    createdAt: expect.any(String),
  });
  expect(body).not.toHaveProperty("deletedAt");
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("task comments HTTP API", () => {
  it("creates a comment with 201 and author attribution (AC-001)", async () => {
    const { app } = createCommentsApp();
    const { agent, user } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const response = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "  Hello thread  " });

    expect(response.status).toBe(201);
    assertPublicComment(response.body, {
      taskId: task.id,
      authorUserId: user.id,
      authorDisplayName: "Ada",
      body: "Hello thread",
    });
    assertNoSecrets(response.body);

    const listed = await agent.get(`/api/tasks/${task.id}/comments`);
    expect(listed.status).toBe(200);
    expect(listed.body.comments).toHaveLength(1);
    expect(listed.body.comments[0].id).toBe(response.body.id);
  });

  it("returns 401 for unauthenticated comment operations (AC-002)", async () => {
    const { app } = createCommentsApp();
    const guest = request(app);

    const create = await guest
      .post(`/api/tasks/${missingId}/comments`)
      .send({ body: "Nope" });
    const list = await guest.get(`/api/tasks/${missingId}/comments`);
    const patch = await guest
      .patch(`/api/tasks/${missingId}/comments/${missingId}`)
      .send({ body: "Nope" });
    const del = await guest.delete(
      `/api/tasks/${missingId}/comments/${missingId}`,
    );

    expect(create.status).toBe(401);
    expect(create.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(list.status).toBe(401);
    expect(patch.status).toBe(401);
    expect(del.status).toBe(401);
    assertNoSecrets(create.body);
  });

  it("rejects invalid create bodies with 400 (AC-003)", async () => {
    const { app } = createCommentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const empty = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "   " });
    const missing = await agent.post(`/api/tasks/${task.id}/comments`).send({});
    const unknown = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "ok", authorUserId: missingId });
    const serverOwned = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "ok", id: missingId, deletedAt: null });

    expect(empty.status).toBe(400);
    expect(empty.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(missing.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(serverOwned.status).toBe(400);
  });

  it("lists live comments newest-first with nextCursor and empty pages (AC-001)", async () => {
    const { app } = createCommentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const empty = await agent.get(`/api/tasks/${task.id}/comments`);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ comments: [], nextCursor: null });

    const first = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "First" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Second" });

    const listed = await agent.get(`/api/tasks/${task.id}/comments`);
    expect(listed.status).toBe(200);
    expect(listed.body.comments.map((c: { id: string }) => c.id)).toEqual([
      second.body.id,
      first.body.id,
    ]);
    expect(listed.body.nextCursor).toBeNull();
    assertNoSecrets(listed.body);
  });

  it("defaults comments limit to 5 and continues with cursor (AC-001, AC-003)", async () => {
    const { app } = createCommentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const createdIds: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const created = await agent
        .post(`/api/tasks/${task.id}/comments`)
        .send({ body: `Comment ${i}` });
      expect(created.status).toBe(201);
      createdIds.push(created.body.id);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const firstPage = await agent.get(`/api/tasks/${task.id}/comments`);
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.comments).toHaveLength(5);
    expect(typeof firstPage.body.nextCursor).toBe("string");
    expect(firstPage.body.comments.map((c: { id: string }) => c.id)).toEqual(
      [...createdIds].reverse().slice(0, 5),
    );

    const secondPage = await agent
      .get(`/api/tasks/${task.id}/comments`)
      .query({ cursor: firstPage.body.nextCursor });
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.comments.map((c: { id: string }) => c.id)).toEqual([
      createdIds[0],
    ]);
    expect(secondPage.body.nextCursor).toBeNull();

    const allIds = [
      ...firstPage.body.comments.map((c: { id: string }) => c.id),
      ...secondPage.body.comments.map((c: { id: string }) => c.id),
    ];
    expect(new Set(allIds).size).toBe(6);
  });

  it("rejects invalid comments pagination query (AC-004)", async () => {
    const { app } = createCommentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const zero = await agent
      .get(`/api/tasks/${task.id}/comments`)
      .query({ limit: 0 });
    const negative = await agent
      .get(`/api/tasks/${task.id}/comments`)
      .query({ limit: -1 });
    const overMax = await agent
      .get(`/api/tasks/${task.id}/comments`)
      .query({ limit: 51 });
    const badCursor = await agent
      .get(`/api/tasks/${task.id}/comments`)
      .query({ cursor: "not-a-cursor" });
    const unknown = await agent
      .get(`/api/tasks/${task.id}/comments`)
      .query({ page: 1 });

    expect(zero.status).toBe(400);
    expect(zero.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(negative.status).toBe(400);
    expect(overMax.status).toBe(400);
    expect(badCursor.status).toBe(400);
    expect(unknown.status).toBe(400);
  });

  it("allows VIEWER list and forbids VIEWER create (AC-005)", async () => {
    const { app } = createCommentsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: viewer, user: viewerUser } = await registerAgent(
      app,
      `viewer-${randomUUID()}@example.com`,
      "Vic",
    );
    const project = await createOwnedProject(owner);
    await owner.post(`/api/projects/${project.id}/members`).send({
      email: viewerUser.email,
      role: "VIEWER",
    });
    const task = await createTask(owner, project.id);
    await owner
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Visible" });

    const create = await viewer
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Nope" });
    const list = await viewer.get(`/api/tasks/${task.id}/comments`);

    expect(create.status).toBe(403);
    expect(create.body).toMatchObject(envelope("FORBIDDEN"));
    expect(list.status).toBe(200);
    expect(list.body.comments).toHaveLength(1);
  });

  it("forbids non-members and returns 404 for missing/deleted task or comment (AC-006)", async () => {
    const { app } = createCommentsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: stranger } = await registerAgent(
      app,
      `stranger-${randomUUID()}@example.com`,
    );
    const project = await createOwnedProject(owner);
    const task = await createTask(owner, project.id);
    const comment = await owner
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Secret" });

    const strangerCreate = await stranger
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Nope" });
    const strangerList = await stranger.get(`/api/tasks/${task.id}/comments`);
    expect(strangerCreate.status).toBe(403);
    expect(strangerList.status).toBe(403);

    const missingTask = await owner
      .post(`/api/tasks/${missingId}/comments`)
      .send({ body: "Nope" });
    expect(missingTask.status).toBe(404);

    await owner.delete(`/api/tasks/${task.id}`);
    const onDeletedTask = await owner.get(`/api/tasks/${task.id}/comments`);
    expect(onDeletedTask.status).toBe(404);

    const { agent: owner2 } = await registerAgent(
      app,
      `owner2-${randomUUID()}@example.com`,
    );
    const project2 = await createOwnedProject(owner2);
    const task2 = await createTask(owner2, project2.id);
    const live = await owner2
      .post(`/api/tasks/${task2.id}/comments`)
      .send({ body: "Live" });
    await owner2.delete(`/api/tasks/${task2.id}/comments/${live.body.id}`);

    const patchDeleted = await owner2
      .patch(`/api/tasks/${task2.id}/comments/${live.body.id}`)
      .send({ body: "Nope" });
    const deleteDeleted = await owner2.delete(
      `/api/tasks/${task2.id}/comments/${live.body.id}`,
    );
    const mismatch = await owner2
      .patch(`/api/tasks/${task2.id}/comments/${comment.body.id}`)
      .send({ body: "Nope" });

    expect(patchDeleted.status).toBe(404);
    expect(deleteDeleted.status).toBe(404);
    expect(mismatch.status).toBe(404);
  });

  it("applies archived 409 for owner and 403 for members (AC-007)", async () => {
    const { app } = createCommentsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: editor, user: editorUser } = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Ed",
    );
    const project = await createOwnedProject(owner);
    await owner.post(`/api/projects/${project.id}/members`).send({
      email: editorUser.email,
      role: "EDITOR",
    });
    const task = await createTask(owner, project.id);
    const comment = await editor
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Prior" });
    await owner.post(`/api/projects/${project.id}/archive`);

    const ownerCreate = await owner
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Blocked" });
    const editorList = await editor.get(`/api/tasks/${task.id}/comments`);
    const editorPatch = await editor
      .patch(`/api/tasks/${task.id}/comments/${comment.body.id}`)
      .send({ body: "Nope" });
    const ownerDelete = await owner.delete(
      `/api/tasks/${task.id}/comments/${comment.body.id}`,
    );

    expect(ownerCreate.status).toBe(409);
    expect(ownerCreate.body).toMatchObject(envelope("CONFLICT"));
    expect(editorList.status).toBe(403);
    expect(editorPatch.status).toBe(403);
    expect(ownerDelete.status).toBe(409);
  });

  it("allows author PATCH and forbids non-author PATCH (AC-014, AC-015)", async () => {
    const { app } = createCommentsApp();
    const { agent: owner } = await registerAgent(app, undefined, "Owner");
    const { agent: editor, user: editorUser } = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Ed",
    );
    const project = await createOwnedProject(owner);
    await owner.post(`/api/projects/${project.id}/members`).send({
      email: editorUser.email,
      role: "EDITOR",
    });
    const task = await createTask(owner, project.id);
    const comment = await editor
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Mine" });

    const patched = await editor
      .patch(`/api/tasks/${task.id}/comments/${comment.body.id}`)
      .send({ body: "Revised" });
    expect(patched.status).toBe(200);
    assertPublicComment(patched.body, {
      taskId: task.id,
      authorUserId: editorUser.id,
      authorDisplayName: "Ed",
      body: "Revised",
    });
    expect(patched.body.id).toBe(comment.body.id);
    expect(patched.body.createdAt).toBe(comment.body.createdAt);

    const hijack = await owner
      .patch(`/api/tasks/${task.id}/comments/${comment.body.id}`)
      .send({ body: "Stolen" });
    expect(hijack.status).toBe(403);
    expect(hijack.body).toMatchObject(envelope("FORBIDDEN"));

    const listed = await owner.get(`/api/tasks/${task.id}/comments`);
    expect(listed.body.comments[0].body).toBe("Revised");
  });

  it("soft-deletes by author or OWNER and forbids EDITOR non-author (AC-016)", async () => {
    const { app, commentsRepository } = createCommentsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: editor, user: editorUser } = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Ed",
    );
    const project = await createOwnedProject(owner);
    await owner.post(`/api/projects/${project.id}/members`).send({
      email: editorUser.email,
      role: "EDITOR",
    });
    const task = await createTask(owner, project.id);
    const mine = await editor
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Mine" });
    const owners = await owner
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Owner note" });
    const another = await editor
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Another" });

    const authorDelete = await editor.delete(
      `/api/tasks/${task.id}/comments/${mine.body.id}`,
    );
    expect(authorDelete.status).toBe(204);
    expect(authorDelete.body).toEqual({});
    expect(
      (await commentsRepository.findById(mine.body.id))?.deletedAt,
    ).not.toBeNull();

    const ownerDelete = await owner.delete(
      `/api/tasks/${task.id}/comments/${another.body.id}`,
    );
    expect(ownerDelete.status).toBe(204);

    const editorForbid = await editor.delete(
      `/api/tasks/${task.id}/comments/${owners.body.id}`,
    );
    expect(editorForbid.status).toBe(403);

    const listed = await owner.get(`/api/tasks/${task.id}/comments`);
    expect(listed.body.comments.map((c: { id: string }) => c.id)).toEqual([
      owners.body.id,
    ]);
    expect(listed.body).not.toHaveProperty("deletedAt");
    for (const comment of listed.body.comments) {
      expect(comment).not.toHaveProperty("deletedAt");
    }
  });
});
