import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKLIST_ITEMS_WINDOW_SIZE,
  checklistProgressPercent,
  TaskChecklistsPanel,
} from "./TaskChecklistsPanel";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    checklistId: "checklist-1",
    text: `Item ${index + 1}`,
    checked: index === 0,
    createdAt: `2026-11-05T12:${String(index).padStart(2, "0")}:00.000Z`,
  }));
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("checklistProgressPercent", () => {
  it("returns 0 for empty checklists and rounds non-empty ratios (Q-122)", () => {
    expect(checklistProgressPercent(0, 0)).toBe(0);
    expect(checklistProgressPercent(1, 3)).toBe(33);
    expect(checklistProgressPercent(2, 3)).toBe(67);
    expect(checklistProgressPercent(1, 2)).toBe(50);
    expect(checklistProgressPercent(3, 3)).toBe(100);
  });
});

describe("TaskChecklistsPanel item window (038)", () => {
  it("shows at most 10 items and Next replaces the window (AC-001/AC-002)", async () => {
    const user = userEvent.setup();
    const allItems = makeItems(12);
    const firstPage = allItems.slice(0, CHECKLIST_ITEMS_WINDOW_SIZE);
    const secondPage = allItems.slice(CHECKLIST_ITEMS_WINDOW_SIZE);
    let itemsCalls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.endsWith("/api/tasks/task-1/checklists")) {
          return jsonResponse(200, {
            checklists: [
              {
                id: "checklist-1",
                taskId: "task-1",
                name: "Long",
                createdAt: "2026-11-05T11:00:00.000Z",
                items: [],
                itemCount: 12,
                checkedCount: 1,
              },
            ],
          });
        }
        if (url.includes("/api/tasks/task-1/checklists/checklist-1/items")) {
          itemsCalls += 1;
          if (url.includes("cursor=")) {
            return jsonResponse(200, {
              items: secondPage,
              nextCursor: null,
            });
          }
          return jsonResponse(200, {
            items: firstPage,
            nextCursor: "cursor-page-2",
          });
        }
        return jsonResponse(404, {
          error: { code: "NOT_FOUND", message: "missing" },
        });
      }),
    );

    render(
      <TaskChecklistsPanel
        taskId="task-1"
        canWrite={true}
        onUnauthenticated={vi.fn()}
        onActivityMaybeChanged={vi.fn()}
      />,
    );

    const list = await screen.findByTestId("checklist-items-checklist-1");
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    expect(within(list).queryByText("Item 11")).toBeNull();
    expect(itemsCalls).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await waitFor(() => {
      expect(within(list).getByText("Item 11")).toBeInTheDocument();
    });
    expect(within(list).queryByText("Item 1")).toBeNull();
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("Prev restores the prior window via FE stack (AC-003)", async () => {
    const user = userEvent.setup();
    const allItems = makeItems(12);
    const firstPage = allItems.slice(0, CHECKLIST_ITEMS_WINDOW_SIZE);
    const secondPage = allItems.slice(CHECKLIST_ITEMS_WINDOW_SIZE);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.endsWith("/api/tasks/task-1/checklists")) {
          return jsonResponse(200, {
            checklists: [
              {
                id: "checklist-1",
                taskId: "task-1",
                name: "Long",
                createdAt: "2026-11-05T11:00:00.000Z",
                items: [],
                itemCount: 12,
                checkedCount: 1,
              },
            ],
          });
        }
        if (url.includes("/api/tasks/task-1/checklists/checklist-1/items")) {
          if (url.includes("cursor=")) {
            return jsonResponse(200, {
              items: secondPage,
              nextCursor: null,
            });
          }
          return jsonResponse(200, {
            items: firstPage,
            nextCursor: "cursor-page-2",
          });
        }
        return jsonResponse(404, {
          error: { code: "NOT_FOUND", message: "missing" },
        });
      }),
    );

    render(
      <TaskChecklistsPanel
        taskId="task-1"
        canWrite={true}
        onUnauthenticated={vi.fn()}
        onActivityMaybeChanged={vi.fn()}
      />,
    );

    const list = await screen.findByTestId("checklist-items-checklist-1");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await waitFor(() => {
      expect(within(list).getByText("Item 11")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^previous$/i }));
    await waitFor(() => {
      expect(within(list).getByText("Item 1")).toBeInTheDocument();
    });
    expect(within(list).queryByText("Item 11")).toBeNull();
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
  });

  it("resets to the first page after an item mutation (Q-230)", async () => {
    const user = userEvent.setup();
    const allItems = makeItems(12);
    const firstPage = allItems.slice(0, CHECKLIST_ITEMS_WINDOW_SIZE);
    const secondPage = allItems.slice(CHECKLIST_ITEMS_WINDOW_SIZE);
    let firstPageFetches = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const method = init?.method ?? "GET";
        if (url.endsWith("/api/tasks/task-1/checklists") && method === "GET") {
          return jsonResponse(200, {
            checklists: [
              {
                id: "checklist-1",
                taskId: "task-1",
                name: "Long",
                createdAt: "2026-11-05T11:00:00.000Z",
                items: [],
                itemCount: 12,
                checkedCount: 1,
              },
            ],
          });
        }
        if (
          url.includes("/api/tasks/task-1/checklists/checklist-1/items/item-11") &&
          method === "PATCH"
        ) {
          return jsonResponse(200, {
            ...secondPage[0],
            checked: true,
          });
        }
        if (
          url.includes("/api/tasks/task-1/checklists/checklist-1/items") &&
          method === "GET"
        ) {
          if (url.includes("cursor=")) {
            return jsonResponse(200, {
              items: secondPage,
              nextCursor: null,
            });
          }
          firstPageFetches += 1;
          return jsonResponse(200, {
            items: firstPage,
            nextCursor: "cursor-page-2",
          });
        }
        return jsonResponse(404, {
          error: { code: "NOT_FOUND", message: "missing" },
        });
      }),
    );

    render(
      <TaskChecklistsPanel
        taskId="task-1"
        canWrite={true}
        onUnauthenticated={vi.fn()}
        onActivityMaybeChanged={vi.fn()}
      />,
    );

    const list = await screen.findByTestId("checklist-items-checklist-1");
    await user.click(screen.getByRole("button", { name: /^next$/i }));
    await waitFor(() => {
      expect(within(list).getByText("Item 11")).toBeInTheDocument();
    });
    const fetchesAfterNext = firstPageFetches;

    await user.click(
      within(list).getByRole("checkbox", {
        name: /mark item 11 complete/i,
      }),
    );

    await waitFor(() => {
      expect(within(list).getByText("Item 1")).toBeInTheDocument();
    });
    expect(within(list).queryByText("Item 11")).toBeNull();
    expect(firstPageFetches).toBeGreaterThan(fetchesAfterNext);
  });
});
