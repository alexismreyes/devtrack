import { describe, expect, it } from "vitest";
import { TASK_STATUS_LABELS, taskStatusLabel } from "./statusDisplay";

describe("statusDisplay", () => {
  it("maps fixed TaskStatus enums to friendly labels (Q-127)", () => {
    expect(taskStatusLabel("TODO")).toBe("To do");
    expect(taskStatusLabel("IN_PROGRESS")).toBe("In progress");
    expect(taskStatusLabel("DONE")).toBe("Done");
    expect(Object.keys(TASK_STATUS_LABELS).sort()).toEqual(
      ["DONE", "IN_PROGRESS", "TODO"].sort(),
    );
  });
});
