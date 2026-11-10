import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EYECANDY_SURFACE_CLASS } from "../theme/uiPalettes";
import { TaskChecklistsPanel } from "./TaskChecklistsPanel";

const sampleChecklist = {
  id: "checklist-1",
  taskId: "task-1",
  name: "QA",
  createdAt: "2026-11-05T12:00:00.000Z",
  items: [
    {
      id: "item-1",
      checklistId: "checklist-1",
      text: "Write tests",
      checked: false,
      createdAt: "2026-11-05T12:00:00.000Z",
    },
  ],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TaskChecklistsPanel eyecandy (023)", () => {
  it("applies pointer cursor and non-flat eyecandy surface on interactive controls (AC-001/AC-002)", async () => {
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
          return jsonResponse(200, { checklists: [sampleChecklist] });
        }
        return jsonResponse(404, { error: { code: "NOT_FOUND", message: "missing" } });
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

    const block = await screen.findByTestId("checklist-block-checklist-1");
    expect(block).toHaveClass(EYECANDY_SURFACE_CLASS);
    expect(block.className).not.toMatch(/(^|\s)bg-card(\s|$)/);

    const checkbox = within(block).getByRole("checkbox", {
      name: /mark write tests complete/i,
    });
    expect(checkbox).toHaveClass("cursor-pointer");
    expect(checkbox).not.toBeDisabled();

    expect(
      within(block).getByRole("button", { name: /add item/i }),
    ).toHaveClass("cursor-pointer");
    expect(
      within(block).getByRole("button", { name: /delete checklist/i }),
    ).toHaveClass("cursor-pointer");
    expect(
      within(block).getByRole("button", { name: /delete item/i }),
    ).toHaveClass("cursor-pointer");
  });
});
