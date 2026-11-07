import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT_STATUSES } from "../test/statuses";
import {
  TASK_STATUS_LABELS,
  taskStatusColor,
  taskStatusLabel,
} from "./statusDisplay";

describe("statusDisplay", () => {
  it("maps seeded keys to friendly labels when catalog is absent", () => {
    expect(taskStatusLabel("TODO")).toBe("To do");
    expect(taskStatusLabel("IN_PROGRESS")).toBe("In progress");
    expect(taskStatusLabel("DONE")).toBe("Done");
    expect(Object.keys(TASK_STATUS_LABELS).sort()).toEqual(
      ["DONE", "IN_PROGRESS", "TODO"].sort(),
    );
  });

  it("prefers catalog display names and colors by key (AC-008)", () => {
    const custom = [
      ...DEFAULT_PROJECT_STATUSES,
      {
        id: "status-hold",
        projectId: "proj-1",
        key: "hold-key",
        name: "On hold",
        color: "ORANGE" as const,
        isSystem: false,
        isCompleted: false,
        position: 3,
        createdAt: "2026-11-06T13:00:00.000Z",
      },
    ];
    expect(taskStatusLabel("hold-key", custom)).toBe("On hold");
    expect(taskStatusLabel("TODO", custom)).toBe("To do");
    expect(taskStatusColor("hold-key", custom)).toBe("ORANGE");
    expect(taskStatusLabel("unknown-key")).toBe("unknown-key");
  });
});
