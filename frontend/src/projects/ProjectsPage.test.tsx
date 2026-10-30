import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectsPage } from "./ProjectsPage";

const activeProject = {
  id: "proj-1",
  ownerUserId: "user-1",
  name: "Alpha",
  description: "First project",
  createdAt: "2026-10-27T18:00:00.000Z",
  archivedAt: null,
};

const archivedProject = {
  ...activeProject,
  id: "proj-archived",
  name: "Archived Alpha",
  archivedAt: "2026-10-27T19:00:00.000Z",
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

describe("ProjectsPage", () => {
  it("shows a loading state then an empty state", async () => {
    let resolveList: ((value: Response) => void) | undefined;
    const listPromise = new Promise<Response>((resolve) => {
      resolveList = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects");
      expect(init?.credentials).toBe("include");
      return listPromise;
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/loading projects/i);
    resolveList?.(jsonResponse(200, { projects: [] }));
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lists active projects and hides archived ones", async () => {
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects");
      expect(url).not.toMatch(/includeArchived/i);
      expect(init?.credentials).toBe("include");
      return jsonResponse(200, {
        projects: [activeProject, archivedProject],
      });
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    const list = await screen.findByRole("list", { name: /projects/i });
    expect(list).toHaveTextContent("Alpha");
    expect(list).not.toHaveTextContent("Archived Alpha");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("creates a project and then shows it in the list", async () => {
    const projects: Array<typeof activeProject> = [];
    const fetchMock = mockFetch((url, init) => {
      expect(url.startsWith("http://localhost:3000/api/projects")).toBe(true);
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/projects") && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({ name: "Alpha", description: "First project" }),
        );
        projects.unshift(activeProject);
        return jsonResponse(201, activeProject);
      }
      return jsonResponse(200, { projects: [...projects] });
    });
    const user = userEvent.setup();

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^name$/i), "Alpha");
    await user.type(screen.getByLabelText(/^description$/i), "First project");
    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByText(/project created/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^alpha$/i })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false,
    );
    expect(window.localStorage.length).toBe(0);
  });

  it("shows an error when create is rejected", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(400, {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
          },
        });
      }
      return jsonResponse(200, { projects: [] });
    });
    const user = userEvent.setup();

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create project/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid request body/i,
    );
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

    render(
      <ProjectsPage
        onSelectProject={vi.fn()}
        onUnauthenticated={onUnauthenticated}
      />,
    );

    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
  });

  it("shows a forbidden state when listing returns 403", async () => {
    mockFetch(() =>
      jsonResponse(403, {
        error: {
          code: "FORBIDDEN",
          message: "You cannot access this project",
        },
      }),
    );

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /you cannot access this project/i,
    );
  });

  it("shows an error state when the list request fails", async () => {
    mockFetch(() =>
      jsonResponse(503, {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        },
      }),
    );

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
  });

  it("notifies the parent when an active project is selected", async () => {
    mockFetch(() => jsonResponse(200, { projects: [activeProject] }));
    const onSelectProject = vi.fn();
    const user = userEvent.setup();

    render(
      <ProjectsPage
        onSelectProject={onSelectProject}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /^alpha$/i }));
    expect(onSelectProject).toHaveBeenCalledWith("proj-1");
  });

  it("marks the listed project that matches the current destination", async () => {
    mockFetch(() => jsonResponse(200, { projects: [activeProject] }));

    render(
      <ProjectsPage
        onSelectProject={vi.fn()}
        onUnauthenticated={vi.fn()}
        selectedProjectId="proj-1"
      />,
    );

    expect(await screen.findByRole("button", { name: /^alpha$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
