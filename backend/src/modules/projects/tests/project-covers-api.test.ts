import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../../app";
import { InMemoryAuthRepository } from "../../auth/tests/in-memory-auth-repository";
import { InMemoryProjectMembersRepository } from "../../project-members/tests/in-memory-project-members-repository";
import { DatabaseUnavailableError } from "../../system/domain/errors";
import { SystemProbe } from "../../system/domain/system-probe";
import type { SystemRepository } from "../../system/repository/system-repository";
import { InMemoryAttachmentStorage } from "../../tasks/tests/in-memory-attachment-storage";
import { InMemoryAttachmentsRepository } from "../../tasks/tests/in-memory-attachments-repository";
import { InMemoryActivityRepository } from "../../tasks/tests/in-memory-activity-repository";
import { InMemoryChecklistsRepository } from "../../tasks/tests/in-memory-checklists-repository";
import { InMemoryCommentsRepository } from "../../tasks/tests/in-memory-comments-repository";
import { InMemoryLabelsRepository } from "../../tasks/tests/in-memory-labels-repository";
import { InMemoryStatusesRepository } from "../../tasks/tests/in-memory-statuses-repository";
import { InMemoryTaskLabelsRepository } from "../../tasks/tests/in-memory-task-labels-repository";
import { InMemoryTasksRepository } from "../../tasks/tests/in-memory-tasks-repository";
import { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";
import { InMemoryProjectBoardBackgroundStorage } from "./in-memory-project-board-background-storage";
import { InMemoryProjectBoardBackgroundsRepository } from "./in-memory-project-board-backgrounds-repository";
import { InMemoryProjectCoverStorage } from "./in-memory-project-cover-storage";
import { InMemoryProjectCoversRepository } from "./in-memory-project-covers-repository";
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

function createCoversApp() {
  const usersRepository = new InMemoryUsersRepository();
  const authRepository = new InMemoryAuthRepository(usersRepository);
  const systemRepository = new FakeSystemRepository();
  const projectsRepository = new InMemoryProjectsRepository();
  const projectCoversRepository = new InMemoryProjectCoversRepository();
  const projectCoverStorage = new InMemoryProjectCoverStorage();
  const projectBoardBackgroundsRepository =
    new InMemoryProjectBoardBackgroundsRepository();
  const projectBoardBackgroundStorage =
    new InMemoryProjectBoardBackgroundStorage();
  const labelsRepository = new InMemoryLabelsRepository();
  const taskLabelsRepository = new InMemoryTaskLabelsRepository(labelsRepository);
  const tasksRepository = new InMemoryTasksRepository(taskLabelsRepository.joins);
  const statusesRepository = new InMemoryStatusesRepository(tasksRepository);
  const projectMembersRepository = new InMemoryProjectMembersRepository();
  const app = createApp({
    corsOrigin: "http://localhost:5173",
    systemRepository,
    usersRepository,
    authRepository,
    projectsRepository,
    projectCoversRepository,
    projectCoverStorage,
    projectBoardBackgroundsRepository,
    projectBoardBackgroundStorage,
    tasksRepository,
    commentsRepository: new InMemoryCommentsRepository(),
    activityRepository: new InMemoryActivityRepository(),
    checklistsRepository: new InMemoryChecklistsRepository(),
    attachmentsRepository: new InMemoryAttachmentsRepository(tasksRepository),
    attachmentStorage: new InMemoryAttachmentStorage(),
    labelsRepository,
    taskLabelsRepository,
    statusesRepository,
    projectMembersRepository,
  });
  return { app, projectCoversRepository, projectCoverStorage };
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
  return response.body as {
    id: string;
    name: string;
    cover: { id: string; contentType: string } | null;
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
  expect(serialized).not.toMatch(/PROJECT_COVERS_ROOT/i);
  expect(serialized).not.toMatch(/ATTACHMENTS_ROOT/i);
  expect(serialized).not.toMatch(/\bat\s+\w+\s+\(/);
}

function pngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

const missingId = "99999999-9999-4999-8999-999999999999";

describe("project covers HTTP API", () => {
  it("uploads, serves private content, and exposes cover summary on project DTO (AC-001/AC-002)", async () => {
    const { app, projectCoverStorage } = createCoversApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);
    expect(project.cover).toBeNull();

    const uploaded = await agent
      .put(`/api/projects/${project.id}/cover`)
      .attach("file", pngBuffer(), {
        filename: "hero.png",
        contentType: "image/png",
      });
    expect(uploaded.status).toBe(200);
    expect(uploaded.body.cover).toMatchObject({
      id: expect.any(String),
      contentType: "image/png",
    });
    assertNoSecrets(uploaded.body);

    const content = await agent.get(
      `/api/projects/${project.id}/cover/content`,
    );
    expect(content.status).toBe(200);
    expect(content.headers["cache-control"]).toMatch(/private/i);
    expect(content.headers["content-type"]).toMatch(/image\/png/i);
    expect(Buffer.from(content.body)).toEqual(pngBuffer());

    const got = await agent.get(`/api/projects/${project.id}`);
    expect(got.status).toBe(200);
    expect(got.body.cover).toEqual(uploaded.body.cover);

    const listed = await agent.get("/api/projects");
    expect(listed.status).toBe(200);
    expect(listed.body.projects[0].cover).toEqual(uploaded.body.cover);

    expect(
      await projectCoverStorage.exists(
        `${project.id}/${uploaded.body.cover.id}`,
      ),
    ).toBe(true);
  });

  it("enforces VIEWER read-only and isolation (AC-003/AC-006)", async () => {
    const { app } = createCoversApp();
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
    const uploaded = await owner
      .put(`/api/projects/${project.id}/cover`)
      .attach("file", pngBuffer(), {
        filename: "a.png",
        contentType: "image/png",
      });
    expect(uploaded.status).toBe(200);

    const guest = request(app);
    expect(
      (await guest.get(`/api/projects/${project.id}/cover/content`)).status,
    ).toBe(401);

    expect(
      (await viewer.get(`/api/projects/${project.id}/cover/content`)).status,
    ).toBe(200);
    expect(
      (
        await viewer
          .put(`/api/projects/${project.id}/cover`)
          .attach("file", pngBuffer(), {
            filename: "b.png",
            contentType: "image/png",
          })
      ).status,
    ).toBe(403);
    expect(
      (await viewer.delete(`/api/projects/${project.id}/cover`)).status,
    ).toBe(403);
    expect(
      (await stranger.get(`/api/projects/${project.id}/cover/content`)).status,
    ).toBe(403);
    expect(
      (await owner.get(`/api/projects/${missingId}/cover/content`)).status,
    ).toBe(404);
  });

  it("rejects invalid types and clears cover metadata+blob (AC-004/AC-005)", async () => {
    const { app, projectCoversRepository, projectCoverStorage } =
      createCoversApp();
    const { agent } = await registerAgent(app);
    const project = await createOwnedProject(agent);

    const exe = await agent
      .put(`/api/projects/${project.id}/cover`)
      .attach("file", Buffer.from([0x4d, 0x5a, 0x90, 0x00]), {
        filename: "bad.exe",
        contentType: "application/octet-stream",
      });
    expect(exe.status).toBe(400);
    expect(exe.body).toMatchObject(envelope("VALIDATION_ERROR"));
    expect(await projectCoversRepository.findByProjectId(project.id)).toBeNull();

    const uploaded = await agent
      .put(`/api/projects/${project.id}/cover`)
      .attach("file", pngBuffer(), {
        filename: "ok.png",
        contentType: "image/png",
      });
    expect(uploaded.status).toBe(200);
    const coverId = uploaded.body.cover.id as string;

    const cleared = await agent.delete(`/api/projects/${project.id}/cover`);
    expect(cleared.status).toBe(204);
    expect(await projectCoversRepository.findByProjectId(project.id)).toBeNull();
    expect(await projectCoverStorage.exists(`${project.id}/${coverId}`)).toBe(
      false,
    );

    const after = await agent.get(`/api/projects/${project.id}`);
    expect(after.body.cover).toBeNull();
  });

  it("maps archived mutate like project PATCH (OWNER 409 / EDITOR 403)", async () => {
    const { app } = createCoversApp();
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
    await owner
      .put(`/api/projects/${project.id}/cover`)
      .attach("file", pngBuffer(), {
        filename: "a.png",
        contentType: "image/png",
      });

    const archive = await owner.post(`/api/projects/${project.id}/archive`);
    expect(archive.status).toBe(200);

    const ownerUpload = await owner
      .put(`/api/projects/${project.id}/cover`)
      .attach("file", pngBuffer(), {
        filename: "b.png",
        contentType: "image/png",
      });
    expect(ownerUpload.status).toBe(409);
    expect(ownerUpload.body).toMatchObject(envelope("CONFLICT"));

    const editorUpload = await editor
      .put(`/api/projects/${project.id}/cover`)
      .attach("file", pngBuffer(), {
        filename: "c.png",
        contentType: "image/png",
      });
    expect(editorUpload.status).toBe(403);

    expect(
      (await owner.get(`/api/projects/${project.id}/cover/content`)).status,
    ).toBe(200);
  });
});
