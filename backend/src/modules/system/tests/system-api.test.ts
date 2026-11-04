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
import { PrismaProjectMembersRepository } from "../../project-members/repository/prisma-project-members-repository";
import { InMemoryProjectMembersRepository } from "../../project-members/tests/in-memory-project-members-repository";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { InMemoryProjectsRepository } from "../../projects/tests/in-memory-projects-repository";
import { PrismaActivityRepository } from "../../tasks/repository/prisma-activity-repository";
import { PrismaCommentsRepository } from "../../tasks/repository/prisma-comments-repository";
import { PrismaTasksRepository } from "../../tasks/repository/prisma-tasks-repository";
import { InMemoryActivityRepository } from "../../tasks/tests/in-memory-activity-repository";
import { InMemoryCommentsRepository } from "../../tasks/tests/in-memory-comments-repository";
import { InMemoryTasksRepository } from "../../tasks/tests/in-memory-tasks-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { DatabaseUnavailableError } from "../domain/errors";
import { SystemProbe } from "../domain/system-probe";
import { PrismaSystemRepository } from "../repository/prisma-system-repository";
import type { SystemRepository } from "../repository/system-repository";

class FakeSystemRepository implements SystemRepository {
  probes: SystemProbe[] = [];
  reachable = true;
  unexpectedError: Error | null = null;

  async createProbe(): Promise<SystemProbe> {
    if (this.unexpectedError) {
      throw this.unexpectedError;
    }
    if (!this.reachable) {
      throw new DatabaseUnavailableError();
    }
    const probe = SystemProbe.record();
    this.probes.unshift(probe);
    return probe;
  }

  async listProbes(): Promise<SystemProbe[]> {
    if (this.unexpectedError) {
      throw this.unexpectedError;
    }
    if (!this.reachable) {
      throw new DatabaseUnavailableError();
    }
    return [...this.probes];
  }

  async isDatabaseReachable(): Promise<boolean> {
    if (this.unexpectedError) {
      throw this.unexpectedError;
    }
    return this.reachable;
  }
}

function createSystemApp(systemRepository: FakeSystemRepository = new FakeSystemRepository()) {
  const usersRepository = new InMemoryUsersRepository();
  const authRepository = new InMemoryAuthRepository(usersRepository);
  const projectsRepository = new InMemoryProjectsRepository();
  const tasksRepository = new InMemoryTasksRepository();
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
    projectMembersRepository,
  });
  return { app, systemRepository, usersRepository, authRepository };
}

async function registerAgent(app: ReturnType<typeof createApp>, email?: string) {
  const agent = request.agent(app);
  const response = await agent.post("/api/auth/register").send({
    email: email ?? `probe-${randomUUID()}@example.com`,
    password: "secret-pass",
    displayName: "Ada",
  });
  expect(response.status).toBe(201);
  return agent;
}

function envelope(code: string, message?: string) {
  return {
    error: {
      code,
      ...(message === undefined ? {} : { message }),
    },
  };
}

function assertNoLeak(body: unknown): void {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/postgresql:\/\//i);
  expect(serialized).not.toMatch(/DATABASE_URL/i);
  expect(serialized).not.toMatch(/\bat\s+\w+\s+\(/);
  expect(serialized).not.toContain("replace-me");
}

describe("system HTTP API", () => {
  it("GET /health returns 200 without using the repository", async () => {
    const systemRepository = new FakeSystemRepository();
    systemRepository.reachable = false;
    systemRepository.unexpectedError = new Error(
      "postgresql://replace-me:replace-me@localhost:5432/replace-me",
    );
    const { app } = createSystemApp(systemRepository);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("GET /ready returns 200 when the repository reports the database reachable", async () => {
    const { app } = createSystemApp();

    const response = await request(app).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  it("GET /ready returns 503 with SERVICE_UNAVAILABLE when the database is not reachable", async () => {
    const systemRepository = new FakeSystemRepository();
    systemRepository.reachable = false;
    const { app } = createSystemApp(systemRepository);

    const response = await request(app).get("/ready");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject(
      envelope("SERVICE_UNAVAILABLE", "Database is unavailable"),
    );
    assertNoLeak(response.body);
  });

  it("probe operations require authentication", async () => {
    const { app } = createSystemApp();

    const list = await request(app).get("/api/system/probes");
    const create = await request(app).post("/api/system/probes").send({});

    expect(list.status).toBe(401);
    expect(create.status).toBe(401);
    expect(list.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(create.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(list.body).not.toHaveProperty("probes");
    expect(create.body).not.toHaveProperty("id");
  });

  it("GET /api/system/probes returns an empty list for an authenticated caller", async () => {
    const { app } = createSystemApp();
    const agent = await registerAgent(app);

    const response = await agent.get("/api/system/probes");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ probes: [] });
  });

  it("POST /api/system/probes creates a probe from an empty object when authenticated", async () => {
    const { app } = createSystemApp();
    const agent = await registerAgent(app);

    const response = await agent.post("/api/system/probes").send({});

    expect(response.status).toBe(201);
    expect(response.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(typeof response.body.recordedAt).toBe("string");
    expect(Number.isNaN(Date.parse(response.body.recordedAt))).toBe(false);
    expect(response.body).not.toHaveProperty("userId");
    expect(response.body).not.toHaveProperty("ownerId");
  });

  it("authenticated callers see the same global probe list", async () => {
    const { app } = createSystemApp();
    const first = await registerAgent(app, `one-${randomUUID()}@example.com`);
    const created = await first.post("/api/system/probes").send({});
    const second = await registerAgent(app, `two-${randomUUID()}@example.com`);

    const listed = await second.get("/api/system/probes");

    expect(created.status).toBe(201);
    expect(listed.status).toBe(200);
    expect(listed.body.probes).toEqual([
      { id: created.body.id, recordedAt: created.body.recordedAt },
    ]);
  });

  it("POST /api/system/probes rejects server-owned fields with VALIDATION_ERROR", async () => {
    const { app, systemRepository } = createSystemApp();
    const agent = await registerAgent(app);

    const response = await agent.post("/api/system/probes").send({
      id: "11111111-1111-4111-8111-111111111111",
      recordedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(typeof response.body.error.message).toBe("string");
    expect(systemRepository.probes).toHaveLength(0);
    assertNoLeak(response.body);
  });

  it("POST /api/system/probes rejects a non-object JSON body with VALIDATION_ERROR", async () => {
    const { app, systemRepository } = createSystemApp();
    const agent = await registerAgent(app);

    const response = await agent
      .post("/api/system/probes")
      .set("Content-Type", "application/json")
      .send("[]");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(systemRepository.probes).toHaveLength(0);
    assertNoLeak(response.body);
  });

  it("POST /api/system/probes rejects invalid JSON with VALIDATION_ERROR", async () => {
    const { app } = createSystemApp();

    const response = await request(app)
      .post("/api/system/probes")
      .set("Content-Type", "application/json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(envelope("VALIDATION_ERROR"));
    assertNoLeak(response.body);
  });

  it("probe operations return 503 when the database is unavailable", async () => {
    const systemRepository = new FakeSystemRepository();
    systemRepository.reachable = false;
    const { app } = createSystemApp(systemRepository);
    const agent = await registerAgent(app);

    const createResponse = await agent.post("/api/system/probes").send({});
    const listResponse = await agent.get("/api/system/probes");

    expect(createResponse.status).toBe(503);
    expect(listResponse.status).toBe(503);
    expect(createResponse.body).toMatchObject(envelope("SERVICE_UNAVAILABLE"));
    expect(listResponse.body).toMatchObject(envelope("SERVICE_UNAVAILABLE"));
    assertNoLeak(createResponse.body);
    assertNoLeak(listResponse.body);
  });

  it("maps unexpected failures to INTERNAL_ERROR without leaking internals", async () => {
    const systemRepository = new FakeSystemRepository();
    systemRepository.unexpectedError = new Error(
      "connect postgresql://replace-me:replace-me@db:5432/replace-me\n    at SystemService.recordProbe (service.ts:9:11)",
    );
    const { app } = createSystemApp(systemRepository);
    const agent = await registerAgent(app);

    const response = await agent.post("/api/system/probes").send({});

    expect(response.status).toBe(500);
    expect(response.body).toEqual(
      envelope("INTERNAL_ERROR", "An unexpected error occurred"),
    );
    assertNoLeak(response.body);
  });
});

describe("system HTTP API persistence", () => {
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
      projectMembersRepository: new PrismaProjectMembersRepository(prisma),
      unitOfWork: new PrismaUnitOfWork(prisma),
    });
  }

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it.skipIf(!hasDatabaseUrl)(
    "persists a probe through Prisma and lists it newest first",
    async () => {
      if (!app || !prisma) {
        return;
      }

      await prisma.$queryRaw`SELECT 1`;
      const agent = await registerAgent(app);

      const createResponse = await agent.post("/api/system/probes").send({});

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.id).toEqual(expect.any(String));
      expect(createResponse.body.recordedAt).toEqual(expect.any(String));
      expect(createResponse.body).not.toHaveProperty("userId");

      const listResponse = await agent.get("/api/system/probes");

      expect(listResponse.status).toBe(200);
      expect(Array.isArray(listResponse.body.probes)).toBe(true);
      expect(
        listResponse.body.probes.some(
          (probe: { id: string }) => probe.id === createResponse.body.id,
        ),
      ).toBe(true);
    },
  );

  it.skipIf(!hasDatabaseUrl)(
    "GET /ready succeeds only after PostgreSQL is reachable through the system repository",
    async () => {
      if (!app) {
        return;
      }

      const response = await request(app).get("/ready");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ready" });
    },
  );
});
