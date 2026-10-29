import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProjectDetail", () => {
  it("shows loading then the owned project", async () => {
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

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/loading project/i);
    resolveGet?.(jsonResponse(200, activeProject));

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.getByText(/this project is active/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^description$/i)).toHaveValue("First project");
    expect(screen.getByRole("button", { name: /archive project/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unarchive project/i })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();
    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it("updates name and description with credentials included", async () => {
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

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const name = await screen.findByLabelText(/^name$/i);
    await user.clear(name);
    await user.type(name, "Beta");
    const description = screen.getByLabelText(/^description$/i);
    await user.clear(description);
    await user.type(description, "Updated");
    await user.click(screen.getByRole("button", { name: /save project/i }));

    expect(await screen.findByText(/project updated/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^beta$/i })).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
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
    const onBack = vi.fn();
    const user = userEvent.setup();

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={onBack}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /archive project/i }));
    expect(await screen.findByText(/project archived/i)).toBeInTheDocument();
    expect(screen.getByText(/this project is archived/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unarchive project/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save project/i })).toBeDisabled();
    expect(onBack).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false,
    );
  });

  it("unarchives and allows update again", async () => {
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

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByText(/this project is archived/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /unarchive project/i }));
    expect(await screen.findByText(/project unarchived/i)).toBeInTheDocument();
    expect(screen.getByText(/this project is active/i)).toBeInTheDocument();

    const name = screen.getByLabelText(/^name$/i);
    expect(name).toBeEnabled();
    await user.clear(name);
    await user.type(name, "Beta");
    await user.click(screen.getByRole("button", { name: /save project/i }));
    expect(await screen.findByText(/project updated/i)).toBeInTheDocument();
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

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /you cannot access this project/i,
    );
    expect(screen.getByRole("button", { name: /back to projects/i })).toBeInTheDocument();
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

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={vi.fn()}
        onUnauthenticated={onUnauthenticated}
      />,
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

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /save project/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /archived projects cannot be updated/i,
    );
  });

  it("does not store a bearer token or session id", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mockFetch((url) => {
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      return jsonResponse(200, activeProject);
    });

    render(
      <ProjectDetail
        projectId="proj-1"
        onBack={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
