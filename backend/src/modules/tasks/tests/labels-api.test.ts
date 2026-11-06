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

function createLabelsApp() {
  const usersRepository = new InMemoryUsersRepository();
  const authRepository = new InMemoryAuthRepository(usersRepository);
  const systemRepository = new FakeSystemRepository();
  const projectsRepository = new InMemoryProjectsRepository();
  const labelsRepository = new InMemoryLabelsRepository();
  const taskLabelsRepository = new InMemoryTaskLabelsRepository(labelsRepository);
  const tasksRepository = new InMemoryTasksRepository(taskLabelsRepository.joins);
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
    projectMembersRepository,
  });
  return { app, activityRepository, labelsRepository };
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
  title = "Work",
) {
  const response = await agent
    .post(`/api/projects/${projectId}/tasks`)
    .send({ title });
  expect(response.status).toBe(201);
  return response.body as { id: string; labels: unknown[] };
}

function envelope(code: string) {
  return {
    error: {
      code,
    },
  };
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("labels HTTP API", () => {
  it("creates, lists, patches, and deletes catalog labels (AC-001, AC-008, AC-011)", async () => {
    const { app } = createLabelsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);

    const created = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: " Bug ", color: "RED" });
    const listed = await agent.get(`/api/projects/${project.id}/labels`);
    const patched = await agent
      .patch(`/api/projects/${project.id}/labels/${created.body.id}`)
      .send({ name: "Defect", color: "ORANGE" });
    const duplicate = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "defect", color: "BLUE" });
    const invalid = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "", color: "CYAN", extra: true });
    const removed = await agent.delete(
      `/api/projects/${project.id}/labels/${patched.body.id}`,
    );
    const afterDelete = await agent.get(`/api/projects/${project.id}/labels`);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      projectId: project.id,
      name: "Bug",
      color: "RED",
    });
    expect(listed.status).toBe(200);
    expect(listed.body.labels).toHaveLength(1);
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ name: "Defect", color: "ORANGE" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject(envelope("CONFLICT"));
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(removed.status).toBe(204);
    expect(afterDelete.body.labels).toEqual([]);
  });

  it("assigns many labels, embeds on task DTO, and filters by labelId (AC-002, AC-005)", async () => {
    const { app } = createLabelsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const taskA = await createTask(agent, project.id, "A");
    const taskB = await createTask(agent, project.id, "B");
    expect(taskA.labels).toEqual([]);

    const bug = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Bug", color: "RED" });
    const feature = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Feature", color: "GREEN" });

    const assigned = await agent.put(`/api/tasks/${taskA.id}/labels`).send({
      labelIds: [feature.body.id, bug.body.id, bug.body.id],
    });
    const got = await agent.get(`/api/tasks/${taskA.id}`);
    const filtered = await agent.get(
      `/api/projects/${project.id}/tasks?labelId=${bug.body.id}&status=TODO`,
    );
    const empty = await agent.get(
      `/api/projects/${project.id}/tasks?labelId=${feature.body.id}&priority=HIGH`,
    );
    const unknownQuery = await agent.get(
      `/api/projects/${project.id}/tasks?labelId=${bug.body.id}&foo=1`,
    );

    expect(assigned.status).toBe(200);
    expect(assigned.body.labels.map((l: { name: string }) => l.name)).toEqual([
      "Bug",
      "Feature",
    ]);
    expect(got.body.labels).toEqual([
      { id: bug.body.id, name: "Bug", color: "RED" },
      { id: feature.body.id, name: "Feature", color: "GREEN" },
    ]);
    expect(filtered.status).toBe(200);
    expect(filtered.body.tasks.map((t: { id: string }) => t.id)).toEqual([
      taskA.id,
    ]);
    expect(empty.status).toBe(200);
    expect(empty.body.tasks).toEqual([]);
    expect(unknownQuery.status).toBe(400);
    expect(taskB.id).toBeTruthy();
  });

  it("rejects cross-project assignment (AC-003)", async () => {
    const { app } = createLabelsApp();
    const { agent } = await registerAgent(app);
    const projectA = await createOwnedProject(agent, "A");
    const projectB = await createOwnedProject(agent, "B");
    const task = await createTask(agent, projectB.id);
    const label = await agent
      .post(`/api/projects/${projectA.id}/labels`)
      .send({ name: "Bug", color: "RED" });

    const response = await agent.put(`/api/tasks/${task.id}/labels`).send({
      labelIds: [label.body.id],
    });
    const got = await agent.get(`/api/tasks/${task.id}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(envelope("NOT_FOUND"));
    expect(got.body.labels).toEqual([]);
  });

  it("enforces authn/authz matrix for catalog and assignment (AC-006, AC-007)", async () => {
    const { app } = createLabelsApp();
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
    const label = await owner
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Bug", color: "RED" });

    const unauth = await request(app).get(`/api/projects/${project.id}/labels`);
    const viewerList = await viewer.get(`/api/projects/${project.id}/labels`);
    const viewerCreate = await viewer
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Nope", color: "BLUE" });
    const viewerAssign = await viewer.put(`/api/tasks/${task.id}/labels`).send({
      labelIds: [label.body.id],
    });
    const strangerList = await stranger.get(
      `/api/projects/${project.id}/labels`,
    );
    const editorAssign = await editor.put(`/api/tasks/${task.id}/labels`).send({
      labelIds: [label.body.id],
    });

    expect(unauth.status).toBe(401);
    expect(viewerList.status).toBe(200);
    expect(viewerCreate.status).toBe(403);
    expect(viewerAssign.status).toBe(403);
    expect(strangerList.status).toBe(403);
    expect(editorAssign.status).toBe(200);
  });

  it("does not emit activity for label changes and keeps comments/activity contracts (AC-009)", async () => {
    const { app, activityRepository } = createLabelsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const before = activityRepository.eventsById.size;

    const label = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Bug", color: "RED" });
    await agent.put(`/api/tasks/${task.id}/labels`).send({
      labelIds: [label.body.id],
    });
    await agent
      .patch(`/api/projects/${project.id}/labels/${label.body.id}`)
      .send({ color: "BLUE" });
    await agent.delete(`/api/projects/${project.id}/labels/${label.body.id}`);

    const comments = await agent.get(`/api/tasks/${task.id}/comments`);
    const activity = await agent.get(`/api/tasks/${task.id}/activity`);

    expect(activityRepository.eventsById.size).toBe(before);
    expect(comments.status).toBe(200);
    expect(comments.body).toEqual({ comments: [] });
    expect(activity.status).toBe(200);
    expect(activity.body.activity).toHaveLength(1);
    expect(activity.body.activity[0].kind).toBe("TASK_CREATED");
  });

  it("applies archived mutate 409/403 and owner catalog list (AC-012)", async () => {
    const { app } = createLabelsApp();
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
    const label = await owner
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Bug", color: "RED" });
    await owner.post(`/api/projects/${project.id}/archive`);

    const ownerCreate = await owner
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Blocked", color: "GRAY" });
    const editorAssign = await editor.put(`/api/tasks/${task.id}/labels`).send({
      labelIds: [label.body.id],
    });
    const editorList = await editor.get(`/api/projects/${project.id}/labels`);
    const ownerList = await owner.get(`/api/projects/${project.id}/labels`);

    expect(ownerCreate.status).toBe(409);
    expect(ownerCreate.body).toMatchObject(envelope("CONFLICT"));
    expect(editorAssign.status).toBe(403);
    expect(editorList.status).toBe(403);
    expect(ownerList.status).toBe(200);
    expect(ownerList.body.labels).toHaveLength(1);
  });

  it("returns 404 for soft-deleted task assignment and missing project/label (AC-013)", async () => {
    const { app } = createLabelsApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const task = await createTask(agent, project.id);
    const label = await agent
      .post(`/api/projects/${project.id}/labels`)
      .send({ name: "Bug", color: "RED" });
    await agent.delete(`/api/tasks/${task.id}`);

    const assign = await agent.put(`/api/tasks/${task.id}/labels`).send({
      labelIds: [label.body.id],
    });
    const missingProject = await agent.get(
      `/api/projects/${missingId}/labels`,
    );
    const missingLabel = await agent
      .patch(`/api/projects/${project.id}/labels/${missingId}`)
      .send({ name: "Ghost" });

    expect(assign.status).toBe(404);
    expect(missingProject.status).toBe(404);
    expect(missingLabel.status).toBe(404);
  });
});
