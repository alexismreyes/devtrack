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
      const columnRoot = this.closest("[data-kanban-column]");
      const cards =
        columnRoot === null
          ? []
          : Array.from(columnRoot.querySelectorAll("[data-kanban-card]"));
      const cardIndex = cards.indexOf(this);
      const top = 48 + Math.max(0, cardIndex) * 64;
      return asDomRect(left + 12, top, 240, 56);
    }
    if (this.hasAttribute("data-kanban-column-handle")) {
      return asDomRect(left + 8, 8, 240, 28);
    }
    // Task droppable / list region inside a column.
    if (column !== null && column !== undefined && index >= 0) {
      return asDomRect(left, 40, 280, 440);
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

export async function keyboardReorderColumn(
  handle: HTMLElement,
  stepsRight: number,
): Promise<void> {
  handle.focus();
  keyDown(handle, "Space", " ");
  await flushSensors();
  const direction = stepsRight >= 0 ? "ArrowRight" : "ArrowLeft";
  const steps = Math.abs(stepsRight);
  for (let step = 0; step < steps; step += 1) {
    keyDown(document, direction, direction);
    await flushSensors();
  }
  keyDown(document, "Space", " ");
  await flushSensors();
}

export async function keyboardReorderCard(
  card: HTMLElement,
  stepsDown: number,
): Promise<void> {
  card.focus();
  keyDown(card, "Space", " ");
  await flushSensors();
  const direction = stepsDown >= 0 ? "ArrowDown" : "ArrowUp";
  const steps = Math.abs(stepsDown);
  for (let step = 0; step < steps; step += 1) {
    keyDown(document, direction, direction);
    await flushSensors();
  }
  keyDown(document, "Space", " ");
  await flushSensors();
}
