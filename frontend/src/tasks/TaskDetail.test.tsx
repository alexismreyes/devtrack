import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { expectNoSessionTokenStorage } from "../test/storage";
import { DEFAULT_PROJECT_STATUSES } from "../test/statuses";
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
  position: 0,
  labels: [] as Array<{ id: string; name: string; color: "RED" | "BLUE" }>,
  cover: null as { attachmentId: string; contentType: string } | null,
};

const bugLabel = {
  id: "label-1",
  projectId: "proj-1",
  name: "Bug",
  color: "RED" as const,
  createdAt: "2026-11-05T12:00:00.000Z",
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
  return /^http:\/\/localhost:3000\/api\/tasks\/task-1\/comments(?:\?.*)?$/.test(
    url,
  );
}

function isActivityListUrl(url: string): boolean {
  return /^http:\/\/localhost:3000\/api\/tasks\/task-1\/activity(?:\?.*)?$/.test(
    url,
  );
}

function isLabelsListUrl(url: string): boolean {
  return url === "http://localhost:3000/api/projects/proj-1/labels";
}

function isStatusesListUrl(url: string): boolean {
  return url === "http://localhost:3000/api/projects/proj-1/statuses";
}

function isChecklistsListUrl(url: string): boolean {
  return url === "http://localhost:3000/api/tasks/task-1/checklists";
}

function isAttachmentsListUrl(url: string): boolean {
  return url === "http://localhost:3000/api/tasks/task-1/attachments";
}

function defaultTaskHandler(
  url: string,
  init?: RequestInit,
  comments: unknown[] = [],
  activityEvents: unknown[] = [],
  labels: unknown[] = [],
  checklists: unknown[] = [],
  attachments: unknown[] = [],
): Response {
  if (isCommentsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { comments, nextCursor: null });
  }
  if (isActivityListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { activity: activityEvents, nextCursor: null });
  }
  if (isLabelsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { labels });
  }
  if (isStatusesListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { statuses: DEFAULT_PROJECT_STATUSES });
  }
  if (isChecklistsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { checklists });
  }
  if (isAttachmentsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, { attachments });
  }
  if (url.endsWith("/api/tasks/task-1") && (init?.method === "GET" || init?.method === undefined)) {
    return jsonResponse(200, task);
  }
  return jsonResponse(500, {
    error: { code: "INTERNAL_ERROR", message: `Unexpected ${init?.method ?? "GET"} ${url}` },
  });
}

const sampleChecklist = {
  id: "checklist-1",
  taskId: "task-1",
  name: "QA",
  createdAt: "2026-11-05T11:00:00.000Z",
  items: [
    {
      id: "item-1",
      checklistId: "checklist-1",
      text: "Write tests",
      checked: true,
      createdAt: "2026-11-05T12:00:00.000Z",
    },
    {
      id: "item-2",
      checklistId: "checklist-1",
      text: "Review PR",
      checked: false,
      createdAt: "2026-11-05T12:30:00.000Z",
    },
  ],
};

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
    expect(screen.getByTestId("task-detail-layout")).toHaveClass(
      "md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]",
    );
    expect(screen.getByTestId("task-detail-main")).toBeInTheDocument();
    expect(screen.getByTestId("task-detail-side")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /comments & activity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^labels$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^checklist$/i })).toBeInTheDocument();
    expect(screen.getByText(/no labels assigned/i)).toBeInTheDocument();
    expect(screen.getByTestId("task-checklists")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("task-detail-main")).getByTestId("task-attachments"),
    ).toBeInTheDocument();
    expect(await screen.findByText(/no attachments yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/new checklist name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add checklist/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save labels/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^dates$/i })).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("task-detail-actions")).getByRole("button", {
        name: /^attachment$/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("task-attachments")).queryByTestId(
        "task-attachment-upload",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/hide checked/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ocultar los elementos/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assign/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/fecha de vencimiento/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/custom status/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage statuses/i })).not.toBeInTheDocument();
    const fieldLabels = screen.getAllByTestId("task-field-label");
    expect(fieldLabels.length).toBeGreaterThanOrEqual(5);
    for (const label of fieldLabels) {
      expect(label).toHaveClass("text-xs", "font-normal", "text-muted-foreground");
    }
    const statusSelect = screen.getByLabelText(/task status/i);
    expect(within(statusSelect).getByRole("option", { name: "To do" })).toHaveValue("TODO");
    expect(within(statusSelect).getByRole("option", { name: "In progress" })).toHaveValue(
      "IN_PROGRESS",
    );
    expect(within(statusSelect).getByRole("option", { name: "Done" })).toHaveValue("DONE");
  });

  it("assigns labels for writers with PUT replace-set on Done and credentials included", async () => {
    const onUpdated = vi.fn();
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/tasks/task-1/labels") && init?.method === "PUT") {
        expect(init.body).toBe(JSON.stringify({ labelIds: ["label-1"] }));
        return jsonResponse(200, { labels: [bugLabel] });
      }
      return defaultTaskHandler(url, init, [], [], [bugLabel]);
    });
    const user = userEvent.setup();

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /^labels$/i }));
    const assignList = await screen.findByRole("list", { name: /assign labels/i });
    await user.click(within(assignList).getByRole("checkbox", { name: /bug/i }));
    await user.click(screen.getByRole("button", { name: /^done$/i }));

    expect(await screen.findByText(/labels updated/i)).toBeInTheDocument();
    const assigned = screen.getByRole("list", { name: /task labels/i });
    expect(within(assigned).getByText("Bug")).toHaveAttribute(
      "data-label-color",
      "RED",
    );
    expect(onUpdated).toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });

  it("shows assigned chips without opening Labels and keeps viewer catalog read-only", async () => {
    const user = userEvent.setup();
    mockFetch((url, init) => {
      if (url.endsWith("/api/tasks/task-1") && (init?.method === "GET" || init?.method === undefined)) {
        return jsonResponse(200, {
          ...task,
          labels: [{ id: "label-1", name: "Bug", color: "RED" }],
        });
      }
      return defaultTaskHandler(url, init, [], [], [bugLabel]);
    });

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

    const chips = await screen.findByRole("list", { name: /task labels/i });
    expect(within(chips).getByText("Bug")).toHaveAttribute("data-label-color", "RED");
    expect(screen.queryByRole("button", { name: /save labels/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^labels$/i }));
    const catalog = await screen.findByRole("list", { name: /assign labels/i });
    expect(within(catalog).getByText("Bug")).toBeInTheDocument();
    expect(within(catalog).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create a new label/i }),
    ).not.toBeInTheDocument();
  });

  it("updates allowed fields with credentials included and reloads activity", async () => {
    const updated = {
      ...task,
      title: "Ship it",
      description: null,
      status: "DONE" as const,
      priority: "HIGH" as const,
      dueDate: null,
    };
    const onUpdated = vi.fn();
    let activityEvents: unknown[] = [createdActivity];
    const fetchMock = mockFetch((url, init) => {
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
        activityEvents = [createdActivity, fieldsChangedActivity];
        return jsonResponse(200, updated);
      }
      return defaultTaskHandler(url, init, [], activityEvents);
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
    const sideList = await screen.findByRole("list", {
      name: /comments and activity/i,
    });
    expect(within(sideList).getByText(/fields changed/i)).toBeInTheDocument();
    expect(
      within(sideList).queryByText(/comment added/i),
    ).not.toBeInTheDocument();
    const activityGets = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    );
    expect(activityGets.length).toBeGreaterThanOrEqual(2);
    expectNoSessionTokenStorage();
  });

  it("keeps a successful Save when activity reload fails", async () => {
    const updated = {
      ...task,
      title: "Ship it",
    };
    let activityCalls = 0;
    mockFetch((url, init) => {
      if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
        return jsonResponse(200, updated);
      }
      if (isActivityListUrl(url)) {
        activityCalls += 1;
        if (activityCalls > 1) {
          return jsonResponse(500, {
            error: {
              code: "INTERNAL_ERROR",
              message: "Activity unavailable",
            },
          });
        }
        return jsonResponse(200, { activity: [], nextCursor: null });
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

    const title = await screen.findByLabelText(/task title/i);
    await user.clear(title);
    await user.type(title, "Ship it");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByText(/task updated/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/task title/i)).toHaveValue("Ship it");
    expect(await screen.findByText(/activity unavailable/i)).toBeInTheDocument();
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

    expect(
      await screen.findByRole("heading", { name: /comments & activity/i }),
    ).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: /comments and activity/i });
    expect(within(list).getByText("First note")).toBeInTheDocument();
    expect(within(list).getByText("Other note")).toBeInTheDocument();
    expect(within(list).getByText(/ada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new comment/i)).toBeInTheDocument();
    expect(screen.queryByText(/markdown/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/@user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          isCommentsListUrl(url) &&
          init?.method === "GET" &&
          init.credentials === "include",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("loads first pages with limit 5 and Next replaces the window (AC-002/AC-006)", async () => {
    const olderComment = {
      ...ownComment,
      id: "comment-older",
      body: "Older page note",
      createdAt: "2026-11-03T09:00:00.000Z",
    };
    const olderActivity = {
      ...createdActivity,
      id: "activity-older",
      createdAt: "2026-11-03T08:00:00.000Z",
    };
    const user = userEvent.setup();
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isCommentsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
        if (url.includes("cursor=")) {
          return jsonResponse(200, {
            comments: [olderComment],
            nextCursor: null,
          });
        }
        expect(url).toContain("limit=5");
        return jsonResponse(200, {
          comments: [ownComment],
          nextCursor: "comments-cursor-1",
        });
      }
      if (isActivityListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
        if (url.includes("cursor=")) {
          return jsonResponse(200, {
            activity: [olderActivity],
            nextCursor: null,
          });
        }
        expect(url).toContain("limit=5");
        return jsonResponse(200, {
          activity: [fieldsChangedActivity],
          nextCursor: "activity-cursor-1",
        });
      }
      return defaultTaskHandler(url, init);
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

    expect(await screen.findByText("First note")).toBeInTheDocument();
    expect(screen.getByText(/fields changed/i)).toBeInTheDocument();
    expect(screen.queryByText("Older page note")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^previous$/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    expect(await screen.findByText("Older page note")).toBeInTheDocument();
    expect(screen.getByText(/task created/i)).toBeInTheDocument();
    expect(screen.queryByText("First note")).not.toBeInTheDocument();
    expect(screen.queryByText(/fields changed/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^previous$/i })).toBeEnabled();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          typeof url === "string" &&
          isCommentsListUrl(url) &&
          url.includes("cursor=comments-cursor-1"),
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          typeof url === "string" &&
          isActivityListUrl(url) &&
          url.includes("cursor=activity-cursor-1"),
      ),
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: /^previous$/i }));
    expect(await screen.findByText("First note")).toBeInTheDocument();
    expect(screen.getByText(/fields changed/i)).toBeInTheDocument();
    expect(screen.queryByText("Older page note")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^previous$/i })).toBeDisabled();
  });

  it("resets to newest window after create (AC-005)", async () => {
    const olderComment = {
      ...ownComment,
      id: "comment-older",
      body: "Older page note",
      createdAt: "2026-11-03T09:00:00.000Z",
    };
    const created = {
      ...ownComment,
      id: "comment-3",
      body: "Fresh comment",
      createdAt: "2026-11-04T12:00:00.000Z",
    };
    let firstPageComments = [ownComment];
    let firstPageNextCursor: string | null = "comments-cursor-1";
    const user = userEvent.setup();
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isCommentsListUrl(url) && init?.method === "POST") {
        expect(init.body).toBe(JSON.stringify({ body: "Fresh comment" }));
        firstPageComments = [created, ownComment];
        firstPageNextCursor = null;
        return jsonResponse(201, created);
      }
      if (isCommentsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
        if (url.includes("cursor=")) {
          return jsonResponse(200, {
            comments: [olderComment],
            nextCursor: null,
          });
        }
        expect(url).toContain("limit=5");
        return jsonResponse(200, {
          comments: firstPageComments,
          nextCursor: firstPageNextCursor,
        });
      }
      if (isActivityListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
        expect(url).toContain("limit=5");
        return jsonResponse(200, {
          activity: [fieldsChangedActivity],
          nextCursor: null,
        });
      }
      return defaultTaskHandler(url, init);
    });

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

    expect(await screen.findByText("First note")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(await screen.findByText("Older page note")).toBeInTheDocument();

    const firstPageGetsBefore = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isCommentsListUrl(url) &&
        !url.includes("cursor=") &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;

    await user.type(await screen.findByLabelText(/new comment/i), "Fresh comment");
    await user.click(screen.getByRole("button", { name: /add comment/i }));
    expect(await screen.findByText(/comment added/i)).toBeInTheDocument();
    expect(screen.getByText("Fresh comment")).toBeInTheDocument();
    expect(screen.queryByText("Older page note")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^previous$/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();

    const firstPageGetsAfter = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isCommentsListUrl(url) &&
        !url.includes("cursor=") &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    expect(firstPageGetsAfter).toBeGreaterThan(firstPageGetsBefore);
  });

  it("lets a writer create a comment and keeps viewer create chrome hidden", async () => {
    const created = {
      ...ownComment,
      id: "comment-3",
      body: "Fresh comment",
      createdAt: "2026-11-04T12:00:00.000Z",
    };
    let listed = [ownComment];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isCommentsListUrl(url) && init?.method === "POST") {
        expect(init.body).toBe(JSON.stringify({ body: "Fresh comment" }));
        listed = [created, ownComment];
        return jsonResponse(201, created);
      }
      return defaultTaskHandler(url, init, listed);
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

    const commentsGetsBefore = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isCommentsListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    const activityGetsBefore = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;

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
    const commentsGetsAfter = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isCommentsListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    const activityGetsAfter = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    expect(commentsGetsAfter).toBeGreaterThan(commentsGetsBefore);
    expect(activityGetsAfter).toBeGreaterThan(activityGetsBefore);

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

    expect(
      await screen.findByRole("heading", { name: /comments & activity/i }),
    ).toBeInTheDocument();
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

    const list = await screen.findByRole("list", { name: /comments and activity/i });
    const ownItem = within(list).getByText("First note").closest("li");
    expect(ownItem).not.toBeNull();
    const otherItem = within(list).getByText("Other note").closest("li");
    expect(otherItem).not.toBeNull();

    const editLink = within(ownItem as HTMLElement).getByRole("button", {
      name: /edit comment/i,
    });
    const deleteLink = within(ownItem as HTMLElement).getByRole("button", {
      name: /delete comment/i,
    });
    expect(editLink).toHaveClass("underline-offset-4");
    expect(editLink.className).not.toMatch(/\bborder\b/);
    expect(deleteLink).toHaveClass("underline-offset-4");
    expect(deleteLink).toHaveClass("text-destructive");
    expect(
      within(otherItem as HTMLElement).queryByRole("button", { name: /edit comment/i }),
    ).not.toBeInTheDocument();
    expect(
      within(otherItem as HTMLElement).queryByRole("button", { name: /delete comment/i }),
    ).not.toBeInTheDocument();

    const commentsGetsBeforeEdit = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isCommentsListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    const activityGetsBeforeEdit = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;

    await user.click(editLink);
    const editField = screen.getByLabelText(/edit comment/i);
    await user.clear(editField);
    await user.type(editField, "Edited note");
    expect(screen.getByRole("button", { name: /cancel edit/i })).toHaveClass(
      "underline-offset-4",
    );
    await user.click(screen.getByRole("button", { name: /save comment/i }));
    expect(await screen.findByText(/comment updated/i)).toBeInTheDocument();
    expect(screen.getByText("Edited note")).toBeInTheDocument();
    const commentsGetsAfterEdit = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isCommentsListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    const activityGetsAfterEdit = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    expect(commentsGetsAfterEdit).toBeGreaterThan(commentsGetsBeforeEdit);
    expect(activityGetsAfterEdit).toBeGreaterThan(activityGetsBeforeEdit);

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
    const commentsGetsAfterDelete = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isCommentsListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    const activityGetsAfterDelete = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    expect(commentsGetsAfterDelete).toBeGreaterThan(commentsGetsAfterEdit);
    expect(activityGetsAfterDelete).toBeGreaterThan(activityGetsAfterEdit);
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

    const list = await screen.findByRole("list", { name: /comments and activity/i });
    const item = within(list).getByText("Other note").closest("li");
    expect(item).not.toBeNull();
    expect(
      within(item as HTMLElement).queryByRole("button", { name: /edit comment/i }),
    ).not.toBeInTheDocument();
    expect(
      within(item as HTMLElement).getByRole("button", { name: /delete comment/i }),
    ).toBeInTheDocument();
  });

  it("shows an empty comments and activity state and keeps chrome", async () => {
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

    expect(
      await screen.findByText(/no comments or activity yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save task/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
  });

  it("interleaves comments and activity newest-first and omits COMMENT_ADDED", async () => {
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

    expect(
      await screen.findByRole("heading", { name: /comments & activity/i }),
    ).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: /comments and activity/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByText(/fields changed/i)).toBeInTheDocument();
    expect(
      within(items[0] as HTMLElement).getByText(
        /title: Write tests → Ship it; status: TODO → DONE/i,
      ),
    ).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText(/task created/i)).toBeInTheDocument();
    expect(within(items[2] as HTMLElement).getByText("First note")).toBeInTheDocument();
    expect(screen.queryByText(/comment added/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          isActivityListUrl(url) &&
          init?.method === "GET" &&
          init.credentials === "include",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("shows checklist progress, strikethrough, and VIEWER read-only chrome (AC-008)", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (
        url ===
          "http://localhost:3000/api/tasks/task-1/checklists/checklist-1/items/item-2" &&
        init?.method === "PATCH"
      ) {
        expect(init.body).toBe(JSON.stringify({ checked: true }));
        return jsonResponse(200, {
          ...sampleChecklist.items[1],
          checked: true,
        });
      }
      return defaultTaskHandler(url, init, [], [], [], [sampleChecklist]);
    });

    const { rerender } = render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("heading", { name: /^qa$/i })).toBeInTheDocument();
    const checklists = screen.getByTestId("task-checklists");
    expect(
      within(checklists).getByText((content) => content.startsWith("50%")),
    ).toBeInTheDocument();
    expect(
      within(checklists).getByRole("progressbar", { name: /qa progress/i }),
    ).toHaveAttribute("aria-valuenow", "50");
    const checkedItem = within(checklists).getByText("Write tests");
    expect(checkedItem).toHaveClass("line-through");
    expect(checkedItem).toBeVisible();
    expect(within(checklists).getByText("Review PR")).toBeVisible();
    expect(screen.queryByText(/hide checked/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^dates$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^attachment$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /assign/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^labels$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /comments & activity/i })).toBeInTheDocument();

    const activityGetsBefore = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    await user.click(
      within(checklists).getByRole("checkbox", {
        name: /mark review pr complete/i,
      }),
    );
    expect(
      await screen.findByText(/checklist item completed/i),
    ).toBeInTheDocument();
    const activityGetsAfter = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    expect(activityGetsAfter).toBeGreaterThan(activityGetsBefore);

    rerender(
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

    expect(
      await screen.findByRole("button", { name: /^checklist$/i }),
    ).toBeDisabled();
    const viewerChecklists = await screen.findByTestId("task-checklists");
    expect(
      within(viewerChecklists).queryByRole("button", { name: /add checklist/i }),
    ).not.toBeInTheDocument();
    expect(
      within(viewerChecklists).queryByRole("button", { name: /delete checklist/i }),
    ).not.toBeInTheDocument();
    expect(
      within(viewerChecklists).getByRole("checkbox", {
        name: /mark write tests incomplete/i,
      }),
    ).toBeDisabled();
    expect(await screen.findByTestId("checklist-block-checklist-1")).toHaveClass(
      "bg-eyecandy-surface",
      "border",
    );
    expect(
      screen.getByTestId("checklist-block-checklist-1").className,
    ).not.toMatch(/(^|\s)bg-card(\s|$)/);
    expectNoSessionTokenStorage();
  });

  it("creates a checklist from the Checklist Dialog and reloads activity", async () => {
    const createdChecklist = {
      id: "checklist-2",
      taskId: "task-1",
      name: "Checklist",
      createdAt: "2026-11-05T13:00:00.000Z",
      items: [],
    };
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isChecklistsListUrl(url) && init?.method === "POST") {
        expect(init.body).toBe(JSON.stringify({ name: "Checklist" }));
        return jsonResponse(201, createdChecklist);
      }
      return defaultTaskHandler(url, init);
    });
    const user = userEvent.setup();

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByText(/no checklists yet/i)).toBeInTheDocument();
    const activityGetsBefore = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    await user.click(screen.getByRole("button", { name: /^checklist$/i }));
    expect(
      await screen.findByRole("heading", { name: /add checklist/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("create-checklist-dialog-form")).toBeInTheDocument();
    expect(screen.getByLabelText(/checklist name/i)).toHaveValue("Checklist");
    await user.click(screen.getByRole("button", { name: /^create checklist$/i }));
    expect(await screen.findByText(/checklist added\./i)).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /checklist progress/i }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(
      screen.getByText((content) => content.startsWith("0%")),
    ).toBeInTheDocument();
    expect(screen.getByTestId("checklist-block-checklist-2")).toHaveClass(
      "bg-eyecandy-surface",
      "border",
    );
    expect(
      screen.getByTestId("checklist-block-checklist-2").className,
    ).not.toMatch(/(^|\s)bg-card(\s|$)/);
    expect(screen.queryByLabelText(/new checklist name/i)).not.toBeInTheDocument();
    const activityGetsAfter = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        isActivityListUrl(url) &&
        (init?.method === "GET" || init?.method === undefined),
    ).length;
    expect(activityGetsAfter).toBeGreaterThan(activityGetsBefore);
    expectNoSessionTokenStorage();
  });

  it("disables Checklist create for archived tasks", async () => {
    mockFetch((url, init) => defaultTaskHandler(url, init));
    render(
      <TaskDetail
        taskId="task-1"
        archived={true}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );
    expect(await screen.findByRole("button", { name: /^checklist$/i })).toBeDisabled();
    expect(screen.queryByRole("heading", { name: /add checklist/i })).not.toBeInTheDocument();
  });

  it("shows a unified empty timeline when both sources are empty", async () => {
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

    expect(
      await screen.findByText(/no comments or activity yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /comments & activity/i }),
    ).toBeInTheDocument();
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

  const sampleAttachment = {
    id: "att-1",
    taskId: "task-1",
    originalFilename: "notes.txt",
    contentType: "text/plain",
    sizeBytes: 12,
    createdAt: "2026-11-06T12:00:00.000Z",
    uploadedByUserId: "user-1",
    isCover: false,
  };

  const sampleImageAttachment = {
    id: "att-2",
    taskId: "task-1",
    originalFilename: "cover.png",
    contentType: "image/png",
    sizeBytes: 64,
    createdAt: "2026-11-06T12:05:00.000Z",
    uploadedByUserId: "user-1",
    isCover: true,
  };

  it("opens Attachment Popover for upload and keeps list stacked in main column (AC-010/Q-137)", async () => {
    const user = userEvent.setup();
    const created = {
      ...sampleAttachment,
      id: "att-new",
      originalFilename: "spec.txt",
    };
    let activityReload = 0;
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isAttachmentsListUrl(url) && init?.method === "POST") {
        expect(init.body).toBeInstanceOf(FormData);
        return jsonResponse(201, created);
      }
      if (isActivityListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
        activityReload += 1;
        if (activityReload > 1) {
          return jsonResponse(200, {
            activity: [
              {
                id: "activity-att",
                taskId: "task-1",
                kind: "ATTACHMENT_ADDED",
                actorUserId: "user-1",
                actorDisplayName: "Ada",
                createdAt: "2026-11-06T13:00:00.000Z",
                payload: {
                  attachmentId: created.id,
                  filenamePreview: created.originalFilename,
                },
              },
            ],
            nextCursor: null,
          });
        }
      }
      return defaultTaskHandler(
        url,
        init,
        [],
        [],
        [],
        [],
        [sampleAttachment, sampleImageAttachment],
      );
    });

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const main = await screen.findByTestId("task-detail-main");
    const attachments = within(main).getByTestId("task-attachments");
    expect(await within(attachments).findByText("notes.txt")).toBeInTheDocument();
    expect(within(attachments).getByText("cover.png")).toBeInTheDocument();
    expect(
      within(attachments).queryByTestId("task-attachment-upload"),
    ).not.toBeInTheDocument();

    const actions = screen.getByTestId("task-detail-actions");
    await user.click(
      within(actions).getByRole("button", { name: /^attachment$/i }),
    );
    expect(
      await screen.findByRole("heading", { name: /add attachment/i }),
    ).toBeInTheDocument();

    const file = new File(["hello"], "spec.txt", { type: "text/plain" });
    await user.upload(screen.getByTestId("task-attachment-upload"), file);
    expect(await within(attachments).findByText("spec.txt")).toBeInTheDocument();
    expect(await screen.findByText(/attachment added/i)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          isAttachmentsListUrl(url) &&
          init?.method === "POST" &&
          init.credentials === "include",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("keeps VIEWER attachment UI read-only (AC-010)", async () => {
    mockFetch((url, init) =>
      defaultTaskHandler(
        url,
        init,
        [],
        [],
        [],
        [],
        [sampleAttachment, sampleImageAttachment],
      ),
    );

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

    const viewerPanel = await screen.findByTestId("task-attachments");
    expect(await within(viewerPanel).findByText("notes.txt")).toBeInTheDocument();
    expect(
      within(viewerPanel).queryByTestId("task-attachment-upload"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^attachment$/i }),
    ).toBeDisabled();
    expect(
      within(viewerPanel).queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(viewerPanel).queryByRole("button", { name: /set as cover/i }),
    ).not.toBeInTheDocument();
    expect(
      within(viewerPanel).queryByRole("button", { name: /clear cover/i }),
    ).not.toBeInTheDocument();
    expect(
      within(viewerPanel).getByRole("button", { name: /^download$/i }),
    ).toBeInTheDocument();
    expect(
      within(viewerPanel).getByRole("button", { name: /^view$/i }),
    ).toBeInTheDocument();
  });

  it("disables attachment upload and mutations when archived (AC-010)", async () => {
    mockFetch((url, init) =>
      defaultTaskHandler(
        url,
        init,
        [],
        [],
        [],
        [],
        [sampleAttachment, sampleImageAttachment],
      ),
    );

    render(
      <TaskDetail
        taskId="task-1"
        archived={true}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const archivedPanel = await screen.findByTestId("task-attachments");
    expect(await within(archivedPanel).findByText("notes.txt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^attachment$/i })).toBeDisabled();
    for (const button of within(archivedPanel).getAllByRole("button", {
      name: /^delete$/i,
    })) {
      expect(button).toBeDisabled();
    }
    expect(
      within(archivedPanel).getByRole("button", { name: /clear cover/i }),
    ).toBeDisabled();
  });

  it("clears cover without deleting the attachment and reloads activity", async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    let coverCleared = false;
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url === "http://localhost:3000/api/tasks/task-1/cover" && init?.method === "DELETE") {
        coverCleared = true;
        return jsonResponse(200, { cover: null });
      }
      if (isAttachmentsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
        return jsonResponse(200, {
          attachments: [
            {
              ...sampleImageAttachment,
              isCover: !coverCleared,
            },
          ],
        });
      }
      if (isActivityListUrl(url) && coverCleared) {
        return jsonResponse(200, {
          activity: [
            {
              id: "activity-cover",
              taskId: "task-1",
              kind: "COVER_CHANGED",
              actorUserId: "user-1",
              actorDisplayName: "Ada",
              createdAt: "2026-11-06T14:00:00.000Z",
              payload: {
                attachmentId: null,
                filenamePreview: null,
              },
            },
          ],
          nextCursor: null,
        });
      }
      return defaultTaskHandler(url, init, [], [], [], [], [sampleImageAttachment]);
    });

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const panel = await screen.findByTestId("task-attachments");
    expect(await within(panel).findByText(/cover\.png/i)).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: /clear cover/i }));
    expect(await screen.findByText(/cover cleared\./i)).toBeInTheDocument();
    expect(await screen.findByText(/^cover changed$/i)).toBeInTheDocument();
    expect(within(panel).getByText(/cover\.png/i)).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: /clear cover/i }),
    ).not.toBeInTheDocument();
    expect(onUpdated).toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });

  it("deleting the cover attachment clears cover without a separate cover DELETE", async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    let deleted = false;
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      expect(String(url)).not.toMatch(/\/uploads\b/);
      if (
        url ===
          "http://localhost:3000/api/tasks/task-1/attachments/att-2" &&
        init?.method === "DELETE"
      ) {
        deleted = true;
        return emptyResponse(204);
      }
      if (isAttachmentsListUrl(url) && (init?.method === "GET" || init?.method === undefined)) {
        return jsonResponse(200, {
          attachments: deleted ? [] : [sampleImageAttachment],
        });
      }
      return defaultTaskHandler(
        url,
        init,
        [],
        [],
        [],
        [],
        deleted ? [] : [sampleImageAttachment],
      );
    });

    render(
      <TaskDetail
        taskId="task-1"
        archived={false}
        canWrite={true}
        onClose={vi.fn()}
        onUpdated={onUpdated}
        onDeleted={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    const panel = await screen.findByTestId("task-attachments");
    expect(await within(panel).findByText(/cover\.png/i)).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: /^delete$/i }));
    expect(await screen.findByText(/attachment deleted/i)).toBeInTheDocument();
    expect(within(panel).queryByText(/cover\.png/i)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.endsWith("/api/tasks/task-1/cover") &&
          init?.method === "DELETE",
      ),
    ).toBe(false);
    expect(onUpdated).toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });
});
