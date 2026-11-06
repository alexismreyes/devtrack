import { describe, expect, it } from "vitest";
import {
  InvalidStatusColorError,
  InvalidStatusKeyError,
  InvalidStatusNameError,
  InvalidStatusReorderError,
  LastNonCompletedStatusError,
  LastStatusError,
  StatusInUseError,
  StatusKeyImmutableError,
} from "../domain/errors";
import {
  applyStatusReorder,
  assertCanDeleteStatus,
  assertCanSetIsCompleted,
  assertStatusKeyInCatalog,
  nextCustomStatusPosition,
  ProjectStatus,
  rejectClientStatusKeyMutation,
  resolveDefaultStatusKey,
  SEEDED_STATUS_DEFINITIONS,
  SEEDED_STATUS_KEY_TODO,
  sortStatusesByPositionAsc,
  STATUS_NAME_MAX_LENGTH,
  toStatusNameKey,
} from "../domain/project-status";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function seedCatalog(projectId = PROJECT_ID): ProjectStatus[] {
  return SEEDED_STATUS_DEFINITIONS.map((definition) =>
    ProjectStatus.createSeeded(projectId, definition),
  );
}

describe("project status domain", () => {
  it("creates seeded rows with immutable keys, seed marker, and default positions", () => {
    const [todo, inProgress, done] = seedCatalog();

    expect(todo.key).toBe("TODO");
    expect(todo.name).toBe("To do");
    expect(todo.color).toBe("GRAY");
    expect(todo.isSystem).toBe(true);
    expect(todo.isCompleted).toBe(false);
    expect(todo.position).toBe(0);

    expect(inProgress.key).toBe("IN_PROGRESS");
    expect(inProgress.position).toBe(1);
    expect(done.key).toBe("DONE");
    expect(done.isCompleted).toBe(true);
    expect(done.position).toBe(2);
  });

  it("creates custom statuses with UUID key, isSystem false, and append position", () => {
    const seeded = seedCatalog();
    const custom = ProjectStatus.createCustom(
      PROJECT_ID,
      "  On hold  ",
      "ORANGE",
      nextCustomStatusPosition(seeded),
      false,
    );

    expect(custom.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(custom.key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(custom.key).not.toBe(custom.id);
    expect(custom.name).toBe("On hold");
    expect(custom.nameKey).toBe("on hold");
    expect(custom.isSystem).toBe(false);
    expect(custom.isCompleted).toBe(false);
    expect(custom.position).toBe(3);
  });

  it("requires name length 1–40 and rejects unknown colors", () => {
    expect(() =>
      ProjectStatus.createCustom(PROJECT_ID, "   ", "RED", 0),
    ).toThrow(InvalidStatusNameError);
    expect(() =>
      ProjectStatus.createCustom(
        PROJECT_ID,
        "a".repeat(STATUS_NAME_MAX_LENGTH + 1),
        "RED",
        0,
      ),
    ).toThrow(InvalidStatusNameError);
    expect(() =>
      ProjectStatus.createCustom(PROJECT_ID, "Blocked", "CYAN", 0),
    ).toThrow(InvalidStatusColorError);
    expect(toStatusNameKey("  MixEd  ")).toBe("mixed");
  });

  it("allows name/color/isCompleted edits on seeded rows without changing key", () => {
    const [todo] = seedCatalog();
    const updated = todo.withDetails({
      name: " Backlog ",
      color: "PURPLE",
      isCompleted: true,
    });

    expect(updated.key).toBe(todo.key);
    expect(updated.isSystem).toBe(true);
    expect(updated.name).toBe("Backlog");
    expect(updated.color).toBe("PURPLE");
    expect(updated.isCompleted).toBe(true);
    expect(updated.position).toBe(todo.position);
  });

  it("rejects client attempts to mutate key", () => {
    expect(() => rejectClientStatusKeyMutation({ key: "X" })).toThrow(
      StatusKeyImmutableError,
    );
    expect(() => rejectClientStatusKeyMutation({})).not.toThrow();
  });

  it("validates assignment keys against same-project catalog", () => {
    const local = seedCatalog();
    const foreignCustom = ProjectStatus.createCustom(
      OTHER_PROJECT_ID,
      "Foreign",
      "PINK",
      3,
    );
    const custom = ProjectStatus.createCustom(PROJECT_ID, "Hold", "TEAL", 3);

    expect(
      assertStatusKeyInCatalog([...local, custom], PROJECT_ID, custom.key).id,
    ).toBe(custom.id);
    expect(() =>
      assertStatusKeyInCatalog(local, PROJECT_ID, foreignCustom.key),
    ).toThrow(InvalidStatusKeyError);
    expect(() =>
      assertStatusKeyInCatalog(local, PROJECT_ID, "missing"),
    ).toThrow(InvalidStatusKeyError);
  });

  it("resolves create default to TODO else first non-completed by position", () => {
    const seeded = seedCatalog();
    expect(resolveDefaultStatusKey(seeded)).toBe(SEEDED_STATUS_KEY_TODO);

    const withoutTodo = seeded.filter(
      (status) => status.key !== SEEDED_STATUS_KEY_TODO,
    );
    expect(resolveDefaultStatusKey(withoutTodo)).toBe("IN_PROGRESS");

    const onlyCompleted = [
      ProjectStatus.createCustom(PROJECT_ID, "Closed", "GREEN", 0, true),
    ];
    expect(() => resolveDefaultStatusKey(onlyCompleted)).toThrow(
      LastNonCompletedStatusError,
    );
  });

  it("blocks delete when in use, last status, or last non-completed", () => {
    const seeded = seedCatalog();
    const [todo, inProgress, done] = seeded;

    expect(() => assertCanDeleteStatus(seeded, todo!, 1)).toThrow(
      StatusInUseError,
    );
    expect(() => assertCanDeleteStatus([todo!], todo!, 0)).toThrow(
      LastStatusError,
    );
    expect(() =>
      assertCanDeleteStatus([todo!, done!], todo!, 0),
    ).toThrow(LastNonCompletedStatusError);
    expect(() =>
      assertCanDeleteStatus(seeded, inProgress!, 0),
    ).not.toThrow();
  });

  it("blocks flipping the last non-completed status to completed", () => {
    const statuses = [
      ProjectStatus.createCustom(PROJECT_ID, "Open", "GRAY", 0, false),
      ProjectStatus.createCustom(PROJECT_ID, "Closed", "GREEN", 1, true),
    ];
    expect(() =>
      assertCanSetIsCompleted(statuses, statuses[0]!, true),
    ).toThrow(LastNonCompletedStatusError);
    expect(() =>
      assertCanSetIsCompleted(statuses, statuses[1]!, false),
    ).not.toThrow();
  });

  it("reorders full catalog by contiguous positions without mutating metadata", () => {
    const seeded = seedCatalog();
    const custom = ProjectStatus.createCustom(PROJECT_ID, "Hold", "ORANGE", 3);
    const catalog = [...seeded, custom];
    const reorderedIds = [custom.id, seeded[2]!.id, seeded[0]!.id, seeded[1]!.id];

    const next = applyStatusReorder(catalog, reorderedIds);
    expect(next.map((status) => status.id)).toEqual(reorderedIds);
    expect(next.map((status) => status.position)).toEqual([0, 1, 2, 3]);
    expect(next[0]!.key).toBe(custom.key);
    expect(next[0]!.name).toBe(custom.name);
    expect(next[0]!.isCompleted).toBe(false);
    expect(next[0]!.isSystem).toBe(false);

    expect(() =>
      applyStatusReorder(catalog, [seeded[0]!.id, seeded[1]!.id]),
    ).toThrow(InvalidStatusReorderError);
    expect(() =>
      applyStatusReorder(catalog, [
        seeded[0]!.id,
        seeded[0]!.id,
        seeded[1]!.id,
        seeded[2]!.id,
      ]),
    ).toThrow(InvalidStatusReorderError);
  });

  it("sorts by position ascending", () => {
    const a = ProjectStatus.rehydrate(
      "11111111-1111-4111-8111-111111111111",
      PROJECT_ID,
      "A",
      "A",
      "RED",
      false,
      false,
      2,
      new Date("2026-11-01T00:00:00.000Z"),
    );
    const b = ProjectStatus.rehydrate(
      "22222222-2222-4222-8222-222222222222",
      PROJECT_ID,
      "B",
      "B",
      "BLUE",
      false,
      false,
      0,
      new Date("2026-11-01T00:00:00.000Z"),
    );
    expect(sortStatusesByPositionAsc([a, b]).map((s) => s.key)).toEqual([
      "B",
      "A",
    ]);
  });
});
