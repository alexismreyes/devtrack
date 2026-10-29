import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaAuthRepository } from "../../auth/repository/prisma-auth-repository";
import { InMemoryAuthRepository } from "../../auth/tests/in-memory-auth-repository";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { InMemoryProjectsRepository } from "../../projects/tests/in-memory-projects-repository";
import { PrismaSystemRepository } from "../../system/repository/prisma-system-repository";
import { DatabaseUnavailableError } from "../../system/domain/errors";
import { SystemProbe } from "../../system/domain/system-probe";
import type { SystemRepository } from "../../system/repository/system-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { PrismaTasksRepository } from "../repository/prisma-tasks-repository";
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

function createTasksApp() {
  const usersRepository = new InMemoryUsersRepository();
  const authRepository = new InMemoryAuthRepository(usersRepository);
  const systemRepository = new FakeSystemRepository();
  const projectsRepository = new InMemoryProjectsRepository();
  const tasksRepository = new InMemoryTasksRepository();
  const app = createApp({
    corsOrigin: "http://localhost:5173",
    systemRepository,
    usersRepository,
    authRepository,
    projectsRepository,
    tasksRepository,
  });
  return { app, tasksRepository };
}

async function registerAgent(
  app: ReturnType<typeof createApp>,
  email = `owner-${randomUUID()}@example.com`,
) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    email,
    password: "secret-pass",
    displayName: "Ada",
  });
  expect(response.status).toBe(201);
  return { agent, user: response.body as { id: string; email: string } };
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

function assertPublicTask(
  body: unknown,
  expected: {
    projectId: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
  },
): asserts body is {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
} {
  expect(body).toEqual({
    id: expect.any(String),
    projectId: expected.projectId,
    title: expected.title,
    description: expected.description,
    status: expected.status,
    priority: expected.priority,
    dueDate: expected.dueDate,
    createdAt: expect.any(String),
  });
  const task = body as {
    id: string;
    createdAt: string;
  };
  expect(task.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
  expect(body).not.toHaveProperty("deletedAt");
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("tasks HTTP API", () => {
  it("creates a task with 201, path projectId, and TODO/MEDIUM defaults", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);

    const response = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Write spec", description: "Draft the API" });

    expect(response.status).toBe(201);
    assertPublicTask(response.body, {
      projectId: project.id,
      title: "Write spec",
      description: "Draft the API",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: null,
    });
    assertNoSecrets(response.body);

    const found = await agent.get(`/api/tasks/${response.body.id}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(response.body.id);
  });

  it("persists supplied status and priority instead of defaults", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);

    const response = await agent.post(`/api/projects/${project.id}/tasks`).send({
      title: "Write spec",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: "2020-01-02",
    });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe("IN_PROGRESS");
    expect(response.body.priority).toBe("HIGH");
    expect(response.body.dueDate).toBe("2020-01-02");
  });

  it("allows duplicate titles on the same project and another project", async () => {
    const { app } = createTasksApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: other } = await registerAgent(
      app,
      `other-${randomUUID()}@example.com`,
    );
    const firstProject = await createOwnedProject(owner, "A");
    const secondProject = await createOwnedProject(owner, "B");
    const otherProject = await createOwnedProject(other, "C");

    const first = await owner
      .post(`/api/projects/${firstProject.id}/tasks`)
      .send({ title: "Shared" });
    const second = await owner
      .post(`/api/projects/${firstProject.id}/tasks`)
      .send({ title: "Shared" });
    const third = await owner
      .post(`/api/projects/${secondProject.id}/tasks`)
      .send({ title: "Shared" });
    const fourth = await other
      .post(`/api/projects/${otherProject.id}/tasks`)
      .send({ title: "Shared" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(201);
    expect(fourth.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
  });

  it("rejects invalid create bodies with 400 VALIDATION_ERROR", async () => {
    const { app, tasksRepository } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const path = `/api/projects/${project.id}/tasks`;

    const missingTitle = await agent.post(path).send({});
    const emptyTitle = await agent.post(path).send({ title: "  " });
    const unknownField = await agent
      .post(path)
      .send({ title: "Write spec", extra: true });
    const serverOwned = await agent.post(path).send({
      title: "Write spec",
      id: missingId,
      createdAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
      projectId: missingId,
    });
    const nullStatus = await agent
      .post(path)
      .send({ title: "Write spec", status: null });
    const invalidStatus = await agent
      .post(path)
      .send({ title: "Write spec", status: "BLOCKED" });
    const invalidPriority = await agent
      .post(path)
      .send({ title: "Write spec", priority: "URGENT" });
    const invalidDueDate = await agent
      .post(path)
      .send({ title: "Write spec", dueDate: "2026-02-31" });

    expect(missingTitle.status).toBe(400);
    expect(emptyTitle.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(serverOwned.status).toBe(400);
    expect(nullStatus.status).toBe(400);
    expect(invalidStatus.status).toBe(400);
    expect(invalidPriority.status).toBe(400);
    expect(invalidDueDate.status).toBe(400);
    expect(missingTitle.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(tasksRepository.tasksById.size).toBe(0);
    assertNoSecrets(serverOwned.body);
  });

  it("stores omitted, null, and blank descriptions as null", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const path = `/api/projects/${project.id}/tasks`;

    const omitted = await agent.post(path).send({ title: "A" });
    const nullable = await agent
      .post(path)
      .send({ title: "B", description: null });
    const blank = await agent
      .post(path)
      .send({ title: "C", description: "   " });

    expect(omitted.status).toBe(201);
    expect(nullable.status).toBe(201);
    expect(blank.status).toBe(201);
    expect(omitted.body.description).toBeNull();
    expect(nullable.body.description).toBeNull();
    expect(blank.body.description).toBeNull();
  });

  it("returns 401 without a session cookie on protected task routes", async () => {
    const { app } = createTasksApp();

    const create = await request(app)
      .post(`/api/projects/${missingId}/tasks`)
      .send({ title: "X" });
    const list = await request(app).get(`/api/projects/${missingId}/tasks`);
    const get = await request(app).get(`/api/tasks/${missingId}`);
    const patch = await request(app)
      .patch(`/api/tasks/${missingId}`)
      .send({ title: "X" });
    const remove = await request(app).delete(`/api/tasks/${missingId}`);

    expect(create.status).toBe(401);
    expect(list.status).toBe(401);
    expect(get.status).toBe(401);
    expect(patch.status).toBe(401);
    expect(remove.status).toBe(401);
    expect(create.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(list.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(get.body).not.toHaveProperty("id");
    expect(list.body).not.toHaveProperty("tasks");
    assertNoSecrets(create.body);
  });

  it("lets the owner GET a live task including after the parent is archived", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const created = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Write spec" });
    const archived = await agent.post(`/api/projects/${project.id}/archive`);
    const found = await agent.get(`/api/tasks/${created.body.id}`);
    const listed = await agent.get(`/api/projects/${project.id}/tasks`);

    expect(created.status).toBe(201);
    expect(archived.status).toBe(200);
    expect(found.status).toBe(200);
    assertPublicTask(found.body, {
      projectId: project.id,
      title: "Write spec",
      description: null,
      status: "TODO",
      priority: "MEDIUM",
      dueDate: null,
    });
    expect(listed.status).toBe(200);
    expect(listed.body.tasks).toEqual([
      expect.objectContaining({ id: created.body.id }),
    ]);
  });

  it("returns 403 for a non-owner of a live task and leaves it unchanged", async () => {
    const { app } = createTasksApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: other } = await registerAgent(
      app,
      `other-${randomUUID()}@example.com`,
    );
    const project = await createOwnedProject(owner);
    const created = await owner
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Private", description: "Mine" });

    const create = await other
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Hacked" });
    const get = await other.get(`/api/tasks/${created.body.id}`);
    const patch = await other
      .patch(`/api/tasks/${created.body.id}`)
      .send({ title: "Hacked" });
    const list = await other.get(`/api/projects/${project.id}/tasks`);
    const remove = await other.delete(`/api/tasks/${created.body.id}`);
    const after = await owner.get(`/api/tasks/${created.body.id}`);

    expect(create.status).toBe(403);
    expect(get.status).toBe(403);
    expect(patch.status).toBe(403);
    expect(list.status).toBe(403);
    expect(remove.status).toBe(403);
    expect(get.body).toMatchObject(envelope("FORBIDDEN"));
    expect(get.body).not.toHaveProperty("title");
    expect(after.body.title).toBe("Private");
    expect(after.body.description).toBe("Mine");
    assertNoSecrets(get.body);
  });

  it("returns 404 NOT_FOUND for a missing project or task id", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);

    const create = await agent
      .post(`/api/projects/${missingId}/tasks`)
      .send({ title: "Ghost" });
    const list = await agent.get(`/api/projects/${missingId}/tasks`);
    const get = await agent.get(`/api/tasks/${missingId}`);
    const patch = await agent.patch(`/api/tasks/${missingId}`).send({
      title: "Ghost",
    });
    const remove = await agent.delete(`/api/tasks/${missingId}`);

    expect(create.status).toBe(404);
    expect(list.status).toBe(404);
    expect(get.status).toBe(404);
    expect(patch.status).toBe(404);
    expect(remove.status).toBe(404);
    expect(get.body).toMatchObject(envelope("NOT_FOUND"));
    assertNoSecrets(get.body);
  });

  it("rejects a non-UUID project or task id with 400", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);

    const list = await agent.get("/api/projects/not-a-uuid/tasks");
    const get = await agent.get("/api/tasks/not-a-uuid");

    expect(list.status).toBe(400);
    expect(get.status).toBe(400);
    expect(list.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(get.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });

  it("lists only that project's non-deleted tasks and returns 200 when empty", async () => {
    const { app } = createTasksApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: other } = await registerAgent(
      app,
      `other-${randomUUID()}@example.com`,
    );
    const { agent: empty } = await registerAgent(
      app,
      `empty-${randomUUID()}@example.com`,
    );
    const project = await createOwnedProject(owner, "Keep");
    const otherProject = await createOwnedProject(other, "Other");
    const emptyProject = await createOwnedProject(empty, "Empty");

    const keep = await owner
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Keep" });
    const hidden = await owner
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Hide" });
    await owner.delete(`/api/tasks/${hidden.body.id}`);
    await other
      .post(`/api/projects/${otherProject.id}/tasks`)
      .send({ title: "Other" });

    const listed = await owner.get(`/api/projects/${project.id}/tasks`);
    const emptyList = await empty.get(`/api/projects/${emptyProject.id}/tasks`);

    expect(keep.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(listed.body.tasks).toEqual([
      expect.objectContaining({ id: keep.body.id, title: "Keep" }),
    ]);
    expect(
      listed.body.tasks.some((task: { id: string }) => task.id === hidden.body.id),
    ).toBe(false);
    expect(emptyList.status).toBe(200);
    expect(emptyList.body).toEqual({ tasks: [] });
    assertNoSecrets(listed.body);
  });

  it("filters the list by status and/or priority and rejects invalid query", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const path = `/api/projects/${project.id}/tasks`;

    await agent.post(path).send({
      title: "A",
      status: "TODO",
      priority: "LOW",
    });
    const match = await agent.post(path).send({
      title: "B",
      status: "DONE",
      priority: "HIGH",
    });
    await agent.post(path).send({
      title: "C",
      status: "DONE",
      priority: "LOW",
    });

    const unfiltered = await agent.get(path);
    const byStatus = await agent.get(`${path}?status=DONE`);
    const byBoth = await agent.get(`${path}?status=DONE&priority=HIGH`);
    const invalid = await agent.get(`${path}?status=NOPE`);
    const unknown = await agent.get(`${path}?includeDeleted=true`);

    expect(unfiltered.status).toBe(200);
    expect(unfiltered.body.tasks).toHaveLength(3);
    expect(byStatus.status).toBe(200);
    expect(byStatus.body.tasks).toHaveLength(2);
    expect(byBoth.status).toBe(200);
    expect(byBoth.body.tasks).toEqual([
      expect.objectContaining({ id: match.body.id }),
    ]);
    expect(invalid.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(invalid.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(unknown.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });

  it("PATCHes allowed fields without changing identity or projectId", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const created = await agent.post(`/api/projects/${project.id}/tasks`).send({
      title: "Write spec",
      description: "First",
    });

    const patched = await agent.patch(`/api/tasks/${created.body.id}`).send({
      title: "Review spec",
      description: "Second",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: "2026-12-01",
    });
    const emptyPatch = await agent.patch(`/api/tasks/${created.body.id}`).send({});
    const rejected = await agent.patch(`/api/tasks/${created.body.id}`).send({
      title: "Nope",
      id: missingId,
      createdAt: "2020-01-01T00:00:00.000Z",
      projectId: missingId,
      deletedAt: "2020-01-01T00:00:00.000Z",
    });
    const after = await agent.get(`/api/tasks/${created.body.id}`);

    expect(patched.status).toBe(200);
    assertPublicTask(patched.body, {
      projectId: project.id,
      title: "Review spec",
      description: "Second",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: "2026-12-01",
    });
    expect(patched.body.id).toBe(created.body.id);
    expect(patched.body.createdAt).toBe(created.body.createdAt);
    expect(emptyPatch.status).toBe(400);
    expect(rejected.status).toBe(400);
    expect(after.body.projectId).toBe(project.id);
    expect(after.body.title).toBe("Review spec");
  });

  it("clears due date on PATCH and allows past calendar dates", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const created = await agent.post(`/api/projects/${project.id}/tasks`).send({
      title: "Write spec",
      dueDate: "2020-01-02",
    });

    const cleared = await agent
      .patch(`/api/tasks/${created.body.id}`)
      .send({ dueDate: null });

    expect(created.body.dueDate).toBe("2020-01-02");
    expect(cleared.status).toBe(200);
    expect(cleared.body.dueDate).toBeNull();
  });

  it("soft-deletes with 204, hides the task, and leaves the in-memory row", async () => {
    const { app, tasksRepository } = createTasksApp();
    const { agent } = await registerAgent(app);
    const { agent: other } = await registerAgent(
      app,
      `other-${randomUUID()}@example.com`,
    );
    const project = await createOwnedProject(agent);
    const created = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Write spec" });

    const removed = await agent.delete(`/api/tasks/${created.body.id}`);
    const found = await agent.get(`/api/tasks/${created.body.id}`);
    const listed = await agent.get(`/api/projects/${project.id}/tasks`);
    const patched = await agent
      .patch(`/api/tasks/${created.body.id}`)
      .send({ title: "Nope" });
    const second = await agent.delete(`/api/tasks/${created.body.id}`);
    const otherGet = await other.get(`/api/tasks/${created.body.id}`);

    expect(removed.status).toBe(204);
    expect(removed.body).toEqual({});
    expect(found.status).toBe(404);
    expect(listed.body.tasks).toEqual([]);
    expect(patched.status).toBe(404);
    expect(second.status).toBe(404);
    expect(otherGet.status).toBe(404);
    expect(found.body).toMatchObject(envelope("NOT_FOUND"));
    expect(tasksRepository.tasksById.get(created.body.id)?.deletedAt).not.toBeNull();
    assertNoSecrets(found.body);
  });

  it("rejects create, update, and soft-delete on an archived parent with 409", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const created = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Write spec", description: "First" });
    const archived = await agent.post(`/api/projects/${project.id}/archive`);

    const create = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Blocked" });
    const patched = await agent
      .patch(`/api/tasks/${created.body.id}`)
      .send({ title: "Blocked" });
    const removed = await agent.delete(`/api/tasks/${created.body.id}`);
    const after = await agent.get(`/api/tasks/${created.body.id}`);

    expect(archived.status).toBe(200);
    expect(create.status).toBe(409);
    expect(patched.status).toBe(409);
    expect(removed.status).toBe(409);
    expect(create.body).toMatchObject(envelope("CONFLICT"));
    expect(after.body.title).toBe("Write spec");
    expect(after.body.description).toBe("First");
    assertNoSecrets(create.body);
  });

  it("rejects unexpected DELETE body fields", async () => {
    const { app } = createTasksApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    const created = await agent
      .post(`/api/projects/${project.id}/tasks`)
      .send({ title: "Write spec" });

    const response = await agent.delete(`/api/tasks/${created.body.id}`).send({
      deletedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });

  it("keeps health public and probes authenticated", async () => {
    const { app } = createTasksApp();

    const health = await request(app).get("/health");
    const ready = await request(app).get("/ready");
    const probes = await request(app).get("/api/system/probes");

    expect(health.status).toBe(200);
    expect(ready.status).toBe(200);
    expect(probes.status).toBe(401);
  });
});

describe("tasks HTTP API persistence", () => {
  loadEnvFiles();
  process.env.CORS_ORIGIN ??= "http://localhost:5173";
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let app: ReturnType<typeof createApp> | null = null;

  if (hasDatabaseUrl) {
    prisma = createPrismaClient(loadConfig().databaseUrl);
    app = createApp({
      corsOrigin: process.env.CORS_ORIGIN,
      systemRepository: new PrismaSystemRepository(prisma),
      usersRepository: new PrismaUsersRepository(prisma),
      authRepository: new PrismaAuthRepository(prisma),
      projectsRepository: new PrismaProjectsRepository(prisma),
      tasksRepository: new PrismaTasksRepository(prisma),
    });
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "persists projectId, defaults, duplicate titles, and soft-delete without removing the row",
    async () => {
      if (!app || !prisma) {
        return;
      }

      const { agent } = await registerAgent(app);
      const project = await createOwnedProject(agent);
      const first = await agent.post(`/api/projects/${project.id}/tasks`).send({
        title: "Shared",
        description: "One",
      });
      const second = await agent
        .post(`/api/projects/${project.id}/tasks`)
        .send({ title: "Shared" });
      const removed = await agent.delete(`/api/tasks/${first.body.id}`);
      const listed = await agent.get(`/api/projects/${project.id}/tasks`);
      const found = await agent.get(`/api/tasks/${first.body.id}`);
      const row = await prisma.task.findUnique({
        where: { id: first.body.id },
      });

      expect(first.status).toBe(201);
      expect(first.body.projectId).toBe(project.id);
      expect(first.body.status).toBe("TODO");
      expect(first.body.priority).toBe("MEDIUM");
      expect(second.status).toBe(201);
      expect(removed.status).toBe(204);
      expect(
        listed.body.tasks.some(
          (task: { id: string }) => task.id === first.body.id,
        ),
      ).toBe(false);
      expect(found.status).toBe(404);
      expect(row).not.toBeNull();
      expect(row?.deletedAt).not.toBeNull();
      expect(row?.title).toBe("Shared");
      assertNoSecrets(first.body);
    },
  );
});
