import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaAuthRepository } from "../../auth/repository/prisma-auth-repository";
import { InMemoryAuthRepository } from "../../auth/tests/in-memory-auth-repository";
import { PrismaSystemRepository } from "../../system/repository/prisma-system-repository";
import { DatabaseUnavailableError } from "../../system/domain/errors";
import { SystemProbe } from "../../system/domain/system-probe";
import type { SystemRepository } from "../../system/repository/system-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { PrismaTasksRepository } from "../../tasks/repository/prisma-tasks-repository";
import { InMemoryTasksRepository } from "../../tasks/tests/in-memory-tasks-repository";
import { PrismaProjectsRepository } from "../repository/prisma-projects-repository";
import { InMemoryProjectsRepository } from "./in-memory-projects-repository";

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

function createProjectsApp() {
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
  return { app, projectsRepository };
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

function assertPublicProject(
  body: unknown,
  expected: {
    ownerUserId: string;
    name: string;
    description: string | null;
    archived: boolean;
  },
): asserts body is {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: string;
  archivedAt: string | null;
} {
  expect(body).toEqual({
    id: expect.any(String),
    ownerUserId: expected.ownerUserId,
    name: expected.name,
    description: expected.description,
    createdAt: expect.any(String),
    archivedAt: expected.archived ? expect.any(String) : null,
  });
  const project = body as {
    id: string;
    ownerUserId: string;
    name: string;
    description: string | null;
    createdAt: string;
    archivedAt: string | null;
  };
  expect(project.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
  expect(Number.isNaN(Date.parse(project.createdAt))).toBe(false);
  if (expected.archived) {
    expect(project.archivedAt).not.toBeNull();
    expect(Number.isNaN(Date.parse(project.archivedAt ?? ""))).toBe(false);
  }
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("projects HTTP API", () => {
  it("creates a project with 201 and owner equal to the actor", async () => {
    const { app } = createProjectsApp();
    const { agent, user } = await registerAgent(app);

    const response = await agent.post("/api/projects").send({
      name: "Roadmap",
      description: "Q1 work",
    });

    expect(response.status).toBe(201);
    assertPublicProject(response.body, {
      ownerUserId: user.id,
      name: "Roadmap",
      description: "Q1 work",
      archived: false,
    });
    assertNoSecrets(response.body);
  });

  it("allows duplicate names for the same owner and another owner", async () => {
    const { app } = createProjectsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: other } = await registerAgent(
      app,
      `other-${randomUUID()}@example.com`,
    );

    const first = await owner.post("/api/projects").send({ name: "Shared" });
    const second = await owner.post("/api/projects").send({ name: "Shared" });
    const third = await other.post("/api/projects").send({ name: "Shared" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(201);
    expect(first.body.id).not.toBe(second.body.id);
    expect(third.body.id).not.toBe(first.body.id);
  });

  it("rejects invalid create bodies with 400 VALIDATION_ERROR", async () => {
    const { app, projectsRepository } = createProjectsApp();
    const { agent } = await registerAgent(app);

    const missingName = await agent.post("/api/projects").send({});
    const emptyName = await agent.post("/api/projects").send({ name: "  " });
    const unknownField = await agent.post("/api/projects").send({
      name: "Roadmap",
      extra: true,
    });
    const serverOwned = await agent.post("/api/projects").send({
      name: "Roadmap",
      id: missingId,
      ownerUserId: missingId,
      createdAt: "2026-01-01T00:00:00.000Z",
      archivedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(missingName.status).toBe(400);
    expect(emptyName.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(serverOwned.status).toBe(400);
    expect(missingName.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(emptyName.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(unknownField.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(serverOwned.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(projectsRepository.projectsById.size).toBe(0);
    assertNoSecrets(serverOwned.body);
  });

  it("stores omitted, null, and blank descriptions as null", async () => {
    const { app } = createProjectsApp();
    const { agent } = await registerAgent(app);

    const omitted = await agent.post("/api/projects").send({ name: "A" });
    const nullable = await agent.post("/api/projects").send({
      name: "B",
      description: null,
    });
    const blank = await agent.post("/api/projects").send({
      name: "C",
      description: "   ",
    });

    expect(omitted.status).toBe(201);
    expect(nullable.status).toBe(201);
    expect(blank.status).toBe(201);
    expect(omitted.body.description).toBeNull();
    expect(nullable.body.description).toBeNull();
    expect(blank.body.description).toBeNull();
  });

  it("returns 401 without a session cookie on protected project routes", async () => {
    const { app } = createProjectsApp();

    const create = await request(app).post("/api/projects").send({ name: "X" });
    const list = await request(app).get("/api/projects");
    const get = await request(app).get(`/api/projects/${missingId}`);
    const patch = await request(app)
      .patch(`/api/projects/${missingId}`)
      .send({ name: "X" });
    const archive = await request(app).post(`/api/projects/${missingId}/archive`);
    const unarchive = await request(app).post(
      `/api/projects/${missingId}/unarchive`,
    );

    expect(create.status).toBe(401);
    expect(list.status).toBe(401);
    expect(get.status).toBe(401);
    expect(patch.status).toBe(401);
    expect(archive.status).toBe(401);
    expect(unarchive.status).toBe(401);
    expect(create.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(list.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(get.body).not.toHaveProperty("id");
    expect(list.body).not.toHaveProperty("projects");
    assertNoSecrets(create.body);
  });

  it("lets the owner GET a project including after archive", async () => {
    const { app } = createProjectsApp();
    const { agent, user } = await registerAgent(app);
    const created = await agent.post("/api/projects").send({ name: "Roadmap" });
    const archived = await agent.post(`/api/projects/${created.body.id}/archive`);
    const found = await agent.get(`/api/projects/${created.body.id}`);

    expect(created.status).toBe(201);
    expect(archived.status).toBe(200);
    expect(found.status).toBe(200);
    assertPublicProject(found.body, {
      ownerUserId: user.id,
      name: "Roadmap",
      description: null,
      archived: true,
    });
    expect(found.body.archivedAt).toBe(archived.body.archivedAt);
  });

  it("returns 403 for a non-owner and leaves the project unchanged", async () => {
    const { app } = createProjectsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: other } = await registerAgent(
      app,
      `other-${randomUUID()}@example.com`,
    );
    const created = await owner.post("/api/projects").send({
      name: "Private",
      description: "Mine",
    });

    const get = await other.get(`/api/projects/${created.body.id}`);
    const patch = await other
      .patch(`/api/projects/${created.body.id}`)
      .send({ name: "Hacked" });
    const archive = await other.post(
      `/api/projects/${created.body.id}/archive`,
    );
    const unarchive = await other.post(
      `/api/projects/${created.body.id}/unarchive`,
    );
    const after = await owner.get(`/api/projects/${created.body.id}`);

    expect(get.status).toBe(403);
    expect(patch.status).toBe(403);
    expect(archive.status).toBe(403);
    expect(unarchive.status).toBe(403);
    expect(get.body).toMatchObject(envelope("FORBIDDEN"));
    expect(get.body).not.toHaveProperty("name");
    expect(after.body.name).toBe("Private");
    expect(after.body.description).toBe("Mine");
    expect(after.body.archivedAt).toBeNull();
    assertNoSecrets(get.body);
  });

  it("returns 404 NOT_FOUND for a missing project id", async () => {
    const { app } = createProjectsApp();
    const { agent } = await registerAgent(app);

    const get = await agent.get(`/api/projects/${missingId}`);
    const patch = await agent.patch(`/api/projects/${missingId}`).send({
      name: "Ghost",
    });
    const archive = await agent.post(`/api/projects/${missingId}/archive`);
    const unarchive = await agent.post(`/api/projects/${missingId}/unarchive`);

    expect(get.status).toBe(404);
    expect(patch.status).toBe(404);
    expect(archive.status).toBe(404);
    expect(unarchive.status).toBe(404);
    expect(get.body).toMatchObject(envelope("NOT_FOUND"));
    expect(patch.body).toMatchObject(envelope("NOT_FOUND"));
    assertNoSecrets(get.body);
  });

  it("rejects a non-UUID project id with 400", async () => {
    const { app } = createProjectsApp();
    const { agent } = await registerAgent(app);

    const response = await agent.get("/api/projects/not-a-uuid");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });

  it("lists only the actor's active projects and returns 200 when empty", async () => {
    const { app } = createProjectsApp();
    const { agent: owner } = await registerAgent(app);
    const { agent: other } = await registerAgent(
      app,
      `other-${randomUUID()}@example.com`,
    );
    const { agent: empty } = await registerAgent(
      app,
      `empty-${randomUUID()}@example.com`,
    );

    const first = await owner.post("/api/projects").send({ name: "Keep" });
    const archived = await owner.post("/api/projects").send({ name: "Hide" });
    await owner.post(`/api/projects/${archived.body.id}/archive`);
    await other.post("/api/projects").send({ name: "Other" });

    const listed = await owner.get("/api/projects");
    const listedWithIgnoredFilter = await owner.get(
      "/api/projects?includeArchived=true",
    );
    const emptyList = await empty.get("/api/projects");

    expect(first.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(listed.body.projects).toEqual([
      expect.objectContaining({ id: first.body.id, name: "Keep" }),
    ]);
    expect(
      listed.body.projects.some(
        (project: { id: string }) => project.id === archived.body.id,
      ),
    ).toBe(false);
    expect(listedWithIgnoredFilter.body.projects).toHaveLength(1);
    expect(emptyList.status).toBe(200);
    expect(emptyList.body).toEqual({ projects: [] });
    assertNoSecrets(listed.body);
  });

  it("PATCHes name and description without changing owner or archive state", async () => {
    const { app } = createProjectsApp();
    const { agent, user } = await registerAgent(app);
    const created = await agent.post("/api/projects").send({
      name: "Roadmap",
      description: "First",
    });

    const patched = await agent.patch(`/api/projects/${created.body.id}`).send({
      name: "Platform",
      description: "Second",
    });
    const emptyPatch = await agent.patch(`/api/projects/${created.body.id}`).send({});
    const rejected = await agent.patch(`/api/projects/${created.body.id}`).send({
      name: "Nope",
      ownerUserId: missingId,
      id: missingId,
      createdAt: "2020-01-01T00:00:00.000Z",
      archivedAt: "2020-01-01T00:00:00.000Z",
    });
    const after = await agent.get(`/api/projects/${created.body.id}`);

    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe("Platform");
    expect(patched.body.description).toBe("Second");
    expect(patched.body.ownerUserId).toBe(user.id);
    expect(patched.body.id).toBe(created.body.id);
    expect(patched.body.createdAt).toBe(created.body.createdAt);
    expect(patched.body.archivedAt).toBeNull();
    expect(emptyPatch.status).toBe(400);
    expect(rejected.status).toBe(400);
    expect(emptyPatch.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(rejected.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(after.body.ownerUserId).toBe(user.id);
    expect(after.body.name).toBe("Platform");
  });

  it("rejects PATCH of an archived project with 409 CONFLICT", async () => {
    const { app } = createProjectsApp();
    const { agent } = await registerAgent(app);
    const created = await agent.post("/api/projects").send({
      name: "Roadmap",
      description: "First",
    });
    const archived = await agent.post(`/api/projects/${created.body.id}/archive`);
    const patched = await agent.patch(`/api/projects/${created.body.id}`).send({
      name: "Blocked",
    });
    const after = await agent.get(`/api/projects/${created.body.id}`);

    expect(archived.status).toBe(200);
    expect(patched.status).toBe(409);
    expect(patched.body).toMatchObject(envelope("CONFLICT"));
    expect(after.body.name).toBe("Roadmap");
    expect(after.body.description).toBe("First");
    expect(after.body.archivedAt).toBe(archived.body.archivedAt);
    assertNoSecrets(patched.body);
  });

  it("archives and unarchives idempotently and restores PATCH and list", async () => {
    const { app } = createProjectsApp();
    const { agent } = await registerAgent(app);
    const created = await agent.post("/api/projects").send({ name: "Roadmap" });

    const firstArchive = await agent.post(
      `/api/projects/${created.body.id}/archive`,
    );
    const secondArchive = await agent.post(
      `/api/projects/${created.body.id}/archive`,
    );
    const listedWhileArchived = await agent.get("/api/projects");
    const firstUnarchive = await agent.post(
      `/api/projects/${created.body.id}/unarchive`,
    );
    const secondUnarchive = await agent.post(
      `/api/projects/${created.body.id}/unarchive`,
    );
    const patched = await agent.patch(`/api/projects/${created.body.id}`).send({
      description: "Restored",
    });
    const listedAfter = await agent.get("/api/projects");

    expect(firstArchive.status).toBe(200);
    expect(secondArchive.status).toBe(200);
    expect(secondArchive.body.archivedAt).toBe(firstArchive.body.archivedAt);
    expect(listedWhileArchived.body.projects).toEqual([]);
    expect(firstUnarchive.status).toBe(200);
    expect(firstUnarchive.body.archivedAt).toBeNull();
    expect(secondUnarchive.status).toBe(200);
    expect(secondUnarchive.body.archivedAt).toBeNull();
    expect(patched.status).toBe(200);
    expect(patched.body.description).toBe("Restored");
    expect(listedAfter.body.projects).toEqual([
      expect.objectContaining({ id: created.body.id, archivedAt: null }),
    ]);
  });

  it("rejects unexpected archive and unarchive body fields", async () => {
    const { app } = createProjectsApp();
    const { agent } = await registerAgent(app);
    const created = await agent.post("/api/projects").send({ name: "Roadmap" });

    const archive = await agent
      .post(`/api/projects/${created.body.id}/archive`)
      .send({ archivedAt: "2026-01-01T00:00:00.000Z" });
    const unarchive = await agent
      .post(`/api/projects/${created.body.id}/unarchive`)
      .send({ archivedAt: null });

    expect(archive.status).toBe(400);
    expect(unarchive.status).toBe(400);
    expect(archive.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(unarchive.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });
});

describe("projects HTTP API persistence", () => {
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
    "persists owner, duplicate names, archive, and unarchive through Prisma",
    async () => {
      if (!app) {
        return;
      }

      const { agent, user } = await registerAgent(app);
      const first = await agent.post("/api/projects").send({
        name: "Shared",
        description: "One",
      });
      const second = await agent.post("/api/projects").send({ name: "Shared" });
      const archived = await agent.post(
        `/api/projects/${first.body.id}/archive`,
      );
      const listed = await agent.get("/api/projects");
      const found = await agent.get(`/api/projects/${first.body.id}`);
      const unarchived = await agent.post(
        `/api/projects/${first.body.id}/unarchive`,
      );

      expect(first.status).toBe(201);
      expect(first.body.ownerUserId).toBe(user.id);
      expect(second.status).toBe(201);
      expect(archived.status).toBe(200);
      expect(archived.body.archivedAt).not.toBeNull();
      expect(
        listed.body.projects.some(
          (project: { id: string }) => project.id === first.body.id,
        ),
      ).toBe(false);
      expect(found.status).toBe(200);
      expect(found.body.archivedAt).toBe(archived.body.archivedAt);
      expect(unarchived.body.archivedAt).toBeNull();
      assertNoSecrets(first.body);
    },
  );
});
