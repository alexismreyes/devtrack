import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createProbe,
  getHealth,
  getProfile,
  listProbes,
  login,
  logout,
  register,
  updateProfile,
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
  expect(window.localStorage.length).toBe(0);
  expect(window.sessionStorage.length).toBe(0);
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
