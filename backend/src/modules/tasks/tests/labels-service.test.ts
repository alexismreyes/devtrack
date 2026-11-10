import { describe, expect, it } from "vitest";
import {
  MembershipForbiddenError,
  MembershipProjectNotFoundError,
} from "../../project-members/domain/errors";
import { ImmediateUnitOfWork } from "../../projects/access/unit-of-work";
import {
  DuplicateLabelNameError,
  LabelNotFoundError,
  TaskNotFoundError,
  TaskParentArchivedError,
} from "../domain/errors";
import { LabelsService } from "../service/labels-service";
import { TasksService } from "../service/tasks-service";
import { FakeProjectAccessPort } from "./fake-project-access-port";
import { FakeProjectMembershipQueryPort } from "./fake-project-membership-query-port";
import { FakeTaskAuthorizationPort } from "./fake-task-authorization-port";
import { InMemoryActivityRepository } from "./in-memory-activity-repository";
import { InMemoryAttachmentsRepository } from "./in-memory-attachments-repository";
import { InMemoryChecklistsRepository } from "./in-memory-checklists-repository";
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

  const labelsService = new LabelsService(
    labels,
    taskLabels,
    tasks,
    authorization,
    unitOfWork,
  );
  const tasksService = new TasksService(
    tasks,
    projects,
    new FakeProjectMembershipQueryPort(projects, authorization),
    authorization,
    activity,
    taskLabels,
    new InMemoryAttachmentsRepository(tasks),
    statuses,
    new InMemoryChecklistsRepository(),
    unitOfWork,
  );

  return {
    labelsService,
    tasksService,
    labels,
    taskLabels,
    tasks,
    statuses,
    activity,
    authorization,
  };
}

describe("LabelsService", () => {
  it("creates and lists catalog labels for writers and readers", async () => {
    const { labelsService } = await createHarness();
    const created = await labelsService.create(OWNER_ID, PROJECT_ID, {
      name: " Bug ",
      color: "RED",
    });
    const listed = await labelsService.listByProject(VIEWER_ID, PROJECT_ID);

    expect(created.name).toBe("Bug");
    expect(created.color).toBe("RED");
    expect(listed.map((label) => label.id)).toEqual([created.id]);
  });

  it("rejects duplicate case-insensitive names and VIEWER catalog writes", async () => {
    const { labelsService } = await createHarness();
    await labelsService.create(EDITOR_ID, PROJECT_ID, {
      name: "Bug",
      color: "RED",
    });

    await expect(
      labelsService.create(OWNER_ID, PROJECT_ID, {
        name: "bug",
        color: "BLUE",
      }),
    ).rejects.toBeInstanceOf(DuplicateLabelNameError);
    await expect(
      labelsService.create(VIEWER_ID, PROJECT_ID, {
        name: "Feature",
        color: "GREEN",
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
  });

  it("assigns many labels via replace-set and embeds them on task reads", async () => {
    const { labelsService, tasksService, activity } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Work",
      description: null,
      dueDate: null,
    });
    const bug = await labelsService.create(OWNER_ID, PROJECT_ID, {
      name: "Bug",
      color: "RED",
    });
    const feature = await labelsService.create(OWNER_ID, PROJECT_ID, {
      name: "Feature",
      color: "GREEN",
    });

    const assigned = await labelsService.replaceTaskLabels(EDITOR_ID, task.id, [
      feature.id,
      bug.id,
      bug.id,
    ]);
    const viewed = await tasksService.getById(VIEWER_ID, task.id);
    const listed = await tasksService.listByProject(OWNER_ID, PROJECT_ID, {
      labelId: bug.id,
    });

    expect(assigned.map((label) => label.name)).toEqual(["Bug", "Feature"]);
    expect(viewed.labels.map((label) => label.id)).toEqual([bug.id, feature.id]);
    expect(listed.map((row) => row.id)).toEqual([task.id]);
    expect(activity.eventsById.size).toBe(1);
  });

  it("rejects cross-project label assignment without creating joins", async () => {
    const { labelsService, tasksService, taskLabels } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Work",
      description: null,
      dueDate: null,
    });
    const foreign = await labelsService.create(OWNER_ID, OTHER_PROJECT_ID, {
      name: "Foreign",
      color: "PINK",
    });

    await expect(
      labelsService.replaceTaskLabels(OWNER_ID, task.id, [foreign.id]),
    ).rejects.toBeInstanceOf(LabelNotFoundError);
    expect((await taskLabels.listForTaskIds([task.id])).get(task.id)).toEqual(
      [],
    );
  });

  it("hard-deletes a label and removes assignments", async () => {
    const { labelsService, tasksService } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Work",
      description: null,
      dueDate: null,
    });
    const label = await labelsService.create(OWNER_ID, PROJECT_ID, {
      name: "Bug",
      color: "RED",
    });
    await labelsService.replaceTaskLabels(OWNER_ID, task.id, [label.id]);
    await labelsService.delete(OWNER_ID, PROJECT_ID, label.id);

    await expect(
      labelsService.update(OWNER_ID, PROJECT_ID, label.id, { name: "Nope" }),
    ).rejects.toBeInstanceOf(LabelNotFoundError);
    expect((await tasksService.getById(OWNER_ID, task.id)).labels).toEqual([]);
  });

  it("returns 404-equivalent for soft-deleted tasks on assignment", async () => {
    const { labelsService, tasksService } = await createHarness();
    const task = await tasksService.create(OWNER_ID, PROJECT_ID, {
      title: "Work",
      description: null,
      dueDate: null,
    });
    const label = await labelsService.create(OWNER_ID, PROJECT_ID, {
      name: "Bug",
      color: "RED",
    });
    await tasksService.softDelete(OWNER_ID, task.id);

    await expect(
      labelsService.replaceTaskLabels(OWNER_ID, task.id, [label.id]),
    ).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("applies archived parent 409 for ownerUserId and 403 for members on mutate; owner can still list", async () => {
    const { labelsService, authorization } = await createHarness(null);
    await labelsService.create(OWNER_ID, PROJECT_ID, {
      name: "Prior",
      color: "GRAY",
    });
    authorization.seed({
      id: PROJECT_ID,
      ownerUserId: OWNER_ID,
      name: "Roadmap",
      archivedAt: new Date("2026-11-05T12:00:00.000Z"),
    });
    authorization.addMember(PROJECT_ID, EDITOR_ID, "EDITOR");
    authorization.addMember(PROJECT_ID, VIEWER_ID, "VIEWER");

    await expect(
      labelsService.create(OWNER_ID, PROJECT_ID, {
        name: "Blocked",
        color: "RED",
      }),
    ).rejects.toBeInstanceOf(TaskParentArchivedError);
    await expect(
      labelsService.create(EDITOR_ID, PROJECT_ID, {
        name: "Blocked",
        color: "RED",
      }),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);

    const listed = await labelsService.listByProject(OWNER_ID, PROJECT_ID);
    expect(listed).toHaveLength(1);
    await expect(
      labelsService.listByProject(EDITOR_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
  });

  it("rejects strangers and missing projects", async () => {
    const { labelsService } = await createHarness();
    await expect(
      labelsService.listByProject(STRANGER_ID, PROJECT_ID),
    ).rejects.toBeInstanceOf(MembershipForbiddenError);
    await expect(
      labelsService.listByProject(OWNER_ID, MISSING_ID),
    ).rejects.toBeInstanceOf(MembershipProjectNotFoundError);
  });
});
