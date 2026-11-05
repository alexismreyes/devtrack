import { describe, expect, it } from "vitest";
import {
  DuplicateLabelNameError,
  LabelNotFoundError,
} from "../domain/errors";
import { InMemoryLabelsRepository } from "./in-memory-labels-repository";
import { InMemoryTaskLabelsRepository } from "./in-memory-task-labels-repository";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TASK_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TASK_ID = "22222222-2222-4222-8222-222222222222";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

describe("InMemoryLabelsRepository", () => {
  it("creates, lists by project name ascending, and finds within project", async () => {
    const repo = new InMemoryLabelsRepository();
    const zebra = await repo.create({
      projectId: PROJECT_ID,
      name: "Zebra",
      color: "RED",
    });
    const alpha = await repo.create({
      projectId: PROJECT_ID,
      name: "Alpha",
      color: "BLUE",
    });
    await repo.create({
      projectId: OTHER_PROJECT_ID,
      name: "Other",
      color: "GRAY",
    });

    const listed = await repo.listByProjectId(PROJECT_ID);
    expect(listed.map((label) => label.id)).toEqual([alpha.id, zebra.id]);
    expect(await repo.findByIdInProject(PROJECT_ID, alpha.id)).toEqual(alpha);
    expect(await repo.findByIdInProject(OTHER_PROJECT_ID, alpha.id)).toBeNull();
  });

  it("enforces case-insensitive unique names per project", async () => {
    const repo = new InMemoryLabelsRepository();
    await repo.create({
      projectId: PROJECT_ID,
      name: "Bug",
      color: "RED",
    });

    await expect(
      repo.create({
        projectId: PROJECT_ID,
        name: " bug ",
        color: "BLUE",
      }),
    ).rejects.toBeInstanceOf(DuplicateLabelNameError);

    await expect(
      repo.create({
        projectId: OTHER_PROJECT_ID,
        name: "Bug",
        color: "BLUE",
      }),
    ).resolves.toMatchObject({ name: "Bug" });
  });

  it("updates name/color and rejects missing ids", async () => {
    const repo = new InMemoryLabelsRepository();
    const created = await repo.create({
      projectId: PROJECT_ID,
      name: "Bug",
      color: "RED",
    });
    const updated = await repo.update(created.id, {
      name: "Defect",
      color: "ORANGE",
    });

    expect(updated.name).toBe("Defect");
    expect(updated.color).toBe("ORANGE");
    await expect(repo.update(MISSING_ID, { name: "Nope" })).rejects.toBeInstanceOf(
      LabelNotFoundError,
    );
  });

  it("hard-deletes catalog rows and cleans assignment joins", async () => {
    const labels = new InMemoryLabelsRepository();
    const assignments = new InMemoryTaskLabelsRepository(labels);
    const label = await labels.create({
      projectId: PROJECT_ID,
      name: "Bug",
      color: "RED",
    });
    await assignments.replaceSetForTask(TASK_ID, [label.id]);
    await assignments.replaceSetForTask(OTHER_TASK_ID, [label.id]);

    await assignments.deleteByLabelId(label.id);
    await labels.delete(label.id);

    expect(await labels.findByIdInProject(PROJECT_ID, label.id)).toBeNull();
    const byTask = await assignments.listForTaskIds([TASK_ID, OTHER_TASK_ID]);
    expect(byTask.get(TASK_ID)).toEqual([]);
    expect(byTask.get(OTHER_TASK_ID)).toEqual([]);
    await expect(labels.delete(MISSING_ID)).rejects.toBeInstanceOf(
      LabelNotFoundError,
    );
  });

  it("replace-set and batch-loads labels for task embedding", async () => {
    const labels = new InMemoryLabelsRepository();
    const assignments = new InMemoryTaskLabelsRepository(labels);
    const bug = await labels.create({
      projectId: PROJECT_ID,
      name: "Bug",
      color: "RED",
    });
    const feature = await labels.create({
      projectId: PROJECT_ID,
      name: "Feature",
      color: "GREEN",
    });

    await assignments.replaceSetForTask(TASK_ID, [feature.id, bug.id]);
    await assignments.replaceSetForTask(OTHER_TASK_ID, []);

    const loaded = await assignments.listForTaskIds([TASK_ID, OTHER_TASK_ID]);
    expect(loaded.get(TASK_ID)?.map((label) => label.name)).toEqual([
      "Bug",
      "Feature",
    ]);
    expect(loaded.get(OTHER_TASK_ID)).toEqual([]);

    await assignments.replaceSetForTask(TASK_ID, [feature.id]);
    const again = await assignments.listForTaskIds([TASK_ID]);
    expect(again.get(TASK_ID)?.map((label) => label.id)).toEqual([feature.id]);
  });
});
