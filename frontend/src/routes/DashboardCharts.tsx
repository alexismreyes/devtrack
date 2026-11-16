import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardOverviewResponseDto } from "../api/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EYECANDY_SURFACE_CLASS } from "../theme/uiPalettes";
import {
  mapProgressData,
  mapProjectsPieData,
  mapTasksBarsData,
  pieSliceColor,
  PROGRESS_BAR_COLOR,
  TASKS_BAR_COLOR,
  truncateProjectLabel,
} from "./dashboardChartData";

type DashboardChartsProps = {
  overview: DashboardOverviewResponseDto;
};

function EmptyChartMessage({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  );
}

function ChartSectionCard({
  title,
  headingId,
  accentClass,
  testId,
  children,
}: {
  title: string;
  headingId: string;
  accentClass: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(EYECANDY_SURFACE_CLASS, "overflow-hidden p-0 gap-0")}
      data-testid={testId}
    >
      <CardHeader
        className={cn(
          "rounded-none border-b border-border/40 px-4 py-3 text-primary-foreground",
          accentClass,
        )}
      >
        <h3
          id={headingId}
          className="text-sm font-semibold uppercase tracking-wide"
        >
          {title}
        </h3>
      </CardHeader>
      <CardContent className="px-4 py-4">{children}</CardContent>
    </Card>
  );
}

export function DashboardCharts({ overview }: DashboardChartsProps) {
  const pieData = mapProjectsPieData(overview.projectsPie);
  const tasksData = mapTasksBarsData(overview.tasksBars);
  const progressData = mapProgressData(overview.progress);
  const pieHasValues = pieData.some((slice) => slice.value > 0);
  const chartHeight = Math.max(220, Math.min(360, 48 + tasksData.length * 36));
  const progressHeight = Math.max(
    220,
    Math.min(400, 48 + progressData.length * 40),
  );

  return (
    <section
      aria-labelledby="dashboard-charts-heading"
      className="grid gap-4"
      data-testid="dashboard-charts"
    >
      <h3 id="dashboard-charts-heading" className="sr-only">
        Dashboard charts
      </h3>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSectionCard
          title="Projects"
          headingId="dashboard-projects-pie-heading"
          accentClass="bg-[oklch(0.55_0.12_145)]"
          testId="dashboard-projects-pie-card"
        >
          {!pieHasValues ? (
            <EmptyChartMessage message="No status counts to chart yet." />
          ) : (
            <div
              className="h-64 w-full min-w-0"
              data-testid="dashboard-projects-pie"
              role="img"
              aria-label="Projects pie chart by task status"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={96}
                    label
                  >
                    {pieData.map((slice, index) => (
                      <Cell
                        key={slice.statusKey}
                        fill={pieSliceColor(index)}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartSectionCard>

        <ChartSectionCard
          title="Tasks"
          headingId="dashboard-tasks-bars-heading"
          accentClass="bg-[oklch(0.58_0.18_25)]"
          testId="dashboard-tasks-bars-card"
        >
          {tasksData.length === 0 ? (
            <EmptyChartMessage message="No checklist completion data yet." />
          ) : (
            <div
              className="w-full min-w-0"
              style={{ height: chartHeight }}
              data-testid="dashboard-tasks-bars"
              role="img"
              aria-label="Tasks checklist completion by project"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={tasksData}
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    allowDecimals={false}
                    className="text-xs"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tickFormatter={truncateProjectLabel}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${String(value)}%`,
                      "Checklist completion",
                    ]}
                  />
                  <Bar
                    dataKey="checklistCompletionPercent"
                    name="Checklist %"
                    fill={TASKS_BAR_COLOR}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartSectionCard>
      </div>

      <ChartSectionCard
        title="Progress"
        headingId="dashboard-progress-heading"
        accentClass="bg-[oklch(0.52_0.14_300)]"
        testId="dashboard-progress-card"
      >
        {progressData.length === 0 ? (
          <EmptyChartMessage message="No project progress yet." />
        ) : (
          <div
            className="w-full min-w-0"
            style={{ height: progressHeight }}
            data-testid="dashboard-progress-bars"
            role="img"
            aria-label="Progress completed versus total tasks by project"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={progressData}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  allowDecimals={false}
                  className="text-xs"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tickFormatter={truncateProjectLabel}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(_value, _name, item) => {
                    const row = item?.payload as
                      | { completedTasks?: number; totalTasks?: number }
                      | undefined;
                    const completed = row?.completedTasks ?? 0;
                    const total = row?.totalTasks ?? 0;
                    return [`${completed}/${total}`, "Completed / total"];
                  }}
                />
                <Bar
                  dataKey="completionPercent"
                  name="Completed / total"
                  fill={PROGRESS_BAR_COLOR}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartSectionCard>
    </section>
  );
}
