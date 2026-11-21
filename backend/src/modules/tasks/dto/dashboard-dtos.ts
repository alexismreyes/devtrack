import type { DashboardOverview } from "../domain/dashboard-summary";

export type DashboardPieSliceDto = {
  statusKey: string;
  label: string;
  count: number;
};

export type DashboardTasksBarDto = {
  projectId: string;
  projectName: string;
  checklistCompletionPercent: number;
};

export type DashboardProgressRowDto = {
  projectId: string;
  projectName: string;
  completedTasks: number;
  totalTasks: number;
};

export type DashboardOverviewResponseDto = {
  totalProjects: number;
  openTasks: number;
  teamMembers: number;
  dueSoon: number;
  projectsPie: DashboardPieSliceDto[];
  tasksBars: DashboardTasksBarDto[];
  progress: DashboardProgressRowDto[];
};

export function toDashboardOverviewDto(
  overview: DashboardOverview,
): DashboardOverviewResponseDto {
  return {
    totalProjects: overview.totalProjects,
    openTasks: overview.openTasks,
    teamMembers: overview.teamMembers,
    dueSoon: overview.dueSoon,
    projectsPie: overview.projectsPie.map((slice) => ({
      statusKey: slice.statusKey,
      label: slice.label,
      count: slice.count,
    })),
    tasksBars: overview.tasksBars.map((bar) => ({
      projectId: bar.projectId,
      projectName: bar.projectName,
      checklistCompletionPercent: bar.checklistCompletionPercent,
    })),
    progress: overview.progress.map((row) => ({
      projectId: row.projectId,
      projectName: row.projectName,
      completedTasks: row.completedTasks,
      totalTasks: row.totalTasks,
    })),
  };
}
