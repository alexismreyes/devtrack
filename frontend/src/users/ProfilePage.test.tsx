import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfilePage } from "./ProfilePage";

const currentUser = {
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

describe("ProfilePage", () => {
  it("shows the current profile with a read-only email", () => {
    render(
      <ProfilePage
        user={currentUser}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const email = screen.getByLabelText(/^email$/i);
    expect(email).toHaveValue("ada@example.com");
    expect(email).toHaveAttribute("readOnly");
    expect(screen.getByLabelText(/display name/i)).toHaveValue("Ada");
  });

  it("shows loading then success when the display name is saved", async () => {
    let resolveUpdate: ((value: Response) => void) | undefined;
    const updatePromise = new Promise<Response>((resolve) => {
      resolveUpdate = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/users/me");
      expect(init?.method).toBe("PATCH");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(JSON.stringify({ displayName: "Ada Lovelace" }));
      return updatePromise;
    });
    const onUpdated = vi.fn();
    const user = userEvent.setup();

    render(
      <ProfilePage
        user={currentUser}
        onUpdated={onUpdated}
        onUnauthenticated={vi.fn()}
      />,
    );

    const displayName = screen.getByLabelText(/display name/i);
    await user.clear(displayName);
    await user.type(displayName, "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /save display name/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/saving profile/i);
    resolveUpdate?.(
      jsonResponse(200, {
        id: "user-1",
        email: "ada@example.com",
        displayName: "Ada Lovelace",
      }),
    );

    expect(await screen.findByText(/display name updated/i)).toBeInTheDocument();
    expect(onUpdated).toHaveBeenCalledWith({
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada Lovelace",
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("shows an error state when the profile update is rejected", async () => {
    mockFetch(() =>
      jsonResponse(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
        },
      }),
    );
    const user = userEvent.setup();

    render(
      <ProfilePage
        user={currentUser}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save display name/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid request body/i,
    );
  });

  it("shows an unauthenticated state when the update returns 401", async () => {
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );
    const onUnauthenticated = vi.fn();
    const user = userEvent.setup();

    render(
      <ProfilePage
        user={currentUser}
        onUpdated={vi.fn()}
        onUnauthenticated={onUnauthenticated}
      />,
    );

    await user.click(screen.getByRole("button", { name: /save display name/i }));
    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
