import { describe, expect, it } from "vitest";
import { TaskActivityEvent } from "../domain/task-activity";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TASK_ID = "22222222-2222-4222-8222-222222222222";
const ACTOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const COMMENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("InMemoryActivityRepository", () => {
  it("creates events and lists by taskId newest createdAt first", async () => {
    const repo = new InMemoryActivityRepository();
    const older = TaskActivityEvent.taskCreated(
      TASK_ID,
      ACTOR_ID,
      new Date("2026-11-01T10:00:00.000Z"),
    );
    const newer = TaskActivityEvent.commentAdded(
      TASK_ID,
      ACTOR_ID,
      COMMENT_ID,
      "Hello",
      new Date("2026-11-03T10:00:00.000Z"),
    );
    const other = TaskActivityEvent.taskSoftDeleted(
      OTHER_TASK_ID,
      ACTOR_ID,
      new Date("2026-11-04T10:00:00.000Z"),
    );

    await repo.create(older);
    await repo.create(newer);
    await repo.create(other);

    const listed = await repo.listByTaskId(TASK_ID);
    expect(listed.map((event) => event.id)).toEqual([newer.id, older.id]);
    expect(await repo.listByTaskId(OTHER_TASK_ID)).toHaveLength(1);
  });
});
