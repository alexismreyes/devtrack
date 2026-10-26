import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

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

describe("foundation probe UI", () => {
  it("shows a loading state then an empty state", async () => {
    let resolveList: ((value: Response) => void) | undefined;
    const listPromise = new Promise<Response>((resolve) => {
      resolveList = resolve;
    });
    mockFetch(() => listPromise);

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading probes/i);
    resolveList?.(jsonResponse(200, { probes: [] }));
    expect(
      await screen.findByText(/no probes recorded yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows persisted probes on success", async () => {
    mockFetch(() =>
      jsonResponse(200, {
        probes: [
          { id: "probe-1", recordedAt: "2026-10-26T17:00:00.000Z" },
          { id: "probe-2", recordedAt: "2026-10-26T16:00:00.000Z" },
        ],
      }),
    );

    render(<App />);

    const list = await screen.findByRole("list", { name: /system probes/i });
    expect(list).toHaveTextContent("probe-1");
    expect(list).toHaveTextContent("probe-2");
    expect(list).toHaveTextContent("2026-10-26T17:00:00.000Z");
  });

  it("shows an error state when the API returns the error envelope", async () => {
    mockFetch(() =>
      jsonResponse(503, {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        },
      }),
    );

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
  });

  it("shows an error state when the backend cannot be reached", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /could not reach the api/i,
    );
  });

  it("records a probe and then shows it from the list response", async () => {
    const probes: Array<{ id: string; recordedAt: string }> = [];
    mockFetch((url, init) => {
      expect(url.startsWith("http://localhost:3000/")).toBe(true);
      expect(url).not.toContain("db");
      if (url.endsWith("/api/system/probes") && init?.method === "POST") {
        const created = {
          id: "probe-created",
          recordedAt: "2026-10-26T18:00:00.000Z",
        };
        probes.unshift(created);
        return jsonResponse(201, created);
      }
      return jsonResponse(200, { probes: [...probes] });
    });
    const user = userEvent.setup();

    render(<App />);

    expect(
      await screen.findByText(/no probes recorded yet/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /record probe/i }));
    expect(await screen.findByText("probe-created")).toBeInTheDocument();
    expect(screen.getByText("2026-10-26T18:00:00.000Z")).toBeInTheDocument();
  });

  it("shows an error state when recording a probe fails", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(503, {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database is unavailable",
          },
        });
      }
      return jsonResponse(200, { probes: [] });
    });
    const user = userEvent.setup();

    render(<App />);

    expect(
      await screen.findByText(/no probes recorded yet/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /record probe/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
  });
});
