import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicMemberDto } from "../api/types";
import { expectNoSessionTokenStorage } from "../test/storage";
import { MembersDialog } from "./MembersDialog";

const ownerMember = {
  id: "member-1",
  userId: "user-1",
  email: "ada@example.com",
  displayName: "Ada",
  role: "OWNER" as const,
  createdAt: "2026-10-31T12:00:00.000Z",
};

const editorMember = {
  id: "member-2",
  userId: "user-2",
  email: "ed@example.com",
  displayName: "Ed",
  role: "EDITOR" as const,
  createdAt: "2026-10-31T12:05:00.000Z",
};

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

function renderDialog(
  onUnauthenticated: () => void = vi.fn(),
): ReturnType<typeof render> {
  return render(
    <MembersDialog
      open={true}
      onOpenChange={vi.fn()}
      projectId="proj-1"
      ownerUserId="user-1"
      onUnauthenticated={onUnauthenticated}
    />,
  );
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("MembersDialog", () => {
  it("shows loading then the member list", async () => {
    let resolveList: ((value: Response) => void) | undefined;
    const listPromise = new Promise<Response>((resolve) => {
      resolveList = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/members");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      return listPromise;
    });

    renderDialog();

    expect(screen.getByRole("status")).toHaveTextContent(/loading members/i);
    resolveList?.(jsonResponse(200, { members: [ownerMember, editorMember] }));

    const list = await screen.findByRole("list", { name: /project members/i });
    expect(list).toHaveTextContent("Ada");
    expect(list).toHaveTextContent("ada@example.com");
    expect(list).toHaveTextContent("Ed");
    expect(list).toHaveTextContent("ed@example.com");
    expect(screen.getByRole("combobox", { name: /role for ada/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /remove ada/i })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /role for ed/i })).toBeEnabled();
    expectNoSessionTokenStorage();
  });

  it("shows an empty state when the roster is empty", async () => {
    mockFetch(() => jsonResponse(200, { members: [] }));

    renderDialog();

    expect(await screen.findByText(/no members yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /project members/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add member/i })).toBeInTheDocument();
  });

  it("adds a member by email and then shows them in the list", async () => {
    const members: PublicMemberDto[] = [ownerMember];
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/members") && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({ email: "ed@example.com", role: "EDITOR" }),
        );
        members.unshift(editorMember);
        return jsonResponse(201, editorMember);
      }
      return jsonResponse(200, { members: [...members] });
    });
    const user = userEvent.setup();

    renderDialog();

    expect(await screen.findByText("Ada")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/member email/i), "ed@example.com");
    await user.selectOptions(within(dialog).getByLabelText(/member role/i), "EDITOR");
    await user.click(within(dialog).getByRole("button", { name: /add member/i }));

    expect(await screen.findByText(/member added/i)).toBeInTheDocument();
    expect(screen.getByText("Ed")).toBeInTheDocument();
    expect(screen.getByText("ed@example.com")).toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("changes a member role and removes a member", async () => {
    let members: PublicMemberDto[] = [ownerMember, editorMember];
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/members/user-2") && init?.method === "PATCH") {
        expect(init.body).toBe(JSON.stringify({ role: "VIEWER" }));
        members = members.map((member) =>
          member.userId === "user-2" ? { ...member, role: "VIEWER" as const } : member,
        );
        return jsonResponse(200, { ...editorMember, role: "VIEWER" });
      }
      if (url.endsWith("/members/user-2") && init?.method === "DELETE") {
        members = members.filter((member) => member.userId !== "user-2");
        return emptyResponse(204);
      }
      return jsonResponse(200, { members: [...members] });
    });
    const user = userEvent.setup();

    renderDialog();

    const role = await screen.findByRole("combobox", { name: /role for ed/i });
    await user.selectOptions(role, "VIEWER");
    expect(await screen.findByText(/member role updated/i)).toBeInTheDocument();
    expect(screen.getByText(/role viewer/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove ed/i }));
    expect(await screen.findByText(/member removed/i)).toBeInTheDocument();
    expect(screen.queryByText("Ed")).not.toBeInTheDocument();
  });

  it("shows an unauthenticated state when listing returns 401", async () => {
    const onUnauthenticated = vi.fn();
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    renderDialog(onUnauthenticated);

    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expectNoSessionTokenStorage();
  });

  it("shows forbidden, not-found, conflict, and validation errors from member writes", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(403, {
          error: { code: "FORBIDDEN", message: "Only owners can manage members" },
        });
      }
      if (init?.method === "PATCH") {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Cannot leave the project without an owner",
          },
        });
      }
      if (init?.method === "DELETE") {
        return jsonResponse(404, {
          error: { code: "NOT_FOUND", message: "Member was not found" },
        });
      }
      return jsonResponse(200, { members: [ownerMember, editorMember] });
    });
    const user = userEvent.setup();

    renderDialog();

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/member email/i), "ed@example.com");
    await user.click(within(dialog).getByRole("button", { name: /add member/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /only owners can manage members/i,
    );

    await user.selectOptions(
      within(dialog).getByRole("combobox", { name: /role for ed/i }),
      "VIEWER",
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot leave the project without an owner/i,
    );

    await user.click(within(dialog).getByRole("button", { name: /remove ed/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /member was not found/i,
    );
  });

  it("shows a validation error when add is rejected", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(400, {
          error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
        });
      }
      return jsonResponse(200, { members: [ownerMember] });
    });
    const user = userEvent.setup();

    renderDialog();

    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: /add member/i,
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid request body/i,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a list error when GET members returns 404", async () => {
    mockFetch(() =>
      jsonResponse(404, {
        error: { code: "NOT_FOUND", message: "Project was not found" },
      }),
    );

    renderDialog();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /project was not found/i,
    );
  });
});
