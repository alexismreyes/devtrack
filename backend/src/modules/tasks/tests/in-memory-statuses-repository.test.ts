import { describe, expect, it } from "vitest";
import {
  DuplicateStatusNameError,
  InvalidStatusReorderError,
  StatusNotFoundError,
} from "../domain/errors";
import { ProjectStatus } from "../domain/project-status";
import { InMemoryStatusesRepository } from "./in-memory-statuses-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("InMemoryStatusesRepository", () => {
  it("seeds defaults at positions 0/1/2 and lists by position asc", async () => {
    const statuses = new InMemoryStatusesRepository();
    const seeded = await statuses.seedDefaultsForProject(PROJECT_ID);
    const listed = await statuses.listByProjectId(PROJECT_ID);

    expect(seeded.map((s) => s.key)).toEqual([
      "TODO",
      "IN_PROGRESS",
      "DONE",
    ]);
    expect(listed.map((s) => s.position)).toEqual([0, 1, 2]);
    expect(listed.every((s) => s.isSystem)).toBe(true);
  });

  it("creates customs after max position and enforces name uniqueness", async () => {
    const statuses = new InMemoryStatusesRepository();
    await statuses.seedDefaultsForProject(PROJECT_ID);
    const custom = await statuses.create({
      projectId: PROJECT_ID,
      name: "On hold",
      color: "ORANGE",
    });
    expect(custom.position).toBe(3);
    expect(custom.isSystem).toBe(false);

    await expect(
      statuses.create({
        projectId: PROJECT_ID,
        name: "on HOLD",
        color: "RED",
      }),
    ).rejects.toBeInstanceOf(DuplicateStatusNameError);
  });

  it("resolves by key, counts in-use live tasks, and counts non-completed", async () => {
    const tasks = new InMemoryTasksRepository();
    const statuses = new InMemoryStatusesRepository(tasks);
    await statuses.seedDefaultsForProject(PROJECT_ID);
    const hold = await statuses.create({
      projectId: PROJECT_ID,
      name: "Hold",
      color: "TEAL",
      isCompleted: false,
    });

    await tasks.create({
      projectId: PROJECT_ID,
      title: "A",
      description: null,
      status: hold.key,
      dueDate: null,
    });
    await tasks.create({
      projectId: PROJECT_ID,
      title: "B",
      description: null,
      status: "TODO",
      dueDate: null,
    });
    const soft = await tasks.create({
      projectId: PROJECT_ID,
      title: "C",
      description: null,
      status: hold.key,
      dueDate: null,
    });
    await tasks.softDelete(soft.id);

    expect(
      (await statuses.findByKeyInProject(PROJECT_ID, hold.key))?.id,
    ).toBe(hold.id);
    expect(await statuses.countLiveTasksByStatusKey(PROJECT_ID, hold.key)).toBe(
      1,
    );
    expect(await statuses.countNonCompleted(PROJECT_ID)).toBe(3);

    const batch = await statuses.listByProjectIds([
      PROJECT_ID,
      OTHER_PROJECT_ID,
    ]);
    expect(batch.every((s) => s.projectId === PROJECT_ID)).toBe(true);
  });

  it("reorders atomically and updates only positions", async () => {
    const statuses = new InMemoryStatusesRepository();
    const seeded = await statuses.seedDefaultsForProject(PROJECT_ID);
    const custom = await statuses.create({
      projectId: PROJECT_ID,
      name: "Hold",
      color: "PINK",
    });
    const orderedIds = [
      custom.id,
      seeded[2]!.id,
      seeded[0]!.id,
      seeded[1]!.id,
    ];
    const reordered = await statuses.reorder(PROJECT_ID, orderedIds);

    expect(reordered.map((s) => s.id)).toEqual(orderedIds);
    expect(reordered.map((s) => s.position)).toEqual([0, 1, 2, 3]);
    expect(reordered[0]!.key).toBe(custom.key);
    expect(reordered[0]!.name).toBe("Hold");

    await expect(
      statuses.reorder(PROJECT_ID, [custom.id]),
    ).rejects.toBeInstanceOf(InvalidStatusReorderError);
  });

  it("updates and deletes by id within project scope", async () => {
    const statuses = new InMemoryStatusesRepository();
    await statuses.seedDefaultsForProject(PROJECT_ID);
    const custom = await statuses.create({
      projectId: PROJECT_ID,
      name: "Hold",
      color: "GRAY",
    });
    const updated = await statuses.update(custom.id, {
      name: "Paused",
      color: "BLUE",
      isCompleted: true,
    });
    expect(updated.name).toBe("Paused");
    expect(updated.key).toBe(custom.key);

    await statuses.delete(custom.id);
    expect(await statuses.findByIdInProject(PROJECT_ID, custom.id)).toBeNull();
    await expect(statuses.delete(custom.id)).rejects.toBeInstanceOf(
      StatusNotFoundError,
    );
  });

  it("allows putting rehydrated rows for tests", async () => {
    const statuses = new InMemoryStatusesRepository();
    const row = ProjectStatus.rehydrate(
      "11111111-1111-4111-8111-111111111111",
      PROJECT_ID,
      "CUSTOM",
      "Custom",
      "RED",
      false,
      false,
      0,
      new Date("2026-11-06T00:00:00.000Z"),
    );
    statuses.put(row);
    expect(await statuses.findByKeyInProject(PROJECT_ID, "CUSTOM")).toEqual(
      row,
    );
  });
});
