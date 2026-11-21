import { formatCalendarDate, type TaskStatus } from "./task";

export type DashboardPieSlice = {
  statusKey: string;
  label: string;
  count: number;
};

export type DashboardTasksBar = {
  projectId: string;
  projectName: string;
  checklistCompletionPercent: number;
};

export type DashboardProgressRow = {
  projectId: string;
  projectName: string;
  completedTasks: number;
  totalTasks: number;
};

export type DashboardOverview = {
  totalProjects: number;
  openTasks: number;
  teamMembers: number;
  dueSoon: number;
  projectsPie: DashboardPieSlice[];
  tasksBars: DashboardTasksBar[];
  progress: DashboardProgressRow[];
};

export type DashboardCountInputProject = {
  id: string;
  name: string;
  archivedAt: Date | null;
};

export type DashboardCountInputTask = {
  id: string;
  projectId: string;
  status: TaskStatus;
  dueDate: Date | null;
  deletedAt: Date | null;
};

export type DashboardStatusCatalogRow = {
  projectId: string;
  key: string;
  name: string;
  isCompleted: boolean;
};

export type DashboardChecklistTally = {
  taskId: string;
  totalItems: number;
  checkedItems: number;
};

/** projectId → (status key → isCompleted). Missing keys treat as not completed. */
export type StatusCompletionByProject = ReadonlyMap<
  string,
  ReadonlyMap<string, boolean>
>;

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

/** Inclusive UTC window [today, today+7]; completed tasks never count. */
export function isTaskDueSoon(
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
  const due = formatCalendarDate(task.dueDate);
  const today = formatCalendarDate(now);
  const end = addUtcCalendarDays(today, 7);
  return due >= today && due <= end;
}

export function addUtcCalendarDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return formatCalendarDate(base);
}

export function checklistCompletionPercent(
  checkedItems: number,
  totalItems: number,
): number {
  if (totalItems <= 0) {
    return 0;
  }
  return Math.round((checkedItems / totalItems) * 100);
}

/**
 * Group task counts by live status key.
 * Slice id is always `statusKey`. Label uses a catalog display name when every
 * catalog row sharing that key agrees on `name`; otherwise the key itself
 * (stable when custom catalogs collide across projects).
 */
export function buildProjectsPie(
  tasks: readonly DashboardCountInputTask[],
  activeProjectIds: ReadonlySet<string>,
  catalog: readonly DashboardStatusCatalogRow[],
): DashboardPieSlice[] {
  const counts = new Map<string, number>();
  for (const task of tasks) {
    if (task.deletedAt !== null || !activeProjectIds.has(task.projectId)) {
      continue;
    }
    counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
  }

  const namesByKey = new Map<string, Set<string>>();
  for (const row of catalog) {
    let names = namesByKey.get(row.key);
    if (names === undefined) {
      names = new Set();
      namesByKey.set(row.key, names);
    }
    names.add(row.name);
  }

  return [...counts.entries()]
    .map(([statusKey, count]) => {
      const names = namesByKey.get(statusKey);
      const label =
        names !== undefined && names.size === 1
          ? [...names][0]!
          : statusKey;
      return { statusKey, label, count };
    })
    .sort((a, b) =>
      a.statusKey < b.statusKey ? -1 : a.statusKey > b.statusKey ? 1 : 0,
    );
}

export function summarizeDashboard(
  projects: readonly DashboardCountInputProject[],
  tasks: readonly DashboardCountInputTask[],
  now: Date,
  teamMemberCount: number,
  catalog: readonly DashboardStatusCatalogRow[],
  checklistTallies: readonly DashboardChecklistTally[],
): DashboardOverview {
  const activeProjects = projects.filter(
    (project) => project.archivedAt === null,
  );
  const activeProjectIds = new Set(activeProjects.map((project) => project.id));
  const completionByProject = buildCompletionByProject(catalog);

  const liveTasks = tasks.filter(
    (task) =>
      task.deletedAt === null && activeProjectIds.has(task.projectId),
  );

  let openTasks = 0;
  let dueSoon = 0;
  const completedByProject = new Map<string, number>();
  const totalByProject = new Map<string, number>();

  for (const project of activeProjects) {
    completedByProject.set(project.id, 0);
    totalByProject.set(project.id, 0);
  }

  for (const task of liveTasks) {
    totalByProject.set(
      task.projectId,
      (totalByProject.get(task.projectId) ?? 0) + 1,
    );
    if (isPendingStatus(task.projectId, task.status, completionByProject)) {
      openTasks += 1;
    }
    if (isCompletedStatus(task.projectId, task.status, completionByProject)) {
      completedByProject.set(
        task.projectId,
        (completedByProject.get(task.projectId) ?? 0) + 1,
      );
    }
    if (isTaskDueSoon(task, now, completionByProject)) {
      dueSoon += 1;
    }
  }

  const talliesByTaskId = new Map(
    checklistTallies.map((row) => [row.taskId, row]),
  );
  const checkedByProject = new Map<string, number>();
  const checklistTotalByProject = new Map<string, number>();
  for (const project of activeProjects) {
    checkedByProject.set(project.id, 0);
    checklistTotalByProject.set(project.id, 0);
  }
  for (const task of liveTasks) {
    const tally = talliesByTaskId.get(task.id);
    if (tally === undefined) {
      continue;
    }
    checkedByProject.set(
      task.projectId,
      (checkedByProject.get(task.projectId) ?? 0) + tally.checkedItems,
    );
    checklistTotalByProject.set(
      task.projectId,
      (checklistTotalByProject.get(task.projectId) ?? 0) + tally.totalItems,
    );
  }

  const tasksBars = activeProjects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    checklistCompletionPercent: checklistCompletionPercent(
      checkedByProject.get(project.id) ?? 0,
      checklistTotalByProject.get(project.id) ?? 0,
    ),
  }));

  const progress = activeProjects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    completedTasks: completedByProject.get(project.id) ?? 0,
    totalTasks: totalByProject.get(project.id) ?? 0,
  }));

  return {
    totalProjects: activeProjects.length,
    openTasks,
    teamMembers: teamMemberCount,
    dueSoon,
    projectsPie: buildProjectsPie(liveTasks, activeProjectIds, catalog),
    tasksBars,
    progress,
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

export function emptyDashboardOverview(): DashboardOverview {
  return {
    totalProjects: 0,
    openTasks: 0,
    teamMembers: 0,
    dueSoon: 0,
    projectsPie: [],
    tasksBars: [],
    progress: [],
  };
}
