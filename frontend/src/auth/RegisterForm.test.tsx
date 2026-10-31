import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { RegisterForm } from "./RegisterForm";

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

describe("RegisterForm", () => {
  it("shows a loading state then calls onSuccess without storing a token", async () => {
    let resolveRegister: ((value: Response) => void) | undefined;
    const registerPromise = new Promise<Response>((resolve) => {
      resolveRegister = resolve;
    });
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/register");
      expect(init?.credentials).toBe("include");
      return registerPromise;
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<RegisterForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/display name/i), "Ada");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/registering/i);
    resolveRegister?.(
      jsonResponse(201, {
        id: "user-1",
        email: "ada@example.com",
        displayName: "Ada",
        token: "must-not-be-kept",
      }),
    );

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        id: "user-1",
        email: "ada@example.com",
        displayName: "Ada",
      });
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expectNoSessionTokenStorage();
  });

  it("shows an error state when registration is rejected", async () => {
    mockFetch(() =>
      jsonResponse(409, {
        error: {
          code: "CONFLICT",
          message: "Email is already registered",
        },
      }),
    );
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<RegisterForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/display name/i), "Ada");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /email is already registered/i,
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
