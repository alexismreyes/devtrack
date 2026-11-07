import { describe, expect, it } from "vitest";
import {
  buildCompletionByProject,
  isCompletedStatus,
  isPendingStatus,
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

const DEFAULT_COMPLETION = buildCompletionByProject([
  { projectId: ACTIVE_A, key: "TODO", isCompleted: false },
  { projectId: ACTIVE_A, key: "IN_PROGRESS", isCompleted: false },
  { projectId: ACTIVE_A, key: "DONE", isCompleted: true },
  { projectId: ACTIVE_B, key: "TODO", isCompleted: false },
  { projectId: ACTIVE_B, key: "IN_PROGRESS", isCompleted: false },
  { projectId: ACTIVE_B, key: "DONE", isCompleted: true },
  { projectId: ARCHIVED_ID, key: "TODO", isCompleted: false },
  { projectId: OTHER_ID, key: "TODO", isCompleted: false },
  { projectId: ACTIVE_A, key: CUSTOM_DONE, isCompleted: true },
]);

function task(input: {
  projectId: string;
  status: string;
  dueDate: string | null;
  deletedAt?: Date | null;
}) {
  return {
    projectId: input.projectId,
    status: input.status,
    dueDate:
      input.dueDate === null ? null : calendarDateFromString(input.dueDate),
    deletedAt: input.deletedAt ?? null,
  };
}

describe("dashboard summary counting", () => {
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

  it("marks a past UTC calendar due date overdue only for non-completed statuses", () => {
    const past = calendarDateFromString("2026-10-30");
    expect(
      isTaskOverdue(
        { projectId: ACTIVE_A, status: "TODO", dueDate: past },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(true);
    expect(
      isTaskOverdue(
        { projectId: ACTIVE_A, status: "IN_PROGRESS", dueDate: past },
        NOW,
        DEFAULT_COMPLETION,
      ),
    ).toBe(true);
    expect(
      isTaskOverdue(
        { projectId: ACTIVE_A, status: "DONE", dueDate: past },
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
    expect(isCompletedStatus(ACTIVE_A, "TODO", DEFAULT_COMPLETION)).toBe(false);
    expect(isCompletedStatus(ACTIVE_A, CUSTOM_DONE, DEFAULT_COMPLETION)).toBe(
      true,
    );
  });

  it("follows flipped Done isCompleted for classification", () => {
    const flipped = buildCompletionByProject([
      { projectId: ACTIVE_A, key: "DONE", isCompleted: false },
      { projectId: ACTIVE_A, key: "TODO", isCompleted: false },
    ]);
    expect(isCompletedStatus(ACTIVE_A, "DONE", flipped)).toBe(false);
    expect(isPendingStatus(ACTIVE_A, "DONE", flipped)).toBe(true);
    expect(
      isTaskOverdue(
        {
          projectId: ACTIVE_A,
          status: "DONE",
          dueDate: calendarDateFromString("2026-10-01"),
        },
        NOW,
        flipped,
      ),
    ).toBe(true);
  });

  it("returns zeros and an empty project list when there is no authorized data", () => {
    expect(summarizeDashboard([], [], NOW, DEFAULT_COMPLETION)).toEqual({
      projectCount: 0,
      taskCount: 0,
      pendingCount: 0,
      completedCount: 0,
      overdueCount: 0,
      projects: [],
    });
  });

  it("lists an active project with zero live tasks", () => {
    const summary = summarizeDashboard(
      [{ id: ACTIVE_A, name: "Roadmap", archivedAt: null }],
      [],
      NOW,
      DEFAULT_COMPLETION,
    );

    expect(summary).toEqual({
      projectCount: 1,
      taskCount: 0,
      pendingCount: 0,
      completedCount: 0,
      overdueCount: 0,
      projects: [
        {
          id: ACTIVE_A,
          name: "Roadmap",
          taskCount: 0,
          pendingCount: 0,
          completedCount: 0,
          overdueCount: 0,
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
        task({ projectId: ACTIVE_A, status: "TODO", dueDate: "2026-10-30" }),
        task({
          projectId: ACTIVE_A,
          status: "TODO",
          dueDate: "2026-10-01",
          deletedAt: new Date("2026-10-30T12:00:00.000Z"),
        }),
        task({
          projectId: ARCHIVED_ID,
          status: "TODO",
          dueDate: "2026-10-01",
        }),
        task({ projectId: OTHER_ID, status: "TODO", dueDate: "2026-10-01" }),
      ],
      NOW,
      DEFAULT_COMPLETION,
    );

    expect(summary.projectCount).toBe(1);
    expect(summary.taskCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.projects.map((project) => project.id)).toEqual([ACTIVE_A]);
  });

  it("counts pending, completed, and overdue using catalog flags including customs", () => {
    const summary = summarizeDashboard(
      [
        { id: ACTIVE_A, name: "Roadmap", archivedAt: null },
        { id: ACTIVE_B, name: "Later", archivedAt: null },
      ],
      [
        task({ projectId: ACTIVE_A, status: "TODO", dueDate: "2026-10-30" }),
        task({
          projectId: ACTIVE_A,
          status: "IN_PROGRESS",
          dueDate: "2026-10-31",
        }),
        task({ projectId: ACTIVE_A, status: "DONE", dueDate: "2026-10-01" }),
        task({
          projectId: ACTIVE_A,
          status: CUSTOM_DONE,
          dueDate: "2026-10-01",
        }),
        task({ projectId: ACTIVE_B, status: "TODO", dueDate: null }),
      ],
      NOW,
      DEFAULT_COMPLETION,
    );

    expect(summary.taskCount).toBe(5);
    expect(summary.pendingCount).toBe(3);
    expect(summary.completedCount).toBe(2);
    expect(summary.overdueCount).toBe(1);
    expect(summary.pendingCount + summary.completedCount).toBe(
      summary.taskCount,
    );
  });
});
