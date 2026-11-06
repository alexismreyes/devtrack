import { formatCalendarDate, type TaskStatus } from "./task";

export type DashboardCounts = {
  taskCount: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
};

export type DashboardProjectSummary = DashboardCounts & {
  id: string;
  name: string;
};

export type DashboardSummary = DashboardCounts & {
  projectCount: number;
  projects: DashboardProjectSummary[];
};

export type DashboardCountInputProject = {
  id: string;
  name: string;
  archivedAt: Date | null;
};

export type DashboardCountInputTask = {
  projectId: string;
  status: TaskStatus;
  dueDate: Date | null;
  deletedAt: Date | null;
};

/** projectId → (status key → isCompleted). Missing keys treat as not completed. */
export type StatusCompletionByProject = ReadonlyMap<
  string,
  ReadonlyMap<string, boolean>
>;

export function emptyDashboardCounts(): DashboardCounts {
  return {
    taskCount: 0,
    pendingCount: 0,
    completedCount: 0,
    overdueCount: 0,
  };
}

export function resolveStatusCompleted(
  projectId: string,
  statusKey: string,
  completionByProject: StatusCompletionByProject,
): boolean {
  return completionByProject.get(projectId)?.get(statusKey) === true;
}

export function isPendingStatus(
  projectId: string,
  status: TaskStatus,
  completionByProject: StatusCompletionByProject,
): boolean {
  return !resolveStatusCompleted(projectId, status, completionByProject);
}

export function isCompletedStatus(
  projectId: string,
  status: TaskStatus,
  completionByProject: StatusCompletionByProject,
): boolean {
  return resolveStatusCompleted(projectId, status, completionByProject);
}

export function isTaskOverdue(
  task: { projectId: string; status: TaskStatus; dueDate: Date | null },
  now: Date,
  completionByProject: StatusCompletionByProject,
): boolean {
  if (
    task.dueDate === null ||
    resolveStatusCompleted(task.projectId, task.status, completionByProject)
  ) {
    return false;
  }
  return formatCalendarDate(task.dueDate) < formatCalendarDate(now);
}

export function summarizeDashboard(
  projects: readonly DashboardCountInputProject[],
  tasks: readonly DashboardCountInputTask[],
  now: Date,
  completionByProject: StatusCompletionByProject = new Map(),
): DashboardSummary {
  const activeProjects = projects.filter(
    (project) => project.archivedAt === null,
  );
  const countsByProjectId = new Map<string, DashboardCounts>();

  for (const project of activeProjects) {
    countsByProjectId.set(project.id, emptyDashboardCounts());
  }

  for (const task of tasks) {
    if (task.deletedAt !== null) {
      continue;
    }
    const counts = countsByProjectId.get(task.projectId);
    if (counts === undefined) {
      continue;
    }
    counts.taskCount += 1;
    if (isPendingStatus(task.projectId, task.status, completionByProject)) {
      counts.pendingCount += 1;
    }
    if (isCompletedStatus(task.projectId, task.status, completionByProject)) {
      counts.completedCount += 1;
    }
    if (isTaskOverdue(task, now, completionByProject)) {
      counts.overdueCount += 1;
    }
  }

  const projectSummaries = activeProjects.map((project) => {
    const counts = countsByProjectId.get(project.id) ?? emptyDashboardCounts();
    return {
      id: project.id,
      name: project.name,
      taskCount: counts.taskCount,
      pendingCount: counts.pendingCount,
      completedCount: counts.completedCount,
      overdueCount: counts.overdueCount,
    };
  });

  const totals = projectSummaries.reduce(
    (acc, row) => ({
      taskCount: acc.taskCount + row.taskCount,
      pendingCount: acc.pendingCount + row.pendingCount,
      completedCount: acc.completedCount + row.completedCount,
      overdueCount: acc.overdueCount + row.overdueCount,
    }),
    emptyDashboardCounts(),
  );

  return {
    projectCount: projectSummaries.length,
    taskCount: totals.taskCount,
    pendingCount: totals.pendingCount,
    completedCount: totals.completedCount,
    overdueCount: totals.overdueCount,
    projects: projectSummaries,
  };
}

export function buildCompletionByProject(
  statuses: readonly {
    projectId: string;
    key: string;
    isCompleted: boolean;
  }[],
): Map<string, Map<string, boolean>> {
  const result = new Map<string, Map<string, boolean>>();
  for (const status of statuses) {
    let byKey = result.get(status.projectId);
    if (byKey === undefined) {
      byKey = new Map();
      result.set(status.projectId, byKey);
    }
    byKey.set(status.key, status.isCompleted);
  }
  return result;
}
