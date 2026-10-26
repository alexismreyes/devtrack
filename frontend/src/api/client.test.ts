import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createProbe, getHealth, listProbes } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("system API client", () => {
  it("lists probes from VITE_API_URL, including an empty list", async () => {
    const fetchMock = mockFetch((url) => {
      expect(url).toBe("http://localhost:3000/api/system/probes");
      expect(url).not.toContain("db");
      return jsonResponse(200, { probes: [] });
    });

    await expect(listProbes()).resolves.toEqual({ probes: [] });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("creates a probe with an empty JSON object", async () => {
    const created = {
      id: "probe-1",
      recordedAt: "2026-10-26T17:00:00.000Z",
    };
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/system/probes");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe("{}");
      return jsonResponse(201, created);
    });

    await expect(createProbe()).resolves.toEqual(created);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reads liveness from GET /health", async () => {
    mockFetch((url) => {
      expect(url).toBe("http://localhost:3000/health");
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
