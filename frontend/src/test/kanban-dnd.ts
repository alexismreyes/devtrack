import { act, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

const DEFAULT_COLUMN_ORDER = ["TODO", "IN_PROGRESS", "DONE"] as const;

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

export function stubKanbanRects(
  columnOrder: readonly string[] = DEFAULT_COLUMN_ORDER,
): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const column =
      this.getAttribute("data-kanban-column") ??
      this.closest("[data-kanban-column]")?.getAttribute("data-kanban-column");
    const index =
      column !== null && column !== undefined
        ? columnOrder.indexOf(column)
        : -1;
    const left = index >= 0 ? index * 300 : 0;
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
  targetStatus: string,
  currentStatus: string,
  columnOrder: readonly string[] = DEFAULT_COLUMN_ORDER,
): Promise<void> {
  const from = columnOrder.indexOf(currentStatus);
  const to = columnOrder.indexOf(targetStatus);
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
