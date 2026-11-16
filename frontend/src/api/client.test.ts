import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import {
  ApiError,
  archiveProject,
  createProbe,
  createProject,
  createTask,
  createTaskComment,
  addMember,
  clearProjectBoardBackground,
  clearProjectCover,
  deleteTaskComment,
  getDashboard,
  getHealth,
  getProfile,
  getProject,
  getTask,
  listMembers,
  listProbes,
  listProjects,
  createLabel,
  createStatus,
  clearTaskCover,
  createTaskChecklist,
  createTaskChecklistItem,
  deleteLabel,
  deleteStatus,
  deleteTaskAttachment,
  deleteTaskChecklist,
  deleteTaskChecklistItem,
  fetchAttachmentContent,
  fetchProjectBoardBackgroundContent,
  fetchProjectCoverContent,
  listLabels,
  listStatuses,
  listTaskActivity,
  listTaskAttachments,
  listTaskChecklists,
  listTaskChecklistItems,
  listTaskComments,
  listTasks,
  changePassword,
  login,
  logout,
  register,
  removeMember,
  reorderStatuses,
  reorderTasks,
  replaceTaskLabels,
  setTaskCover,
  softDeleteTask,
  unarchiveProject,
  updateLabel,
  updateMember,
  updateProfile,
  updateProject,
  updateStatus,
  updateTask,
  updateTaskChecklist,
  updateTaskChecklistItem,
  updateTaskComment,
  uploadProjectBoardBackground,
  uploadProjectCover,
  uploadTaskAttachment,
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

  it("changes password with POST, credentials included, and empty 204 body", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/password");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          currentPassword: "secret-pass",
          newPassword: "new-secret",
        }),
      );
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return emptyResponse(204);
    });

    await expect(
      changePassword({
        currentPassword: "secret-pass",
        newPassword: "new-secret",
      }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
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
    cover: null as { id: string; contentType: string } | null,
    boardBackground: null,
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

  it("lists projects with includeArchived=true when requested", async () => {
    const archived = { ...project, archivedAt: "2026-10-27T19:00:00.000Z" };
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects?includeArchived=true");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, { projects: [project, archived] });
    });

    await expect(listProjects({ includeArchived: true })).resolves.toEqual({
      projects: [project, archived],
    });
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

  it("maps PublicProjectDto.cover summary and never keeps storage paths", async () => {
    const cover = { id: "cover-1", contentType: "image/png" };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, {
        ...project,
        cover: {
          ...cover,
          storageKey: "must-not-be-kept",
        },
      });
    });

    await expect(getProject("proj-1")).resolves.toEqual({
      ...project,
      cover,
    });
    expectNoTokenStorage();
  });

  it("uploads project cover multipart with field file and credentials included", async () => {
    const cover = { id: "cover-1", contentType: "image/png" };
    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/cover");
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.method).toBe("PUT");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect(form.get("file")).toBeInstanceOf(File);
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.["Content-Type"]).toBeUndefined();
      return jsonResponse(200, { cover });
    });

    await expect(uploadProjectCover("proj-1", file)).resolves.toEqual({ cover });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("clears project cover with DELETE and credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/cover");
      expect(init?.method).toBe("DELETE");
      expectCredentialsInclude(init);
      return emptyResponse(204);
    });

    await expect(clearProjectCover("proj-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("fetches project cover content with credentials and no public static path", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/cover/content",
      );
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private",
        },
      });
    });

    const result = await fetchProjectCoverContent("proj-1");
    expect(result.contentType).toBe("image/png");
    expect(result.blob.size).toBe(4);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("uploads project board background multipart with field file and credentials included", async () => {
    const boardBackground = { id: "bg-1", contentType: "image/png" };
    const file = new File([new Uint8Array([1, 2, 3])], "board.png", {
      type: "image/png",
    });
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/board-background",
      );
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.method).toBe("PUT");
      expectCredentialsInclude(init);
      expect(init?.body).toBeInstanceOf(FormData);
      return jsonResponse(200, { boardBackground });
    });

    await expect(
      uploadProjectBoardBackground("proj-1", file),
    ).resolves.toEqual({ boardBackground });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("clears project board background with DELETE and credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/board-background",
      );
      expect(init?.method).toBe("DELETE");
      expectCredentialsInclude(init);
      return emptyResponse(204);
    });

    await expect(clearProjectBoardBackground("proj-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("fetches project board background content with credentials and private cache path", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/board-background/content",
      );
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private",
        },
      });
    });

    const result = await fetchProjectBoardBackgroundContent("proj-1");
    expect(result.contentType).toBe("image/png");
    expect(result.blob.size).toBe(4);
    expect(fetchMock).toHaveBeenCalledOnce();
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
    position: 0,
    labels: [] as Array<{ id: string; name: string; color: string }>,
    cover: null as { attachmentId: string; contentType: string } | null,
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

  it("lists tasks with optional labelId query filter", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/tasks?labelId=label-1",
      );
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, { tasks: [] });
    });

    await expect(listTasks("proj-1", { labelId: "label-1" })).resolves.toEqual({
      tasks: [],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("keeps embedded labels on task responses and strips non-public fields", async () => {
    const labeled = {
      ...task,
      labels: [{ id: "label-1", name: "Bug", color: "RED" as const }],
    };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1");
      expectCredentialsInclude(init);
      return jsonResponse(200, {
        ...labeled,
        deletedAt: "must-not-be-kept",
        token: "must-not-be-kept",
      });
    });

    await expect(getTask("task-1")).resolves.toEqual(labeled);
    expectNoTokenStorage();
  });

  it("maps PublicTaskDto.cover summary only and never keeps an attachments array (Q-140)", async () => {
    const withCover = {
      ...task,
      cover: {
        attachmentId: "att-1",
        contentType: "image/png",
      },
    };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1");
      expectCredentialsInclude(init);
      return jsonResponse(200, {
        ...withCover,
        attachments: [{ id: "att-1", bytes: "must-not-be-kept" }],
        deletedAt: "must-not-be-kept",
      });
    });

    const result = await getTask("task-1");
    expect(result).toEqual(withCover);
    expect(result).not.toHaveProperty("attachments");
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

  it("reorders tasks with PUT status+taskIds and credentials included (AC-001 / AC-007)", async () => {
    const reordered = [
      { ...task, id: "task-2", position: 0 },
      { ...task, id: "task-1", position: 1 },
    ];
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/tasks/reorder",
      );
      expect(init?.method).toBe("PUT");
      expect(init?.body).toBe(
        JSON.stringify({ status: "TODO", taskIds: ["task-2", "task-1"] }),
      );
      expectCredentialsInclude(init);
      return jsonResponse(200, { tasks: reordered });
    });

    await expect(
      reorderTasks("proj-1", { status: "TODO", taskIds: ["task-2", "task-1"] }),
    ).resolves.toEqual({ tasks: reordered });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("maps PublicTaskDto.position from task responses (AC-007)", async () => {
    const positioned = { ...task, position: 3 };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1");
      expectCredentialsInclude(init);
      return jsonResponse(200, {
        ...positioned,
        deletedAt: "must-not-be-kept",
      });
    });

    await expect(getTask("task-1")).resolves.toEqual(positioned);
    expectNoTokenStorage();
  });
});

describe("task labels API client", () => {
  const label = {
    id: "label-1",
    projectId: "proj-1",
    name: "Bug",
    color: "RED" as const,
    createdAt: "2026-11-05T12:00:00.000Z",
  };

  it("lists project labels with credentials included and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/labels");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        labels: [{ ...label, token: "must-not-be-kept" }],
      });
    });

    await expect(listLabels("proj-1")).resolves.toEqual({ labels: [label] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("creates a label with credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/labels");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ name: "Bug", color: "RED" }));
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(201, label);
    });

    await expect(
      createLabel("proj-1", { name: "Bug", color: "RED" }),
    ).resolves.toEqual(label);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("patches a label name and color with credentials included", async () => {
    const updated = { ...label, name: "Defect", color: "ORANGE" as const };
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/labels/label-1",
      );
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(
        JSON.stringify({ name: "Defect", color: "ORANGE" }),
      );
      expectCredentialsInclude(init);
      return jsonResponse(200, updated);
    });

    await expect(
      updateLabel("proj-1", "label-1", { name: "Defect", color: "ORANGE" }),
    ).resolves.toEqual(updated);
    expectNoTokenStorage();
  });

  it("deletes a label with DELETE, empty body, 204, and credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/labels/label-1",
      );
      expect(init?.method).toBe("DELETE");
      expect(init?.body).toBeUndefined();
      expectCredentialsInclude(init);
      return emptyResponse(204);
    });

    await expect(deleteLabel("proj-1", "label-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("replaces task labels with PUT and credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/labels");
      expect(init?.method).toBe("PUT");
      expect(init?.body).toBe(JSON.stringify({ labelIds: ["label-1"] }));
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, { labels: [label] });
    });

    await expect(
      replaceTaskLabels("task-1", { labelIds: ["label-1"] }),
    ).resolves.toEqual({ labels: [label] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("maps unauthenticated label access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await listLabels("proj-1").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });
});

describe("project statuses API client", () => {
  const status = {
    id: "status-1",
    projectId: "proj-1",
    key: "TODO",
    name: "To do",
    color: "GRAY" as const,
    isSystem: true,
    isCompleted: false,
    position: 0,
    createdAt: "2026-11-06T12:00:00.000Z",
  };

  it("lists project statuses with credentials included and strips extras", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/statuses");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        statuses: [{ ...status, token: "must-not-be-kept" }],
      });
    });

    await expect(listStatuses("proj-1")).resolves.toEqual({ statuses: [status] });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("creates a status with credentials included", async () => {
    const created = {
      ...status,
      id: "status-custom",
      key: "custom-key",
      name: "On hold",
      color: "ORANGE" as const,
      isSystem: false,
      position: 3,
    };
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/statuses");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({ name: "On hold", color: "ORANGE", isCompleted: false }),
      );
      expectCredentialsInclude(init);
      return jsonResponse(201, created);
    });

    await expect(
      createStatus("proj-1", {
        name: "On hold",
        color: "ORANGE",
        isCompleted: false,
      }),
    ).resolves.toEqual(created);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("patches status name, color, and isCompleted with credentials included", async () => {
    const updated = {
      ...status,
      name: "Backlog",
      color: "PURPLE" as const,
      isCompleted: true,
    };
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/statuses/status-1",
      );
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(
        JSON.stringify({
          name: "Backlog",
          color: "PURPLE",
          isCompleted: true,
        }),
      );
      expectCredentialsInclude(init);
      return jsonResponse(200, updated);
    });

    await expect(
      updateStatus("proj-1", "status-1", {
        name: "Backlog",
        color: "PURPLE",
        isCompleted: true,
      }),
    ).resolves.toEqual(updated);
    expectNoTokenStorage();
  });

  it("deletes a status with DELETE, empty body, 204, and credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/statuses/status-1",
      );
      expect(init?.method).toBe("DELETE");
      expect(init?.body).toBeUndefined();
      expectCredentialsInclude(init);
      return emptyResponse(204);
    });

    await expect(deleteStatus("proj-1", "status-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("reorders statuses with PUT statusIds and credentials included (AC-014)", async () => {
    const reordered = [
      { ...status, id: "b", position: 0 },
      { ...status, id: "a", position: 1 },
    ];
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/statuses/reorder",
      );
      expect(init?.method).toBe("PUT");
      expect(init?.body).toBe(JSON.stringify({ statusIds: ["b", "a"] }));
      expectCredentialsInclude(init);
      return jsonResponse(200, { statuses: reordered });
    });

    await expect(
      reorderStatuses("proj-1", { statusIds: ["b", "a"] }),
    ).resolves.toEqual({ statuses: reordered });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("filters tasks by status key with credentials included (AC-008)", async () => {
    const task = {
      id: "task-1",
      projectId: "proj-1",
      title: "Write tests",
      description: null,
      status: "custom-key",
      priority: "MEDIUM" as const,
      dueDate: null,
      createdAt: "2026-11-06T12:00:00.000Z",
      position: 0,
      labels: [],
      cover: null,
    };
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/tasks?status=custom-key",
      );
      expectCredentialsInclude(init);
      return jsonResponse(200, { tasks: [task] });
    });

    await expect(
      listTasks("proj-1", { status: "custom-key" }),
    ).resolves.toEqual({ tasks: [task] });
    expectNoTokenStorage();
  });

  it("maps conflict when deleting an in-use status", async () => {
    mockFetch(() =>
      jsonResponse(409, {
        error: {
          code: "CONFLICT",
          message: "Status is in use by one or more tasks",
        },
      }),
    );

    const error = await deleteStatus("proj-1", "status-1").catch(
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Status is in use by one or more tasks",
    });
    expectNoTokenStorage();
  });
});

describe("task comments API client", () => {
  const comment = {
    id: "comment-1",
    taskId: "task-1",
    authorUserId: "user-1",
    authorDisplayName: "Ada",
    body: "Looks good",
    createdAt: "2026-11-04T18:00:00.000Z",
  };

  it("lists comments with credentials included and strips non-public fields", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/comments");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        comments: [
          {
            ...comment,
            deletedAt: "must-not-be-kept",
            token: "must-not-be-kept",
            sessionId: "must-not-be-kept",
          },
        ],
        nextCursor: null,
      });
    });

    await expect(listTaskComments("task-1")).resolves.toEqual({
      comments: [comment],
      nextCursor: null,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("lists comments with cursor and limit query params", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/comments?cursor=cursor-1&limit=5",
      );
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, {
        comments: [comment],
        nextCursor: "cursor-2",
      });
    });

    await expect(
      listTaskComments("task-1", { cursor: "cursor-1", limit: 5 }),
    ).resolves.toEqual({
      comments: [comment],
      nextCursor: "cursor-2",
    });
    expectNoTokenStorage();
  });

  it("creates a comment with credentials included and no token storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/comments");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ body: "Looks good" }));
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(201, {
        ...comment,
        deletedAt: "must-not-be-kept",
      });
    });

    await expect(
      createTaskComment("task-1", { body: "Looks good" }),
    ).resolves.toEqual(comment);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("patches a comment body with credentials included", async () => {
    const updated = { ...comment, body: "Revised" };
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/comments/comment-1",
      );
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(JSON.stringify({ body: "Revised" }));
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, updated);
    });

    await expect(
      updateTaskComment("task-1", "comment-1", { body: "Revised" }),
    ).resolves.toEqual(updated);
    expectNoTokenStorage();
  });

  it("soft-deletes a comment with DELETE, empty body, 204, and credentials included", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/comments/comment-1",
      );
      expect(init?.method).toBe("DELETE");
      expect(init?.body).toBeUndefined();
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return emptyResponse(204);
    });

    await expect(
      deleteTaskComment("task-1", "comment-1"),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("maps unauthenticated comment access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await listTaskComments("task-1").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });
});

describe("task activity API client", () => {
  const createdEvent = {
    id: "activity-1",
    taskId: "task-1",
    kind: "TASK_CREATED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T12:00:00.000Z",
    payload: {},
  };

  const fieldsChangedEvent = {
    id: "activity-2",
    taskId: "task-1",
    kind: "TASK_FIELDS_CHANGED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T13:00:00.000Z",
    payload: {
      changes: [
        {
          field: "title" as const,
          oldValue: "Write tests",
          newValue: "Ship it",
        },
      ],
    },
  };

  const commentAddedEvent = {
    id: "activity-3",
    taskId: "task-1",
    kind: "COMMENT_ADDED" as const,
    actorUserId: "user-2",
    actorDisplayName: "Bob",
    createdAt: "2026-11-04T14:00:00.000Z",
    payload: {
      commentId: "comment-1",
      bodyPreview: "Looks good",
    },
  };

  const checklistAddedEvent = {
    id: "activity-4",
    taskId: "task-1",
    kind: "CHECKLIST_ADDED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T15:00:00.000Z",
    payload: {
      checklistId: "checklist-1",
      namePreview: "QA",
    },
  };

  const checklistRemovedEvent = {
    id: "activity-5",
    taskId: "task-1",
    kind: "CHECKLIST_REMOVED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T16:00:00.000Z",
    payload: {
      checklistId: "checklist-1",
      namePreview: "QA",
    },
  };

  const checklistItemCompletedEvent = {
    id: "activity-6",
    taskId: "task-1",
    kind: "CHECKLIST_ITEM_COMPLETED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T17:00:00.000Z",
    payload: {
      checklistId: "checklist-1",
      itemId: "item-1",
      textPreview: "Write tests",
    },
  };

  const checklistItemUncompletedEvent = {
    id: "activity-7",
    taskId: "task-1",
    kind: "CHECKLIST_ITEM_UNCOMPLETED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T18:00:00.000Z",
    payload: {
      checklistId: "checklist-1",
      itemId: "item-1",
      textPreview: "Write tests",
    },
  };

  const attachmentAddedEvent = {
    id: "activity-8",
    taskId: "task-1",
    kind: "ATTACHMENT_ADDED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T19:00:00.000Z",
    payload: {
      attachmentId: "att-1",
      filenamePreview: "cover.png",
    },
  };

  const attachmentRemovedEvent = {
    id: "activity-9",
    taskId: "task-1",
    kind: "ATTACHMENT_REMOVED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T20:00:00.000Z",
    payload: {
      attachmentId: "att-1",
      filenamePreview: "cover.png",
    },
  };

  const coverChangedEvent = {
    id: "activity-10",
    taskId: "task-1",
    kind: "COVER_CHANGED" as const,
    actorUserId: "user-1",
    actorDisplayName: "Ada",
    createdAt: "2026-11-04T21:00:00.000Z",
    payload: {
      attachmentId: "att-1",
      filenamePreview: "cover.png",
    },
  };

  it("lists activity with credentials included and strips non-public fields", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/activity");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        activity: [
          {
            ...commentAddedEvent,
            deletedAt: "must-not-be-kept",
            token: "must-not-be-kept",
            sessionId: "must-not-be-kept",
          },
          {
            ...fieldsChangedEvent,
            passwordHash: "must-not-be-kept",
          },
          {
            ...createdEvent,
            stack: "must-not-be-kept",
          },
          {
            ...checklistAddedEvent,
            secret: "must-not-be-kept",
          },
          {
            ...checklistRemovedEvent,
            token: "must-not-be-kept",
          },
          {
            ...checklistItemCompletedEvent,
            passwordHash: "must-not-be-kept",
          },
          {
            ...checklistItemUncompletedEvent,
            sessionId: "must-not-be-kept",
          },
          {
            ...attachmentAddedEvent,
            secret: "must-not-be-kept",
          },
          {
            ...attachmentRemovedEvent,
            token: "must-not-be-kept",
          },
          {
            ...coverChangedEvent,
            passwordHash: "must-not-be-kept",
          },
        ],
        nextCursor: null,
      });
    });

    await expect(listTaskActivity("task-1")).resolves.toEqual({
      activity: [
        commentAddedEvent,
        fieldsChangedEvent,
        createdEvent,
        checklistAddedEvent,
        checklistRemovedEvent,
        checklistItemCompletedEvent,
        checklistItemUncompletedEvent,
        attachmentAddedEvent,
        attachmentRemovedEvent,
        coverChangedEvent,
      ],
      nextCursor: null,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("lists activity with cursor and limit query params", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/activity?cursor=cursor-a&limit=5",
      );
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      return jsonResponse(200, {
        activity: [createdEvent],
        nextCursor: "cursor-b",
      });
    });

    await expect(
      listTaskActivity("task-1", { cursor: "cursor-a", limit: 5 }),
    ).resolves.toEqual({
      activity: [createdEvent],
      nextCursor: "cursor-b",
    });
    expectNoTokenStorage();
  });

  it("maps unauthenticated activity access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await listTaskActivity("task-1").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });

  it("maps forbidden and not-found activity access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(403, {
        error: {
          code: "FORBIDDEN",
          message: "You cannot access this project",
        },
      }),
    );

    const forbidden = await listTaskActivity("task-1").catch(
      (err: unknown) => err,
    );
    expect(forbidden).toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });

    mockFetch(() =>
      jsonResponse(404, {
        error: {
          code: "NOT_FOUND",
          message: "Task not found",
        },
      }),
    );

    const missing = await listTaskActivity("task-1").catch(
      (err: unknown) => err,
    );
    expect(missing).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
    expectNoTokenStorage();
  });
});

describe("task checklists API client", () => {
  const checklistItem = {
    id: "item-1",
    checklistId: "checklist-1",
    text: "Write tests",
    checked: false,
    createdAt: "2026-11-05T12:00:00.000Z",
  };

  const checklist = {
    id: "checklist-1",
    taskId: "task-1",
    name: "QA",
    createdAt: "2026-11-05T11:00:00.000Z",
    items: [],
    itemCount: 1,
    checkedCount: 0,
  };

  it("lists checklists with credentials included and strips non-public fields", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/checklists");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        checklists: [
          {
            ...checklist,
            secret: "must-not-be-kept",
            items: [
              {
                ...checklistItem,
                token: "must-not-be-kept",
              },
            ],
          },
        ],
      });
    });

    await expect(listTaskChecklists("task-1")).resolves.toEqual({
      checklists: [
        {
          ...checklist,
          items: [checklistItem],
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("lists checklist items with cursor/limit and credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/checklists/checklist-1/items?cursor=cursor-1&limit=10",
      );
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        items: [{ ...checklistItem, secret: "must-not-be-kept" }],
        nextCursor: "cursor-2",
      });
    });

    await expect(
      listTaskChecklistItems("task-1", "checklist-1", {
        cursor: "cursor-1",
        limit: 10,
      }),
    ).resolves.toEqual({
      items: [checklistItem],
      nextCursor: "cursor-2",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("creates a checklist with credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/checklists");
      expect(init?.method).toBe("POST");
      expectCredentialsInclude(init);
      expect(init?.body).toBe(JSON.stringify({ name: "QA" }));
      return jsonResponse(201, {
        ...checklist,
        items: [],
        itemCount: 0,
        checkedCount: 0,
      });
    });

    await expect(
      createTaskChecklist("task-1", { name: "QA" }),
    ).resolves.toEqual({
      ...checklist,
      items: [],
      itemCount: 0,
      checkedCount: 0,
    });
    expectNoTokenStorage();
  });

  it("patches a checklist name with credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/checklists/checklist-1",
      );
      expect(init?.method).toBe("PATCH");
      expectCredentialsInclude(init);
      expect(init?.body).toBe(JSON.stringify({ name: "Renamed" }));
      return jsonResponse(200, { ...checklist, name: "Renamed" });
    });

    await expect(
      updateTaskChecklist("task-1", "checklist-1", { name: "Renamed" }),
    ).resolves.toEqual({ ...checklist, name: "Renamed" });
    expectNoTokenStorage();
  });

  it("deletes a checklist with DELETE, empty body, 204, and credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/checklists/checklist-1",
      );
      expect(init?.method).toBe("DELETE");
      expectCredentialsInclude(init);
      expect(init?.body).toBeUndefined();
      return emptyResponse(204);
    });

    await expect(
      deleteTaskChecklist("task-1", "checklist-1"),
    ).resolves.toBeUndefined();
    expectNoTokenStorage();
  });

  it("creates a checklist item with credentials included and no checked on create", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/checklists/checklist-1/items",
      );
      expect(init?.method).toBe("POST");
      expectCredentialsInclude(init);
      expect(init?.body).toBe(JSON.stringify({ text: "Write tests" }));
      return jsonResponse(201, checklistItem);
    });

    await expect(
      createTaskChecklistItem("task-1", "checklist-1", { text: "Write tests" }),
    ).resolves.toEqual(checklistItem);
    expectNoTokenStorage();
  });

  it("patches a checklist item checked state with credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/checklists/checklist-1/items/item-1",
      );
      expect(init?.method).toBe("PATCH");
      expectCredentialsInclude(init);
      expect(init?.body).toBe(JSON.stringify({ checked: true }));
      return jsonResponse(200, { ...checklistItem, checked: true });
    });

    await expect(
      updateTaskChecklistItem("task-1", "checklist-1", "item-1", {
        checked: true,
      }),
    ).resolves.toEqual({ ...checklistItem, checked: true });
    expectNoTokenStorage();
  });

  it("deletes a checklist item with DELETE, empty body, 204, and credentials included", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/checklists/checklist-1/items/item-1",
      );
      expect(init?.method).toBe("DELETE");
      expectCredentialsInclude(init);
      expect(init?.body).toBeUndefined();
      return emptyResponse(204);
    });

    await expect(
      deleteTaskChecklistItem("task-1", "checklist-1", "item-1"),
    ).resolves.toBeUndefined();
    expectNoTokenStorage();
  });

  it("maps unauthenticated checklist access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await listTaskChecklists("task-1").catch(
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    });
    expectNoTokenStorage();
  });
});

describe("attachments API client", () => {
  const attachment = {
    id: "att-1",
    taskId: "task-1",
    originalFilename: "cover.png",
    contentType: "image/png",
    sizeBytes: 128,
    createdAt: "2026-11-06T12:00:00.000Z",
    uploadedByUserId: "user-1",
    isCover: false,
  };

  it("lists attachments with credentials included and strips non-public fields", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/attachments");
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return jsonResponse(200, {
        attachments: [
          {
            ...attachment,
            storageKey: "must-not-be-kept",
            token: "must-not-be-kept",
          },
        ],
      });
    });

    await expect(listTaskAttachments("task-1")).resolves.toEqual({
      attachments: [attachment],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("uploads multipart with field file and credentials included (no public URL)", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/attachments");
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.method).toBe("POST");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect(form.get("file")).toBeInstanceOf(File);
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.["Content-Type"]).toBeUndefined();
      return jsonResponse(201, {
        ...attachment,
        storageKey: "must-not-be-kept",
      });
    });

    await expect(uploadTaskAttachment("task-1", file)).resolves.toEqual(
      attachment,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("fetches attachment content with credentials and no public static path", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/attachments/att-1/content",
      );
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.method).toBe("GET");
      expectCredentialsInclude(init);
      expectNoAuthorizationHeader(init);
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private",
        },
      });
    });

    const result = await fetchAttachmentContent("task-1", "att-1");
    expect(result.contentType).toBe("image/png");
    expect(result.blob.size).toBe(4);
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("deletes an attachment with credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/attachments/att-1",
      );
      expect(init?.method).toBe("DELETE");
      expectCredentialsInclude(init);
      return emptyResponse(204);
    });

    await expect(deleteTaskAttachment("task-1", "att-1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoTokenStorage();
  });

  it("sets and clears cover with credentials included", async () => {
    const cover = {
      attachmentId: "att-1",
      contentType: "image/png",
    };
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/cover");
      expect(init?.method).toBe("PUT");
      expect(init?.body).toBe(JSON.stringify({ attachmentId: "att-1" }));
      expectCredentialsInclude(init);
      return jsonResponse(200, { cover });
    });
    await expect(
      setTaskCover("task-1", { attachmentId: "att-1" }),
    ).resolves.toEqual({ cover });

    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1/cover");
      expect(init?.method).toBe("DELETE");
      expectCredentialsInclude(init);
      return jsonResponse(200, { cover: null });
    });
    await expect(clearTaskCover("task-1")).resolves.toEqual({ cover: null });
    expectNoTokenStorage();
  });

  it("maps unauthenticated attachment access without storing credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    const error = await listTaskAttachments("task-1").catch(
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
    expectNoTokenStorage();
  });
});

describe("dashboard API client", () => {
  const dashboard = {
    totalProjects: 2,
    openTasks: 3,
    teamMembers: 4,
    dueSoon: 1,
    projectsPie: [
      { statusKey: "TODO", label: "To do", count: 2 },
      { statusKey: "DONE", label: "Done", count: 1 },
    ],
    tasksBars: [
      {
        projectId: "proj-1",
        projectName: "Alpha",
        checklistCompletionPercent: 50,
      },
      {
        projectId: "proj-2",
        projectName: "Beta",
        checklistCompletionPercent: 0,
      },
    ],
    progress: [
      {
        projectId: "proj-1",
        projectName: "Alpha",
        completedTasks: 1,
        totalTasks: 3,
      },
      {
        projectId: "proj-2",
        projectName: "Beta",
        completedTasks: 0,
        totalTasks: 0,
      },
    ],
  };

  const emptyDashboard = {
    totalProjects: 0,
    openTasks: 0,
    teamMembers: 0,
    dueSoon: 0,
    projectsPie: [] as typeof dashboard.projectsPie,
    tasksBars: [] as typeof dashboard.tasksBars,
    progress: [] as typeof dashboard.progress,
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
        projectsPie: dashboard.projectsPie.map((slice) => ({
          ...slice,
          ownerUserId: "must-not-be-kept",
        })),
        tasksBars: dashboard.tasksBars.map((bar) => ({
          ...bar,
          deletedAt: "must-not-be-kept",
        })),
        progress: dashboard.progress.map((row) => ({
          ...row,
          archivedAt: "must-not-be-kept",
        })),
      });
    });

    await expect(getDashboard()).resolves.toEqual(dashboard);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(setItem).not.toHaveBeenCalled();
    expectNoTokenStorage();
  });

  it("returns zeros and empty series arrays as success", async () => {
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
