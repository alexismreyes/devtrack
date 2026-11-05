import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaUnitOfWork } from "../../../infrastructure/prisma/prisma-unit-of-work";
import { PrismaAuthRepository } from "../../auth/repository/prisma-auth-repository";
import { InMemoryAuthRepository } from "../../auth/tests/in-memory-auth-repository";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { InMemoryProjectsRepository } from "../../projects/tests/in-memory-projects-repository";
import { PrismaSystemRepository } from "../../system/repository/prisma-system-repository";
import { DatabaseUnavailableError } from "../../system/domain/errors";
import { SystemProbe } from "../../system/domain/system-probe";
import type { SystemRepository } from "../../system/repository/system-repository";
import { PrismaActivityRepository } from "../../tasks/repository/prisma-activity-repository";
import { PrismaChecklistsRepository } from "../../tasks/repository/prisma-checklists-repository";
import { PrismaCommentsRepository } from "../../tasks/repository/prisma-comments-repository";
import { PrismaTasksRepository } from "../../tasks/repository/prisma-tasks-repository";
import { PrismaLabelsRepository } from "../../tasks/repository/prisma-labels-repository";
import { PrismaTaskLabelsRepository } from "../../tasks/repository/prisma-task-labels-repository";
import { InMemoryActivityRepository } from "../../tasks/tests/in-memory-activity-repository";
import { InMemoryChecklistsRepository } from "../../tasks/tests/in-memory-checklists-repository";
import { InMemoryCommentsRepository } from "../../tasks/tests/in-memory-comments-repository";
import { InMemoryLabelsRepository } from "../../tasks/tests/in-memory-labels-repository";
import { InMemoryTaskLabelsRepository } from "../../tasks/tests/in-memory-task-labels-repository";
import { InMemoryTasksRepository } from "../../tasks/tests/in-memory-tasks-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { PrismaProjectMembersRepository } from "../repository/prisma-project-members-repository";
import { InMemoryProjectMembersRepository } from "./in-memory-project-members-repository";

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

function createMembersApp() {
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
    labelsRepository,
    taskLabelsRepository,
    projectMembersRepository,
  });
  return { app, usersRepository, projectMembersRepository };
}

async function registerAgent(
  app: ReturnType<typeof createApp>,
  email: string,
  displayName: string,
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

function assertPublicMember(
  body: unknown,
  expected: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
  },
): asserts body is {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
} {
  expect(body).toEqual({
    id: expect.any(String),
    userId: expected.userId,
    email: expected.email,
    displayName: expected.displayName,
    role: expected.role,
    createdAt: expect.any(String),
  });
  const member = body as {
    id: string;
    createdAt: string;
  };
  expect(member.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(Number.isNaN(Date.parse(member.createdAt))).toBe(false);
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("project-members HTTP API", () => {
  it("adds a member by existing email, lists them, changes role, and removes them", async () => {
    const { app } = createMembersApp();
    const owner = await registerAgent(
      app,
      `owner-${randomUUID()}@example.com`,
      "Ada",
    );
    const editor = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Grace",
    );
    const created = await owner.agent.post("/api/projects").send({
      name: "Roadmap",
    });
    expect(created.status).toBe(201);
    const projectId = created.body.id as string;

    const ownerRow = await owner.agent.get(`/api/projects/${projectId}/members`);
    expect(ownerRow.status).toBe(200);
    expect(ownerRow.body.members).toHaveLength(1);
    assertPublicMember(ownerRow.body.members[0], {
      userId: owner.user.id,
      email: owner.user.email,
      displayName: "Ada",
      role: "OWNER",
    });

    const added = await owner.agent
      .post(`/api/projects/${projectId}/members`)
      .send({ email: editor.user.email.toUpperCase(), role: "EDITOR" });
    expect(added.status).toBe(201);
    assertPublicMember(added.body, {
      userId: editor.user.id,
      email: editor.user.email,
      displayName: "Grace",
      role: "EDITOR",
    });
    assertNoSecrets(added.body);

    const listed = await owner.agent.get(`/api/projects/${projectId}/members`);
    expect(listed.status).toBe(200);
    expect(listed.body.members).toHaveLength(2);
    assertPublicMember(listed.body.members[0], {
      userId: editor.user.id,
      email: editor.user.email,
      displayName: "Grace",
      role: "EDITOR",
    });
    assertPublicMember(listed.body.members[1], {
      userId: owner.user.id,
      email: owner.user.email,
      displayName: "Ada",
      role: "OWNER",
    });

    const asEditor = await editor.agent.get(
      `/api/projects/${projectId}/members`,
    );
    expect(asEditor.status).toBe(200);
    expect(asEditor.body.members).toHaveLength(2);

    const patched = await owner.agent
      .patch(`/api/projects/${projectId}/members/${editor.user.id}`)
      .send({ role: "VIEWER" });
    expect(patched.status).toBe(200);
    assertPublicMember(patched.body, {
      userId: editor.user.id,
      email: editor.user.email,
      displayName: "Grace",
      role: "VIEWER",
    });

    const removed = await owner.agent.delete(
      `/api/projects/${projectId}/members/${editor.user.id}`,
    );
    expect(removed.status).toBe(204);
    expect(removed.body).toEqual({});

    const after = await owner.agent.get(`/api/projects/${projectId}/members`);
    expect(after.body.members).toHaveLength(1);
    assertPublicMember(after.body.members[0], {
      userId: owner.user.id,
      email: owner.user.email,
      displayName: "Ada",
      role: "OWNER",
    });
  });

  it("returns 401 without a session and does not persist members", async () => {
    const { app } = createMembersApp();
    const owner = await registerAgent(
      app,
      `owner-${randomUUID()}@example.com`,
      "Ada",
    );
    const created = await owner.agent.post("/api/projects").send({
      name: "Roadmap",
    });
    const projectId = created.body.id as string;
    const guest = request(app);

    const list = await guest.get(`/api/projects/${projectId}/members`);
    const add = await guest.post(`/api/projects/${projectId}/members`).send({
      email: "someone@example.com",
      role: "EDITOR",
    });

    expect(list.status).toBe(401);
    expect(list.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(add.status).toBe(401);
    expect(add.body).toMatchObject(envelope("UNAUTHENTICATED"));
    assertNoSecrets(list.body);
  });

  it("returns 404 for a missing project on membership paths", async () => {
    const { app } = createMembersApp();
    const owner = await registerAgent(
      app,
      `owner-${randomUUID()}@example.com`,
      "Ada",
    );

    const list = await owner.agent.get(`/api/projects/${missingId}/members`);
    const add = await owner.agent.post(`/api/projects/${missingId}/members`).send({
      email: "someone@example.com",
      role: "EDITOR",
    });
    const patch = await owner.agent
      .patch(`/api/projects/${missingId}/members/${missingId}`)
      .send({ role: "VIEWER" });
    const remove = await owner.agent.delete(
      `/api/projects/${missingId}/members/${missingId}`,
    );

    expect(list.status).toBe(404);
    expect(add.status).toBe(404);
    expect(patch.status).toBe(404);
    expect(remove.status).toBe(404);
    expect(list.body).toMatchObject(envelope("NOT_FOUND"));
    expect(add.body).toMatchObject(envelope("NOT_FOUND"));
  });

  it("returns 403 when a non-OWNER tries membership admin, and 404 for unknown email", async () => {
    const { app, usersRepository } = createMembersApp();
    const owner = await registerAgent(
      app,
      `owner-${randomUUID()}@example.com`,
      "Ada",
    );
    const editor = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Grace",
    );
    const viewer = await registerAgent(
      app,
      `viewer-${randomUUID()}@example.com`,
      "Alan",
    );
    const created = await owner.agent.post("/api/projects").send({
      name: "Roadmap",
    });
    const projectId = created.body.id as string;
    await owner.agent.post(`/api/projects/${projectId}/members`).send({
      email: editor.user.email,
      role: "EDITOR",
    });

    const forbiddenAdd = await editor.agent
      .post(`/api/projects/${projectId}/members`)
      .send({ email: viewer.user.email, role: "VIEWER" });
    const unknownEmail = await owner.agent
      .post(`/api/projects/${projectId}/members`)
      .send({ email: "missing@example.com", role: "VIEWER" });
    const stranger = await viewer.agent.get(
      `/api/projects/${projectId}/members`,
    );

    expect(forbiddenAdd.status).toBe(403);
    expect(forbiddenAdd.body).toMatchObject(envelope("FORBIDDEN"));
    expect(unknownEmail.status).toBe(404);
    expect(unknownEmail.body).toMatchObject(envelope("NOT_FOUND"));
    expect(stranger.status).toBe(403);
    const stillMissing = await usersRepository.findByEmail(
      "missing@example.com",
    );
    expect(stillMissing).toBeNull();
  });

  it("returns 409 for duplicate members and owner-row changes", async () => {
    const { app } = createMembersApp();
    const owner = await registerAgent(
      app,
      `owner-${randomUUID()}@example.com`,
      "Ada",
    );
    const editor = await registerAgent(
      app,
      `editor-${randomUUID()}@example.com`,
      "Grace",
    );
    const created = await owner.agent.post("/api/projects").send({
      name: "Roadmap",
    });
    const projectId = created.body.id as string;
    const first = await owner.agent
      .post(`/api/projects/${projectId}/members`)
      .send({ email: editor.user.email, role: "EDITOR" });
    const duplicate = await owner.agent
      .post(`/api/projects/${projectId}/members`)
      .send({ email: editor.user.email, role: "VIEWER" });
    const demoteOwner = await owner.agent
      .patch(`/api/projects/${projectId}/members/${owner.user.id}`)
      .send({ role: "EDITOR" });
    const removeOwner = await owner.agent.delete(
      `/api/projects/${projectId}/members/${owner.user.id}`,
    );
    const missingMember = await owner.agent
      .patch(`/api/projects/${projectId}/members/${missingId}`)
      .send({ role: "VIEWER" });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject(envelope("CONFLICT"));
    expect(demoteOwner.status).toBe(409);
    expect(removeOwner.status).toBe(409);
    expect(missingMember.status).toBe(404);
    assertNoSecrets(duplicate.body);
  });

  it("rejects invalid bodies and unknown fields", async () => {
    const { app } = createMembersApp();
    const owner = await registerAgent(
      app,
      `owner-${randomUUID()}@example.com`,
      "Ada",
    );
    const created = await owner.agent.post("/api/projects").send({
      name: "Roadmap",
    });
    const projectId = created.body.id as string;

    const invalidEmail = await owner.agent
      .post(`/api/projects/${projectId}/members`)
      .send({ email: "not-an-email", role: "EDITOR" });
    const invalidRole = await owner.agent
      .post(`/api/projects/${projectId}/members`)
      .send({ email: "ada@example.com", role: "ADMIN" });
    const extraField = await owner.agent
      .post(`/api/projects/${projectId}/members`)
      .send({
        email: "ada@example.com",
        role: "EDITOR",
        id: missingId,
      });
    const extraPatch = await owner.agent
      .patch(`/api/projects/${projectId}/members/${missingId}`)
      .send({ role: "EDITOR", userId: missingId });

    expect(invalidEmail.status).toBe(400);
    expect(invalidRole.status).toBe(400);
    expect(extraField.status).toBe(400);
    expect(extraPatch.status).toBe(400);
    expect(invalidEmail.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });
});

describe("project-members HTTP API persistence", () => {
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
      commentsRepository: new PrismaCommentsRepository(prisma),
      activityRepository: new PrismaActivityRepository(prisma),
      checklistsRepository: new PrismaChecklistsRepository(prisma),
      labelsRepository: new PrismaLabelsRepository(prisma),
      taskLabelsRepository: new PrismaTaskLabelsRepository(prisma),
      projectMembersRepository: new PrismaProjectMembersRepository(prisma),
      unitOfWork: new PrismaUnitOfWork(prisma),
    });
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "persists membership add, list, role change, and remove through Prisma",
    async () => {
      if (!app) {
        return;
      }

      const owner = await registerAgent(
        app,
        `member-api-owner-${randomUUID()}@example.com`,
        "Ada",
      );
      const editor = await registerAgent(
        app,
        `member-api-editor-${randomUUID()}@example.com`,
        "Grace",
      );
      const created = await owner.agent.post("/api/projects").send({
        name: "Roadmap",
      });
      const projectId = created.body.id as string;
      const added = await owner.agent
        .post(`/api/projects/${projectId}/members`)
        .send({ email: editor.user.email, role: "EDITOR" });
      const listed = await owner.agent.get(
        `/api/projects/${projectId}/members`,
      );
      const patched = await owner.agent
        .patch(`/api/projects/${projectId}/members/${editor.user.id}`)
        .send({ role: "VIEWER" });
      const removed = await owner.agent.delete(
        `/api/projects/${projectId}/members/${editor.user.id}`,
      );

      expect(added.status).toBe(201);
      expect(listed.status).toBe(200);
      expect(listed.body.members).toHaveLength(2);
      expect(patched.status).toBe(200);
      expect(patched.body.role).toBe("VIEWER");
      expect(removed.status).toBe(204);
      assertNoSecrets(added.body);
    },
  );
});
