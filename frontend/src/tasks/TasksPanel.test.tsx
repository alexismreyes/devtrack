import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TasksPanel } from "./TasksPanel";

const task = {
  id: "task-1",
  projectId: "proj-1",
  title: "Write tests",
  description: "Cover the UI",
  status: "TODO" as const,
  priority: "MEDIUM" as const,
  dueDate: "2026-11-01" as string | null,
  createdAt: "2026-10-29T18:00:00.000Z",
};

const otherTask = {
  ...task,
  id: "task-2",
  title: "Review PR",
  status: "IN_PROGRESS" as const,
  priority: "HIGH" as const,
  dueDate: null,
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

function isTaskListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/tasks/.test(url);
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TasksPanel", () => {
  it("shows loading then an empty state", async () => {
    let resolveList: ((value: Response) => void) | undefined;
    const listPromise = new Promise<Response>((resolve) => {
      resolveList = resolve;
    });
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      return listPromise;
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/loading tasks/i);
    resolveList?.(jsonResponse(200, { tasks: [] }));
    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("lists tasks for the selected project with credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
      expect(init?.credentials).toBe("include");
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBeUndefined();
      expect(headers?.authorization).toBeUndefined();
      return jsonResponse(200, { tasks: [task, otherTask] });
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review pr/i })).toBeInTheDocument();
    expect(screen.queryByText(/kanban/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(window.localStorage.length).toBe(0);
  });

  it("creates a task omitting status and priority so defaults apply", async () => {
    const created = { ...task, id: "task-3", title: "Ship docs" };
    let listed = [] as typeof created[];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isTaskListUrl(url) && init?.method === "POST") {
        expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
        expect(init.body).toBe(
          JSON.stringify({
            title: "Ship docs",
            description: "Write the README",
            dueDate: null,
          }),
        );
        listed = [created];
        return jsonResponse(201, created);
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: listed });
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.type(await screen.findByLabelText(/new task title/i), "Ship docs");
    await user.type(screen.getByLabelText(/new task description/i), "Write the README");
    await user.click(screen.getByRole("button", { name: /create task/i }));

    expect(await screen.findByText(/task created/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ship docs/i })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    );
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("filters the list by status and priority query parameters", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      expect(init?.method).toBe("GET");
      if (url.includes("status=TODO") && url.includes("priority=HIGH")) {
        return jsonResponse(200, { tasks: [] });
      }
      if (url.includes("status=TODO")) {
        return jsonResponse(200, { tasks: [task] });
      }
      return jsonResponse(200, { tasks: [task, otherTask] });
    });
    const user = userEvent.setup();

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /review pr/i })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/filter by status/i), "TODO");
    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review pr/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by priority/i), "HIGH");
    expect(await screen.findByText(/no matching tasks/i)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          typeof url === "string" &&
          url ===
            "http://localhost:3000/api/projects/proj-1/tasks?status=TODO&priority=HIGH",
      ),
    ).toBe(true);
  });

  it("opens nested task detail inside the panel without a task-detail URL", async () => {
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/tasks/task-1") && init?.method === "GET") {
        return jsonResponse(200, task);
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: [task] });
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /write tests/i }));
    expect(await screen.findByLabelText(/task title/i)).toHaveValue("Write tests");
    expect(screen.queryByRole("heading", { name: /create task/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close task/i }));
    expect(await screen.findByRole("heading", { name: /create task/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^task title$/i)).not.toBeInTheDocument();
  });

  it("shows an unauthenticated list state", async () => {
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
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={onUnauthenticated}
      />,
    );

    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(screen.queryByRole("heading", { name: /create task/i })).not.toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
  });

  it("shows an error when the task list request fails", async () => {
    mockFetch(() =>
      jsonResponse(503, {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        },
      }),
    );

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
    expect(JSON.stringify(screen.getByRole("alert").textContent)).not.toMatch(
      /DATABASE_URL/i,
    );
  });

  it("shows a forbidden list state", async () => {
    mockFetch(() =>
      jsonResponse(403, {
        error: {
          code: "FORBIDDEN",
          message: "You cannot access this project",
        },
      }),
    );

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /you cannot access this project/i,
    );
    expect(screen.queryByRole("heading", { name: /create task/i })).not.toBeInTheDocument();
  });

  it("shows an archived-parent conflict when create is rejected", async () => {
    mockFetch((url, init) => {
      if (isTaskListUrl(url) && init?.method === "POST") {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Cannot modify tasks on an archived project",
          },
        });
      }
      return jsonResponse(200, { tasks: [] });
    });
    const user = userEvent.setup();

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.type(await screen.findByLabelText(/new task title/i), "Blocked");
    await user.click(screen.getByRole("button", { name: /create task/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot modify tasks on an archived project/i,
    );
  });

  it("disables create on an archived project while still listing tasks", async () => {
    mockFetch((_url, init) => {
      expect(init?.credentials).toBe("include");
      expect(init?.method).toBe("GET");
      return jsonResponse(200, { tasks: [task] });
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={true}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expect(
      screen.getByText(/task writes are unavailable while the parent project is archived/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create task/i })).toBeDisabled();
    expect(screen.getByLabelText(/new task title/i)).toBeDisabled();
  });

  it("does not store a bearer token or session id", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mockFetch(() => jsonResponse(200, { tasks: [task] }));

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});
