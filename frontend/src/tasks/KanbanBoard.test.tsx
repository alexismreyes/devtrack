import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicTaskDto } from "../api/types";
import {
  keyboardDropOnColumn,
  keyboardStartDrag,
  stubKanbanRects,
} from "../test/kanban-dnd";
import { DEFAULT_PROJECT_STATUSES } from "../test/statuses";
import { KanbanBoard, resolveKanbanDrop } from "./KanbanBoard";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const columnKeys = DEFAULT_PROJECT_STATUSES.map((status) => status.key);

const todoTask: PublicTaskDto = {
  id: "task-1",
  projectId: "proj-1",
  title: "Write tests",
  description: "Cover the UI",
  status: "TODO",
  priority: "MEDIUM",
  dueDate: null,
  createdAt: "2026-10-29T18:00:00.000Z",
  labels: [],
  cover: null,
};

const datedTask: PublicTaskDto = {
  ...todoTask,
  id: "task-dated",
  title: "Dated work",
  priority: "HIGH",
  dueDate: "2026-11-01",
};

const labeledTask: PublicTaskDto = {
  ...todoTask,
  id: "task-labeled",
  title: "Labeled work",
  labels: [
    { id: "label-1", name: "Bug", color: "RED" },
    { id: "label-2", name: "Frontend", color: "BLUE" },
  ],
};

function renderBoard(
  props: {
    columns?: typeof DEFAULT_PROJECT_STATUSES;
    tasks?: PublicTaskDto[];
    onSelectTask?: (taskId: string) => void;
    onMoveTask?: (taskId: string, status: string) => Promise<void>;
    onAddTask?: (status: string) => void;
    disabled?: boolean;
  } = {},
): ReturnType<typeof render> {
  return render(
    <KanbanBoard
      columns={props.columns ?? DEFAULT_PROJECT_STATUSES}
      tasks={props.tasks ?? [todoTask]}
      onSelectTask={props.onSelectTask ?? vi.fn()}
      onMoveTask={props.onMoveTask ?? vi.fn().mockResolvedValue(undefined)}
      onAddTask={props.onAddTask}
      disabled={props.disabled}
    />,
  );
}

describe("resolveKanbanDrop", () => {
  it("returns the target status key for a cross-column drop (AC-005)", () => {
    expect(
      resolveKanbanDrop("task-1", "IN_PROGRESS", [todoTask], columnKeys),
    ).toEqual({
      taskId: "task-1",
      status: "IN_PROGRESS",
    });
  });

  it("is a no-op for a same-column drop (no task rank H)", () => {
    expect(
      resolveKanbanDrop("task-1", "TODO", [todoTask], columnKeys),
    ).toBeNull();
  });

  it("is a no-op when there is no drop target", () => {
    expect(resolveKanbanDrop("task-1", null, [todoTask], columnKeys)).toBeNull();
  });

  it("rejects unknown column keys", () => {
    expect(
      resolveKanbanDrop("task-1", "NOT_A_COLUMN", [todoTask], columnKeys),
    ).toBeNull();
  });
});

describe("KanbanBoard drag-and-drop", () => {
  it("calls onMoveTask when a card is dropped on another column", async () => {
    stubKanbanRects();
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onMoveTask });

    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "IN_PROGRESS", "TODO");
    expect(onMoveTask).toHaveBeenCalledOnce();
    expect(onMoveTask).toHaveBeenCalledWith("task-1", "IN_PROGRESS");
  });

  it("does not call onMoveTask for a same-column drop", async () => {
    stubKanbanRects();
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onMoveTask });

    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "TODO", "TODO");
    expect(onMoveTask).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /write tests/i })).toBeInTheDocument();
  });

  it("does not call onMoveTask when the board is disabled", async () => {
    stubKanbanRects();
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onMoveTask, disabled: true });

    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "IN_PROGRESS", "TODO");
    expect(onMoveTask).not.toHaveBeenCalled();
  });

  it("renders columns in catalog position order including customs (AC-005 / AC-014)", () => {
    const customColumns = [
      {
        ...DEFAULT_PROJECT_STATUSES[2]!,
        position: 0,
      },
      {
        id: "status-hold",
        projectId: "proj-1",
        key: "hold-key",
        name: "On hold",
        color: "ORANGE" as const,
        isSystem: false,
        isCompleted: false,
        position: 1,
        createdAt: "2026-11-06T13:00:00.000Z",
      },
      DEFAULT_PROJECT_STATUSES[0]!,
      DEFAULT_PROJECT_STATUSES[1]!,
    ];
    renderBoard({ columns: customColumns, tasks: [] });

    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((header) => header.textContent)).toEqual([
      "Done",
      "On hold",
      "To do",
      "In progress",
    ]);
    expect(document.querySelector('[data-kanban-column="hold-key"]')).not.toBeNull();
    expect(screen.queryByText(/wip/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/rank/i)).not.toBeInTheDocument();
  });

  it("shows title, priority, and due date only when present", () => {
    renderBoard({
      tasks: [todoTask, datedTask],
      onAddTask: vi.fn(),
    });

    expect(screen.getByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dated work/i })).toBeInTheDocument();
    expect(screen.getByText(/priority medium/i)).toBeInTheDocument();
    expect(screen.getByText(/priority high/i)).toBeInTheDocument();
    expect(screen.getByText(/due 2026-11-01/i)).toBeInTheDocument();
    expect(
      within(document.querySelector('[data-kanban-card="task-1"]') as HTMLElement).queryByText(
        /due /i,
      ),
    ).not.toBeInTheDocument();
  });

  it("shows assigned label names and color tokens on the card face", () => {
    renderBoard({ tasks: [labeledTask] });

    const card = document.querySelector(
      '[data-kanban-card="task-labeled"]',
    ) as HTMLElement;
    const labels = within(card).getByRole("list", { name: /task labels/i });
    expect(within(labels).getByText("Bug")).toHaveAttribute(
      "data-label-color",
      "RED",
    );
    expect(within(labels).getByText("Frontend")).toHaveAttribute(
      "data-label-color",
      "BLUE",
    );
    expect(screen.queryByText(/checklist/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
  });

  it("keeps compact left-aligned columns instead of stretching the full main width", () => {
    renderBoard({ onAddTask: vi.fn() });

    const board = document.querySelector('[data-slot="kanban-board"]');
    expect(board).toHaveClass("flex", "justify-start", "flex-1", "min-h-0");
    expect(board?.className).not.toMatch(/grid-cols-3/);
    const todoColumn = document.querySelector('[data-kanban-column="TODO"]');
    expect(todoColumn).toHaveClass("w-72", "min-w-64", "max-w-80", "shrink-0", "min-h-0");
    expect(screen.getByRole("list", { name: "TODO tasks" })).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-y-auto",
    );
    expect(screen.getByRole("columnheader", { name: "To do" })).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "In progress" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-header-TODO")).toHaveClass("bg-muted");
    expect(screen.getByTestId("kanban-column-header-IN_PROGRESS")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-header-DONE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add task to todo/i })).toBeInTheDocument();
  });

  it("shows a pointer cursor on task cards", () => {
    renderBoard();

    expect(document.querySelector('[data-kanban-card="task-1"]')).toHaveClass(
      "cursor-pointer",
    );
  });

  it("shows a drag overlay while a card is being dragged", async () => {
    stubKanbanRects();
    renderBoard();

    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('[data-slot="kanban-drag-overlay"]')).toBeNull();
    await keyboardStartDrag(card as HTMLElement);
    const overlay = document.querySelector('[data-slot="kanban-drag-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveTextContent("Write tests");
    expect(card).toHaveClass("opacity-50");
  });

  it("loads card-face cover via authenticated content fetch, not a public /uploads URL (AC-011)", async () => {
    const coverTask: PublicTaskDto = {
      ...todoTask,
      cover: {
        attachmentId: "att-cover",
        contentType: "image/png",
      },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      expect(url).toBe(
        "http://localhost:3000/api/tasks/task-1/attachments/att-cover/content",
      );
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.credentials).toBe("include");
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { "Content-Type": "image/png", "Cache-Control": "private" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.fn(() => "blob:kanban-cover");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const { rerender } = renderBoard({ tasks: [coverTask] });

    await waitFor(() => {
      expect(screen.getByTestId("kanban-card-cover")).toHaveAttribute(
        "src",
        "blob:kanban-cover",
      );
    });
    expect(screen.getByTestId("kanban-card-cover")).toHaveAttribute(
      "data-cover-attachment-id",
      "att-cover",
    );
    expect(fetchMock).toHaveBeenCalledOnce();

    rerender(
      <KanbanBoard
        columns={DEFAULT_PROJECT_STATUSES}
        tasks={[{ ...coverTask, cover: null }]}
        onSelectTask={vi.fn()}
        onMoveTask={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.queryByTestId("kanban-card-cover")).not.toBeInTheDocument();
  });
});
