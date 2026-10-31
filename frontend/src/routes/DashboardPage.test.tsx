import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../session/SessionContext";
import { expectNoSessionTokenStorage } from "../test/storage";
import { DashboardPage } from "./DashboardPage";

const publicUser = {
  id: "user-1",
  email: "ada@example.com",
  displayName: "Ada",
};

const dashboard = {
  projectCount: 2,
  taskCount: 5,
  pendingCount: 3,
  completedCount: 2,
  overdueCount: 1,
  projects: [
    {
      id: "proj-1",
      name: "Alpha",
      taskCount: 3,
      pendingCount: 2,
      completedCount: 1,
      overdueCount: 1,
    },
    {
      id: "proj-2",
      name: "Beta",
      taskCount: 0,
      pendingCount: 0,
      completedCount: 0,
      overdueCount: 0,
    },
  ],
};

const emptyDashboard = {
  projectCount: 0,
  taskCount: 0,
  pendingCount: 0,
  completedCount: 0,
  overdueCount: 0,
  projects: [] as typeof dashboard.projects,
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
  it("shows loading then owner-wide totals and per-project counts from GET /api/dashboard", async () => {
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

    const totals = await screen.findByRole("list", { name: /owner totals/i });
    expect(totals).toHaveTextContent(/projects 2/i);
    expect(totals).toHaveTextContent(/tasks 5/i);
    expect(totals).toHaveTextContent(/pending 3/i);
    expect(totals).toHaveTextContent(/completed 2/i);
    expect(totals).toHaveTextContent(/overdue 1/i);

    const projects = screen.getByRole("list", { name: /project summaries/i });
    expect(within(projects).getByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    const alphaCounts = screen.getByRole("list", { name: /alpha counts/i });
    expect(alphaCounts).toHaveTextContent(/tasks 3/i);
    expect(alphaCounts).toHaveTextContent(/pending 2/i);
    expect(alphaCounts).toHaveTextContent(/completed 1/i);
    expect(alphaCounts).toHaveTextContent(/overdue 1/i);
    expect(within(projects).getByRole("heading", { name: /^beta$/i })).toBeInTheDocument();
    const betaCounts = screen.getByRole("list", { name: /beta counts/i });
    expect(betaCounts).toHaveTextContent(/tasks 0/i);
    expect(betaCounts).toHaveTextContent(/pending 0/i);
    expect(betaCounts).toHaveTextContent(/completed 0/i);
    expect(betaCounts).toHaveTextContent(/overdue 0/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/due soon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/activity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expectNoListTasks(fetchMock);
    expectNoSessionTokenStorage();
  });

  it("treats zero authorized data as empty zeros, not an error", async () => {
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
    const totals = await screen.findByRole("list", { name: /owner totals/i });
    expect(totals).toHaveTextContent(/projects 0/i);
    expect(totals).toHaveTextContent(/tasks 0/i);
    expect(totals).toHaveTextContent(/pending 0/i);
    expect(totals).toHaveTextContent(/completed 0/i);
    expect(totals).toHaveTextContent(/overdue 0/i);
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /project summaries/i })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("list", { name: /owner totals/i })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("list", { name: /owner totals/i })).not.toBeInTheDocument();
    expectNoListTasks(fetchMock);
    expectNoSessionTokenStorage();
  });
});
