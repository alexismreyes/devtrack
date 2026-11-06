import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { InMemoryAuthRepository } from "../../auth/tests/in-memory-auth-repository";
import { InMemoryProjectMembersRepository } from "../../project-members/tests/in-memory-project-members-repository";
import { InMemoryProjectsRepository } from "../../projects/tests/in-memory-projects-repository";
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

function createAttachmentsApp() {
  const usersRepository = new InMemoryUsersRepository();
  const authRepository = new InMemoryAuthRepository(usersRepository);
  const systemRepository = new FakeSystemRepository();
  const projectsRepository = new InMemoryProjectsRepository();
  const labelsRepository = new InMemoryLabelsRepository();
  const taskLabelsRepository = new InMemoryTaskLabelsRepository(labelsRepository);
  const tasksRepository = new InMemoryTasksRepository(taskLabelsRepository.joins);
  const commentsRepository = new InMemoryCommentsRepository();
  const activityRepository = new InMemoryActivityRepository();
  const checklistsRepository = new InMemoryChecklistsRepository();
  const attachmentsRepository = new InMemoryAttachmentsRepository(tasksRepository);
  const attachmentStorage = new InMemoryAttachmentStorage();
  const projectMembersRepository = new InMemoryProjectMembersRepository();
  const app = createApp({
    corsOrigin: "http://localhost:5173",
    systemRepository,
    usersRepository,
    authRepository,
    projectsRepository,
    tasksRepository,
    commentsRepository,
    activityRepository,
    checklistsRepository,
    attachmentsRepository,
    attachmentStorage,
    labelsRepository,
    taskLabelsRepository,
    projectMembersRepository,
  });
  return {
    app,
    activityRepository,
    attachmentsRepository,
    attachmentStorage,
    tasksRepository,
  };
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
  title = "Ship",
) {
  const response = await agent
    .post(`/api/projects/${projectId}/tasks`)
    .send({ title });
  expect(response.status).toBe(201);
  return response.body as { id: string; cover: unknown };
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
  expect(serialized).not.toMatch(/ATTACHMENTS_ROOT/i);
  expect(serialized).not.toMatch(/\bat\s+\w+\s+\(/);
}

function pngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("task attachments HTTP API", () => {
  it("uploads, lists, downloads with private cache, and emits ATTACHMENT_ADDED (AC-001/AC-002)", async () => {
    const { app, activityRepository, attachmentStorage } = createAttachmentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const uploaded = await agent
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "shot.png", contentType: "image/png" });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body).toMatchObject({
      taskId: task.id,
      originalFilename: "shot.png",
      contentType: "image/png",
      isCover: false,
    });
    assertNoSecrets(uploaded.body);

    const listed = await agent.get(`/api/tasks/${task.id}/attachments`);
    expect(listed.status).toBe(200);
    expect(listed.body.attachments).toHaveLength(1);

    const content = await agent.get(
      `/api/tasks/${task.id}/attachments/${uploaded.body.id}/content`,
    );
    expect(content.status).toBe(200);
    expect(content.headers["cache-control"]).toMatch(/private/i);
    expect(content.headers["content-type"]).toMatch(/image\/png/i);
    expect(Buffer.from(content.body)).toEqual(pngBuffer());

    expect(
      [...activityRepository.eventsById.values()].some(
        (event) => event.kind === "ATTACHMENT_ADDED",
      ),
    ).toBe(true);
    expect(
      await attachmentStorage.exists(
        `${project.id}/${task.id}/${uploaded.body.id}`,
      ),
    ).toBe(true);
  });

  it("enforces VIEWER read-only and auth failures (AC-003/AC-004)", async () => {
    const { app } = createAttachmentsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: viewer, user: viewerUser } = await registerAgent(
      app,
      `viewer-${randomUUID()}@example.com`,
      "Vie",
    );
    const { agent: stranger } = await registerAgent(
      app,
      `stranger-${randomUUID()}@example.com`,
      "Str",
    );
    const project = await createOwnedProject(owner);
    await owner
      .post(`/api/projects/${project.id}/members`)
      .send({ email: viewerUser.email, role: "VIEWER" });
    const task = await createTask(owner, project.id);
    const uploaded = await owner
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "a.png", contentType: "image/png" });

    const guest = request(app);
    expect(
      (await guest.get(`/api/tasks/${task.id}/attachments`)).status,
    ).toBe(401);

    expect(
      (await viewer.get(`/api/tasks/${task.id}/attachments`)).status,
    ).toBe(200);
    expect(
      (
        await viewer
          .post(`/api/tasks/${task.id}/attachments`)
          .attach("file", pngBuffer(), {
            filename: "b.png",
            contentType: "image/png",
          })
      ).status,
    ).toBe(403);
    expect(
      (
        await viewer.delete(
          `/api/tasks/${task.id}/attachments/${uploaded.body.id}`,
        )
      ).status,
    ).toBe(403);
    expect(
      (await stranger.get(`/api/tasks/${task.id}/attachments`)).status,
    ).toBe(403);
    expect(
      (await owner.get(`/api/tasks/${missingId}/attachments`)).status,
    ).toBe(404);
  });

  it("rejects disallowed types and keeps contracts free of attachments array (AC-005/AC-009/AC-014)", async () => {
    const { app } = createAttachmentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const exe = await agent
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", Buffer.from([0x4d, 0x5a, 0x90, 0x00]), {
        filename: "bad.exe",
        contentType: "application/octet-stream",
      });
    expect(exe.status).toBe(400);
    expect(exe.body).toMatchObject(envelope("VALIDATION_ERROR"));

    const uploaded = await agent
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "ok.png", contentType: "image/png" });
    expect(uploaded.status).toBe(201);

    await agent
      .put(`/api/tasks/${task.id}/cover`)
      .send({ attachmentId: uploaded.body.id });

    const taskGet = await agent.get(`/api/tasks/${task.id}`);
    expect(taskGet.status).toBe(200);
    expect(taskGet.body).toHaveProperty("cover");
    expect(taskGet.body.cover).toEqual({
      attachmentId: uploaded.body.id,
      contentType: "image/png",
    });
    expect(taskGet.body).not.toHaveProperty("attachments");

    const list = await agent.get(`/api/projects/${project.id}/tasks`);
    expect(list.body.tasks[0]).toHaveProperty("cover");
    expect(list.body.tasks[0]).not.toHaveProperty("attachments");

    const comments = await agent.get(`/api/tasks/${task.id}/comments`);
    expect(comments.status).toBe(200);
    expect(comments.body).not.toHaveProperty("attachments");
  });

  it("hard-deletes attachment+blob and dual-emits when cover clears (AC-006)", async () => {
    const { app, activityRepository, attachmentStorage, attachmentsRepository } =
      createAttachmentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const uploaded = await agent
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "cover.png", contentType: "image/png" });
    await agent
      .put(`/api/tasks/${task.id}/cover`)
      .send({ attachmentId: uploaded.body.id });

    const deleted = await agent.delete(
      `/api/tasks/${task.id}/attachments/${uploaded.body.id}`,
    );
    expect(deleted.status).toBe(204);
    expect(
      await attachmentsRepository.findByIdInTask(task.id, uploaded.body.id),
    ).toBeNull();
    expect(
      await attachmentStorage.exists(
        `${project.id}/${task.id}/${uploaded.body.id}`,
      ),
    ).toBe(false);

    const kinds = [...activityRepository.eventsById.values()].map((e) => e.kind);
    expect(kinds).toContain("ATTACHMENT_REMOVED");
    expect(kinds).toContain("COVER_CHANGED");
  });

  it("returns 404 for soft-deleted task while keeping rows/blobs (AC-007)", async () => {
    const { app, attachmentsRepository, attachmentStorage, tasksRepository } =
      createAttachmentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const uploaded = await agent
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "keep.png", contentType: "image/png" });

    const soft = await agent.delete(`/api/tasks/${task.id}`);
    expect(soft.status).toBe(204);

    expect(
      (await agent.get(`/api/tasks/${task.id}/attachments`)).status,
    ).toBe(404);
    expect(
      await attachmentsRepository.findByIdInTask(task.id, uploaded.body.id),
    ).not.toBeNull();
    expect(
      await attachmentStorage.exists(
        `${project.id}/${task.id}/${uploaded.body.id}`,
      ),
    ).toBe(true);
    expect((await tasksRepository.findById(task.id))?.deletedAt).not.toBeNull();
  });

  it("applies archived mutate 409/403 and allows reads (AC-008)", async () => {
    const { app } = createAttachmentsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: editor, user: editorUser } = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Ed",
    );
    const project = await createOwnedProject(owner);
    await owner
      .post(`/api/projects/${project.id}/members`)
      .send({ email: editorUser.email, role: "EDITOR" });
    const task = await createTask(owner, project.id);
    await owner
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "a.png", contentType: "image/png" });

    const archive = await owner.post(`/api/projects/${project.id}/archive`);
    expect(archive.status).toBe(200);

    const ownerUpload = await owner
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "b.png", contentType: "image/png" });
    expect(ownerUpload.status).toBe(409);
    expect(ownerUpload.body).toMatchObject(envelope("CONFLICT"));

    const editorUpload = await editor
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "c.png", contentType: "image/png" });
    expect(editorUpload.status).toBe(403);

    expect((await owner.get(`/api/tasks/${task.id}/attachments`)).status).toBe(
      200,
    );
  });

  it("sets and clears cover without deleting attachment (AC-011 backend)", async () => {
    const { app, attachmentsRepository } = createAttachmentsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const uploaded = await agent
      .post(`/api/tasks/${task.id}/attachments`)
      .attach("file", pngBuffer(), { filename: "cover.png", contentType: "image/png" });

    const set = await agent
      .put(`/api/tasks/${task.id}/cover`)
      .send({ attachmentId: uploaded.body.id });
    expect(set.status).toBe(200);
    expect(set.body.cover).toEqual({
      attachmentId: uploaded.body.id,
      contentType: "image/png",
    });

    const cleared = await agent.delete(`/api/tasks/${task.id}/cover`);
    expect(cleared.status).toBe(200);
    expect(cleared.body.cover).toBeNull();
    expect(
      await attachmentsRepository.findByIdInTask(task.id, uploaded.body.id),
    ).not.toBeNull();
  });

  it("does not expose a public /uploads route", async () => {
    const { app } = createAttachmentsApp();
    const response = await request(app).get("/uploads/anything");
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
