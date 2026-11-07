import { describe, expect, it } from "vitest";
import {
  MembershipForbiddenError,
  MembershipProjectNotFoundError,
} from "../../project-members/domain/errors";
import { ImmediateUnitOfWork } from "../../projects/access/unit-of-work";
import {
  InvalidStatusKeyError,
  LastNonCompletedStatusError,
  LastStatusError,
  StatusInUseError,
  StatusNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import { StatusesService } from "../service/statuses-service";
import { TasksService } from "../service/tasks-service";
import { FakeProjectAccessPort } from "./fake-project-access-port";
import { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryAttachmentsRepository } from "./in-memory-attachments-repository";
import { InMemoryLabelsRepository } from "./in-memory-labels-repository";
import { InMemoryStatusesRepository } from "./in-memory-statuses-repository";
import { InMemoryTaskLabelsRepository } from "./in-memory-task-labels-repository";
import { InMemoryTasksRepository } from "./in-memory-tasks-repository";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const EDITOR_ID = "22222222-2222-4222-8222-222222222222";
const VIEWER_ID = "33333333-3333-4333-8333-333333333333";
const STRANGER_ID = "44444444-4444-4444-8444-444444444444";
const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PROJECT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

async function createHarness(archivedAt: Date | null = null) {
  const labels = new InMemoryLabelsRepository();
  const taskLabels = new InMemoryTaskLabelsRepository(labels);
  const tasks = new InMemoryTasksRepository(taskLabels.joins);
  const statuses = new InMemoryStatusesRepository(tasks);
  const projects = new FakeProjectAccessPort();
  const authorization = new FakeTaskAuthorizationPort();
  const activity = new InMemoryActivityRepository();
  const unitOfWork = new ImmediateUnitOfWork();

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
  authorization.seed(
    {
      id: OTHER_PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Other",
      archivedAt: null,
    },
    { [OWNER_ID]: "OWNER" },
  );
  projects.seed({
    id: PROJECT_ID,
    ownerUserId: OWNER_ID,
    name: "Roadmap",
    archivedAt,
  });
  await statuses.seedDefaultsForProject(PROJECT_ID);
  await statuses.seedDefaultsForProject(OTHER_PROJECT_ID);

  return {
    statusesService: new StatusesService(statuses, authorization),
    tasksService: new TasksService(
      tasks,
      projects,
      authorization,
      activity,
      taskLabels,
      new InMemoryAttachmentsRepository(tasks),
      statuses,
      unitOfWork,
    ),
    statuses,
    tasks,
    activity,
    authorization,
  };
}

describe("StatusesService", () => {
  it("creates and lists catalog statuses for writers and readers (AC-001)", async () => {
    const { statusesService } = await createHarness();
    const created = await statusesService.create(OWNER_ID, PROJECT_ID, {
      name: " On hold ",
      color: "ORANGE",
      isCompleted: false,
    });
    const listed = await statusesService.listByProject(VIEWER_ID, PROJECT_ID);

    expect(created.key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(created.isSystem).toBe(false);
    expect(created.position).toBe(3);
    expect(listed.map((s) => s.key)).toEqual([
      "TODO",
      "IN_PROGRESS",
      "DONE",
      created.key,
    ]);
  });

  it("assigns catalog keys on task create/update and rejects unknown keys (AC-002, AC-003)", async () => {
    const { statusesService, tasksService } = await createHarness();
    const custom = await statusesService.create(EDITOR_ID, PROJECT_ID, {
      name: "Blocked",
      color: "RED",
    });
    const created = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Work",
      description: null,
      dueDate: null,
      status: custom.key,
    });
    expect(created.status).toBe(custom.key);

    const updated = await tasksService.update(OWNER_ID, created.id, {
      status: "TODO",
    });
    expect(updated.status).toBe("TODO");

    await expect(
      tasksService.update(OWNER_ID, created.id, { status: "missing-key" }),
    ).rejects.toBeInstanceOf(InvalidStatusKeyError);

    const otherCatalog = await statusesService.listByProject(
      OWNER_ID,
      OTHER_PROJECT_ID,
    );
    const foreign = await statusesService.create(OWNER_ID, OTHER_PROJECT_ID, {
      name: "Foreign",
      color: "PINK",
    });
    await expect(
      tasksService.update(OWNER_ID, created.id, { status: foreign.key }),
    ).rejects.toBeInstanceOf(InvalidStatusKeyError);
    expect(otherCatalog.some((s) => s.key === "TODO")).toBe(true);
  });

  it("defaults create to TODO and falls back to first non-completed (AC-004)", async () => {
    const { statusesService, tasksService, statuses } = await createHarness();
    const defaulted = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Default",
      description: null,
      dueDate: null,
    });
    expect(defaulted.status).toBe("TODO");

    await tasksService.softDelete(OWNER_ID, defaulted.id);
    const todo = (await statuses.listByProjectId(PROJECT_ID)).find(
      (s) => s.key === "TODO",
    )!;
    await statusesService.delete(OWNER_ID, PROJECT_ID, todo.id);
    const fallback = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Fallback",
      description: null,
      dueDate: null,
    });
    expect(fallback.status).toBe("IN_PROGRESS");
  });

  it("enforces authz for catalog mutate vs read (AC-007)", async () => {
    const { statusesService } = await createHarness();
    await expect(
      statusesService.create(VIEWER_ID, PROJECT_ID, {
        name: "Nope",
        color: "GRAY",
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      statusesService.listByProject(STRANGER_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      statusesService.listByProject(OWNER_ID, MISSING_ID),
    ).rejects.toBeInstanceOf(MembershipProjectNotFoundError);
  });

  it("edits seeded rows, blocks delete in use / last status / last non-completed (AC-010)", async () => {
    const { statusesService, tasksService, statuses } = await createHarness();
    const seeded = await statuses.listByProjectId(PROJECT_ID);
    const done = seeded.find((s) => s.key === "DONE")!;
    const todo = seeded.find((s) => s.key === "TODO")!;
    const inProgress = seeded.find((s) => s.key === "IN_PROGRESS")!;

    const renamed = await statusesService.update(OWNER_ID, PROJECT_ID, done.id, {
      name: "Finished",
      color: "TEAL",
      isCompleted: true,
    });
    expect(renamed.key).toBe("DONE");
    expect(renamed.name).toBe("Finished");

    const live = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Live",
      description: null,
      dueDate: null,
      status: "TODO",
    });
    await expect(
      statusesService.delete(OWNER_ID, PROJECT_ID, todo.id),
    ).rejects.toBeInstanceOf(StatusInUseError);

    const custom = await statusesService.create(OWNER_ID, PROJECT_ID, {
      name: "Hold",
      color: "ORANGE",
    });
    await statusesService.delete(OWNER_ID, PROJECT_ID, custom.id);

    await tasksService.softDelete(OWNER_ID, live.id);
    await statusesService.delete(OWNER_ID, PROJECT_ID, inProgress.id);

    await expect(
      statusesService.delete(OWNER_ID, PROJECT_ID, todo.id),
    ).rejects.toBeInstanceOf(LastNonCompletedStatusError);
    await expect(
      statusesService.update(OWNER_ID, PROJECT_ID, todo.id, {
        isCompleted: true,
      }),
    ).rejects.toBeInstanceOf(LastNonCompletedStatusError);

    await statusesService.delete(OWNER_ID, PROJECT_ID, done.id);
    await expect(
      statusesService.delete(OWNER_ID, PROJECT_ID, todo.id),
    ).rejects.toBeInstanceOf(LastStatusError);
  });

  it("reorders full catalog without changing metadata (AC-014)", async () => {
    const { statusesService } = await createHarness();
    const custom = await statusesService.create(EDITOR_ID, PROJECT_ID, {
      name: "Hold",
      color: "BLUE",
    });
    const listed = await statusesService.listByProject(OWNER_ID, PROJECT_ID);
    const orderedIds = [
      custom.id,
      listed[2]!.id,
      listed[0]!.id,
      listed[1]!.id,
    ];
    const reordered = await statusesService.reorder(
      OWNER_ID,
      PROJECT_ID,
      orderedIds,
    );
    expect(reordered.map((s) => s.id)).toEqual(orderedIds);
    expect(reordered.map((s) => s.position)).toEqual([0, 1, 2, 3]);
    expect(reordered[0]!.key).toBe(custom.key);
    expect(reordered[0]!.name).toBe("Hold");
    expect(reordered[0]!.isSystem).toBe(false);
  });

  it("rejects catalog mutations on archived parents for owner", async () => {
    const { statusesService } = await createHarness(
      new Date("2026-11-01T00:00:00.000Z"),
    );
    await expect(
      statusesService.create(OWNER_ID, PROJECT_ID, {
        name: "Hold",
        color: "GRAY",
      }),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
  });

  it("returns not found for unknown status id", async () => {
    const { statusesService } = await createHarness();
    await expect(
      statusesService.update(OWNER_ID, PROJECT_ID, MISSING_ID, {
        name: "X",
      }),
    ).rejects.toBeInstanceOf(StatusNotFoundError);
  });
});
