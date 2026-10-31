import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { LoginForm } from "./LoginForm";

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

describe("LoginForm", () => {
  it("shows a loading state then calls onSuccess without storing a token", async () => {
    let resolveLogin: ((value: Response) => void) | undefined;
    const loginPromise = new Promise<Response>((resolve) => {
      resolveLogin = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/login");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(
        JSON.stringify({ email: "ada@example.com", password: "secret" }),
      );
      return loginPromise;
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/signing in/i);
    resolveLogin?.(
      jsonResponse(200, {
        id: "user-1",
        email: "ada@example.com",
        displayName: "Ada",
      }),
    );

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        id: "user-1",
        email: "ada@example.com",
        displayName: "Ada",
      });
    });
    expectNoSessionTokenStorage();
  });

  it("shows an error state for invalid credentials", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      }),
    );
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid email or password/i,
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
