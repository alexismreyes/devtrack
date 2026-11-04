import { describe, expect, it } from "vitest";
import { CommentNotFoundError } from "../domain/errors";
import { InMemoryCommentsRepository } from "./in-memory-comments-repository";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_TASK_ID = "22222222-2222-4222-8222-222222222222";
const AUTHOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

describe("InMemoryCommentsRepository", () => {
  it("creates with deletedAt null and finds including soft-deleted", async () => {
    const repo = new InMemoryCommentsRepository();
    const created = await repo.create({
      taskId: TASK_ID,
      authorUserId: AUTHOR_ID,
      body: "Hello",
    });

    expect(created.deletedAt).toBeNull();
    expect(await repo.findById(created.id)).toEqual(created);

    const deleted = await repo.softDelete(created.id);
    expect(deleted.deletedAt).not.toBeNull();
    expect((await repo.findById(created.id))?.deletedAt).not.toBeNull();
  });

  it("lists live comments for a task oldest-first and omits other tasks", async () => {
    const repo = new InMemoryCommentsRepository();
    const first = await repo.create({
      taskId: TASK_ID,
      authorUserId: AUTHOR_ID,
      body: "First",
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await repo.create({
      taskId: TASK_ID,
      authorUserId: AUTHOR_ID,
      body: "Second",
    });
    await repo.create({
      taskId: OTHER_TASK_ID,
      authorUserId: AUTHOR_ID,
      body: "Other",
    });
    await repo.softDelete(first.id);

    const listed = await repo.listByTaskId(TASK_ID);
    expect(listed.map((c) => c.id)).toEqual([second.id]);
  });

  it("updateBody and softDelete reject missing or already-deleted comments", async () => {
    const repo = new InMemoryCommentsRepository();
    const created = await repo.create({
      taskId: TASK_ID,
      authorUserId: AUTHOR_ID,
      body: "Hello",
    });

    await expect(repo.updateBody(MISSING_ID, "Nope")).rejects.toBeInstanceOf(
      CommentNotFoundError,
    );
    await expect(repo.softDelete(MISSING_ID)).rejects.toBeInstanceOf(
      CommentNotFoundError,
    );

    const updated = await repo.updateBody(created.id, "Revised");
    expect(updated.body).toBe("Revised");

    await repo.softDelete(created.id);
    await expect(repo.updateBody(created.id, "Again")).rejects.toBeInstanceOf(
      CommentNotFoundError,
    );
    await expect(repo.softDelete(created.id)).rejects.toBeInstanceOf(
      CommentNotFoundError,
    );
  });
});
