import { describe, expect, it } from "vitest";
import { MembershipForbiddenError } from "../../project-members/domain/errors";
import {
  ImmediateUnitOfWork,
  type UnitOfWork,
} from "../../projects/access/unit-of-work";
import {
  AttachmentCountExceededError,
  AttachmentNotFoundError,
  InvalidCoverAttachmentError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import type { TaskActivityEvent } from "../domain/task-activity";
import { ATTACHMENT_MAX_PER_TASK } from "../domain/task-attachment";
import type { ActivityRepository } from "../repository/activity-repository";
import { AttachmentsService } from "../service/attachments-service";
import { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryAttachmentStorage } from "./in-memory-attachment-storage";
import { InMemoryAttachmentsRepository } from "./in-memory-attachments-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const STRANGER_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

class FailingActivityRepository implements ActivityRepository {
  readonly eventsById = new Map<string, TaskActivityEvent>();

  async create(): Promise<TaskActivityEvent> {
    throw new Error("activity insert failed");
  }

  async listPage() {
    return { items: [], nextCursor: null };
  }
}

class SnapshotUnitOfWork implements UnitOfWork {
  constructor(
    private readonly attachments: InMemoryAttachmentsRepository,
    private readonly activity: ActivityRepository & {
      eventsById: Map<string, TaskActivityEvent>;
    },
    private readonly tasks: InMemoryTasksRepository,
  ) {}

  async run<T>(work: () => Promise<T>): Promise<T> {
    const attachmentSnap = new Map(this.attachments.attachmentsById);
    const activitySnap = new Map(this.activity.eventsById);
    const taskSnap = new Map(this.tasks.tasksById);
    try {
      return await work();
    } catch (error) {
      this.attachments.attachmentsById.clear();
      for (const [id, attachment] of attachmentSnap) {
        this.attachments.attachmentsById.set(id, attachment);
      }
      this.activity.eventsById.clear();
      for (const [id, event] of activitySnap) {
        this.activity.eventsById.set(id, event);
      }
      this.tasks.tasksById.clear();
      for (const [id, task] of taskSnap) {
        this.tasks.tasksById.set(id, task);
      }
      throw error;
    }
  }
}

function createHarness(
  archivedAt: Date | null = null,
  activity: ActivityRepository = new InMemoryActivityRepository(),
  unitOfWork: UnitOfWork = new ImmediateUnitOfWork(),
) {
  const tasks = new InMemoryTasksRepository();
  const attachments = new InMemoryAttachmentsRepository(tasks);
  const storage = new InMemoryAttachmentStorage();
  const authorization = new FakeTaskAuthorizationPort();
  authorization.seed(
    {
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt,
    },
    {
      [OWNER_ID]: "OWNER",
      [EDITOR_ID]: "EDITOR",
      [VIEWER_ID]: "VIEWER",
    },
  );
  const service = new AttachmentsService(
    attachments,
    tasks,
    authorization,
    activity,
    storage,
    unitOfWork,
  );
  return { service, attachments, tasks, storage, activity, authorization };
}

async function seedLiveTask(tasks: InMemoryTasksRepository) {
  return tasks.create({
    projectId: PROJECT_ID,
    title: "Ship",
    description: null,
    dueDate: null,
  });
}

describe("AttachmentsService", () => {
  it("uploads, lists, downloads, and emits ATTACHMENT_ADDED same-tx", async () => {
    const { service, tasks, storage, activity } = createHarness();
    const task = await seedLiveTask(tasks);

    const uploaded = await service.upload(EDITOR_ID, task.id, {
      originalFilename: "shot.png",
      clientContentType: "image/png",
      bytes: pngBytes(),
    });
    expect(uploaded.contentType).toBe("image/png");
    expect(await storage.exists(
      `${PROJECT_ID}/${task.id}/${uploaded.id}`,
    )).toBe(true);

    const listed = await service.listByTask(VIEWER_ID, task.id);
    expect(listed.map((entry) => entry.id)).toEqual([uploaded.id]);

    const content = await service.getContent(VIEWER_ID, task.id, uploaded.id);
    expect(content.bytes).toEqual(pngBytes());

    const events = [...(activity as InMemoryActivityRepository).eventsById.values()];
    expect(events.filter((e) => e.kind === "ATTACHMENT_ADDED")).toHaveLength(1);
  });

  it("sets and clears cover with COVER_CHANGED; delete cover emits both kinds", async () => {
    const { service, tasks, activity } = createHarness();
    const task = await seedLiveTask(tasks);
    const uploaded = await service.upload(OWNER_ID, task.id, {
      originalFilename: "cover.png",
      clientContentType: "image/png",
      bytes: pngBytes(),
    });

    const set = await service.setCover(OWNER_ID, task.id, uploaded.id);
    expect(set).toEqual({
      attachmentId: uploaded.id,
      contentType: "image/png",
    });

    const pdf = await service.upload(OWNER_ID, task.id, {
      originalFilename: "doc.pdf",
      clientContentType: "application/pdf",
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
    });
    await expect(
      service.setCover(OWNER_ID, task.id, pdf.id),
    ).rejects.toBeInstanceOf(InvalidCoverAttachmentError);

    await service.clearCover(OWNER_ID, task.id);
    expect(await service.getCover(OWNER_ID, task.id)).toBeNull();

    await service.setCover(OWNER_ID, task.id, uploaded.id);
    await service.delete(OWNER_ID, task.id, uploaded.id);
    const events = [...(activity as InMemoryActivityRepository).eventsById.values()];
    expect(events.some((e) => e.kind === "ATTACHMENT_REMOVED")).toBe(true);
    expect(
      events.filter((e) => e.kind === "COVER_CHANGED").length,
    ).toBeGreaterThanOrEqual(2);
    expect(await service.getCover(OWNER_ID, task.id)).toBeNull();
  });

  it("enforces authz, soft-delete 404, archived 409/403, and count cap", async () => {
    const live = createHarness();
    const task = await seedLiveTask(live.tasks);
    const uploaded = await live.service.upload(OWNER_ID, task.id, {
      originalFilename: "a.png",
      clientContentType: "image/png",
      bytes: pngBytes(),
    });

    await expect(
      live.service.listByTask(STRANGER_ID, task.id),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      live.service.upload(VIEWER_ID, task.id, {
        originalFilename: "b.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      live.service.getContent(OWNER_ID, MISSING_ID, uploaded.id),
    ).rejects.toBeInstanceOf(TaskNotFoundError);

    await live.tasks.softDelete(task.id);
    await expect(
      live.service.listByTask(OWNER_ID, task.id),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(live.attachments.attachmentsById.has(uploaded.id)).toBe(true);
    expect(
      await live.storage.exists(`${PROJECT_ID}/${task.id}/${uploaded.id}`),
    ).toBe(true);

    const archived = createHarness(new Date("2026-11-01T00:00:00.000Z"));
    const archivedTask = await seedLiveTask(archived.tasks);
    await expect(
      archived.service.upload(OWNER_ID, archivedTask.id, {
        originalFilename: "x.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
    await expect(
      archived.service.upload(EDITOR_ID, archivedTask.id, {
        originalFilename: "x.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);

    const capped = createHarness();
    const cappedTask = await seedLiveTask(capped.tasks);
    for (let i = 0; i < ATTACHMENT_MAX_PER_TASK; i += 1) {
      await capped.service.upload(OWNER_ID, cappedTask.id, {
        originalFilename: `f${i}.png`,
        clientContentType: "image/png",
        bytes: pngBytes(),
      });
    }
    await expect(
      capped.service.upload(OWNER_ID, cappedTask.id, {
        originalFilename: "overflow.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toBeInstanceOf(AttachmentCountExceededError);
  });

  it("fails the write when activity insert fails and compensates the blob", async () => {
    const failing = new FailingActivityRepository();
    const tasks = new InMemoryTasksRepository();
    const attachments = new InMemoryAttachmentsRepository(tasks);
    const storage = new InMemoryAttachmentStorage();
    const authorization = new FakeTaskAuthorizationPort();
    authorization.seed(
      {
        id: PROJECT_ID,
        ownerUserId: OWNER_ID,
        name: "Roadmap",
        archivedAt: null,
      },
      { [OWNER_ID]: "OWNER" },
    );
    const service = new AttachmentsService(
      attachments,
      tasks,
      authorization,
      failing,
      storage,
      new SnapshotUnitOfWork(attachments, failing, tasks),
    );
    const task = await seedLiveTask(tasks);

    await expect(
      service.upload(OWNER_ID, task.id, {
        originalFilename: "fail.png",
        clientContentType: "image/png",
        bytes: pngBytes(),
      }),
    ).rejects.toThrow(/activity insert failed/);
    expect(attachments.attachmentsById.size).toBe(0);
    expect(storage.blobs.size).toBe(0);
  });

  it("returns 404 for wrong-task attachment ids", async () => {
    const { service, tasks } = createHarness();
    const task = await seedLiveTask(tasks);
    const other = await tasks.create({
      projectId: PROJECT_ID,
      title: "Other",
      description: null,
      dueDate: null,
    });
    const uploaded = await service.upload(OWNER_ID, task.id, {
      originalFilename: "a.png",
      clientContentType: "image/png",
      bytes: pngBytes(),
    });
    await expect(
      service.getById(OWNER_ID, other.id, uploaded.id),
    ).rejects.toBeInstanceOf(AttachmentNotFoundError);
  });
});
