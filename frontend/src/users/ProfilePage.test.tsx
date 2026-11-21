import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
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
    expect(screen.getByTestId("profile-card")).toHaveClass("bg-eyecandy-surface");
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
    expectNoSessionTokenStorage();
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

  it("toggles change-password visibility independently without clearing values", async () => {
    const user = userEvent.setup();

    render(
      <ProfilePage
        user={currentUser}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const current = screen.getByLabelText(/^current password$/i);
    const next = screen.getByLabelText(/^new password$/i);
    const confirm = screen.getByLabelText(/^confirm new password$/i);

    await user.type(current, "secret-pass");
    await user.type(next, "new-secret");
    await user.type(confirm, "new-secret");

    await user.click(
      screen.getByRole("button", { name: /^show current password$/i }),
    );
    expect(current).toHaveAttribute("type", "text");
    expect(current).toHaveValue("secret-pass");
    expect(next).toHaveAttribute("type", "password");
    expect(confirm).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /^show new password$/i }));
    expect(next).toHaveAttribute("type", "text");
    expect(next).toHaveValue("new-secret");
    expect(confirm).toHaveAttribute("type", "password");

    await user.click(
      screen.getByRole("button", { name: /^show confirm new password$/i }),
    );
    expect(confirm).toHaveAttribute("type", "text");
    expect(confirm).toHaveValue("new-secret");

    await user.click(
      screen.getByRole("button", { name: /^hide current password$/i }),
    );
    expect(current).toHaveAttribute("type", "password");
    expect(current).toHaveValue("secret-pass");
    expect(next).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "text");
  });

  it("validates confirm password locally without calling the API", async () => {
    const fetchMock = mockFetch(() => {
      throw new Error("change password should not be requested");
    });
    const user = userEvent.setup();

    render(
      <ProfilePage
        user={currentUser}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^current password$/i), "secret-pass");
    await user.type(screen.getByLabelText(/^new password$/i), "new-secret");
    await user.type(
      screen.getByLabelText(/^confirm new password$/i),
      "different-secret",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/new password and confirmation do not match/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });

  it("shows loading then success when the password is changed", async () => {
    let resolveChange: ((value: Response) => void) | undefined;
    const changePromise = new Promise<Response>((resolve) => {
      resolveChange = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/auth/password");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBe(
        JSON.stringify({
          currentPassword: "secret-pass",
          newPassword: "new-secret",
        }),
      );
      return changePromise;
    });
    const user = userEvent.setup();

    render(
      <ProfilePage
        user={currentUser}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/^current password$/i), "secret-pass");
    await user.type(screen.getByLabelText(/^new password$/i), "new-secret");
    await user.type(screen.getByLabelText(/^confirm new password$/i), "new-secret");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/updating password/i);
    resolveChange?.(new Response(null, { status: 204 }));

    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^current password$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^new password$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^confirm new password$/i)).toHaveValue("");
    expect(document.body.textContent).not.toMatch(/\$argon2/i);
    expectNoSessionTokenStorage();
  });

  it("shows an error when password change is rejected", async () => {
    mockFetch(() =>
      jsonResponse(400, {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid credentials",
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

    await user.type(screen.getByLabelText(/^current password$/i), "wrong-pass");
    await user.type(screen.getByLabelText(/^new password$/i), "new-secret");
    await user.type(screen.getByLabelText(/^confirm new password$/i), "new-secret");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid credentials/i,
    );
  });
});
