import type {
  DashboardOverviewResponseDto,
  DashboardPieSliceDto,
  DashboardProgressRowDto,
  DashboardTasksBarDto,
} from "../api/types";

export type ProjectsPieDatum = {
  statusKey: string;
  name: string;
  value: number;
};

export type TasksBarDatum = {
  projectId: string;
  name: string;
  checklistCompletionPercent: number;
};

export type ProgressBarDatum = {
  projectId: string;
  name: string;
  completedTasks: number;
  totalTasks: number;
  /** 0–100 for bar length; 0 when totalTasks is 0. */
  completionPercent: number;
};

/** Stable palette for dynamic status-key pie slices (Recharts Cell fills). */
export const PIE_SLICE_COLORS = [
  "var(--primary)",
  "var(--accent)",
  "var(--chart-3, oklch(0.7 0.14 85))",
  "var(--destructive)",
  "var(--chart-5, oklch(0.65 0.12 300))",
  "var(--muted-foreground)",
] as const;

export const TASKS_BAR_COLOR = "var(--primary)";
export const PROGRESS_BAR_COLOR = "var(--accent)";

export function mapProjectsPieData(
  slices: DashboardPieSliceDto[],
): ProjectsPieDatum[] {
  return slices.map((slice) => ({
    statusKey: slice.statusKey,
    name: slice.label,
    value: slice.count,
  }));
}

export function mapTasksBarsData(bars: DashboardTasksBarDto[]): TasksBarDatum[] {
  return bars.map((bar) => ({
    projectId: bar.projectId,
    name: bar.projectName,
    checklistCompletionPercent: bar.checklistCompletionPercent,
  }));
}

export function mapProgressData(
  rows: DashboardProgressRowDto[],
): ProgressBarDatum[] {
  return rows.map((row) => ({
    projectId: row.projectId,
    name: row.projectName,
    completedTasks: row.completedTasks,
    totalTasks: row.totalTasks,
    completionPercent:
      row.totalTasks <= 0
        ? 0
        : Math.round((row.completedTasks / row.totalTasks) * 100),
  }));
}

export function pieSliceColor(index: number): string {
  return PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length]!;
}

export function isEmptyOverview(
  overview: Pick<
    DashboardOverviewResponseDto,
    "totalProjects" | "projectsPie" | "tasksBars" | "progress"
  >,
): boolean {
  return overview.totalProjects === 0;
}

export function truncateProjectLabel(name: string, maxLength = 16): string {
  if (name.length <= maxLength) {
    return name;
  }
  return `${name.slice(0, Math.max(0, maxLength - 1))}…`;
}
