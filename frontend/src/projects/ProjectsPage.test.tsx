import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { ProjectsPage } from "./ProjectsPage";

const activeProject = {
  id: "proj-1",
  ownerUserId: "user-1",
  name: "Alpha",
  description: "First project",
  createdAt: "2026-10-27T18:00:00.000Z",
  archivedAt: null,
  cover: null as { id: string; contentType: string } | null,
  boardBackground: null,
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
      expect(url).toBe(
        "http://localhost:3000/api/projects?includeArchived=true",
      );
      expect(init?.credentials).toBe("include");
      return listPromise;
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/loading projects/i);
    resolveList?.(jsonResponse(200, { projects: [] }));
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^description$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lists active projects separately from archived sidebar entries", async () => {
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects?includeArchived=true",
      );
      expect(init?.credentials).toBe("include");
      return jsonResponse(200, {
        projects: [activeProject, archivedProject],
      });
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    const list = await screen.findByRole("list", { name: /^projects$/i });
    expect(list).toHaveTextContent("Alpha");
    expect(list).not.toHaveTextContent("Archived Alpha");
    const archivedList = screen.getByRole("list", {
      name: /archived projects/i,
    });
    expect(archivedList).toHaveTextContent("Archived Alpha");
    expect(screen.getByRole("heading", { name: /^archived$/i })).toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("hides the Archived section when there are no archived projects", async () => {
    mockFetch((url) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects?includeArchived=true",
      );
      return jsonResponse(200, { projects: [activeProject] });
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByRole("button", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^archived$/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: /archived projects/i }),
    ).not.toBeInTheDocument();
  });

  it("navigates when an archived sidebar entry is selected", async () => {
    mockFetch(() =>
      jsonResponse(200, { projects: [activeProject, archivedProject] }),
    );
    const onSelectProject = vi.fn();
    const user = userEvent.setup();

    render(
      <ProjectsPage
        onSelectProject={onSelectProject}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: /^archived alpha$/i }),
    );
    expect(onSelectProject).toHaveBeenCalledWith("proj-archived");
  });

  it("lists a shared project the caller did not create", async () => {
    const sharedProject = {
      ...activeProject,
      ownerUserId: "other-user",
      name: "Shared Alpha",
    };
    mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects?includeArchived=true",
      );
      expect(init?.credentials).toBe("include");
      return jsonResponse(200, { projects: [sharedProject] });
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByRole("button", { name: /^shared alpha$/i })).toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("creates a project from a dialog and then shows it in the list", async () => {
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
    const onSelectProject = vi.fn();
    const user = userEvent.setup();

    render(
      <ProjectsPage
        onSelectProject={onSelectProject}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create project/i }));
    const dialog = await screen.findByRole("dialog");
    const coverInput = within(dialog).getByLabelText(/optional project cover/i);
    expect(coverInput).toBeInTheDocument();
    expect(coverInput).toHaveClass("cursor-pointer", "file:cursor-pointer");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Alpha");
    await user.type(within(dialog).getByLabelText(/^description$/i), "First project");
    await user.click(within(dialog).getByRole("button", { name: /create project/i }));

    expect(await screen.findByText(/^project created\.$/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^alpha$/i })).toBeInTheDocument();
    expect(onSelectProject).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.endsWith("/cover") &&
          init?.method === "PUT",
      ),
    ).toBe(false);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false,
    );
    expectNoSessionTokenStorage();
  });

  it("creates a project with an optional cover via create-then-PUT", async () => {
    const cover = { id: "cover-1", contentType: "image/png" };
    const projects: Array<typeof activeProject & { cover: typeof cover | null }> =
      [];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/projects") && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({ name: "Alpha", description: null }),
        );
        projects.unshift({ ...activeProject, cover: null });
        return jsonResponse(201, { ...activeProject, cover: null });
      }
      if (url.endsWith("/api/projects/proj-1/cover") && init?.method === "PUT") {
        expect(init.body).toBeInstanceOf(FormData);
        const updated = { ...activeProject, cover };
        projects[0] = updated;
        return jsonResponse(200, { cover });
      }
      return jsonResponse(200, { projects: [...projects] });
    });
    const user = userEvent.setup();
    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create project/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Alpha");
    await user.upload(
      within(dialog).getByLabelText(/optional project cover/i),
      file,
    );
    expect(within(dialog).getByTestId("create-cover-file-name")).toHaveTextContent(
      /cover\.png/i,
    );
    await user.click(within(dialog).getByRole("button", { name: /create project/i }));

    expect(await screen.findByText(/^project created\.$/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^alpha$/i })).toBeInTheDocument();
    const putCall = fetchMock.mock.calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url.endsWith("/api/projects/proj-1/cover") &&
        init?.method === "PUT",
    );
    expect(putCall).toBeDefined();
    expect(putCall?.[1]?.credentials).toBe("include");
    expectNoSessionTokenStorage();
  });

  it("keeps the project and soft-fails when cover PUT fails after create", async () => {
    const projects: Array<typeof activeProject> = [];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/projects") && init?.method === "POST") {
        projects.unshift(activeProject);
        return jsonResponse(201, activeProject);
      }
      if (url.endsWith("/api/projects/proj-1/cover") && init?.method === "PUT") {
        return jsonResponse(400, {
          error: {
            code: "VALIDATION_ERROR",
            message: "Cover must be a jpeg, png, webp, or gif image",
          },
        });
      }
      return jsonResponse(200, { projects: [...projects] });
    });
    const user = userEvent.setup();
    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create project/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Alpha");
    await user.upload(
      within(dialog).getByLabelText(/optional project cover/i),
      file,
    );
    expect(within(dialog).getByTestId("create-cover-file-name")).toHaveTextContent(
      /cover\.png/i,
    );
    await user.click(within(dialog).getByRole("button", { name: /create project/i }));

    expect(
      await screen.findByText("Project created, but cover upload failed."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^alpha$/i })).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.endsWith("/cover") &&
          init?.method === "PUT",
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(false);
  });

  it("does not upload a cover when project create fails", async () => {
    const fetchMock = mockFetch((_url, init) => {
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
    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create project/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Alpha");
    await user.upload(
      within(dialog).getByLabelText(/optional project cover/i),
      file,
    );
    await user.click(within(dialog).getByRole("button", { name: /create project/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid request body/i,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/cover") &&
          init?.method === "PUT",
      ),
    ).toBe(false);
  });

  it("keeps the create dialog locked while create or cover upload is in flight", async () => {
    let resolveCreate: ((value: Response) => void) | undefined;
    const createPromise = new Promise<Response>((resolve) => {
      resolveCreate = resolve;
    });
    mockFetch((url, init) => {
      if (url.endsWith("/api/projects") && init?.method === "POST") {
        return createPromise;
      }
      return jsonResponse(200, { projects: [] });
    });
    const user = userEvent.setup();

    render(
      <ProjectsPage onSelectProject={vi.fn()} onUnauthenticated={vi.fn()} />,
    );

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create project/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Alpha");
    await user.click(within(dialog).getByRole("button", { name: /create project/i }));

    expect(await within(dialog).findByText(/creating project/i)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /creating/i }),
    ).toBeDisabled();
    expect(within(dialog).getByLabelText(/optional project cover/i)).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    resolveCreate?.(jsonResponse(201, activeProject));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
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
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /create project/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid request body/i,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
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
    expectNoSessionTokenStorage();
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
