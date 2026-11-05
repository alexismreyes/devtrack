import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectMemberRole, PublicMemberDto } from "../api/types";
import { expectNoSessionTokenStorage } from "../test/storage";
import { ProjectDetail } from "./ProjectDetail";

const publicUser = {
  id: "user-1",
  email: "ada@example.com",
  displayName: "Ada",
};

const editorUser = {
  id: "user-2",
  email: "ed@example.com",
  displayName: "Ed",
};

const viewerUser = {
  id: "user-3",
  email: "vie@example.com",
  displayName: "Vie",
};

const activeProject = {
  id: "proj-1",
  ownerUserId: "user-1",
  name: "Alpha",
  description: "First project",
  createdAt: "2026-10-27T18:00:00.000Z",
  archivedAt: null as string | null,
};

const ownerMember: PublicMemberDto = {
  id: "member-1",
  userId: publicUser.id,
  email: publicUser.email,
  displayName: publicUser.displayName,
  role: "OWNER",
  createdAt: "2026-10-31T12:00:00.000Z",
};

function memberFor(
  user: { id: string; email: string; displayName: string },
  role: ProjectMemberRole,
): PublicMemberDto {
  return {
    id: `member-${user.id}`,
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role,
    createdAt: "2026-10-31T12:00:00.000Z",
  };
}

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

function renderDetail(
  ui: ReactElement = (
    <ProjectDetail projectId="proj-1" onUnauthenticated={vi.fn()} />
  ),
): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function isTaskListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/tasks/.test(url);
}

function isMembersListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/members$/.test(url);
}

function isLabelsListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/labels$/.test(url);
}

function respondBoardReads(
  url: string,
  init: RequestInit | undefined,
  options: {
    actor?: typeof publicUser;
    members?: PublicMemberDto[];
    project?: typeof activeProject;
  } = {},
): Response | null {
  const actor = options.actor ?? publicUser;
  const members = options.members ?? [ownerMember];
  const project = options.project ?? activeProject;
  if (url.endsWith("/api/users/me")) {
    return jsonResponse(200, actor);
  }
  if (isTaskListUrl(url)) {
    return jsonResponse(200, { tasks: [] });
  }
  if (isLabelsListUrl(url) && (init?.method === undefined || init.method === "GET")) {
    return jsonResponse(200, { labels: [] });
  }
  if (isMembersListUrl(url) && (init?.method === undefined || init.method === "GET")) {
    return jsonResponse(200, { members });
  }
  if (url.endsWith("/api/projects/proj-1") && (init?.method === undefined || init.method === "GET")) {
    return jsonResponse(200, project);
  }
  return null;
}

function expectBackNextToEditAndArchive(archiveName: RegExp = /archive project/i): void {
  const back = screen.getByRole("link", { name: /back to projects/i });
  const edit = screen.getByRole("button", { name: /edit project/i });
  const archive = screen.getByRole("button", { name: archiveName });
  const members = screen.getByRole("button", { name: /^members$/i });
  expect(back).toHaveAttribute("href", "/projects");
  expect(back.parentElement).toContainElement(edit);
  expect(back.parentElement).toContainElement(archive);
  expect(back.parentElement).toContainElement(members);
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProjectDetail", () => {
  it("shows a compact header with Back to projects next to Edit/Archive/Members, without an always-visible update form", async () => {
    let resolveGet: ((value: Response) => void) | undefined;
    const getPromise = new Promise<Response>((resolve) => {
      resolveGet = resolve;
    });
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/projects/proj-1") && init?.method === "GET") {
        return getPromise;
      }
      const common = respondBoardReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    renderDetail();

    expect(screen.getByRole("status")).toHaveTextContent(/loading project/i);
    resolveGet?.(jsonResponse(200, activeProject));

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.getByText(/first project/i)).toBeInTheDocument();
    expect(screen.getByText(/this project is active/i)).toBeInTheDocument();
    expectBackNextToEditAndArchive();
    expect(screen.queryByRole("button", { name: /unarchive project/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^description$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save project/i })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();
    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "TODO" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "IN_PROGRESS" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "DONE" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /^tasks$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^members$/i })).not.toBeInTheDocument();
  });

  it("opens the Members Dialog from the board header", async () => {
    mockFetch((url, init) => {
      const common = respondBoardReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    renderDetail();

    expect(await screen.findByRole("button", { name: /^labels$/i })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /^members$/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /^members$/i })).toBeInTheDocument();
    expect(await within(dialog).findByText("Ada")).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/member email/i)).toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("opens the Labels Dialog from the board header", async () => {
    mockFetch((url, init) => {
      const common = respondBoardReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    renderDetail();

    expect(await screen.findByRole("button", { name: /^members$/i })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /^labels$/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /^labels$/i })).toBeInTheDocument();
    expect(await within(dialog).findByText(/no labels yet/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/new label name/i)).toBeInTheDocument();
    expect(screen.queryByText(/checklist/i)).not.toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("shows EDITOR chrome without Archive or membership admin", async () => {
    const sharedProject = { ...activeProject, ownerUserId: "user-1" };
    mockFetch((url, init) => {
      const common = respondBoardReads(url, init, {
        actor: editorUser,
        members: [ownerMember, memberFor(editorUser, "EDITOR")],
        project: sharedProject,
      });
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    renderDetail();

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to projects/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit project/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^add task$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unarchive project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^members$/i })).not.toBeInTheDocument();
  });

  it("shows VIEWER chrome as read/list only", async () => {
    mockFetch((url, init) => {
      const common = respondBoardReads(url, init, {
        actor: viewerUser,
        members: [ownerMember, memberFor(viewerUser, "VIEWER")],
      });
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    renderDetail();

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to projects/i })).toBeInTheDocument();
    expect(await screen.findByRole("columnheader", { name: "TODO" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^members$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^labels$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^add task$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add task to todo/i })).not.toBeInTheDocument();
  });

  it("updates name and description from the edit dialog with credentials included", async () => {
    const updated = {
      ...activeProject,
      name: "Beta",
      description: "Updated",
    };
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/projects/proj-1") && init?.method === "PATCH") {
        expect(init.body).toBe(
          JSON.stringify({ name: "Beta", description: "Updated" }),
        );
        return jsonResponse(200, updated);
      }
      const common = respondBoardReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    renderDetail();

    await user.click(await screen.findByRole("button", { name: /edit project/i }));
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText(/^name$/i);
    await user.clear(name);
    await user.type(name, "Beta");
    const description = within(dialog).getByLabelText(/^description$/i);
    await user.clear(description);
    await user.type(description, "Updated");
    await user.click(within(dialog).getByRole("button", { name: /save project/i }));

    expect(await screen.findByText(/project updated/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^beta$/i })).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("stays on the detail view after archive so the owner can unarchive", async () => {
    let current = { ...activeProject };
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      expect(init?.method).not.toBe("DELETE");
      if (url.endsWith("/api/projects/proj-1/archive") && init?.method === "POST") {
        expect(init.body).toBe("{}");
        current = {
          ...current,
          archivedAt: "2026-10-27T19:00:00.000Z",
        };
        return jsonResponse(200, current);
      }
      const common = respondBoardReads(url, init, { project: current });
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    renderDetail();

    await user.click(await screen.findByRole("button", { name: /archive project/i }));
    expect(await screen.findByText(/project archived/i)).toBeInTheDocument();
    expect(screen.getByText(/this project is archived/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expectBackNextToEditAndArchive(/unarchive project/i);
    expect(screen.getByRole("button", { name: /edit project/i })).toBeDisabled();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false,
    );
  });

  it("unarchives and allows update again from the edit dialog", async () => {
    let current: typeof activeProject = {
      ...activeProject,
      archivedAt: "2026-10-27T19:00:00.000Z",
    };
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/projects/proj-1/unarchive") && init?.method === "POST") {
        expect(init.body).toBe("{}");
        current = { ...current, archivedAt: null };
        return jsonResponse(200, current);
      }
      if (url.endsWith("/api/projects/proj-1") && init?.method === "PATCH") {
        current = { ...current, name: "Beta" };
        return jsonResponse(200, current);
      }
      const common = respondBoardReads(url, init, { project: current });
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    renderDetail();

    expect(await screen.findByText(/this project is archived/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit project/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /unarchive project/i }));
    expect(await screen.findByText(/project unarchived/i)).toBeInTheDocument();
    expect(screen.getByText(/this project is active/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit project/i }));
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText(/^name$/i);
    expect(name).toBeEnabled();
    await user.clear(name);
    await user.type(name, "Beta");
    await user.click(within(dialog).getByRole("button", { name: /save project/i }));
    expect(await screen.findByText(/project updated/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^beta$/i })).toBeInTheDocument();
  });

  it("shows a forbidden state when GET returns 403", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      return jsonResponse(403, {
        error: {
          code: "FORBIDDEN",
          message: "You cannot access this project",
        },
      });
    });

    renderDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /you cannot access this project/i,
    );
    expect(screen.queryByRole("link", { name: /back to projects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit project/i })).not.toBeInTheDocument();
  });

  it("shows an unauthenticated state when GET returns 401", async () => {
    const onUnauthenticated = vi.fn();
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    renderDetail(
      <ProjectDetail projectId="proj-1" onUnauthenticated={onUnauthenticated} />,
    );

    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error when update is rejected", async () => {
    mockFetch((url, init) => {
      if (init?.method === "PATCH") {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Archived projects cannot be updated",
          },
        });
      }
      const common = respondBoardReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    renderDetail();

    await user.click(await screen.findByRole("button", { name: /edit project/i }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: /save project/i,
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /archived projects cannot be updated/i,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not store a bearer token or session id", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mockFetch((url, init) => {
      const common = respondBoardReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    renderDetail();

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });

  it("navigates to /projects from Back to projects", async () => {
    mockFetch((url, init) => {
      const common = respondBoardReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/projects/proj-1"]}>
        <Routes>
          <Route path="/projects" element={<p>Projects home destination</p>} />
          <Route
            path="/projects/:projectId"
            element={<ProjectDetail projectId="proj-1" onUnauthenticated={vi.fn()} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("link", { name: /back to projects/i }));
    expect(await screen.findByText(/projects home destination/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
  });
});
