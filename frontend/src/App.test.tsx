import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const publicUser = {
  id: "user-1",
  email: "ada@example.com",
  displayName: "Ada",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthenticated(): Response {
  return jsonResponse(401, {
    error: {
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    },
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

function expectAllCredentialsIncluded(fetchMock: ReturnType<typeof vi.fn>): void {
  for (const [, init] of fetchMock.mock.calls) {
    expect(init?.credentials).toBe("include");
  }
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("App auth view switching", () => {
  it("shows a loading session state then guest register and probe unauthenticated", async () => {
    let resolveMe: ((value: Response) => void) | undefined;
    const mePromise = new Promise<Response>((resolve) => {
      resolveMe = resolve;
    });
    const fetchMock = mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return mePromise;
      }
      return unauthenticated();
    });

    render(<App />);

    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
    resolveMe?.(unauthenticated());

    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
    expectAllCredentialsIncluded(fetchMock);
    expect(window.localStorage.length).toBe(0);
  });

  it("switches between register and login without a client router", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me") || url.endsWith("/api/system/probes")) {
        return unauthenticated();
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(screen.getByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^register$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^register$/i }));
    expect(screen.getByRole("heading", { name: /^register$/i })).toBeInTheDocument();
  });

  it("registers, shows profile, then logs out back to guest", async () => {
    let authenticated = false;
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/auth/register") && init?.method === "POST") {
        authenticated = true;
        return jsonResponse(201, publicUser);
      }
      if (url.endsWith("/api/auth/logout") && init?.method === "POST") {
        authenticated = false;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/api/users/me")) {
        return authenticated ? jsonResponse(200, publicUser) : unauthenticated();
      }
      if (url.endsWith("/api/system/probes")) {
        return authenticated
          ? jsonResponse(200, { probes: [] })
          : unauthenticated();
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/display name/i), "Ada");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/signed in as ada@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("ada@example.com");
    expect(await screen.findByText(/no probes recorded yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expectAllCredentialsIncluded(fetchMock);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("logs in an existing user and keeps probe UI", async () => {
    let authenticated = false;
    mockFetch((url, init) => {
      if (url.endsWith("/api/auth/login") && init?.method === "POST") {
        authenticated = true;
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/users/me")) {
        return authenticated ? jsonResponse(200, publicUser) : unauthenticated();
      }
      if (url.endsWith("/api/system/probes")) {
        return authenticated
          ? jsonResponse(200, {
              probes: [{ id: "probe-1", recordedAt: "2026-10-26T17:00:00.000Z" }],
            })
          : unauthenticated();
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: /^log in$/i }));
    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/signed in as ada@example.com/i)).toBeInTheDocument();
    expect(await screen.findByText("probe-1")).toBeInTheDocument();
  });

  it("restores an existing session from GET /api/users/me", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/system/probes")) {
        return jsonResponse(200, { probes: [] });
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    render(<App />);

    expect(await screen.findByText(/signed in as ada@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /your profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^register$/i })).not.toBeInTheDocument();
  });

  it("shows an error when the session check fails for a non-auth reason", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(503, {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database is unavailable",
          },
        });
      }
      return unauthenticated();
    });

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
  });
});
