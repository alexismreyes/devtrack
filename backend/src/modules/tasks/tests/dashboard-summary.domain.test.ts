import { describe, expect, it } from "vitest";
import {
  buildCompletionByProject,
  buildProjectsPie,
  checklistCompletionPercent,
  isCompletedStatus,
  isPendingStatus,
  isTaskDueSoon,
  isTaskOverdue,
  summarizeDashboard,
} from "../domain/dashboard-summary";
import { calendarDateFromString } from "../domain/task";

const NOW = new Date("2026-10-31T15:00:00.000Z");
const ACTIVE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACTIVE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ARCHIVED_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const CUSTOM_DONE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const CATALOG = [
  { projectId: ACTIVE_A, key: "TODO", name: "To do", isCompleted: false },
  {
    projectId: ACTIVE_A,
    key: "IN_PROGRESS",
    name: "In progress",
    isCompleted: false,
  },
  { projectId: ACTIVE_A, key: "DONE", name: "Done", isCompleted: true },
  { projectId: ACTIVE_B, key: "TODO", name: "To do", isCompleted: false },
  {
    projectId: ACTIVE_B,
    key: "IN_PROGRESS",
    name: "In progress",
    isCompleted: false,
  },
  { projectId: ACTIVE_B, key: "DONE", name: "Done", isCompleted: true },
  { projectId: ARCHIVED_ID, key: "TODO", name: "To do", isCompleted: false },
  { projectId: OTHER_ID, key: "TODO", name: "To do", isCompleted: false },
  {
    projectId: ACTIVE_A,
    key: CUSTOM_DONE,
    name: "Shipped",
    isCompleted: true,
  },
];

const DEFAULT_COMPLETION = buildCompletionByProject(CATALOG);

function task(input: {
  id?: string;
  projectId: string;
  status: string;
  dueDate: string | null;
  deletedAt?: Date | null;
}) {
  return {
    id: input.id ?? crypto.randomUUID(),
    projectId: input.projectId,
    status: input.status,
    dueDate:
      input.dueDate === null ? null : calendarDateFromString(input.dueDate),
    deletedAt: input.deletedAt ?? null,
  };
}

describe("dashboard overview counting", () => {
  it("treats null due date, due today, and completed flags as never overdue", () => {
    expect(
      isTaskOverdue(
        { projectId: ACTIVE_A, status: "TODO", dueDate: null },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(false);
    expect(
      isTaskOverdue(
        {
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: calendarDateFromString("2026-10-31"),
        },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(false);
    expect(
      isTaskOverdue(
        {
          projectId: ACTIVE_A,
          status: "DONE",
          dueDate: calendarDateFromString("2026-10-01"),
        },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(false);
  });

  it("marks due soon only for incomplete tasks in [today, today+7] UTC", () => {
    expect(
      isTaskDueSoon(
        {
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: calendarDateFromString("2026-10-31"),
        },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(true);
    expect(
      isTaskDueSoon(
        {
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: calendarDateFromString("2026-11-07"),
        },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(true);
    expect(
      isTaskDueSoon(
        {
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: calendarDateFromString("2026-10-30"),
        },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(false);
    expect(
      isTaskDueSoon(
        {
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: calendarDateFromString("2026-11-08"),
        },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(false);
    expect(
      isTaskDueSoon(
        {
          projectId: ACTIVE_A,
          status: "DONE",
          dueDate: calendarDateFromString("2026-11-01"),
        },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(false);
  });

  it("maps pending/completed from live catalog isCompleted flags", () => {
    expect(isPendingStatus(ACTIVE_A, "TODO", DEFAULT_COMPLETION)).toBe(true);
    expect(isPendingStatus(ACTIVE_A, "IN_PROGRESS", DEFAULT_COMPLETION)).toBe(
      true,
    );
    expect(isPendingStatus(ACTIVE_A, "DONE", DEFAULT_COMPLETION)).toBe(false);
    expect(isCompletedStatus(ACTIVE_A, "DONE", DEFAULT_COMPLETION)).toBe(true);
    expect(isCompletedStatus(ACTIVE_A, CUSTOM_DONE, DEFAULT_COMPLETION)).toBe(
      true,
    );
  });

  it("returns zeros and empty series when there is no authorized data", () => {
    expect(summarizeDashboard([], [], NOW, 0, CATALOG, [])).toEqual({
      totalProjects: 0,
      openTasks: 0,
      teamMembers: 0,
      dueSoon: 0,
      projectsPie: [],
      tasksBars: [],
      progress: [],
    });
  });

  it("lists an active project with zero live tasks and 0% checklist", () => {
    const summary = summarizeDashboard(
      [{ id: ACTIVE_A, name: "Roadmap", archivedAt: null }],
      [],
      NOW,
      1,
      CATALOG,
      [],
    );

    expect(summary).toEqual({
      totalProjects: 1,
      openTasks: 0,
      teamMembers: 1,
      dueSoon: 0,
      projectsPie: [],
      tasksBars: [
        {
          projectId: ACTIVE_A,
          projectName: "Roadmap",
          checklistCompletionPercent: 0,
        },
      ],
      progress: [
        {
          projectId: ACTIVE_A,
          projectName: "Roadmap",
          completedTasks: 0,
          totalTasks: 0,
        },
      ],
    });
  });

  it("excludes archived projects, soft-deleted tasks, and other project ids", () => {
    const summary = summarizeDashboard(
      [
        { id: ACTIVE_A, name: "Roadmap", archivedAt: null },
        {
          id: ARCHIVED_ID,
          name: "Old",
          archivedAt: new Date("2026-10-29T12:00:00.000Z"),
        },
      ],
      [
        task({
          id: "t1",
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: "2026-11-01",
        }),
        task({
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: "2026-11-01",
          deletedAt: new Date("2026-10-30T12:00:00.000Z"),
        }),
        task({
          projectId: ARCHIVED_ID,
          status: "TODO",
          dueDate: "2026-11-01",
        }),
        task({ projectId: OTHER_ID, status: "TODO", dueDate: "2026-11-01" }),
      ],
      NOW,
      1,
      CATALOG,
      [],
    );

    expect(summary.totalProjects).toBe(1);
    expect(summary.openTasks).toBe(1);
    expect(summary.dueSoon).toBe(1);
    expect(summary.progress.map((row) => row.projectId)).toEqual([ACTIVE_A]);
  });

  it("aggregates KPIs, pie by status key, checklist %, and progress", () => {
    const t1 = "11111111-1111-4111-8111-111111111101";
    const t2 = "11111111-1111-4111-8111-111111111102";
    const t3 = "11111111-1111-4111-8111-111111111103";
    const t4 = "11111111-1111-4111-8111-111111111104";
    const t5 = "11111111-1111-4111-8111-111111111105";
    const summary = summarizeDashboard(
      [
        { id: ACTIVE_A, name: "Roadmap", archivedAt: null },
        { id: ACTIVE_B, name: "Later", archivedAt: null },
      ],
      [
        task({
          id: t1,
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: "2026-10-30",
        }),
        task({
          id: t2,
          projectId: ACTIVE_A,
          status: "IN_PROGRESS",
          dueDate: "2026-10-31",
        }),
        task({
          id: t3,
          projectId: ACTIVE_A,
          status: "DONE",
          dueDate: "2026-10-01",
        }),
        task({
          id: t4,
          projectId: ACTIVE_A,
          status: CUSTOM_DONE,
          dueDate: "2026-10-01",
        }),
        task({
          id: t5,
          projectId: ACTIVE_B,
          status: "TODO",
          dueDate: null,
        }),
      ],
      NOW,
      3,
      CATALOG,
      [
        { taskId: t1, totalItems: 2, checkedItems: 1 },
        { taskId: t2, totalItems: 2, checkedItems: 1 },
      ],
    );

    expect(summary.totalProjects).toBe(2);
    expect(summary.openTasks).toBe(3);
    expect(summary.teamMembers).toBe(3);
    expect(summary.dueSoon).toBe(1);
    expect(summary.projectsPie).toEqual([
      { statusKey: "DONE", label: "Done", count: 1 },
      { statusKey: "IN_PROGRESS", label: "In progress", count: 1 },
      { statusKey: "TODO", label: "To do", count: 2 },
      { statusKey: CUSTOM_DONE, label: "Shipped", count: 1 },
    ]);
    expect(summary.tasksBars).toEqual([
      {
        projectId: ACTIVE_A,
        projectName: "Roadmap",
        checklistCompletionPercent: 50,
      },
      {
        projectId: ACTIVE_B,
        projectName: "Later",
        checklistCompletionPercent: 0,
      },
    ]);
    expect(summary.progress).toEqual([
      {
        projectId: ACTIVE_A,
        projectName: "Roadmap",
        completedTasks: 2,
        totalTasks: 4,
      },
      {
        projectId: ACTIVE_B,
        projectName: "Later",
        completedTasks: 0,
        totalTasks: 1,
      },
    ]);
    expect(checklistCompletionPercent(0, 0)).toBe(0);
  });

  it("uses status key as pie label when catalog names collide across projects", () => {
    const pie = buildProjectsPie(
      [
        task({
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: null,
        }),
        task({
          projectId: ACTIVE_B,
          status: "TODO",
          dueDate: null,
        }),
      ],
      new Set([ACTIVE_A, ACTIVE_B]),
      [
        { projectId: ACTIVE_A, key: "TODO", name: "Backlog", isCompleted: false },
        {
          projectId: ACTIVE_B,
          key: "TODO",
          name: "Inbox",
          isCompleted: false,
        },
      ],
    );

    expect(pie).toEqual([{ statusKey: "TODO", label: "TODO", count: 2 }]);
  });
});
