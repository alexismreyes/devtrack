import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicTaskDto } from "../api/types";
import { keyboardDropOnColumn, stubKanbanRects } from "../test/kanban-dnd";
import { expectNoSessionTokenStorage } from "../test/storage";
import { DEFAULT_PROJECT_STATUSES } from "../test/statuses";
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

const otherTask = {
  ...task,
  id: "task-2",
  title: "Review PR",
  status: "IN_PROGRESS" as const,
  priority: "HIGH" as const,
  dueDate: null,
};

const doneTask = {
  ...task,
  id: "task-3",
  title: "Ship docs",
  status: "DONE" as const,
  priority: "LOW" as const,
  dueDate: null,
  createdAt: "2026-10-28T18:00:00.000Z",
};

function expectStatusColumns(hidden = false): void {
  expect(
    screen.getByRole("columnheader", { name: "To do", hidden }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "In progress", hidden }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("columnheader", { name: "Done", hidden }),
  ).toBeInTheDocument();
}

function expectNoUngroupedTaskList(): void {
  expect(screen.queryByRole("list", { name: /^tasks$/i })).not.toBeInTheDocument();
}

function expectNoListBoardToggle(): void {
  expect(screen.queryByRole("button", { name: /^list$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^board$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: /^list$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: /^board$/i })).not.toBeInTheDocument();
}

const STATUS_HEADER: Record<"TODO" | "IN_PROGRESS" | "DONE", string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

function columnSection(
  status: "TODO" | "IN_PROGRESS" | "DONE",
  hidden = false,
): HTMLElement {
  const header = screen.getByRole("columnheader", {
    name: STATUS_HEADER[status],
    hidden,
  });
  const section = header.closest("section");
  if (section === null) {
    throw new Error(`Missing ${status} column`);
  }
  return section;
}

function taskCards(status: "TODO" | "IN_PROGRESS" | "DONE"): HTMLElement {
  return within(columnSection(status)).getByRole("list", {
    name: `${status} tasks`,
  });
}

function expectNoTaskCards(status: "TODO" | "IN_PROGRESS" | "DONE"): void {
  expect(within(taskCards(status)).queryByRole("button")).not.toBeInTheDocument();
}

function expectRemainingHeightBoard(): void {
  expect(document.querySelector('[data-slot="kanban-board"]')).toHaveClass(
    "flex-1",
    "min-h-0",
  );
  expect(document.querySelector('[data-kanban-column="TODO"]')).toHaveClass("min-h-0");
  expect(screen.getByRole("list", { name: "TODO tasks" })).toHaveClass(
    "min-h-0",
    "flex-1",
    "overflow-y-auto",
  );
  expect(screen.queryByRole("heading", { name: /dashboard/i })).not.toBeInTheDocument();
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
    if (
      isStatusesListUrl(url) &&
      (init?.method === undefined || init.method === "GET")
    ) {
      return defaultStatusesResponse();
    }
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function isTaskListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/tasks/.test(url);
}

function isTaskCommentsUrl(url: string): boolean {
  return /\/api\/tasks\/[^/]+\/comments(?:\/[^/]+)?$/.test(url);
}

function isTaskActivityUrl(url: string): boolean {
  return /\/api\/tasks\/[^/]+\/activity$/.test(url);
}

function isLabelsListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/labels$/.test(url);
}

function isStatusesListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/statuses$/.test(url);
}

function emptyCommentsResponse(): Response {
  return jsonResponse(200, { comments: [] });
}

function emptyActivityResponse(): Response {
  return jsonResponse(200, { activity: [] });
}

function emptyLabelsResponse(): Response {
  return jsonResponse(200, { labels: [] });
}

function defaultStatusesResponse(): Response {
  return jsonResponse(200, { statuses: DEFAULT_PROJECT_STATUSES });
}

function respondCommonReads(
  url: string,
  init: RequestInit | undefined,
): Response | null {
  if (isLabelsListUrl(url) && (init?.method === undefined || init.method === "GET")) {
    return emptyLabelsResponse();
  }
  if (isStatusesListUrl(url) && (init?.method === undefined || init.method === "GET")) {
    return defaultStatusesResponse();
  }
  if (isTaskCommentsUrl(url) && (init?.method === undefined || init.method === "GET")) {
    return emptyCommentsResponse();
  }
  if (isTaskActivityUrl(url) && (init?.method === undefined || init.method === "GET")) {
    return emptyActivityResponse();
  }
  return null;
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
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      if (isLabelsListUrl(url)) {
        return emptyLabelsResponse();
      }
      if (isStatusesListUrl(url)) {
        return defaultStatusesResponse();
      }
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
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
    expectStatusColumns();
    expectNoTaskCards("TODO");
    expectNoTaskCards("IN_PROGRESS");
    expectNoTaskCards("DONE");
    expect(screen.getByRole("button", { name: /^add task$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add task to todo/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/new task title/i)).not.toBeInTheDocument();
    expectRemainingHeightBoard();
    expectNoUngroupedTaskList();
    expectNoListBoardToggle();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          typeof url === "string" &&
          url === "http://localhost:3000/api/projects/proj-1/tasks",
      ),
    ).toBe(true);
  });

  it("hides add-task and column add controls when the actor cannot write tasks", async () => {
    mockFetch(() => jsonResponse(200, { tasks: [task] }));

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        canWriteTasks={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expectStatusColumns();
    expect(screen.queryByRole("button", { name: /^add task$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add task to todo/i })).not.toBeInTheDocument();
    expect(document.querySelector('[aria-roledescription="draggable"]')).not.toBeNull();
  });

  it("lists tasks for the selected project with credentials included", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBeUndefined();
      expect(headers?.authorization).toBeUndefined();
      if (isLabelsListUrl(url)) {
        return emptyLabelsResponse();
      }
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
      return jsonResponse(200, { tasks: [task, otherTask, doneTask] });
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expectStatusColumns();
    expect(
      within(columnSection("TODO")).getByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("IN_PROGRESS")).getByRole("button", {
        name: /review pr/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("DONE")).getByRole("button", { name: /ship docs/i }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("TODO")).queryByRole("button", { name: /review pr/i }),
    ).not.toBeInTheDocument();
    expect(
      within(columnSection("TODO")).queryByRole("button", { name: /ship docs/i }),
    ).not.toBeInTheDocument();
    expect(
      within(columnSection("IN_PROGRESS")).queryByRole("button", {
        name: /write tests/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(columnSection("DONE")).queryByRole("button", { name: /write tests/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/priority medium/i)).toBeInTheDocument();
    expect(screen.getByText(/due 2026-11-01/i)).toBeInTheDocument();
    expect(within(columnSection("IN_PROGRESS")).getByText(/priority high/i)).toBeInTheDocument();
    expect(
      within(document.querySelector('[data-kanban-card="task-2"]') as HTMLElement).queryByText(
        /due /i,
      ),
    ).not.toBeInTheDocument();
    expectRemainingHeightBoard();
    expectNoUngroupedTaskList();
    expectNoListBoardToggle();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/trello/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          typeof url === "string" &&
          url === "http://localhost:3000/api/projects/proj-1/tasks",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
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
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
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

    expect(screen.queryByLabelText(/new task title/i)).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /^add task$/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByLabelText(/new task status/i)).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/new task title/i), "Ship docs");
    await user.type(within(dialog).getByLabelText(/new task description/i), "Write the README");
    await user.click(within(dialog).getByRole("button", { name: /create task/i }));

    expect(await screen.findByText(/task created/i)).toBeInTheDocument();
    expect(
      within(columnSection("TODO")).getByRole("button", { name: /ship docs/i }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("IN_PROGRESS")).queryByRole("button", {
        name: /ship docs/i,
      }),
    ).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    );
    expectNoSessionTokenStorage();
  });

  it("filters the list by status and priority query parameters", async () => {
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      expect(init?.method).toBe("GET");
      if (isLabelsListUrl(url)) {
        return emptyLabelsResponse();
      }
      if (isStatusesListUrl(url)) {
        return defaultStatusesResponse();
      }
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
    expect(
      await screen.findByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review pr/i })).not.toBeInTheDocument();
    expect(
      within(columnSection("TODO")).getByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expectStatusColumns();

    await user.selectOptions(screen.getByLabelText(/filter by priority/i), "HIGH");
    expect(await screen.findByText(/no matching tasks/i)).toBeInTheDocument();
    expectStatusColumns();
    expectNoTaskCards("TODO");
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          typeof url === "string" &&
          url ===
            "http://localhost:3000/api/projects/proj-1/tasks?status=TODO&priority=HIGH",
      ),
    ).toBe(true);
  });

  it("filters the list by labelId query parameter and shows card-face labels", async () => {
    const labeledTask = {
      ...task,
      labels: [{ id: "label-1", name: "Bug", color: "RED" as const }],
    };
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isLabelsListUrl(url)) {
        return jsonResponse(200, { labels: [bugLabel] });
      }
      if (url.includes("labelId=label-1")) {
        return jsonResponse(200, { tasks: [labeledTask] });
      }
      return jsonResponse(200, { tasks: [labeledTask, otherTask] });
    });
    const user = userEvent.setup();

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    const cardLabels = within(
      document.querySelector('[data-kanban-card="task-1"]') as HTMLElement,
    ).getByRole("list", { name: /task labels/i });
    expect(within(cardLabels).getByText("Bug")).toHaveAttribute(
      "data-label-color",
      "RED",
    );
    expect(screen.getByLabelText(/filter by label/i)).toBeInTheDocument();
    expect(screen.queryByText(/checklist/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by label/i), "label-1");
    expect(
      await screen.findByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review pr/i })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url]) =>
          typeof url === "string" &&
          url ===
            "http://localhost:3000/api/projects/proj-1/tasks?labelId=label-1",
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
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
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
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(await screen.findByLabelText(/task title/i)).toHaveValue("Write tests");
    expect(screen.queryByRole("heading", { name: /^create task$/i })).not.toBeInTheDocument();
    expectStatusColumns(true);
    expect(document.querySelector('[data-kanban-column="TODO"]')).not.toBeNull();
    expect(document.querySelector('[data-kanban-column="IN_PROGRESS"]')).not.toBeNull();
    expect(document.querySelector('[data-kanban-column="DONE"]')).not.toBeNull();
    expectNoUngroupedTaskList();

    await user.click(screen.getByRole("button", { name: /close task/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^task title$/i)).not.toBeInTheDocument();
    expectStatusColumns();
  });

  it("moves a card to the matching column after a nested status update", async () => {
    let listed: PublicTaskDto[] = [{ ...task }];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
        expect(init.body).toBe(
          JSON.stringify({
            title: "Write tests",
            description: "Cover the UI",
            dueDate: "2026-11-01",
            status: "IN_PROGRESS",
            priority: "MEDIUM",
          }),
        );
        listed = [{ ...task, status: "IN_PROGRESS" }];
        return jsonResponse(200, listed[0]);
      }
      if (url.endsWith("/api/tasks/task-1") && init?.method === "GET") {
        return jsonResponse(200, listed[0]);
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: listed });
      }
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
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
    await user.selectOptions(await screen.findByLabelText(/task status/i), "IN_PROGRESS");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByText(/task updated/i)).toBeInTheDocument();
    expect(
      await screen.findByRole("columnheader", {
        name: "In progress",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("IN_PROGRESS", true)).getByRole("button", {
        name: /write tests/i,
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("TODO", true)).queryByRole("button", {
        name: /write tests/i,
        hidden: true,
      }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url === "http://localhost:3000/api/tasks/task-1" &&
          init?.method === "PATCH",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("removes a soft-deleted task from every column", async () => {
    let listed: PublicTaskDto[] = [{ ...task }];
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/tasks/task-1") && init?.method === "DELETE") {
        listed = [];
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/api/tasks/task-1") && init?.method === "GET") {
        return jsonResponse(200, task);
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: listed });
      }
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
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
    await user.click(await screen.findByRole("button", { name: /delete task/i }));

    expect(await screen.findByText(/no tasks yet/i)).toBeInTheDocument();
    expectStatusColumns();
    expect(screen.queryByRole("button", { name: /write tests/i })).not.toBeInTheDocument();
  });

  it("keeps within-column order as the listed newest-first order", async () => {
    const newerTodo = {
      ...task,
      id: "task-newer",
      title: "Newer todo",
      createdAt: "2026-10-30T18:00:00.000Z",
    };
    const olderTodo = {
      ...task,
      id: "task-older",
      title: "Older todo",
      createdAt: "2026-10-28T18:00:00.000Z",
    };
    mockFetch(() => jsonResponse(200, { tasks: [newerTodo, olderTodo] }));

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /newer todo/i })).toBeInTheDocument();
    const cards = within(taskCards("TODO")).getAllByRole("button");
    expect(cards.map((card) => card.textContent)).toEqual([
      "Newer todo",
      "Older todo",
    ]);
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
    expectNoSessionTokenStorage();
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

    await user.click(await screen.findByRole("button", { name: /^add task$/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/new task title/i), "Blocked");
    await user.click(within(dialog).getByRole("button", { name: /create task/i }));
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
    expectStatusColumns();
    expect(
      within(columnSection("TODO")).getByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/task writes are unavailable while the parent project is archived/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^add task$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /add task to todo/i })).toBeDisabled();
    expect(screen.queryByLabelText(/new task title/i)).not.toBeInTheDocument();
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
    expectNoSessionTokenStorage();
  });

  it("persists a cross-column drop with PATCH { status } and credentials included", async () => {
    stubKanbanRects();
    let listed: PublicTaskDto[] = [{ ...task }];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBeUndefined();
      expect(headers?.authorization).toBeUndefined();
      if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
        expect(init.body).toBe(JSON.stringify({ status: "IN_PROGRESS" }));
        const parsed = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(parsed).toEqual({ status: "IN_PROGRESS" });
        expect(parsed).not.toHaveProperty("position");
        expect(parsed).not.toHaveProperty("rank");
        listed = [{ ...task, status: "IN_PROGRESS" }];
        return jsonResponse(200, listed[0]);
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: listed });
      }
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "IN_PROGRESS", "TODO");

    expect(
      await within(columnSection("IN_PROGRESS")).findByRole("button", {
        name: /write tests/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("TODO")).queryByRole("button", { name: /write tests/i }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url === "http://localhost:3000/api/tasks/task-1" &&
          init?.method === "PATCH" &&
          init.body === JSON.stringify({ status: "IN_PROGRESS" }) &&
          init.credentials === "include",
      ),
    ).toBe(true);
    expectNoSessionTokenStorage();
  });

  it("does not PATCH or send rank on a same-column drop", async () => {
    stubKanbanRects();
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: [task] });
      }
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "TODO", "TODO");

    expect(
      within(columnSection("TODO")).getByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(false);
    expect(
      JSON.stringify(fetchMock.mock.calls),
    ).not.toMatch(/"rank"|"position"/);
  });

  it("keeps the persisted column when a drop PATCH returns archived 409", async () => {
    stubKanbanRects();
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Cannot modify tasks on an archived project",
          },
        });
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: [task] });
      }
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "DONE", "TODO");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cannot modify tasks on an archived project/i,
    );
    expect(
      within(columnSection("TODO")).getByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("DONE")).queryByRole("button", { name: /write tests/i }),
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(true);
  });

  it("keeps the persisted column when a drop PATCH fails", async () => {
    stubKanbanRects();
    mockFetch((url, init) => {
      if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
        return jsonResponse(403, {
          error: {
            code: "FORBIDDEN",
            message: "You cannot access this project",
          },
        });
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: [task] });
      }
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });

    render(
      <TasksPanel
        projectId="proj-1"
        archived={false}
        onUnauthenticated={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "IN_PROGRESS", "TODO");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /you cannot access this project/i,
    );
    expect(
      within(columnSection("TODO")).getByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("IN_PROGRESS")).queryByRole("button", {
        name: /write tests/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("does not PATCH a drop when the parent project is archived", async () => {
    stubKanbanRects();
    const fetchMock = mockFetch((_url, init) => {
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
    expectStatusColumns();
    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    expect(card).toHaveAttribute("aria-disabled", "true");
    await keyboardDropOnColumn(card as HTMLElement, "IN_PROGRESS", "TODO");

    expect(
      within(columnSection("TODO")).getByRole("button", { name: /write tests/i }),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(false);
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("creates from a column plus with that column status pre-filled", async () => {
    const created = {
      ...otherTask,
      id: "task-in-progress",
      title: "In flight",
    };
    let listed: PublicTaskDto[] = [];
    const fetchMock = mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (isTaskListUrl(url) && init?.method === "POST") {
        expect(url).toBe("http://localhost:3000/api/projects/proj-1/tasks");
        expect(init.body).toBe(
          JSON.stringify({
            title: "In flight",
            description: null,
            dueDate: null,
            status: "IN_PROGRESS",
          }),
        );
        listed = [created];
        return jsonResponse(201, created);
      }
      if (isTaskListUrl(url)) {
        return jsonResponse(200, { tasks: listed });
      }
      const common = respondCommonReads(url, init);
      if (common !== null) {
        return common;
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

    await user.click(
      await screen.findByRole("button", { name: /add task to in_progress/i }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/new task status/i)).toHaveValue(
      "IN_PROGRESS",
    );
    await user.type(within(dialog).getByLabelText(/new task title/i), "In flight");
    await user.click(within(dialog).getByRole("button", { name: /create task/i }));

    expect(await screen.findByText(/task created/i)).toBeInTheDocument();
    expect(
      within(columnSection("IN_PROGRESS")).getByRole("button", {
        name: /in flight/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(columnSection("TODO")).queryByRole("button", { name: /in flight/i }),
    ).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
      true,
    );
  });
});
