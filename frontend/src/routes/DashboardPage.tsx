import { useCallback, useEffect, useState } from "react";
import { getDashboard, isUnauthenticated, toUserMessage } from "../api/client";
import type {
  DashboardProjectSummaryDto,
  DashboardSummaryResponseDto,
} from "../api/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSession } from "../session/SessionContext";

type DashboardState =
  | { kind: "loading" }
  | { kind: "empty"; summary: DashboardSummaryResponseDto }
  | { kind: "success"; summary: DashboardSummaryResponseDto }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string };

function CountList({
  label,
  taskCount,
  pendingCount,
  completedCount,
  overdueCount,
  projectCount,
}: {
  label: string;
  taskCount: number;
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
  projectCount?: number;
}) {
  return (
    <ul aria-label={label} className="grid gap-1 text-sm">
      {projectCount !== undefined ? <li>Projects {projectCount}</li> : null}
      <li>Tasks {taskCount}</li>
      <li>Pending {pendingCount}</li>
      <li>Completed {completedCount}</li>
      <li>Overdue {overdueCount}</li>
    </ul>
  );
}

function OwnerTotals({ summary }: { summary: DashboardSummaryResponseDto }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold tracking-tight">Owner totals</h3>
      </CardHeader>
      <CardContent>
        <CountList
          label="Owner totals"
          projectCount={summary.projectCount}
          taskCount={summary.taskCount}
          pendingCount={summary.pendingCount}
          completedCount={summary.completedCount}
          overdueCount={summary.overdueCount}
        />
      </CardContent>
    </Card>
  );
}

function ProjectSummaryRow({ project }: { project: DashboardProjectSummaryDto }) {
  return (
    <li>
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold tracking-tight">{project.name}</h3>
        </CardHeader>
        <CardContent>
          <CountList
            label={`${project.name} counts`}
            taskCount={project.taskCount}
            pendingCount={project.pendingCount}
            completedCount={project.completedCount}
            overdueCount={project.overdueCount}
          />
        </CardContent>
      </Card>
    </li>
  );
}

export function DashboardPage() {
  const { onLoggedOut } = useSession();
  const [state, setState] = useState<DashboardState>({ kind: "loading" });

  const loadDashboard = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const summary = await getDashboard();
      if (summary.projectCount === 0) {
        setState({ kind: "empty", summary });
        return;
      }
      setState({ kind: "success", summary });
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
          <OwnerTotals summary={state.summary} />
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        </>
      ) : null}
      {state.kind === "success" ? (
        <>
          <OwnerTotals summary={state.summary} />
          <ul aria-label="Project summaries" className="grid gap-4">
            {state.summary.projects.map((project) => (
              <ProjectSummaryRow key={project.id} project={project} />
            ))}
          </ul>
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
