import { describe, expect, it } from "vitest";
import {
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

function task(input: {
  projectId: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
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
  it("treats null due date, due today, and DONE as never overdue", () => {
    expect(
      isTaskOverdue({ status: "TODO", dueDate: null }, NOW),
    ).toBe(false);
    expect(
      isTaskOverdue(
        { status: "TODO", dueDate: calendarDateFromString("2026-10-31") },
        NOW,
      ),
    ).toBe(false);
    expect(
      isTaskOverdue(
        { status: "DONE", dueDate: calendarDateFromString("2026-10-01") },
        NOW,
      ),
    ).toBe(false);
  });

  it("marks a past UTC calendar due date overdue only for pending statuses", () => {
    const past = calendarDateFromString("2026-10-30");
    expect(isTaskOverdue({ status: "TODO", dueDate: past }, NOW)).toBe(true);
    expect(isTaskOverdue({ status: "IN_PROGRESS", dueDate: past }, NOW)).toBe(
      true,
    );
    expect(isTaskOverdue({ status: "DONE", dueDate: past }, NOW)).toBe(false);
  });

  it("maps pending to TODO and IN_PROGRESS and completed to DONE", () => {
    expect(isPendingStatus("TODO")).toBe(true);
    expect(isPendingStatus("IN_PROGRESS")).toBe(true);
    expect(isPendingStatus("DONE")).toBe(false);
    expect(isCompletedStatus("DONE")).toBe(true);
    expect(isCompletedStatus("TODO")).toBe(false);
    expect(isCompletedStatus("IN_PROGRESS")).toBe(false);
  });

  it("returns zeros and an empty project list when there is no authorized data", () => {
    expect(summarizeDashboard([], [], NOW)).toEqual({
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
    );

    expect(summary.projectCount).toBe(1);
    expect(summary.taskCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.projects.map((project) => project.id)).toEqual([ACTIVE_A]);
  });

  it("counts pending, completed, and overdue overlap without counting DONE as overdue", () => {
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
        task({ projectId: ACTIVE_B, status: "TODO", dueDate: null }),
      ],
      NOW,
    );

    expect(summary.taskCount).toBe(4);
    expect(summary.pendingCount).toBe(3);
    expect(summary.completedCount).toBe(1);
    expect(summary.overdueCount).toBe(1);
    expect(summary.pendingCount + summary.completedCount).toBe(summary.taskCount);
    expect(summary.projects[0]).toEqual({
      id: ACTIVE_A,
      name: "Roadmap",
      taskCount: 3,
      pendingCount: 2,
      completedCount: 1,
      overdueCount: 1,
    });
    expect(summary.projects[1]).toEqual({
      id: ACTIVE_B,
      name: "Later",
      taskCount: 1,
      pendingCount: 1,
      completedCount: 0,
      overdueCount: 0,
    });
  });
});
