import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import {
  ApiError,
  archiveProject,
  createProbe,
  createProject,
  createTask,
  addMember,
  getDashboard,
  getHealth,
  getProfile,
  getProject,
  getTask,
  listMembers,
  listProbes,
  listProjects,
  listTasks,
  login,
  logout,
  register,
  removeMember,
  softDeleteTask,
  unarchiveProject,
  updateMember,
  updateProfile,
  updateProject,
  updateTask,
} from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function expectCredentialsInclude(init?: RequestInit): void {
  expect(init?.credentials).toBe("include");
}

function expectNoAuthorizationHeader(init?: RequestInit): void {
  const headers = init?.headers;
  if (headers === undefined) {
    return;
  }
  if (headers instanceof Headers) {
    expect(headers.get("Authorization")).toBeNull();
    return;
  }
  const record = headers as Record<string, string>;
  expect(record.Authorization).toBeUndefined();
  expect(record.authorization).toBeUndefined();
}

function expectNoTokenStorage(): void {
  expectNoSessionTokenStorage();
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("system API client", () => {
  it("lists probes from VITE_API_URL with credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/system/probes");
      expect(url).not.toContain("db");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, { probes: [] });
    });

    await expect(listProbes()).resolves.toEqual({ probes: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("creates a probe with an empty JSON object and credentials included", async () => {
    const created = {
      id: "probe-1",
      recordedAt: "2026-10-26T17:00:00.000Z",
    };
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/system/probes");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe("{}");
      expectCredentialsInclude(init);
      return jsonResponse(201, created);
    });

    await expect(createProbe()).resolves.toEqual(created);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reads liveness from GET /health with credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/health");
      expectCredentialsInclude(init);
      return jsonResponse(200, { status: "ok" });
    });

    await expect(getHealth()).resolves.toEqual({ status: "ok" });
  });

  it("maps the error envelope to ApiError", async () => {
    mockFetch(() =>
      jsonResponse(503, {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        },
      }),
    );

    const error = await listProbes().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Database is unavailable",
    });
    expect(JSON.stringify(error)).not.toMatch(/DATABASE_URL/i);
    expect(JSON.stringify(error)).not.toMatch(/postgresql:\/\//i);
  });
});

describe("auth and profile API client", () => {
  const publicUser = {
    id: "user-1",
    email: "ada@example.com",
    displayName: "Ada",
  };

  it("registers at VITE_API_URL, sends credentials, and keeps only the public user", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/register");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          email: "Ada@Example.com",
          password: "secret",
          displayName: "Ada",
        }),
      );
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(201, {
        ...publicUser,
        token: "must-not-be-kept",
        sessionId: "must-not-be-kept",
      });
    });

    await expect(
      register({
        email: "Ada@Example.com",
        password: "secret",
        displayName: "Ada",
      }),
    ).resolves.toEqual(publicUser);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("logs in with credentials included and does not keep a bearer token", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/login");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({ email: "ada@example.com", password: "secret" }),
      );
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, publicUser);
    });

    const user = await login({ email: "ada@example.com", password: "secret" });
    expect(user).toEqual(publicUser);
    expect(user).not.toHaveProperty("token");
    expect(user).not.toHaveProperty("sessionId");
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("logs out with an empty POST body, credentials included, and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/logout");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeUndefined();
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return emptyResponse(204);
    });

    await expect(logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("reads the current profile with credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/users/me");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, publicUser);
    });

    await expect(getProfile()).resolves.toEqual(publicUser);
    expectNoTokenStorage();
  });

  it("patches displayName only with credentials included", async () => {
    const updated = { ...publicUser, displayName: "Ada Lovelace" };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/users/me");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(JSON.stringify({ displayName: "Ada Lovelace" }));
      expectCredentialsInclude(init);
      return jsonResponse(200, updated);
    });

    await expect(updateProfile({ displayName: "Ada Lovelace" })).resolves.toEqual(
      updated,
    );
    expectNoTokenStorage();
  });

  it("maps unauthenticated profile access to ApiError without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await getProfile().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });
});

describe("projects API client", () => {
  const project = {
    id: "proj-1",
    ownerUserId: "user-1",
    name: "Alpha",
    description: "First project",
    createdAt: "2026-10-27T18:00:00.000Z",
    archivedAt: null as string | null,
  };

  it("creates a project at VITE_API_URL with credentials included and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects");
      expect(url).not.toContain("db");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({ name: "Alpha", description: "First project" }),
      );
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(201, {
        ...project,
        token: "must-not-be-kept",
        sessionId: "must-not-be-kept",
      });
    });

    await expect(
      createProject({ name: "Alpha", description: "First project" }),
    ).resolves.toEqual(project);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("lists projects without includeArchived and keeps only public fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects");
      expect(url).not.toMatch(/includeArchived/i);
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        projects: [{ ...project, token: "must-not-be-kept" }],
      });
    });

    await expect(listProjects()).resolves.toEqual({ projects: [project] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("reads a project by id with credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, project);
    });

    await expect(getProject("proj-1")).resolves.toEqual(project);
    expectNoTokenStorage();
  });

  it("patches name and description with credentials included", async () => {
    const updated = { ...project, name: "Beta", description: null };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(
        JSON.stringify({ name: "Beta", description: null }),
      );
      expectCredentialsInclude(init);
      return jsonResponse(200, updated);
    });

    await expect(
      updateProject("proj-1", { name: "Beta", description: null }),
    ).resolves.toEqual(updated);
    expectNoTokenStorage();
  });

  it("archives with POST, empty JSON object, and never DELETE", async () => {
    const archived = { ...project, archivedAt: "2026-10-27T19:00:00.000Z" };
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/archive");
      expect(init?.method).toBe("POST");
      expect(init?.method).not.toBe("DELETE");
      expect(init?.body).toBe("{}");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, archived);
    });

    await expect(archiveProject("proj-1")).resolves.toEqual(archived);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("unarchives with POST and credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/unarchive");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe("{}");
      expectCredentialsInclude(init);
      return jsonResponse(200, project);
    });

    await expect(unarchiveProject("proj-1")).resolves.toEqual(project);
    expectNoTokenStorage();
  });

  it("maps unauthenticated project access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await listProjects().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });

  it("maps forbidden project access without leaking secrets", async () => {
    mockFetch(() =>
      jsonResponse(403, {
        error: {
          code: "FORBIDDEN",
          message: "You cannot access this project",
        },
      }),
    );

    const error = await getProject("proj-1").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "You cannot access this project",
    });
    expect(JSON.stringify(error)).not.toMatch(/DATABASE_URL/i);
    expect(JSON.stringify(error)).not.toMatch(/postgresql:\/\//i);
    expectNoTokenStorage();
  });
});

describe("membership API client", () => {
  const member = {
    id: "member-1",
    userId: "user-2",
    email: "ed@example.com",
    displayName: "Ed",
    role: "EDITOR" as const,
    createdAt: "2026-10-31T12:00:00.000Z",
  };

  it("lists members with credentials included and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/members");
      expect(url).not.toContain("db");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        members: [{ ...member, token: "must-not-be-kept", sessionId: "must-not-be-kept" }],
      });
    });

    await expect(listMembers("proj-1")).resolves.toEqual({ members: [member] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("adds a member by email and role without a bearer token", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/members");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({ email: "ed@example.com", role: "EDITOR" }),
      );
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(201, { ...member, token: "must-not-be-kept" });
    });

    await expect(
      addMember("proj-1", { email: "ed@example.com", role: "EDITOR" }),
    ).resolves.toEqual(member);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("patches a member role with credentials included", async () => {
    const updated = { ...member, role: "VIEWER" as const };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/members/user-2");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(JSON.stringify({ role: "VIEWER" }));
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, updated);
    });

    await expect(
      updateMember("proj-1", "user-2", { role: "VIEWER" }),
    ).resolves.toEqual(updated);
    expectNoTokenStorage();
  });

  it("removes a member with DELETE, empty body, 204, and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/members/user-2");
      expect(init?.method).toBe("DELETE");
      expect(init?.body).toBeUndefined();
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return emptyResponse(204);
    });

    await expect(removeMember("proj-1", "user-2")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("maps unauthenticated, forbidden, not-found, conflict, and validation errors", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "GET") {
        return jsonResponse(401, {
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication is required",
          },
        });
      }
      if (init?.method === "POST") {
        return jsonResponse(403, {
          error: { code: "FORBIDDEN", message: "Only owners can manage members" },
        });
      }
      return jsonResponse(409, {
        error: { code: "CONFLICT", message: "User is already a member" },
      });
    });

    const unauthenticated = await listMembers("proj-1").catch((err: unknown) => err);
    expect(unauthenticated).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });

    const forbidden = await addMember("proj-1", {
      email: "ed@example.com",
      role: "EDITOR",
    }).catch((err: unknown) => err);
    expect(forbidden).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    const conflict = await updateMember("proj-1", "user-2", {
      role: "VIEWER",
    }).catch((err: unknown) => err);
    expect(conflict).toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
    expect(JSON.stringify(conflict)).not.toMatch(/DATABASE_URL/i);
    expectNoTokenStorage();
  });

  it("maps unknown email and invalid body without leaking secrets", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(404, {
          error: { code: "NOT_FOUND", message: "User was not found" },
        });
      }
      return jsonResponse(400, {
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      });
    });

    const missing = await addMember("proj-1", {
      email: "missing@example.com",
      role: "EDITOR",
    }).catch((err: unknown) => err);
    expect(missing).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "User was not found",
    });

    const invalid = await updateMember("proj-1", "user-2", {
      role: "VIEWER",
    }).catch((err: unknown) => err);
    expect(invalid).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
    expect(JSON.stringify(missing)).not.toMatch(/postgresql:\/\//i);
    expectNoTokenStorage();
  });
});

describe("tasks API client", () => {
  const task = {
    id: "task-1",
    projectId: "proj-1",
    title: "Write tests",
    description: "Cover the API client",
    status: "TODO" as const,
    priority: "MEDIUM" as const,
    dueDate: "2026-11-01" as string | null,
    createdAt: "2026-10-29T18:00:00.000Z",
  };

  it("creates a task under the project path with credentials included and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
      expect(url).not.toContain("db");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          title: "Write tests",
          description: "Cover the API client",
          dueDate: "2026-11-01",
        }),
      );
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(201, {
        ...task,
        deletedAt: "must-not-be-kept",
        token: "must-not-be-kept",
        sessionId: "must-not-be-kept",
      });
    });

    await expect(
      createTask("proj-1", {
        title: "Write tests",
        description: "Cover the API client",
        dueDate: "2026-11-01",
      }),
    ).resolves.toEqual(task);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("lists tasks without filters and keeps only public fields", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
      expect(url).not.toMatch(/includeDeleted/i);
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        tasks: [{ ...task, deletedAt: "must-not-be-kept", token: "must-not-be-kept" }],
      });
    });

    await expect(listTasks("proj-1")).resolves.toEqual({ tasks: [task] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("lists tasks with optional status and priority query filters", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/tasks?status=TODO&priority=HIGH",
      );
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, { tasks: [] });
    });

    await expect(
      listTasks("proj-1", { status: "TODO", priority: "HIGH" }),
    ).resolves.toEqual({ tasks: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("reads a task by id with credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, task);
    });

    await expect(getTask("task-1")).resolves.toEqual(task);
    expectNoTokenStorage();
  });

  it("patches allowed task fields with credentials included", async () => {
    const updated = {
      ...task,
      title: "Ship it",
      description: null,
      status: "DONE" as const,
      priority: "HIGH" as const,
      dueDate: null,
    };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(
        JSON.stringify({
          title: "Ship it",
          description: null,
          status: "DONE",
          priority: "HIGH",
          dueDate: null,
        }),
      );
      expectCredentialsInclude(init);
      return jsonResponse(200, updated);
    });

    await expect(
      updateTask("task-1", {
        title: "Ship it",
        description: null,
        status: "DONE",
        priority: "HIGH",
        dueDate: null,
      }),
    ).resolves.toEqual(updated);
    expectNoTokenStorage();
  });

  it("soft-deletes with DELETE, empty body, 204, credentials included, and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1");
      expect(init?.method).toBe("DELETE");
      expect(init?.body).toBeUndefined();
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return emptyResponse(204);
    });

    await expect(softDeleteTask("task-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("maps unauthenticated task access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await listTasks("proj-1").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });

  it("maps forbidden and archived-parent conflict without leaking secrets", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/tasks/task-1")) {
        return jsonResponse(403, {
          error: {
            code: "FORBIDDEN",
            message: "You cannot access this project",
          },
        });
      }
      return jsonResponse(409, {
        error: {
          code: "CONFLICT",
          message: "Cannot modify tasks on an archived project",
        },
      });
    });

    const forbidden = await getTask("task-1").catch((err: unknown) => err);
    expect(forbidden).toBeInstanceOf(ApiError);
    expect(forbidden).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    const conflict = await createTask("proj-1", { title: "Blocked" }).catch(
      (err: unknown) => err,
    );
    expect(conflict).toBeInstanceOf(ApiError);
    expect(conflict).toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Cannot modify tasks on an archived project",
    });
    expect(JSON.stringify(conflict)).not.toMatch(/DATABASE_URL/i);
    expect(JSON.stringify(conflict)).not.toMatch(/postgresql:\/\//i);
    expectNoTokenStorage();
  });
});

describe("dashboard API client", () => {
  const dashboard = {
    projectCount: 2,
    taskCount: 5,
    pendingCount: 3,
    completedCount: 2,
    overdueCount: 1,
    projects: [
      {
        id: "proj-1",
        name: "Alpha",
        taskCount: 3,
        pendingCount: 2,
        completedCount: 1,
        overdueCount: 1,
      },
      {
        id: "proj-2",
        name: "Beta",
        taskCount: 2,
        pendingCount: 1,
        completedCount: 1,
        overdueCount: 0,
      },
    ],
  };

  const emptyDashboard = {
    projectCount: 0,
    taskCount: 0,
    pendingCount: 0,
    completedCount: 0,
    overdueCount: 0,
    projects: [] as typeof dashboard.projects,
  };

  it("reads GET /api/dashboard from VITE_API_URL with credentials included and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/dashboard");
      expect(url).not.toContain("db");
      expect(url).not.toMatch(/\/api\/projects\/[^/]+\/tasks/);
      expect(init?.method).toBe("GET");
      expect(init?.body).toBeUndefined();
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        ...dashboard,
        deletedAt: "must-not-be-kept",
        token: "must-not-be-kept",
        sessionId: "must-not-be-kept",
        projects: dashboard.projects.map((project) => ({
          ...project,
          deletedAt: "must-not-be-kept",
          ownerUserId: "must-not-be-kept",
          archivedAt: "must-not-be-kept",
        })),
      });
    });

    await expect(getDashboard()).resolves.toEqual(dashboard);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("returns zeros and an empty project list as success", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/dashboard");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, emptyDashboard);
    });

    await expect(getDashboard()).resolves.toEqual(emptyDashboard);
    expectNoTokenStorage();
  });

  it("maps unauthenticated dashboard access without storing credentials", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/dashboard");
      expectCredentialsInclude(init);
      return jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      });
    });

    const error = await getDashboard().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });
});
