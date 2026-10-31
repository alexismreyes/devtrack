import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { TaskDetail } from "./TaskDetail";

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

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TaskDetail", () => {
  it("shows loading then the owned task", async () => {
    let resolveGet: ((value: Response) => void) | undefined;
    const getPromise = new Promise<Response>((resolve) => {
      resolveGet = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/tasks/task-1");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      return getPromise;
    });

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/loading task/i);
    resolveGet?.(jsonResponse(200, task));

    expect(await screen.findByRole("heading", { name: /write tests/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/task title/i)).toHaveValue("Write tests");
    expect(screen.getByLabelText(/task description/i)).toHaveValue("Cover the UI");
    expect(screen.getByLabelText(/task due date/i)).toHaveValue("2026-11-01");
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
  });

  it("updates allowed fields with credentials included", async () => {
    const updated = {
      ...task,
      title: "Ship it",
      description: null,
      status: "DONE" as const,
      priority: "HIGH" as const,
      dueDate: null,
    };
    const onUpdated = vi.fn();
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
        expect(init.body).toBe(
          JSON.stringify({
            title: "Ship it",
            description: null,
            dueDate: null,
            status: "DONE",
            priority: "HIGH",
          }),
        );
        return jsonResponse(200, updated);
      }
      return jsonResponse(200, task);
    });
    const user = userEvent.setup();

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const title = await screen.findByLabelText(/task title/i);
    await user.clear(title);
    await user.type(title, "Ship it");
    await user.clear(screen.getByLabelText(/task description/i));
    await user.clear(screen.getByLabelText(/task due date/i));
    await user.selectOptions(screen.getByLabelText(/task status/i), "DONE");
    await user.selectOptions(screen.getByLabelText(/task priority/i), "HIGH");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByText(/task updated/i)).toBeInTheDocument();
    expect(onUpdated).toHaveBeenCalledOnce();
    expectNoSessionTokenStorage();
  });

  it("soft-deletes with DELETE and an empty 204 body", async () => {
    const onDeleted = vi.fn();
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/tasks/task-1") && init?.method === "DELETE") {
        expect(init.body).toBeUndefined();
        return emptyResponse(204);
      }
      return jsonResponse(200, task);
    });
    const user = userEvent.setup();

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={onDeleted}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /delete task/i }));
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE"),
    ).toBe(true);
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
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
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /you cannot access this project/i,
    );
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
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={onUnauthenticated}
      />,
    );

    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an archived-parent conflict when update is rejected", async () => {
    mockFetch((_url, init) => {
      if (init?.method === "PATCH") {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Cannot modify tasks on an archived project",
          },
        });
      }
      return jsonResponse(200, task);
    });
    const user = userEvent.setup();

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /save task/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot modify tasks on an archived project/i,
    );
  });

  it("hides write controls when the actor cannot write", async () => {
    mockFetch(() => jsonResponse(200, task));

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: /write tests/i })).toBeInTheDocument();
    expect(screen.getByText(/cover the ui/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/task title/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete task/i })).not.toBeInTheDocument();
  });

  it("disables update and delete when the parent project is archived", async () => {
    mockFetch(() => jsonResponse(200, task));

    render(
      <TaskDetail
        taskId="task-1"
        archived={true}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByLabelText(/task title/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /save task/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /delete task/i })).toBeDisabled();
  });

  it("does not store a bearer token or session id", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    mockFetch(() => jsonResponse(200, task));

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: /write tests/i })).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });
});
