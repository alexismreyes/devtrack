import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../session/SessionContext";
import { expectNoSessionTokenStorage } from "../test/storage";
import { DashboardPage } from "./DashboardPage";

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

const publicUser = {
  id: "user-1",
  email: "ada@example.com",
  displayName: "Ada",
};

const dashboard = {
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

const emptyDashboard = {
  totalProjects: 0,
  openTasks: 0,
  teamMembers: 0,
  dueSoon: 0,
  projectsPie: [] as typeof dashboard.projectsPie,
  tasksBars: [] as typeof dashboard.tasksBars,
  progress: [] as typeof dashboard.progress,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDashboard(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <SessionProvider>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

function expectNoListTasks(fetchMock: ReturnType<typeof vi.fn>): void {
  expect(
    fetchMock.mock.calls.some(([url]) =>
      /\/api\/projects\/[^/]+\/tasks/.test(String(url)),
    ),
  ).toBe(false);
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("DashboardPage", () => {
  it("shows loading then KPI row and overview charts from GET /api/dashboard", async () => {
    let resolveDashboard: ((value: Response) => void) | undefined;
    const dashboardPromise = new Promise<Response>((resolve) => {
      resolveDashboard = resolve;
    });
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      expect(url).toBe("http://localhost:3000/api/dashboard");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBeUndefined();
      return dashboardPromise;
    });

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/loading dashboard/i);
    resolveDashboard?.(jsonResponse(200, dashboard));

    const kpis = await screen.findByRole("list", { name: /dashboard kpis/i });
    expect(kpis).toHaveTextContent(/total projects/i);
    expect(kpis).toHaveTextContent(/open tasks/i);
    expect(kpis).toHaveTextContent(/team members/i);
    expect(kpis).toHaveTextContent(/due soon/i);
    expect(screen.getByLabelText(/total projects 2/i)).toHaveTextContent("2");
    expect(screen.getByLabelText(/open tasks 3/i)).toHaveTextContent("3");
    expect(screen.getByLabelText(/team members 4/i)).toHaveTextContent("4");
    expect(screen.getByLabelText(/due soon 1/i)).toHaveTextContent("1");

    expect(screen.getByRole("heading", { name: /^projects$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^progress$/i })).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-projects-pie")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-tasks-bars")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-progress-bars")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /stacked bars/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("dashboard-kpi-total-projects")).toHaveClass(
      "bg-eyecandy-surface",
    );
    expect(screen.getByTestId("dashboard-projects-pie-card")).toHaveClass(
      "bg-eyecandy-surface",
    );
    expectNoListTasks(fetchMock);
    expectNoSessionTokenStorage();
  });

  it("treats zero membership projects as empty success UI, not an error", async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      expect(url).toBe("http://localhost:3000/api/dashboard");
      expect(init?.credentials).toBe("include");
      return jsonResponse(200, emptyDashboard);
    });

    renderDashboard();

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    const kpis = await screen.findByRole("list", { name: /dashboard kpis/i });
    expect(screen.getByLabelText(/total projects 0/i)).toHaveTextContent("0");
    expect(screen.getByLabelText(/open tasks 0/i)).toHaveTextContent("0");
    expect(screen.getByLabelText(/team members 0/i)).toHaveTextContent("0");
    expect(screen.getByLabelText(/due soon 0/i)).toHaveTextContent("0");
    expect(kpis).toBeInTheDocument();
    expect(
      screen.getByText(/no projects in your membership set yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no status counts to chart yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no checklist completion data yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no project progress yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expectNoListTasks(fetchMock);
    expectNoSessionTokenStorage();
  });

  it("shows an error state when the dashboard request fails", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      return jsonResponse(503, {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Database is unavailable",
        },
      });
    });

    renderDashboard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
    expect(screen.queryByRole("list", { name: /dashboard kpis/i })).not.toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("shows an unauthenticated state when the dashboard request returns 401", async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      expect(url).toBe("http://localhost:3000/api/dashboard");
      expect(init?.credentials).toBe("include");
      return jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      });
    });

    renderDashboard();

    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /dashboard kpis/i })).not.toBeInTheDocument();
    expectNoListTasks(fetchMock);
    expectNoSessionTokenStorage();
  });
});
