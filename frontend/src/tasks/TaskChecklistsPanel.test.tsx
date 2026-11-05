import { describe, expect, it } from "vitest";
import { checklistProgressPercent } from "./TaskChecklistsPanel";

describe("checklistProgressPercent", () => {
  it("returns 0 for empty checklists and rounds non-empty ratios (Q-122)", () => {
    expect(checklistProgressPercent(0, 0)).toBe(0);
    expect(checklistProgressPercent(1, 3)).toBe(33);
    expect(checklistProgressPercent(2, 3)).toBe(67);
    expect(checklistProgressPercent(1, 2)).toBe(50);
    expect(checklistProgressPercent(3, 3)).toBe(100);
  });
});
