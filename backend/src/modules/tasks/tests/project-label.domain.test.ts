import { describe, expect, it } from "vitest";
import {
  InvalidLabelColorError,
  InvalidLabelNameError,
  LabelNotFoundError,
} from "../domain/errors";
import {
  assertLabelsBelongToProject,
  canonicalizeLabelIds,
  LABEL_NAME_MAX_LENGTH,
  ProjectLabel,
  sortLabelsByNameAsc,
  toLabelNameKey,
} from "../domain/project-label";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("project label domain", () => {
  it("assigns UUID identity, created time, project binding, nameKey, and color", () => {
    const before = Date.now();
    const label = ProjectLabel.create(PROJECT_ID, "  Backend  ", "BLUE");
    const after = Date.now();

    expect(label.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(label.projectId).toBe(PROJECT_ID);
    expect(label.name).toBe("Backend");
    expect(label.nameKey).toBe("backend");
    expect(label.color).toBe("BLUE");
    expect(label.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(label.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("requires name length 1–40 after trim and rejects empty or too long names", () => {
    expect(() => ProjectLabel.create(PROJECT_ID, "   ", "RED")).toThrow(
      InvalidLabelNameError,
    );
    expect(() =>
      ProjectLabel.create(PROJECT_ID, "a".repeat(LABEL_NAME_MAX_LENGTH + 1), "RED"),
    ).toThrow(InvalidLabelNameError);
    expect(
      ProjectLabel.create(PROJECT_ID, "a".repeat(LABEL_NAME_MAX_LENGTH), "RED")
        .name.length,
    ).toBe(LABEL_NAME_MAX_LENGTH);
  });

  it("rejects unknown color tokens", () => {
    expect(() => ProjectLabel.create(PROJECT_ID, "Bug", "#ff0000")).toThrow(
      InvalidLabelColorError,
    );
    expect(() => ProjectLabel.create(PROJECT_ID, "Bug", "CYAN")).toThrow(
      InvalidLabelColorError,
    );
  });

  it("builds case-insensitive nameKey from trimmed display name", () => {
    expect(toLabelNameKey("  MixEd Case  ")).toBe("mixed case");
    expect(ProjectLabel.create(PROJECT_ID, "MixEd Case", "GRAY").nameKey).toBe(
      "mixed case",
    );
  });

  it("keeps projectId immutable across name/color updates", () => {
    const label = ProjectLabel.create(PROJECT_ID, "Original", "RED");
    const updated = label.withDetails({ name: " Renamed ", color: "GREEN" });

    expect(updated.id).toBe(label.id);
    expect(updated.projectId).toBe(PROJECT_ID);
    expect(updated.createdAt.getTime()).toBe(label.createdAt.getTime());
    expect(updated.name).toBe("Renamed");
    expect(updated.nameKey).toBe("renamed");
    expect(updated.color).toBe("GREEN");
  });

  it("canonicalizes replace-set ids with order-preserving unique collapse", () => {
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    expect(canonicalizeLabelIds([a, b, a, b])).toEqual([a, b]);
    expect(canonicalizeLabelIds([])).toEqual([]);
  });

  it("rejects cross-project or incomplete label sets for assignment", () => {
    const local = ProjectLabel.create(PROJECT_ID, "Local", "TEAL");
    const foreign = ProjectLabel.create(OTHER_PROJECT_ID, "Foreign", "PINK");

    expect(() =>
      assertLabelsBelongToProject([local], PROJECT_ID, [local.id, foreign.id]),
    ).toThrow(LabelNotFoundError);
    expect(() =>
      assertLabelsBelongToProject([foreign], PROJECT_ID, [foreign.id]),
    ).toThrow(LabelNotFoundError);
    expect(() =>
      assertLabelsBelongToProject([local], PROJECT_ID, [local.id]),
    ).not.toThrow();
  });

  it("sorts labels by name ascending with id tie-break", () => {
    const zebra = ProjectLabel.rehydrate(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      PROJECT_ID,
      "Zebra",
      "RED",
      new Date("2026-11-01T10:00:00.000Z"),
    );
    const alpha = ProjectLabel.rehydrate(
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      PROJECT_ID,
      "Alpha",
      "BLUE",
      new Date("2026-11-02T10:00:00.000Z"),
    );

    expect(sortLabelsByNameAsc([zebra, alpha]).map((l) => l.name)).toEqual([
      "Alpha",
      "Zebra",
    ]);
  });
});
