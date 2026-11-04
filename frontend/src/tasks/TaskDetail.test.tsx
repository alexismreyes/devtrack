import { render, screen, within } from "@testing-library/react";
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

const ownComment = {
  id: "comment-1",
  taskId: "task-1",
  authorUserId: "user-1",
  authorDisplayName: "Ada",
  body: "First note",
  createdAt: "2026-11-04T10:00:00.000Z",
};

const otherComment = {
  id: "comment-2",
  taskId: "task-1",
  authorUserId: "user-2",
  authorDisplayName: "Bob",
  body: "Other note",
  createdAt: "2026-11-04T11:00:00.000Z",
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

function isCommentsListUrl(url: string): boolean {
  return url === "http://localhost:3000/api/tasks/task-1/comments";
}

function isActivityListUrl(url: string): boolean {
  return url === "http://localhost:3000/api/tasks/task-1/activity";
}

function defaultTaskHandler(
  url: string,
  init?: RequestInit,
  comments: unknown[] = [],
  activityEvents: unknown[] = [],
): Response {
  if (isCommentsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { comments });
  }
  if (isActivityListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { activity: activityEvents });
  }
  if (url.endsWith("/api/tasks/task-1") && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, task);
  }
  return jsonResponse(500, {
    error: { code: "INTERNAL_ERROR", message: `Unexpected ${init?.method ?? "GET"} ${url}` },
  });
}

const createdActivity = {
  id: "activity-1",
  taskId: "task-1",
  kind: "TASK_CREATED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T12:00:00.000Z",
  payload: {},
};

const fieldsChangedActivity = {
  id: "activity-2",
  taskId: "task-1",
  kind: "TASK_FIELDS_CHANGED" as const,
  actorUserId: "user-1",
  actorDisplayName: "Ada",
  createdAt: "2026-11-04T13:00:00.000Z",
  payload: {
    changes: [
      { field: "title" as const, oldValue: "Write tests", newValue: "Ship it" },
      { field: "status" as const, oldValue: "TODO", newValue: "DONE" },
    ],
  },
};

const commentAddedActivity = {
  id: "activity-3",
  taskId: "task-1",
  kind: "COMMENT_ADDED" as const,
  actorUserId: "user-2",
  actorDisplayName: "Bob",
  createdAt: "2026-11-04T14:00:00.000Z",
  payload: {
    commentId: "comment-1",
    bodyPreview: "First note",
  },
};

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
      if (url === "http://localhost:3000/api/tasks/task-1") {
        expect(init?.method).toBe("GET");
        expect(init?.credentials).toBe("include");
        return getPromise;
      }
      return defaultTaskHandler(url, init);
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
      return defaultTaskHandler(url, init);
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
      return defaultTaskHandler(url, init);
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
    mockFetch((url, init) => {
      if (init?.method === "PATCH" && url.endsWith("/api/tasks/task-1")) {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Cannot modify tasks on an archived project",
          },
        });
      }
      return defaultTaskHandler(url, init);
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
    mockFetch((url, init) => defaultTaskHandler(url, init));

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
    mockFetch((url, init) => defaultTaskHandler(url, init));

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
    mockFetch((url, init) => defaultTaskHandler(url, init));

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

  it("lists live comments as plain text with credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      return defaultTaskHandler(url, init, [ownComment, otherComment]);
    });

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        currentUserId="user-1"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: /^comments$/i })).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: /task comments/i });
    expect(within(list).getByText("First note")).toBeInTheDocument();
    expect(within(list).getByText("Other note")).toBeInTheDocument();
    expect(within(list).getByText(/ada/i)).toBeInTheDocument();
    expect(screen.queryByText(/markdown/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/label/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/@user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url === "http://localhost:3000/api/tasks/task-1/comments" &&
          init?.method === "GET" &&
          init.credentials === "include",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("lets a writer create a comment and keeps viewer create chrome hidden", async () => {
    const created = {
      ...ownComment,
      id: "comment-3",
      body: "Fresh comment",
      createdAt: "2026-11-04T12:00:00.000Z",
    };
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isCommentsListUrl(url) && init?.method === "POST") {
        expect(init.body).toBe(JSON.stringify({ body: "Fresh comment" }));
        return jsonResponse(201, created);
      }
      return defaultTaskHandler(url, init, [ownComment]);
    });
    const user = userEvent.setup();

    const { rerender } = render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        currentUserId="user-1"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.type(await screen.findByLabelText(/new comment/i), "Fresh comment");
    await user.click(screen.getByRole("button", { name: /add comment/i }));
    expect(await screen.findByText(/comment added/i)).toBeInTheDocument();
    expect(screen.getByText("Fresh comment")).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url === "http://localhost:3000/api/tasks/task-1/comments" &&
          init?.method === "POST",
      ),
    ).toBe(true);

    rerender(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={false}
        currentUserId="user-1"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: /^comments$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/new comment/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add comment/i })).not.toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("lets the author edit and soft-delete their own comment", async () => {
    let listed = [ownComment, otherComment];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (
        url === "http://localhost:3000/api/tasks/task-1/comments/comment-1" &&
        init?.method === "PATCH"
      ) {
        expect(init.body).toBe(JSON.stringify({ body: "Edited note" }));
        const updated = { ...ownComment, body: "Edited note" };
        listed = [updated, otherComment];
        return jsonResponse(200, updated);
      }
      if (
        url === "http://localhost:3000/api/tasks/task-1/comments/comment-1" &&
        init?.method === "DELETE"
      ) {
        expect(init.body).toBeUndefined();
        listed = [otherComment];
        return emptyResponse(204);
      }
      return defaultTaskHandler(url, init, listed);
    });
    const user = userEvent.setup();

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        currentUserId="user-1"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const list = await screen.findByRole("list", { name: /task comments/i });
    const ownItem = within(list).getByText("First note").closest("li");
    expect(ownItem).not.toBeNull();
    const otherItem = within(list).getByText("Other note").closest("li");
    expect(otherItem).not.toBeNull();

    expect(
      within(ownItem as HTMLElement).getByRole("button", { name: /edit comment/i }),
    ).toBeInTheDocument();
    expect(
      within(ownItem as HTMLElement).getByRole("button", { name: /delete comment/i }),
    ).toBeInTheDocument();
    expect(
      within(otherItem as HTMLElement).queryByRole("button", { name: /edit comment/i }),
    ).not.toBeInTheDocument();
    expect(
      within(otherItem as HTMLElement).queryByRole("button", { name: /delete comment/i }),
    ).not.toBeInTheDocument();

    await user.click(
      within(ownItem as HTMLElement).getByRole("button", { name: /edit comment/i }),
    );
    const editField = screen.getByLabelText(/edit comment/i);
    await user.clear(editField);
    await user.type(editField, "Edited note");
    await user.click(screen.getByRole("button", { name: /save comment/i }));
    expect(await screen.findByText(/comment updated/i)).toBeInTheDocument();
    expect(screen.getByText("Edited note")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete comment/i }));
    expect(await screen.findByText(/comment deleted/i)).toBeInTheDocument();
    expect(screen.queryByText("Edited note")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.endsWith("/comments/comment-1") &&
          init?.method === "DELETE",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("shows OWNER soft-delete chrome for another user's comment", async () => {
    mockFetch((url, init) => defaultTaskHandler(url, init, [otherComment]));

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        canManageMembers={true}
        currentUserId="user-1"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const list = await screen.findByRole("list", { name: /task comments/i });
    const item = within(list).getByText("Other note").closest("li");
    expect(item).not.toBeNull();
    expect(
      within(item as HTMLElement).queryByRole("button", { name: /edit comment/i }),
    ).not.toBeInTheDocument();
    expect(
      within(item as HTMLElement).getByRole("button", { name: /delete comment/i }),
    ).toBeInTheDocument();
  });

  it("shows an empty comments state and keeps the existing dialog chrome", async () => {
    mockFetch((url, init) => defaultTaskHandler(url, init, []));

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        currentUserId="user-1"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByText(/no comments yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save task/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
  });

  it("lists activity newest first with field changes and comment preview (AC-010)", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      return defaultTaskHandler(url, init, [ownComment], [
        commentAddedActivity,
        fieldsChangedActivity,
        createdActivity,
      ]);
    });

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        currentUserId="user-1"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: /^activity$/i })).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: /task activity/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByText(/comment added/i)).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText("First note")).toBeInTheDocument();
    expect(within(items[0] as HTMLElement).getByText(/bob/i)).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText(/fields changed/i)).toBeInTheDocument();
    expect(
      within(items[1] as HTMLElement).getByText(
        /title: Write tests → Ship it; status: TODO → DONE/i,
      ),
    ).toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByText(/task created/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^comments$/i })).toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/label/i)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url === "http://localhost:3000/api/tasks/task-1/activity" &&
          init?.method === "GET" &&
          init.credentials === "include",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("shows an empty activity state", async () => {
    mockFetch((url, init) => defaultTaskHandler(url, init, [], []));

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

    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^activity$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^comments$/i })).toBeInTheDocument();
  });

  it("shows activity forbidden and not-found states", async () => {
    mockFetch((url, init) => {
      if (isActivityListUrl(url)) {
        return jsonResponse(403, {
          error: {
            code: "FORBIDDEN",
            message: "You cannot access this project",
          },
        });
      }
      return defaultTaskHandler(url, init);
    });

    const { unmount } = render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(
      await screen.findByText(/you cannot access this project/i),
    ).toBeInTheDocument();
    unmount();

    mockFetch((url, init) => {
      if (isActivityListUrl(url)) {
        return jsonResponse(404, {
          error: {
            code: "NOT_FOUND",
            message: "Task not found",
          },
        });
      }
      return defaultTaskHandler(url, init);
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

    expect(await screen.findByText(/task not found/i)).toBeInTheDocument();
  });

  it("shows activity error and unauthenticated states", async () => {
    mockFetch((url, init) => {
      if (isActivityListUrl(url)) {
        return jsonResponse(500, {
          error: {
            code: "INTERNAL_ERROR",
            message: "Activity unavailable",
          },
        });
      }
      return defaultTaskHandler(url, init);
    });

    const { unmount } = render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByText(/activity unavailable/i)).toBeInTheDocument();
    unmount();

    const onUnauthenticated = vi.fn();
    mockFetch((url, init) => {
      if (isActivityListUrl(url)) {
        return jsonResponse(401, {
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication is required",
          },
        });
      }
      return defaultTaskHandler(url, init);
    });

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
  });
});
