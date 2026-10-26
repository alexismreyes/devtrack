import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./LogoutButton";

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
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LogoutButton", () => {
  it("shows a loading state then calls onLoggedOut without storing a token", async () => {
    let resolveLogout: ((value: Response) => void) | undefined;
    const logoutPromise = new Promise<Response>((resolve) => {
      resolveLogout = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/logout");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBeUndefined();
      return logoutPromise;
    });
    const onLoggedOut = vi.fn();
    const user = userEvent.setup();

    render(<LogoutButton onLoggedOut={onLoggedOut} />);

    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/signing out/i);
    resolveLogout?.(new Response(null, { status: 204 }));

    await vi.waitFor(() => {
      expect(onLoggedOut).toHaveBeenCalledOnce();
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("treats an unauthenticated logout response as signed out", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );
    const onLoggedOut = vi.fn();
    const user = userEvent.setup();

    render(<LogoutButton onLoggedOut={onLoggedOut} />);
    await user.click(screen.getByRole("button", { name: /log out/i }));

    await vi.waitFor(() => {
      expect(onLoggedOut).toHaveBeenCalledOnce();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error state when logout fails", async () => {
    mockFetch(() =>
      jsonResponse(503, {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        },
      }),
    );
    const onLoggedOut = vi.fn();
    const user = userEvent.setup();

    render(<LogoutButton onLoggedOut={onLoggedOut} />);
    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
    expect(onLoggedOut).not.toHaveBeenCalled();
  });
});
