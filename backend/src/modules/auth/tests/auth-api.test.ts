import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { loadConfig } from "../../../config/config";
import { loadEnvFiles } from "../../../config/env";
import { createPrismaClient } from "../../../infrastructure/prisma/client";
import { PrismaUnitOfWork } from "../../../infrastructure/prisma/prisma-unit-of-work";
import { PrismaAuthRepository } from "../repository/prisma-auth-repository";
import { PrismaSystemRepository } from "../../system/repository/prisma-system-repository";
import { DatabaseUnavailableError } from "../../system/domain/errors";
import { SystemProbe } from "../../system/domain/system-probe";
import type { SystemRepository } from "../../system/repository/system-repository";
import { PrismaProjectMembersRepository } from "../../project-members/repository/prisma-project-members-repository";
import { InMemoryProjectMembersRepository } from "../../project-members/tests/in-memory-project-members-repository";
import { PrismaProjectsRepository } from "../../projects/repository/prisma-projects-repository";
import { InMemoryProjectsRepository } from "../../projects/tests/in-memory-projects-repository";
import { PrismaActivityRepository } from "../../tasks/repository/prisma-activity-repository";
import { PrismaChecklistsRepository } from "../../tasks/repository/prisma-checklists-repository";
import { PrismaCommentsRepository } from "../../tasks/repository/prisma-comments-repository";
import { PrismaTasksRepository } from "../../tasks/repository/prisma-tasks-repository";
import { PrismaLabelsRepository } from "../../tasks/repository/prisma-labels-repository";
import { PrismaTaskLabelsRepository } from "../../tasks/repository/prisma-task-labels-repository";
import { InMemoryActivityRepository } from "../../tasks/tests/in-memory-activity-repository";
import { PrismaAttachmentsRepository } from "../../tasks/repository/prisma-attachments-repository";
import { InMemoryAttachmentStorage } from "../../tasks/tests/in-memory-attachment-storage";
import { InMemoryAttachmentsRepository } from "../../tasks/tests/in-memory-attachments-repository";
import { InMemoryChecklistsRepository } from "../../tasks/tests/in-memory-checklists-repository";
import { InMemoryCommentsRepository } from "../../tasks/tests/in-memory-comments-repository";
import { InMemoryLabelsRepository } from "../../tasks/tests/in-memory-labels-repository";
import { InMemoryTaskLabelsRepository } from "../../tasks/tests/in-memory-task-labels-repository";
import { InMemoryTasksRepository } from "../../tasks/tests/in-memory-tasks-repository";
import { PrismaUsersRepository } from "../../users/repository/prisma-users-repository";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { AuthSession } from "../domain/auth-session";
import { SESSION_COOKIE_NAME } from "../http/session-cookie";
import { InMemoryAuthRepository } from "./in-memory-auth-repository";

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

function createMemoryApp() {
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
  return { app, usersRepository, authRepository, systemRepository };
}

function envelope(code: string, message?: string) {
  return {
    error: {
      code,
      ...(message === undefined ? {} : { message }),
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

function firstSetCookie(response: { headers: { [key: string]: unknown } }): string {
  const header = response.headers["set-cookie"];
  const cookies = Array.isArray(header) ? header : header ? [String(header)] : [];
  expect(cookies.length).toBeGreaterThan(0);
  return String(cookies[0]);
}

function assertSessionCookie(cookie: string): void {
  expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`));
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toMatch(/Path=\//);
  expect(cookie).toMatch(/SameSite=Lax/i);
  expect(cookie).toMatch(/Max-Age=604800/);
  expect(cookie).not.toMatch(/;\s*Secure/i);
}

function cookieHeader(setCookie: string): string {
  return setCookie.split(";")[0] ?? setCookie;
}

const registerBody = {
  email: "ada@example.com",
  password: "secret-pass",
  displayName: "Ada",
};

describe("auth and users HTTP API", () => {
  it("registers with 201, issues an HttpOnly session cookie, and omits secrets", async () => {
    const { app } = createMemoryApp();

    const response = await request(app).post("/api/auth/register").send(registerBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      email: "ada@example.com",
      displayName: "Ada",
    });
    assertSessionCookie(firstSetCookie(response));
    assertNoSecrets(response.body);
  });

  it("also authenticates on register so GET /api/users/me succeeds", async () => {
    const { app } = createMemoryApp();
    const agent = request.agent(app);

    const registered = await agent.post("/api/auth/register").send(registerBody);
    const me = await agent.get("/api/users/me");

    expect(registered.status).toBe(201);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({
      id: registered.body.id,
      email: "ada@example.com",
      displayName: "Ada",
    });
    assertNoSecrets(me.body);
  });

  it("rejects a duplicate email including a different letter case with 409 CONFLICT", async () => {
    const { app } = createMemoryApp();
    await request(app).post("/api/auth/register").send(registerBody);

    const response = await request(app).post("/api/auth/register").send({
      ...registerBody,
      email: "ADA@example.com",
      displayName: "Other",
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(envelope("CONFLICT"));
    assertNoSecrets(response.body);
  });

  it("rejects missing, empty, and invalid registration fields with 400", async () => {
    const { app } = createMemoryApp();

    const missing = await request(app).post("/api/auth/register").send({});
    const empty = await request(app).post("/api/auth/register").send({
      email: " ",
      password: " ",
      displayName: " ",
    });
    const invalidEmail = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "secret-pass",
      displayName: "Ada",
    });

    expect(missing.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(invalidEmail.status).toBe(400);
    expect(missing.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(empty.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(invalidEmail.body).toMatchObject(envelope("VALIDATION_ERROR"));
  });

  it("logs in with 200, a session cookie, and no bearer token", async () => {
    const { app } = createMemoryApp();
    await request(app).post("/api/auth/register").send(registerBody);

    const response = await request(app).post("/api/auth/login").send({
      email: "ADA@example.com",
      password: "secret-pass",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      email: "ada@example.com",
      displayName: "Ada",
    });
    assertSessionCookie(firstSetCookie(response));
    assertNoSecrets(response.body);
  });

  it("returns the same generic INVALID_CREDENTIALS for unknown email and wrong password", async () => {
    const { app } = createMemoryApp();
    await request(app).post("/api/auth/register").send(registerBody);

    const unknown = await request(app).post("/api/auth/login").send({
      email: "missing@example.com",
      password: "secret-pass",
    });
    const wrong = await request(app).post("/api/auth/login").send({
      email: "ada@example.com",
      password: "wrong-pass",
    });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(unknown.body).toEqual(
      envelope("INVALID_CREDENTIALS", "Invalid email or password"),
    );
    assertNoSecrets(unknown.body);
    assertNoSecrets(wrong.body);
  });

  it("returns 401 UNAUTHENTICATED without a session cookie", async () => {
    const { app } = createMemoryApp();

    const me = await request(app).get("/api/users/me");
    const logout = await request(app).post("/api/auth/logout");
    const probes = await request(app).get("/api/system/probes");

    expect(me.status).toBe(401);
    expect(logout.status).toBe(401);
    expect(probes.status).toBe(401);
    expect(me.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(logout.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(probes.body).toMatchObject(envelope("UNAUTHENTICATED"));
  });

  it("returns 401 for malformed and unknown session cookies", async () => {
    const { app } = createMemoryApp();

    const malformed = await request(app)
      .get("/api/users/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=not-a-session`);
    const unknown = await request(app)
      .get("/api/users/me")
      .set(
        "Cookie",
        `${SESSION_COOKIE_NAME}=11111111-1111-4111-8111-111111111111`,
      );

    expect(malformed.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(malformed.body).toMatchObject(envelope("UNAUTHENTICATED"));
    expect(unknown.body).toMatchObject(envelope("UNAUTHENTICATED"));
  });

  it("returns the own profile and updates displayName only", async () => {
    const { app } = createMemoryApp();
    const agent = request.agent(app);
    const registered = await agent.post("/api/auth/register").send(registerBody);

    const me = await agent.get("/api/users/me");
    const patched = await agent.patch("/api/users/me").send({
      displayName: "Ada Lovelace",
    });
    const after = await agent.get("/api/users/me");

    expect(me.status).toBe(200);
    expect(patched.status).toBe(200);
    expect(patched.body).toEqual({
      id: registered.body.id,
      email: "ada@example.com",
      displayName: "Ada Lovelace",
    });
    expect(after.body.displayName).toBe("Ada Lovelace");
    expect(after.body.email).toBe("ada@example.com");
    assertNoSecrets(patched.body);
  });

  it("rejects PATCH bodies that include email or unknown fields", async () => {
    const { app } = createMemoryApp();
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(registerBody);

    const withEmail = await agent.patch("/api/users/me").send({
      displayName: "Ada Lovelace",
      email: "other@example.com",
    });
    const unknownField = await agent.patch("/api/users/me").send({
      displayName: "Ada Lovelace",
      role: "admin",
    });

    expect(withEmail.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(withEmail.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(unknownField.body).toMatchObject(envelope("VALIDATION_ERROR"));

    const me = await agent.get("/api/users/me");
    expect(me.body.email).toBe("ada@example.com");
    expect(me.body.displayName).toBe("Ada");
  });

  it("logs out with 204, clears the cookie, and revokes only that session", async () => {
    const { app } = createMemoryApp();
    const first = await request(app).post("/api/auth/register").send(registerBody);
    const second = await request(app).post("/api/auth/login").send({
      email: registerBody.email,
      password: registerBody.password,
    });
    const cookie1 = cookieHeader(firstSetCookie(first));
    const cookie2 = cookieHeader(firstSetCookie(second));

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookie1);

    expect(logout.status).toBe(204);
    expect(logout.text).toBe("");
    const cleared = firstSetCookie(logout);
    expect(cleared).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=`));
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);

    const afterLogout = await request(app)
      .get("/api/users/me")
      .set("Cookie", cookie1);
    const otherSession = await request(app)
      .get("/api/users/me")
      .set("Cookie", cookie2);

    expect(afterLogout.status).toBe(401);
    expect(otherSession.status).toBe(200);
    expect(otherSession.body.id).toBe(first.body.id);
  });

  it("rejects an expired session as 401 UNAUTHENTICATED", async () => {
    const { app, authRepository, usersRepository } = createMemoryApp();
    const user = await usersRepository.create({
      email: "ada@example.com",
      displayName: "Ada",
    });
    const expired = AuthSession.rehydrate(
      "33333333-3333-4333-8333-333333333333",
      user.id,
      new Date("2020-01-01T00:00:00.000Z"),
      new Date("2020-01-08T00:00:00.000Z"),
      null,
    );
    authRepository.putSession(expired);

    const response = await request(app)
      .get("/api/users/me")
      .set("Cookie", `${SESSION_COOKIE_NAME}=${expired.id}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(envelope("UNAUTHENTICATED"));
    assertNoSecrets(response.body);
  });

  it("allows CORS from the configured origin with credentials and never *", async () => {
    const { app } = createMemoryApp();

    const response = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-origin"]).not.toBe("*");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });
});

describe("auth HTTP API persistence", () => {
  loadEnvFiles();
  process.env.CORS_ORIGIN ??= "http://localhost:5173";
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  let prisma: ReturnType<typeof createPrismaClient> | null = null;
  let app: ReturnType<typeof createApp> | null = null;

  if (hasDatabaseUrl) {
    process.env.ATTACHMENTS_ROOT ??= "./data/attachments-test";
    prisma = createPrismaClient(loadConfig().databaseUrl);
    const tasksRepository = new PrismaTasksRepository(prisma);
    app = createApp({
      corsOrigin: process.env.CORS_ORIGIN,
      systemRepository: new PrismaSystemRepository(prisma),
      usersRepository: new PrismaUsersRepository(prisma),
      authRepository: new PrismaAuthRepository(prisma),
      projectsRepository: new PrismaProjectsRepository(prisma),
      tasksRepository,
      commentsRepository: new PrismaCommentsRepository(prisma),
      activityRepository: new PrismaActivityRepository(prisma),
      checklistsRepository: new PrismaChecklistsRepository(prisma),
      attachmentsRepository: new PrismaAttachmentsRepository(prisma),
      attachmentStorage: new InMemoryAttachmentStorage(),
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
    "registers against PostgreSQL, sets a session cookie, and reads the profile",
    async () => {
      if (!app) {
        return;
      }

      const email = `api-${randomUUID()}@example.com`;
      const agent = request.agent(app);
      const registered = await agent.post("/api/auth/register").send({
        email,
        password: "secret-pass",
        displayName: "Ada",
      });
      const me = await agent.get("/api/users/me");

      expect(registered.status).toBe(201);
      assertSessionCookie(firstSetCookie(registered));
      expect(me.status).toBe(200);
      expect(me.body.email).toBe(email);
      assertNoSecrets(registered.body);
      assertNoSecrets(me.body);
    },
  );
});
