import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardCharts } from "./DashboardCharts";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children?: React.ReactNode;
    }) => <div data-testid="responsive-container">{children}</div>,
  };
});

const overview = {
  totalProjects: 2,
  openTasks: 3,
  teamMembers: 4,
  dueSoon: 1,
  projectsPie: [
    { statusKey: "TODO", label: "To do", count: 2 },
    { statusKey: "DONE", label: "Done", count: 1 },
  ],
  tasksBars: [
    {
      projectId: "proj-1",
      projectName: "Alpha",
      checklistCompletionPercent: 50,
    },
    {
      projectId: "proj-2",
      projectName: "Beta",
      checklistCompletionPercent: 0,
    },
  ],
  progress: [
    {
      projectId: "proj-1",
      projectName: "Alpha",
      completedTasks: 1,
      totalTasks: 3,
    },
    {
      projectId: "proj-2",
      projectName: "Beta",
      completedTasks: 0,
      totalTasks: 0,
    },
  ],
};

const emptyOverview = {
  totalProjects: 0,
  openTasks: 0,
  teamMembers: 0,
  dueSoon: 0,
  projectsPie: [] as typeof overview.projectsPie,
  tasksBars: [] as typeof overview.tasksBars,
  progress: [] as typeof overview.progress,
};

describe("DashboardCharts", () => {
  it("renders Projects pie, Tasks bars, and Progress without a chart mode toggle", () => {
    render(<DashboardCharts overview={overview} />);

    expect(
      screen.getByRole("heading", { name: /^projects$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^tasks$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^progress$/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-projects-pie")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tasks-bars")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-progress-bars")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /chart mode/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /stacked bars/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-projects-pie-card")).toHaveClass(
      "bg-eyecandy-surface",
    );
    expect(screen.getByTestId("dashboard-tasks-bars-card")).toHaveClass(
      "bg-eyecandy-surface",
    );
    expect(screen.getByTestId("dashboard-progress-card")).toHaveClass(
      "bg-eyecandy-surface",
    );
  });

  it("shows empty success copy when series arrays are empty", () => {
    render(<DashboardCharts overview={emptyOverview} />);

    expect(screen.getByText(/no status counts to chart yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no checklist completion data yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no project progress yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-projects-pie")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-tasks-bars")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-progress-bars")).not.toBeInTheDocument();
  });
});
