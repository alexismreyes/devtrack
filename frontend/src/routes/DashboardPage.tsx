import { useCallback, useEffect, useState } from "react";
import { getDashboard, isUnauthenticated, toUserMessage } from "../api/client";
import type { DashboardOverviewResponseDto } from "../api/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSession } from "../session/SessionContext";
import { EYECANDY_SURFACE_CLASS } from "../theme/uiPalettes";
import { isEmptyOverview } from "./dashboardChartData";
import { DashboardCharts } from "./DashboardCharts";

type DashboardState =
  | { kind: "loading" }
  | { kind: "empty"; overview: DashboardOverviewResponseDto }
  | { kind: "success"; overview: DashboardOverviewResponseDto }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string };

const KPI_CARDS: {
  key: keyof Pick<
    DashboardOverviewResponseDto,
    "totalProjects" | "openTasks" | "teamMembers" | "dueSoon"
  >;
  label: string;
  accentClass: string;
  testId: string;
}[] = [
  {
    key: "totalProjects",
    label: "Total Projects",
    accentClass: "bg-[oklch(0.55_0.1_195)]",
    testId: "dashboard-kpi-total-projects",
  },
  {
    key: "openTasks",
    label: "Open Tasks",
    accentClass: "bg-[oklch(0.58_0.18_25)]",
    testId: "dashboard-kpi-open-tasks",
  },
  {
    key: "teamMembers",
    label: "Team Members",
    accentClass: "bg-[oklch(0.72_0.14_85)]",
    testId: "dashboard-kpi-team-members",
  },
  {
    key: "dueSoon",
    label: "Due Soon",
    accentClass: "bg-[oklch(0.55_0.14_145)]",
    testId: "dashboard-kpi-due-soon",
  },
];

function KpiRow({ overview }: { overview: DashboardOverviewResponseDto }) {
  return (
    <ul
      aria-label="Dashboard KPIs"
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      data-testid="dashboard-kpi-row"
    >
      {KPI_CARDS.map((card) => (
        <li key={card.key}>
          <Card
            className={cn(EYECANDY_SURFACE_CLASS, "overflow-hidden p-0 gap-0")}
            data-testid={card.testId}
          >
            <CardHeader
              className={cn(
                "rounded-none border-b border-border/40 px-4 py-2.5 text-primary-foreground",
                card.accentClass,
              )}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide">
                {card.label}
              </h3>
            </CardHeader>
            <CardContent className="px-4 py-4">
              <p
                className="text-3xl font-semibold tabular-nums tracking-tight"
                aria-label={`${card.label} ${overview[card.key]}`}
              >
                {overview[card.key]}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function DashboardPage() {
  const { onLoggedOut } = useSession();
  const [state, setState] = useState<DashboardState>({ kind: "loading" });

  const loadDashboard = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const overview = await getDashboard();
      if (isEmptyOverview(overview)) {
        setState({ kind: "empty", overview });
        return;
      }
      setState({ kind: "success", overview });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setState({ kind: "unauthenticated", message: toUserMessage(err) });
        onLoggedOut();
        return;
      }
      setState({ kind: "error", message: toUserMessage(err) });
    }
  }, [onLoggedOut]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <section
      aria-labelledby="dashboard-heading"
      className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto"
    >
      <h2 id="dashboard-heading" className="text-xl font-semibold tracking-tight">
        Dashboard
      </h2>
      {state.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading dashboard…
        </p>
      ) : null}
      {state.kind === "empty" ? (
        <>
          <KpiRow overview={state.overview} />
          <DashboardCharts overview={state.overview} />
          <p className="text-sm text-muted-foreground" role="status">
            No projects in your membership set yet.
          </p>
        </>
      ) : null}
      {state.kind === "success" ? (
        <>
          <KpiRow overview={state.overview} />
          <DashboardCharts overview={state.overview} />
        </>
      ) : null}
      {state.kind === "unauthenticated" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {state.message}
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
