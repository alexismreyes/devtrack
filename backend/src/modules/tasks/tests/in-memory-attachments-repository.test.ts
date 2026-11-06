import { describe, expect, it } from "vitest";
import { AttachmentNotFoundError } from "../domain/errors";
import { TaskAttachment } from "../domain/task-attachment";
import { InMemoryAttachmentsRepository } from "./in-memory-attachments-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("InMemoryAttachmentsRepository", () => {
  it("lists by createdAt ascending and supports cover set/clear/delete", async () => {
    const tasks = new InMemoryTasksRepository();
    const attachments = new InMemoryAttachmentsRepository(tasks);
    const task = await tasks.create({
      projectId: PROJECT_ID,
      title: "Ship",
      description: null,
      dueDate: null,
    });

    const first = TaskAttachment.create({
      taskId: task.id,
      projectId: PROJECT_ID,
      uploadedByUserId: USER_ID,
      originalFilename: "a.png",
      contentType: "image/png",
      sizeBytes: 4,
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = TaskAttachment.create({
      taskId: task.id,
      projectId: PROJECT_ID,
      uploadedByUserId: USER_ID,
      originalFilename: "b.pdf",
      contentType: "application/pdf",
      sizeBytes: 4,
    });
    await attachments.create({ attachment: first });
    await attachments.create({ attachment: second });

    const listed = await attachments.listByTaskId(task.id);
    expect(listed.map((entry) => entry.id)).toEqual([first.id, second.id]);

    await attachments.setCover(task.id, first.id);
    expect(await attachments.getCoverAttachmentId(task.id)).toBe(first.id);

    const deleted = await attachments.delete(first.id);
    expect(deleted.clearedCover).toBe(true);
    expect(await attachments.getCoverAttachmentId(task.id)).toBeNull();
    expect(await attachments.findByIdInTask(task.id, first.id)).toBeNull();
    expect(await attachments.countByTaskId(task.id)).toBe(1);

    await expect(attachments.delete(first.id)).rejects.toBeInstanceOf(
      AttachmentNotFoundError,
    );
  });
});
