import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { InMemoryAuthRepository } from "../../auth/tests/in-memory-auth-repository";
import { InMemoryProjectMembersRepository } from "../../project-members/tests/in-memory-project-members-repository";
import { InMemoryProjectsRepository } from "../../projects/tests/in-memory-projects-repository";
import { InMemoryProjectCoverStorage } from "../../projects/tests/in-memory-project-cover-storage";
import { InMemoryProjectCoversRepository } from "../../projects/tests/in-memory-project-covers-repository";
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

function createChecklistsApp() {
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
  const checklistsRepository = new InMemoryChecklistsRepository();
  const projectMembersRepository = new InMemoryProjectMembersRepository();
  const app = createApp({
    corsOrigin: "http://localhost:5173",
    systemRepository,
    usersRepository,
    authRepository,
    projectsRepository,
    projectCoversRepository: new InMemoryProjectCoversRepository(),
    projectCoverStorage: new InMemoryProjectCoverStorage(),
    tasksRepository,
    commentsRepository,
    activityRepository,
    checklistsRepository,
    attachmentsRepository: new InMemoryAttachmentsRepository(tasksRepository),
    attachmentStorage: new InMemoryAttachmentStorage(),
    labelsRepository,
    taskLabelsRepository,
    statusesRepository,
    projectMembersRepository,
  });
  return {
    app,
    activityRepository,
    checklistsRepository,
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
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("task checklists HTTP API", () => {
  it("creates named checklist, lists nested items, emits CHECKLIST_ADDED (AC-001/AC-002)", async () => {
    const { app, activityRepository } = createChecklistsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);

    const created = await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "  Launch  " });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      taskId: task.id,
      name: "Launch",
      createdAt: expect.any(String),
      items: [],
    });
    assertNoSecrets(created.body);

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "QA" });
    expect(second.status).toBe(201);

    const listed = await agent.get(`/api/tasks/${task.id}/checklists`);
    expect(listed.status).toBe(200);
    expect(listed.body.checklists.map((c: { id: string }) => c.id)).toEqual([
      created.body.id,
      second.body.id,
    ]);

    const activity = await agent.get(`/api/tasks/${task.id}/activity`);
    expect(activity.status).toBe(200);
    const added = activity.body.activity.filter(
      (e: { kind: string }) => e.kind === "CHECKLIST_ADDED",
    );
    expect(added).toHaveLength(2);
    expect(added[0].payload).toEqual({
      checklistId: second.body.id,
      namePreview: "QA",
    });
    expect(activityRepository.eventsById.size).toBeGreaterThanOrEqual(2);
  });

  it("adds items, patches checked with emission rules, rejects checked on create (AC-003/AC-011)", async () => {
    const { app } = createChecklistsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const checklist = await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "List" });

    const withChecked = await agent
      .post(`/api/tasks/${task.id}/checklists/${checklist.body.id}/items`)
      .send({ text: "Nope", checked: true });
    expect(withChecked.status).toBe(400);
    expect(withChecked.body).toMatchObject(envelope("VALIDATION_ERROR"));

    const emptyName = await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "   " });
    expect(emptyName.status).toBe(400);

    const item = await agent
      .post(`/api/tasks/${task.id}/checklists/${checklist.body.id}/items`)
      .send({ text: "  Do it  " });
    expect(item.status).toBe(201);
    expect(item.body).toEqual({
      id: expect.any(String),
      checklistId: checklist.body.id,
      text: "Do it",
      checked: false,
      createdAt: expect.any(String),
    });

    const complete = await agent
      .patch(
        `/api/tasks/${task.id}/checklists/${checklist.body.id}/items/${item.body.id}`,
      )
      .send({ checked: true });
    expect(complete.status).toBe(200);
    expect(complete.body.checked).toBe(true);

    const noop = await agent
      .patch(
        `/api/tasks/${task.id}/checklists/${checklist.body.id}/items/${item.body.id}`,
      )
      .send({ checked: true });
    expect(noop.status).toBe(200);

    const textOnly = await agent
      .patch(
        `/api/tasks/${task.id}/checklists/${checklist.body.id}/items/${item.body.id}`,
      )
      .send({ text: "Updated" });
    expect(textOnly.status).toBe(200);
    expect(textOnly.body.text).toBe("Updated");

    const rename = await agent
      .patch(`/api/tasks/${task.id}/checklists/${checklist.body.id}`)
      .send({ name: "Renamed" });
    expect(rename.status).toBe(200);
    expect(rename.body.name).toBe("Renamed");

    const activity = await agent.get(`/api/tasks/${task.id}/activity`);
    const kinds = activity.body.activity.map((e: { kind: string }) => e.kind);
    expect(kinds.filter((k: string) => k === "CHECKLIST_ITEM_COMPLETED")).toHaveLength(
      1,
    );
    expect(kinds).not.toContain("CHECKLIST_ITEM_UNCOMPLETED");
    expect(
      kinds.filter((k: string) => k === "CHECKLIST_ADDED"),
    ).toHaveLength(1);
  });

  it("enforces authz matrix and VIEWER read-only (AC-004/AC-005)", async () => {
    const { app } = createChecklistsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: editor, user: editorUser } = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Ed",
    );
    const { agent: viewer, user: viewerUser } = await registerAgent(
      app,
      `viewer-${randomUUID()}@example.com`,
      "Vi",
    );
    const { agent: stranger } = await registerAgent(
      app,
      `stranger-${randomUUID()}@example.com`,
      "St",
    );
    const project = await createOwnedProject(owner);
    await owner.post(`/api/projects/${project.id}/members`).send({
      email: editorUser.email,
      role: "EDITOR",
    });
    await owner.post(`/api/projects/${project.id}/members`).send({
      email: viewerUser.email,
      role: "VIEWER",
    });
    const task = await createTask(owner, project.id);
    const checklist = await owner
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "List" });

    const guest = request(app);
    const unauth = await guest.get(`/api/tasks/${task.id}/checklists`);
    expect(unauth.status).toBe(401);

    const viewerList = await viewer.get(`/api/tasks/${task.id}/checklists`);
    expect(viewerList.status).toBe(200);
    expect(viewerList.body.checklists).toHaveLength(1);

    const viewerCreate = await viewer
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "Nope" });
    expect(viewerCreate.status).toBe(403);

    const strangerList = await stranger.get(`/api/tasks/${task.id}/checklists`);
    expect(strangerList.status).toBe(403);

    const editorItem = await editor
      .post(`/api/tasks/${task.id}/checklists/${checklist.body.id}/items`)
      .send({ text: "Ok" });
    expect(editorItem.status).toBe(201);

    const missingTask = await owner.get(`/api/tasks/${missingId}/checklists`);
    expect(missingTask.status).toBe(404);
  });

  it("hard-deletes checklist cascading items with CHECKLIST_REMOVED only (AC-009)", async () => {
    const { app, checklistsRepository } = createChecklistsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const checklist = await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "Remove" });
    const item = await agent
      .post(`/api/tasks/${task.id}/checklists/${checklist.body.id}/items`)
      .send({ text: "Child" });
    expect(item.status).toBe(201);

    const deleted = await agent.delete(
      `/api/tasks/${task.id}/checklists/${checklist.body.id}`,
    );
    expect(deleted.status).toBe(204);
    expect(
      await checklistsRepository.findByIdInTask(task.id, checklist.body.id),
    ).toBeNull();
    expect(
      await checklistsRepository.findItemByIdInChecklist(
        checklist.body.id,
        item.body.id,
      ),
    ).toBeNull();

    const activity = await agent.get(`/api/tasks/${task.id}/activity`);
    const removed = activity.body.activity.filter(
      (e: { kind: string }) => e.kind === "CHECKLIST_REMOVED",
    );
    expect(removed).toHaveLength(1);
    expect(
      activity.body.activity.filter((e: { kind: string }) =>
        e.kind.startsWith("CHECKLIST_ITEM_"),
      ),
    ).toHaveLength(0);
  });

  it("orders by createdAt ascending and allows empty checklists (AC-010/AC-120)", async () => {
    const { app } = createChecklistsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const first = await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "First" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "Second" });
    const itemA = await agent
      .post(`/api/tasks/${task.id}/checklists/${first.body.id}/items`)
      .send({ text: "A" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const itemB = await agent
      .post(`/api/tasks/${task.id}/checklists/${first.body.id}/items`)
      .send({ text: "B" });
    await agent.delete(
      `/api/tasks/${task.id}/checklists/${first.body.id}/items/${itemA.body.id}`,
    );

    const listed = await agent.get(`/api/tasks/${task.id}/checklists`);
    expect(listed.body.checklists.map((c: { id: string }) => c.id)).toEqual([
      first.body.id,
      second.body.id,
    ]);
    expect(
      listed.body.checklists[0].items.map((i: { id: string }) => i.id),
    ).toEqual([itemB.body.id]);
    expect(listed.body.checklists[1].items).toEqual([]);
  });

  it("applies archived mutate 409/403 and soft-deleted task 404 (AC-012)", async () => {
    const { app } = createChecklistsApp();
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
    await owner.post(`/api/projects/${project.id}/archive`);

    const ownerCreate = await owner
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "Blocked" });
    const editorCreate = await editor
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "Blocked" });
    const ownerList = await owner.get(`/api/tasks/${task.id}/checklists`);

    expect(ownerCreate.status).toBe(409);
    expect(ownerCreate.body).toMatchObject(envelope("CONFLICT"));
    expect(editorCreate.status).toBe(403);
    expect(ownerList.status).toBe(200);

    const liveProject = await createOwnedProject(owner, "Live");
    const liveTask = await createTask(owner, liveProject.id);
    await owner.delete(`/api/tasks/${liveTask.id}`);
    const soft = await owner.get(`/api/tasks/${liveTask.id}/checklists`);
    expect(soft.status).toBe(404);
  });

  it("keeps comments/labels contracts and PublicTaskDto without checklists (AC-007/AC-014)", async () => {
    const { app } = createChecklistsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    await agent
      .post(`/api/tasks/${task.id}/checklists`)
      .send({ name: "Hidden from cards" });

    const comments = await agent
      .post(`/api/tasks/${task.id}/comments`)
      .send({ body: "Hello" });
    expect(comments.status).toBe(201);
    expect(comments.body).toEqual({
      id: expect.any(String),
      taskId: task.id,
      authorUserId: expect.any(String),
      authorDisplayName: "Ada",
      body: "Hello",
      createdAt: expect.any(String),
    });
    expect(comments.body).not.toHaveProperty("checklists");

    const label = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Bug", color: "RED" });
    expect(label.status).toBe(201);

    const taskGet = await agent.get(`/api/tasks/${task.id}`);
    expect(taskGet.status).toBe(200);
    expect(taskGet.body).not.toHaveProperty("checklists");
    expect(taskGet.body).toHaveProperty("labels");

    const list = await agent.get(`/api/projects/${project.id}/tasks`);
    expect(list.status).toBe(200);
    expect(list.body.tasks[0]).not.toHaveProperty("checklists");
  });

  it("returns 404 for cross-task checklist/item misuse", async () => {
    const { app } = createChecklistsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const taskA = await createTask(agent, project.id, "A");
    const taskB = await createTask(agent, project.id, "B");
    const checklist = await agent
      .post(`/api/tasks/${taskA.id}/checklists`)
      .send({ name: "A list" });
    const item = await agent
      .post(`/api/tasks/${taskA.id}/checklists/${checklist.body.id}/items`)
      .send({ text: "Item" });

    const wrong = await agent
      .patch(
        `/api/tasks/${taskB.id}/checklists/${checklist.body.id}/items/${item.body.id}`,
      )
      .send({ checked: true });
    expect(wrong.status).toBe(404);
  });
});
