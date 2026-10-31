import type { DashboardSummary } from "../domain/dashboard-summary";

export type DashboardProjectSummaryDto = {
  id: string;
  name: string;
  taskCount: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
};

export type DashboardSummaryResponseDto = {
  projectCount: number;
  taskCount: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  projects: DashboardProjectSummaryDto[];
};

export function toDashboardSummaryDto(
  summary: DashboardSummary,
): DashboardSummaryResponseDto {
  return {
    projectCount: summary.projectCount,
    taskCount: summary.taskCount,
    pendingCount: summary.pendingCount,
    completedCount: summary.completedCount,
    overdueCount: summary.overdueCount,
    projects: summary.projects.map((project) => ({
      id: project.id,
      name: project.name,
      taskCount: project.taskCount,
      pendingCount: project.pendingCount,
      completedCount: project.completedCount,
      overdueCount: project.overdueCount,
    })),
  };
}
