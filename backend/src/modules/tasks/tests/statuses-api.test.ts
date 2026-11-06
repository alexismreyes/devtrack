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

function createStatusesApp() {
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
  return { app, activityRepository, statusesRepository };
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

function envelope(code: string) {
  return {
    error: {
      code,
    },
  };
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("statuses HTTP API", () => {
  it("seeds defaults on project create and supports catalog CRUD + reorder (AC-001, AC-004, AC-014)", async () => {
    const { app } = createStatusesApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);

    const listed = await agent.get(`/api/projects/${project.id}/statuses`);
    expect(listed.status).toBe(200);
    expect(listed.body.statuses.map((s: { key: string }) => s.key)).toEqual([
      "TODO",
      "IN_PROGRESS",
      "DONE",
    ]);
    expect(listed.body.statuses[2]).toMatchObject({
      key: "DONE",
      isCompleted: true,
      isSystem: true,
      position: 2,
      color: "GREEN",
    });

    const created = await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ name: " On hold ", color: "ORANGE", isCompleted: false });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: "On hold",
      color: "ORANGE",
      isSystem: false,
      isCompleted: false,
      position: 3,
    });
    expect(created.body.key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    const patched = await agent
      .patch(`/api/projects/${project.id}/statuses/${created.body.id}`)
      .send({ name: "Paused", color: "TEAL", isCompleted: true });
    expect(patched.status).toBe(200);
    expect(patched.body.key).toBe(created.body.key);
    expect(patched.body).toMatchObject({
      name: "Paused",
      color: "TEAL",
      isCompleted: true,
    });

    const rejectKey = await agent
      .patch(`/api/projects/${project.id}/statuses/${created.body.id}`)
      .send({ key: "HACKED" });
    expect(rejectKey.status).toBe(400);

    const all = await agent.get(`/api/projects/${project.id}/statuses`);
    const ids = all.body.statuses.map((s: { id: string }) => s.id);
    const reorderedIds = [ids[3], ids[2], ids[0], ids[1]];
    const reordered = await agent
      .put(`/api/projects/${project.id}/statuses/reorder`)
      .send({ statusIds: reorderedIds });
    expect(reordered.status).toBe(200);
    expect(reordered.body.statuses.map((s: { id: string }) => s.id)).toEqual(
      reorderedIds,
    );
    expect(reordered.body.statuses.map((s: { position: number }) => s.position)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(reordered.body.statuses[0].key).toBe(created.body.key);
    expect(reordered.body.statuses[0].name).toBe("Paused");

    const removed = await agent.delete(
      `/api/projects/${project.id}/statuses/${created.body.id}`,
    );
    expect(removed.status).toBe(204);
  });

  it("assigns task status keys, filters by key, and emits activity keys only (AC-002, AC-003, AC-009)", async () => {
    const { app, activityRepository } = createStatusesApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const custom = await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ name: "Blocked", color: "RED" });
    const task = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Work", status: custom.body.key });
    expect(task.status).toBe(201);
    expect(task.body.status).toBe(custom.body.key);

    const filtered = await agent.get(
      `/api/projects/${project.id}/tasks?status=${custom.body.key}`,
    );
    expect(filtered.status).toBe(200);
    expect(filtered.body.tasks).toHaveLength(1);

    const patched = await agent
      .patch(`/api/tasks/${task.body.id}`)
      .send({ status: "IN_PROGRESS" });
    expect(patched.status).toBe(200);
    expect(patched.body.status).toBe("IN_PROGRESS");

    const events = [...activityRepository.eventsById.values()].filter(
      (event) => event.kind === "TASK_FIELDS_CHANGED",
    );
    expect(events).toHaveLength(1);
    expect(events[0]!.payload).toMatchObject({
      changes: [
        {
          field: "status",
          oldValue: custom.body.key,
          newValue: "IN_PROGRESS",
        },
      ],
    });

    const beforeCatalogEvents = activityRepository.eventsById.size;
    await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ name: "Review", color: "BLUE" });
    expect(activityRepository.eventsById.size).toBe(beforeCatalogEvents);

    const unknown = await agent
      .patch(`/api/tasks/${task.body.id}`)
      .send({ status: "not-in-catalog" });
    expect(unknown.status).toBe(400);
    expect(unknown.body).toMatchObject(envelope("VALIDATION_ERROR"));

    const other = await createOwnedProject(agent, "Other");
    const foreign = await agent
      .post(`/api/projects/${other.id}/statuses`)
      .send({ name: "Foreign", color: "PINK" });
    const cross = await agent
      .patch(`/api/tasks/${task.body.id}`)
      .send({ status: foreign.body.key });
    expect(cross.status).toBe(400);
  });

  it("classifies dashboard via live isCompleted including flipped Done (AC-006)", async () => {
    const { app } = createStatusesApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const customDone = await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ name: "Shipped", color: "GREEN", isCompleted: true });
    await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Pending", dueDate: "2020-01-01" });
    await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Done custom", status: customDone.body.key });
    const statuses = await agent.get(`/api/projects/${project.id}/statuses`);
    const done = statuses.body.statuses.find(
      (s: { key: string }) => s.key === "DONE",
    );

    const before = await agent.get("/api/dashboard");
    expect(before.status).toBe(200);
    expect(before.body.pendingCount).toBe(1);
    expect(before.body.completedCount).toBe(1);
    expect(before.body.overdueCount).toBe(1);

    await agent
      .patch(`/api/projects/${project.id}/statuses/${done.id}`)
      .send({ isCompleted: false });
    const flippedTask = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Was done", status: "DONE", dueDate: "2020-01-02" });
    expect(flippedTask.status).toBe(201);

    const after = await agent.get("/api/dashboard");
    expect(after.body.pendingCount).toBe(2);
    expect(after.body.completedCount).toBe(1);
    expect(after.body.overdueCount).toBe(2);
  });

  it("enforces authz matrix and validation (AC-007)", async () => {
    const { app } = createStatusesApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: viewer, user: viewerUser } = await registerAgent(
      app,
      `viewer-${randomUUID()}@example.com`,
      "Viewer",
    );
    const { agent: stranger } = await registerAgent(
      app,
      `stranger-${randomUUID()}@example.com`,
      "Stranger",
    );
    const project = await createOwnedProject(owner);
    await owner
      .post(`/api/projects/${project.id}/members`)
      .send({ userId: viewerUser.id, role: "VIEWER" });

    const unauth = await request(app).get(
      `/api/projects/${project.id}/statuses`,
    );
    expect(unauth.status).toBe(401);

    const viewerCreate = await viewer
      .post(`/api/projects/${project.id}/statuses`)
      .send({ name: "Nope", color: "GRAY" });
    expect(viewerCreate.status).toBe(403);

    const viewerReorder = await viewer
      .put(`/api/projects/${project.id}/statuses/reorder`)
      .send({ statusIds: [missingId] });
    expect(viewerReorder.status).toBe(403);

    const strangerList = await stranger.get(
      `/api/projects/${project.id}/statuses`,
    );
    expect(strangerList.status).toBe(403);

    const missing = await owner.get(`/api/projects/${missingId}/statuses`);
    expect(missing.status).toBe(404);

    const invalid = await owner
      .post(`/api/projects/${project.id}/statuses`)
      .send({ name: "", color: "CYAN", key: "x" });
    expect(invalid.status).toBe(400);

    const incompleteReorder = await owner
      .put(`/api/projects/${project.id}/statuses/reorder`)
      .send({ statusIds: [missingId] });
    expect(incompleteReorder.status).toBe(400);
  });

  it("blocks delete in use and last-status / last-non-completed guardrails (AC-010)", async () => {
    const { app } = createStatusesApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const listed = await agent.get(`/api/projects/${project.id}/statuses`);
    const todo = listed.body.statuses.find(
      (s: { key: string }) => s.key === "TODO",
    );
    await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Live", status: "TODO" });

    const inUse = await agent.delete(
      `/api/projects/${project.id}/statuses/${todo.id}`,
    );
    expect(inUse.status).toBe(409);
    expect(inUse.body).toMatchObject(envelope("CONFLICT"));

    const soft = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Temp" });
    await agent.delete(`/api/tasks/${soft.body.id}`);

    const custom = await agent
      .post(`/api/projects/${project.id}/statuses`)
      .send({ name: "Hold", color: "ORANGE" });
    const deletedCustom = await agent.delete(
      `/api/projects/${project.id}/statuses/${custom.body.id}`,
    );
    expect(deletedCustom.status).toBe(204);

    const seeded = await agent.get(`/api/projects/${project.id}/statuses`);
    const inProgress = seeded.body.statuses.find(
      (s: { key: string }) => s.key === "IN_PROGRESS",
    );
    const done = seeded.body.statuses.find(
      (s: { key: string }) => s.key === "DONE",
    );
    await agent.delete(`/api/projects/${project.id}/statuses/${inProgress.id}`);

    const lastNonCompleted = await agent.delete(
      `/api/projects/${project.id}/statuses/${todo.id}`,
    );
    expect(lastNonCompleted.status).toBe(409);

    const flipLast = await agent
      .patch(`/api/projects/${project.id}/statuses/${todo.id}`)
      .send({ isCompleted: true });
    expect(flipLast.status).toBe(409);

    const liveTasks = await agent.get(
      `/api/projects/${project.id}/tasks?status=TODO`,
    );
    for (const task of liveTasks.body.tasks as Array<{ id: string }>) {
      await agent.delete(`/api/tasks/${task.id}`);
    }
    await agent.delete(`/api/projects/${project.id}/statuses/${done.id}`);
    const last = await agent.delete(
      `/api/projects/${project.id}/statuses/${todo.id}`,
    );
    expect(last.status).toBe(409);
    expect(last.body).toMatchObject(envelope("CONFLICT"));
  });

  it("allows editing and deleting unused seeded statuses when guardrails pass", async () => {
    const { app } = createStatusesApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const listed = await agent.get(`/api/projects/${project.id}/statuses`);
    const inProgress = listed.body.statuses.find(
      (s: { key: string }) => s.key === "IN_PROGRESS",
    );
    const renamed = await agent
      .patch(`/api/projects/${project.id}/statuses/${inProgress.id}`)
      .send({ name: "Doing" });
    expect(renamed.status).toBe(200);
    expect(renamed.body.key).toBe("IN_PROGRESS");
    expect(renamed.body.name).toBe("Doing");

    const removed = await agent.delete(
      `/api/projects/${project.id}/statuses/${inProgress.id}`,
    );
    expect(removed.status).toBe(204);
    const after = await agent.get(`/api/projects/${project.id}/statuses`);
    expect(after.body.statuses.map((s: { key: string }) => s.key)).toEqual([
      "TODO",
      "DONE",
    ]);
  });
});
