import type { ReactElement } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { ProjectDetail } from "./ProjectDetail";

const activeProject = {
  id: "proj-1",
  ownerUserId: "user-1",
  name: "Alpha",
  description: "First project",
  createdAt: "2026-10-27T18:00:00.000Z",
  archivedAt: null as string | null,
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

function renderDetail(
  ui: ReactElement = (
    <ProjectDetail projectId="proj-1" onUnauthenticated={vi.fn()} />
  ),
): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function expectBackNextToEditAndArchive(archiveName: RegExp = /archive project/i): void {
  const back = screen.getByRole("link", { name: /back to projects/i });
  const edit = screen.getByRole("button", { name: /edit project/i });
  const archive = screen.getByRole("button", { name: archiveName });
  expect(back).toHaveAttribute("href", "/projects");
  expect(back.parentElement).toContainElement(edit);
  expect(back.parentElement).toContainElement(archive);
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProjectDetail", () => {
  it("shows a compact header with Back to projects next to Edit/Archive, without an always-visible update form", async () => {
    let resolveGet: ((value: Response) => void) | undefined;
    const getPromise = new Promise<Response>((resolve) => {
      resolveGet = resolve;
    });
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      expect(url).toBe("http://localhost:3000/api/projects/proj-1");
      expect(init?.method).toBe("GET");
      return getPromise;
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
  });

  it("updates name and description from the edit dialog with credentials included", async () => {
    const updated = {
      ...activeProject,
      name: "Beta",
      description: "Updated",
    };
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      if (url.endsWith("/api/projects/proj-1") && init?.method === "PATCH") {
        expect(init.body).toBe(
          JSON.stringify({ name: "Beta", description: "Updated" }),
        );
        return jsonResponse(200, updated);
      }
      return jsonResponse(200, activeProject);
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
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        expect(init?.method).toBe("GET");
        return jsonResponse(200, { tasks: [] });
      }
      expect(init?.method).not.toBe("DELETE");
      if (url.endsWith("/api/projects/proj-1/archive") && init?.method === "POST") {
        expect(init.body).toBe("{}");
        current = {
          ...current,
          archivedAt: "2026-10-27T19:00:00.000Z",
        };
        return jsonResponse(200, current);
      }
      return jsonResponse(200, current);
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
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      if (url.endsWith("/api/projects/proj-1/unarchive") && init?.method === "POST") {
        expect(init.body).toBe("{}");
        current = { ...current, archivedAt: null };
        return jsonResponse(200, current);
      }
      if (url.endsWith("/api/projects/proj-1") && init?.method === "PATCH") {
        current = { ...current, name: "Beta" };
        return jsonResponse(200, current);
      }
      return jsonResponse(200, current);
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
    mockFetch(() =>
      jsonResponse(403, {
        error: {
          code: "FORBIDDEN",
          message: "You cannot access this project",
        },
      }),
    );

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
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      if (init?.method === "PATCH") {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Archived projects cannot be updated",
          },
        });
      }
      return jsonResponse(200, activeProject);
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
    mockFetch((url) => {
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      return jsonResponse(200, activeProject);
    });

    renderDetail();

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });

  it("navigates to /projects from Back to projects", async () => {
    mockFetch((url) => {
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      return jsonResponse(200, activeProject);
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
