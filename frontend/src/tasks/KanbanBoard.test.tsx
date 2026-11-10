import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicTaskDto } from "../api/types";
import {
  keyboardDropOnColumn,
  keyboardReorderCard,
  keyboardReorderColumn,
  keyboardStartDrag,
  stubKanbanRects,
} from "../test/kanban-dnd";
import { DEFAULT_PROJECT_STATUSES } from "../test/statuses";
import {
  KanbanBoard,
  resolveColumnReorder,
  resolveKanbanDrop,
  resolveTaskReorder,
  sortTasksByPosition,
} from "./KanbanBoard";
import { labelSoftTintClassName } from "./labelColors";

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
  position: 0,
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
    onReorderColumns?: (statusIds: string[]) => Promise<void>;
    onReorderTasks?: (status: string, taskIds: string[]) => Promise<void>;
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
      onReorderColumns={props.onReorderColumns}
      onReorderTasks={props.onReorderTasks}
      onAddTask={props.onAddTask}
      disabled={props.disabled}
    />,
  );
}

const statusIds = DEFAULT_PROJECT_STATUSES.map((status) => status.id);

describe("resolveKanbanDrop", () => {
  it("returns the target status key for a cross-column drop (AC-005)", () => {
    expect(
      resolveKanbanDrop("task-1", "IN_PROGRESS", [todoTask], columnKeys),
    ).toEqual({
      taskId: "task-1",
      status: "IN_PROGRESS",
    });
  });

  it("is a no-op for a same-column status target (reorder owns that path)", () => {
    expect(
      resolveKanbanDrop("task-1", "TODO", [todoTask], columnKeys),
    ).toBeNull();
  });

  it("resolves cross-column drops onto a card in the target column", () => {
    const inProgress: PublicTaskDto = {
      ...todoTask,
      id: "task-2",
      status: "IN_PROGRESS",
      position: 0,
    };
    expect(
      resolveKanbanDrop("task-1", "task-2", [todoTask, inProgress], columnKeys),
    ).toEqual({
      taskId: "task-1",
      status: "IN_PROGRESS",
    });
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

describe("resolveTaskReorder", () => {
  it("returns the reordered task id list (AC-001)", () => {
    expect(
      resolveTaskReorder("task-1", "task-2", ["task-1", "task-2", "task-3"]),
    ).toEqual(["task-2", "task-1", "task-3"]);
  });

  it("is a no-op when the drop target matches the active task", () => {
    expect(resolveTaskReorder("task-1", "task-1", ["task-1", "task-2"])).toBeNull();
  });

  it("is a no-op when there is no drop target", () => {
    expect(resolveTaskReorder("task-1", null, ["task-1", "task-2"])).toBeNull();
  });
});

describe("sortTasksByPosition", () => {
  it("orders by position ascending then id (AC-007)", () => {
    const first: PublicTaskDto = { ...todoTask, id: "b", position: 1 };
    const second: PublicTaskDto = { ...todoTask, id: "a", position: 0 };
    const third: PublicTaskDto = { ...todoTask, id: "c", position: 1 };
    expect(sortTasksByPosition([first, third, second]).map((task) => task.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("resolveColumnReorder", () => {
  it("returns the reordered status id list (AC-001)", () => {
    expect(
      resolveColumnReorder(
        "status-todo",
        "status-in-progress",
        statusIds,
      ),
    ).toEqual([
      "status-in-progress",
      "status-todo",
      "status-done",
    ]);
  });

  it("is a no-op when the drop target matches the active column", () => {
    expect(
      resolveColumnReorder("status-todo", "status-todo", statusIds),
    ).toBeNull();
  });

  it("is a no-op when there is no drop target", () => {
    expect(resolveColumnReorder("status-todo", null, statusIds)).toBeNull();
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

  it("does not call onMoveTask for a same-column drop onto the column", async () => {
    stubKanbanRects();
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    const onReorderTasks = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onMoveTask, onReorderTasks });

    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "TODO", "TODO");
    expect(onMoveTask).not.toHaveBeenCalled();
    expect(onReorderTasks).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /write tests/i })).toBeInTheDocument();
  });

  it("calls onReorderTasks for a within-column card reorder (AC-001 / AC-002)", async () => {
    stubKanbanRects();
    const secondTodo: PublicTaskDto = {
      ...todoTask,
      id: "task-2",
      title: "Second card",
      position: 1,
    };
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    const onReorderTasks = vi.fn().mockResolvedValue(undefined);
    renderBoard({
      tasks: [todoTask, secondTodo],
      onMoveTask,
      onReorderTasks,
    });

    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardReorderCard(card as HTMLElement, 1);
    expect(onReorderTasks).toHaveBeenCalledOnce();
    expect(onReorderTasks).toHaveBeenCalledWith("TODO", ["task-2", "task-1"]);
    expect(onMoveTask).not.toHaveBeenCalled();
  });

  it("does not offer card reorder when onReorderTasks is omitted (AC-005)", () => {
    renderBoard({
      tasks: [
        todoTask,
        { ...todoTask, id: "task-2", title: "Second", position: 1 },
      ],
    });

    expect(document.querySelector("[data-kanban-card-sortable]")).toBeNull();
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
    expect(screen.getByTestId("kanban-column-header-TODO")).toHaveClass(
      ...labelSoftTintClassName("GRAY").split(" "),
    );
    expect(screen.getByTestId("kanban-column-header-IN_PROGRESS")).toBeInTheDocument();
    expect(screen.getByTestId("kanban-column-header-DONE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add task to todo/i })).toBeInTheDocument();
  });

  it("shows a grab cursor on sortable task cards", () => {
    renderBoard({
      onReorderTasks: vi.fn().mockResolvedValue(undefined),
    });

    expect(document.querySelector('[data-kanban-card="task-1"]')).toHaveClass(
      "cursor-grab",
    );
  });

  it("opens task detail from a non-title region of the card (AC-002)", async () => {
    const user = userEvent.setup();
    const onSelectTask = vi.fn();
    renderBoard({ onSelectTask });

    await user.click(screen.getByText(/priority medium/i));
    expect(onSelectTask).toHaveBeenCalledOnce();
    expect(onSelectTask).toHaveBeenCalledWith("task-1");
  });

  it("uses a single card control without a nested title button (AC-002)", () => {
    renderBoard();

    const card = document.querySelector(
      '[data-kanban-card="task-1"]',
    ) as HTMLElement;
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("aria-label", "Write tests");
    expect(card.querySelector("button")).toBeNull();
    expect(screen.getByRole("button", { name: /write tests/i })).toBe(card);
  });

  it("does not open task detail after a completed status drag (AC-003 / Q-154)", async () => {
    stubKanbanRects();
    const onSelectTask = vi.fn();
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onSelectTask, onMoveTask });

    const card = document.querySelector(
      '[data-kanban-card="task-1"]',
    ) as HTMLElement;
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card, "IN_PROGRESS", "TODO");
    expect(onMoveTask).toHaveBeenCalledOnce();
    expect(onMoveTask).toHaveBeenCalledWith("task-1", "IN_PROGRESS");
    expect(onSelectTask).not.toHaveBeenCalled();
  });

  it("suppresses card open while a drag is active (AC-003 / Q-154)", async () => {
    stubKanbanRects();
    const onSelectTask = vi.fn();
    renderBoard({ onSelectTask });

    const card = document.querySelector(
      '[data-kanban-card="task-1"]',
    ) as HTMLElement;
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardStartDrag(card);
    expect(document.querySelector('[data-slot="kanban-drag-overlay"]')).not.toBeNull();
    fireEvent.click(card);
    expect(onSelectTask).not.toHaveBeenCalled();
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

  it("calls onReorderColumns when a writable column is keyboard-reordered (AC-001)", async () => {
    stubKanbanRects();
    const onReorderColumns = vi.fn().mockResolvedValue(undefined);
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onReorderColumns, onMoveTask });

    const handle = document.querySelector(
      '[data-kanban-column-handle="status-todo"]',
    ) as HTMLElement;
    expect(handle).toBeInstanceOf(HTMLElement);
    await keyboardReorderColumn(handle, 1);
    expect(onReorderColumns).toHaveBeenCalledOnce();
    expect(onReorderColumns).toHaveBeenCalledWith([
      "status-in-progress",
      "status-todo",
      "status-done",
    ]);
    expect(onMoveTask).not.toHaveBeenCalled();
  });

  it("does not offer column drag when onReorderColumns is omitted (AC-006)", () => {
    renderBoard();

    const header = screen.getByTestId("kanban-column-header-TODO");
    expect(document.querySelector("[data-kanban-column-handle]")).toBeNull();
    expect(header).not.toHaveClass("cursor-grab");
    expect(header).not.toHaveAttribute("data-kanban-column-handle");
  });

  it("does not offer column drag when the board is disabled (AC-006)", () => {
    renderBoard({
      onReorderColumns: vi.fn().mockResolvedValue(undefined),
      disabled: true,
    });

    const header = screen.getByTestId("kanban-column-header-TODO");
    expect(document.querySelector("[data-kanban-column-handle]")).toBeNull();
    expect(header).not.toHaveClass("cursor-grab");
  });

  it("uses the full header strip as column handle with grab/grabbing (AC-001)", async () => {
    stubKanbanRects();
    renderBoard({
      onReorderColumns: vi.fn().mockResolvedValue(undefined),
      onAddTask: vi.fn(),
    });

    const handle = screen.getByTestId("kanban-column-header-TODO");
    expect(handle).toHaveAttribute("data-kanban-column-handle", "status-todo");
    expect(handle).toHaveClass("cursor-grab");
    expect(handle).toHaveAttribute("role", "columnheader");
    expect(
      screen.getByRole("button", { name: /add task to todo/i }),
    ).not.toHaveAttribute("data-kanban-column-handle");
    await keyboardStartDrag(handle);
    expect(handle).toHaveClass("cursor-grabbing");
  });

  it("tints writable column headers with soft status color (AC-002)", () => {
    renderBoard({
      onReorderColumns: vi.fn().mockResolvedValue(undefined),
    });

    const todoHeader = screen.getByTestId("kanban-column-header-TODO");
    expect(todoHeader).toHaveClass(...labelSoftTintClassName("GRAY").split(" "));
    expect(todoHeader.querySelector("[data-status-color='GRAY']")).not.toBeNull();
    expect(todoHeader).toHaveTextContent("To do");

    const inProgressHeader = screen.getByTestId("kanban-column-header-IN_PROGRESS");
    expect(inProgressHeader).toHaveClass(
      ...labelSoftTintClassName("BLUE").split(" "),
    );
    expect(
      inProgressHeader.querySelector("[data-status-color='BLUE']"),
    ).not.toBeNull();
  });

  it("shows free-follow compact chrome overlay and rail ghost while column dragging (AC-003)", async () => {
    stubKanbanRects();
    renderBoard({
      onReorderColumns: vi.fn().mockResolvedValue(undefined),
      tasks: [todoTask],
    });

    const handle = document.querySelector(
      '[data-kanban-column-handle="status-todo"]',
    ) as HTMLElement;
    expect(handle).toBeInstanceOf(HTMLElement);
    await keyboardStartDrag(handle);

    const overlay = document.querySelector(
      '[data-slot="kanban-column-drag-overlay"]',
    );
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveTextContent("To do");
    expect(overlay?.querySelectorAll("[aria-hidden='true']").length).toBeGreaterThan(
      0,
    );
    expect(overlay?.textContent).not.toMatch(/Write tests/i);

    const sourceColumn = document.querySelector(
      '[data-kanban-column="TODO"]',
    ) as HTMLElement;
    expect(sourceColumn).toHaveAttribute(
      "data-kanban-column-ghost",
      "status-todo",
    );
    expect(
      sourceColumn.querySelector('[data-slot="kanban-column-rail-ghost"]'),
    ).not.toBeNull();
    expect(
      within(sourceColumn).queryByRole("list", { name: "TODO tasks" }),
    ).not.toBeInTheDocument();
  });

  it("uses grab/grabbing cursors on column chrome when sortable (AC-004)", async () => {
    stubKanbanRects();
    renderBoard({
      onReorderColumns: vi.fn().mockResolvedValue(undefined),
    });

    const handle = document.querySelector(
      '[data-kanban-column-handle="status-todo"]',
    ) as HTMLElement;
    expect(handle).toHaveClass("cursor-grab");
    await keyboardStartDrag(handle);
    expect(handle).toHaveClass("cursor-grabbing");
    expect(
      document.querySelector('[data-slot="kanban-column-drag-overlay"]'),
    ).not.toBeNull();
  });

  it("keeps task cross-column moves on cards without column reorder (AC-002 / AC-003 / AC-009)", async () => {
    stubKanbanRects();
    const onReorderColumns = vi.fn().mockResolvedValue(undefined);
    const onReorderTasks = vi.fn().mockResolvedValue(undefined);
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onReorderColumns, onReorderTasks, onMoveTask });

    const card = document.querySelector('[data-kanban-card="task-1"]');
    expect(card).toBeInstanceOf(HTMLElement);
    await keyboardDropOnColumn(card as HTMLElement, "IN_PROGRESS", "TODO");
    expect(onMoveTask).toHaveBeenCalledOnce();
    expect(onMoveTask).toHaveBeenCalledWith("task-1", "IN_PROGRESS");
    expect(onReorderColumns).not.toHaveBeenCalled();
    expect(onReorderTasks).not.toHaveBeenCalled();
  });

  it("keeps column reorder without calling task reorder (AC-009)", async () => {
    stubKanbanRects();
    const onReorderColumns = vi.fn().mockResolvedValue(undefined);
    const onReorderTasks = vi.fn().mockResolvedValue(undefined);
    const onMoveTask = vi.fn().mockResolvedValue(undefined);
    renderBoard({ onReorderColumns, onReorderTasks, onMoveTask });

    const handle = document.querySelector(
      '[data-kanban-column-handle="status-todo"]',
    ) as HTMLElement;
    expect(handle).toBeInstanceOf(HTMLElement);
    await keyboardReorderColumn(handle, 1);
    expect(onReorderColumns).toHaveBeenCalledOnce();
    expect(onReorderTasks).not.toHaveBeenCalled();
    expect(onMoveTask).not.toHaveBeenCalled();
  });

  it("marks writable cards as sortable without a separate rank control (AC-001)", () => {
    renderBoard({
      onReorderColumns: vi.fn().mockResolvedValue(undefined),
      onReorderTasks: vi.fn().mockResolvedValue(undefined),
    });

    expect(
      document.querySelector('[data-kanban-card-sortable="task-1"]'),
    ).not.toBeNull();
    expect(screen.queryByLabelText(/rank/i)).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-kanban-card="task-1"]'),
    ).toHaveClass("cursor-grab");
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
