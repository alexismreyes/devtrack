import { act, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

const COLUMN_LEFT: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 300,
  DONE: 600,
};

function asDomRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    width,
    height,
    top,
    left,
    right: left + width,
    bottom: top + height,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

export function stubKanbanRects(): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const column =
      this.getAttribute("data-kanban-column") ??
      this.closest("[data-kanban-column]")?.getAttribute("data-kanban-column");
    const left =
      column !== null && column !== undefined && column in COLUMN_LEFT
        ? COLUMN_LEFT[column]
        : 0;
    if (this.hasAttribute("data-kanban-column")) {
      return asDomRect(left, 0, 280, 500);
    }
    if (this.hasAttribute("data-kanban-card")) {
      return asDomRect(left + 12, 48, 240, 56);
    }
    return asDomRect(0, 0, 0, 0);
  });
}

async function flushSensors(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  });
}

function keyDown(target: Document | Element, code: string, key: string): void {
  fireEvent.keyDown(target, {
    key,
    code,
    bubbles: true,
    cancelable: true,
  });
}

export async function keyboardStartDrag(card: HTMLElement): Promise<void> {
  card.focus();
  keyDown(card, "Space", " ");
  await flushSensors();
}

export async function keyboardDropOnColumn(
  card: HTMLElement,
  targetStatus: "TODO" | "IN_PROGRESS" | "DONE",
  currentStatus: "TODO" | "IN_PROGRESS" | "DONE",
): Promise<void> {
  const order = ["TODO", "IN_PROGRESS", "DONE"] as const;
  const from = order.indexOf(currentStatus);
  const to = order.indexOf(targetStatus);
  card.focus();
  keyDown(card, "Space", " ");
  await flushSensors();
  if (to > from) {
    for (let step = 0; step < to - from; step += 1) {
      keyDown(document, "ArrowRight", "ArrowRight");
      await flushSensors();
    }
  } else if (to < from) {
    for (let step = 0; step < from - to; step += 1) {
      keyDown(document, "ArrowLeft", "ArrowLeft");
      await flushSensors();
    }
  }
  keyDown(document, "Space", " ");
  await flushSensors();
}
