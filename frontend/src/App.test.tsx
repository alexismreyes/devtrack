import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, RouterProvider, createMemoryRouter } from "react-router-dom";
import { App } from "./App";
import { expectNoSessionTokenStorage } from "./test/storage";
import { UI_PALETTE_IDS, UI_PALETTE_STORAGE_KEY } from "./theme/uiPalettes";

const publicUser = {
  id: "user-1",
  email: "ada@example.com",
  displayName: "Ada",
};

const activeProject = {
  id: "proj-1",
  ownerUserId: "user-1",
  name: "Alpha",
  description: "First project",
  createdAt: "2026-10-27T18:00:00.000Z",
  archivedAt: null as string | null,
};

const ownerMember = {
  id: "member-1",
  userId: publicUser.id,
  email: publicUser.email,
  displayName: publicUser.displayName,
  role: "OWNER" as const,
  createdAt: "2026-10-31T12:00:00.000Z",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthenticated(): Response {
  return jsonResponse(401, {
    error: {
      code: "UNAUTHENTICATED",
      message: "Authentication is required",
    },
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

function expectAllCredentialsIncluded(fetchMock: ReturnType<typeof vi.fn>): void {
  for (const [, init] of fetchMock.mock.calls) {
    expect(init?.credentials).toBe("include");
  }
}

function expectNoProbeUi(): void {
  expect(screen.queryByRole("heading", { name: /recorded probes/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /record probe/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("list", { name: /system probes/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/no probes recorded yet/i)).not.toBeInTheDocument();
}

function expectNoProductSidebar(): void {
  expect(screen.queryByRole("complementary", { name: /projects/i })).not.toBeInTheDocument();
}

function expectProductSidebar(): HTMLElement {
  return screen.getByRole("complementary", { name: /projects/i });
}

function expectProjectsHomeMain(): void {
  expect(screen.getByRole("heading", { name: /your projects/i })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/choose a project from the sidebar/i)).not.toBeInTheDocument();
}

function expectCappedAuthenticatedShell(): void {
  const banner = screen.getByRole("banner");
  const shell = banner.parentElement;
  expect(shell).toHaveClass("h-svh", "overflow-hidden");
  expect(shell).not.toHaveClass("min-h-screen");
  expect(screen.getByRole("main")).toHaveClass("min-h-0", "flex-1", "overflow-hidden");
  expect(expectProductSidebar()).toHaveClass("overflow-y-auto");
}

function expectNoProjectsHomeMain(): void {
  expect(screen.queryByRole("heading", { name: /your projects/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
}

function expectBackNextToEditAndArchive(archiveName: RegExp = /archive project/i): void {
  const back = screen.getByRole("link", { name: /back to projects/i });
  const edit = screen.getByRole("button", { name: /edit project/i });
  const archive = screen.getByRole("button", { name: archiveName });
  const members = screen.getByRole("button", { name: /^members$/i });
  expect(back).toHaveAttribute("href", "/projects");
  expect(back.parentElement).toContainElement(edit);
  expect(back.parentElement).toContainElement(archive);
  expect(back.parentElement).toContainElement(members);
  expect(screen.getByRole("link", { name: /^devtrack$/i })).toHaveAttribute(
    "href",
    "/projects",
  );
}

function isMembersListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/members$/.test(url);
}

function isLabelsListUrl(url: string): boolean {
  return /\/api\/projects\/[^/]+\/labels$/.test(url);
}

function renderApp(path = "/"): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function renderAppWithHistory(initialEntries: string[]): {
  router: ReturnType<typeof createMemoryRouter>;
} {
  const router = createMemoryRouter(
    [{ path: "*", element: <App /> }],
    { initialEntries },
  );
  render(<RouterProvider router={router} />);
  return { router };
}

function unexpectedRequest(): Response {
  return jsonResponse(500, {
    error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
  });
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("App frontend shell", () => {
  it("shows a loading session state then guest register without probe UI or a product sidebar", async () => {
    let resolveMe: ((value: Response) => void) | undefined;
    const mePromise = new Promise<Response>((resolve) => {
      resolveMe = resolve;
    });
    const fetchMock = mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return mePromise;
      }
      return unexpectedRequest();
    });

    renderApp("/register");

    expect(screen.getByText(/checking session/i)).toBeInTheDocument();
    resolveMe?.(unauthenticated());

    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^log in$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /log out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /color palette/i })).not.toBeInTheDocument();
    expect(document.documentElement.dataset.palette).toBe("Forest");
    expectNoProductSidebar();
    expectNoProbeUi();
    expectAllCredentialsIncluded(fetchMock);
    expectNoSessionTokenStorage();
  });

  it("uses login and register as distinct destinations", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return unauthenticated();
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/register");

    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^log in$/i }));
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^register$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expectNoProductSidebar();
    expectNoProbeUi();
    await user.click(screen.getByRole("link", { name: /^register$/i }));
    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
  });

  it("sends guests away from authenticated destinations without showing product data", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return unauthenticated();
      }
      return unexpectedRequest();
    });

    const projects = renderApp("/projects");

    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expectNoProjectsHomeMain();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expectNoProductSidebar();
    expectNoProbeUi();
    projects.unmount();

    const profile = renderApp("/profile");
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expectNoProductSidebar();
    profile.unmount();

    const projectDetail = renderApp("/projects/proj-1");
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
    expectNoProductSidebar();
    projectDetail.unmount();

    const dashboard = renderApp("/dashboard");
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /owner totals/i })).not.toBeInTheDocument();
    expectNoProductSidebar();
    dashboard.unmount();
  });

  it("registers, lands on projects with sidebar and empty main, then logs out to login", async () => {
    let authenticated = false;
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/auth/register") && init?.method === "POST") {
        authenticated = true;
        return jsonResponse(201, publicUser);
      }
      if (url.endsWith("/api/auth/logout") && init?.method === "POST") {
        authenticated = false;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/api/users/me")) {
        return authenticated ? jsonResponse(200, publicUser) : unauthenticated();
      }
      if (url.endsWith("/api/projects")) {
        return authenticated
          ? jsonResponse(200, { projects: [] })
          : unauthenticated();
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/register");

    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/display name/i), "Ada");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/signed in as ada@example.com/i)).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expectNoProbeUi();

    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expectNoProductSidebar();
    expectNoProbeUi();
    expectAllCredentialsIncluded(fetchMock);
    expectNoSessionTokenStorage();
  });

  it("logs in and lands on projects without storing a bearer token", async () => {
    let authenticated = false;
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/auth/login") && init?.method === "POST") {
        authenticated = true;
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/users/me")) {
        return authenticated ? jsonResponse(200, publicUser) : unauthenticated();
      }
      if (url.endsWith("/api/projects")) {
        return authenticated
          ? jsonResponse(200, { projects: [] })
          : unauthenticated();
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/login");

    await user.type(await screen.findByLabelText(/^email$/i), "ada@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/signed in as ada@example.com/i)).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expectProjectsHomeMain();
    expectNoProbeUi();
    expectAllCredentialsIncluded(fetchMock);
    expectNoSessionTokenStorage();
  });

  it("restores an existing session onto the requested destination", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [] });
      }
      return unexpectedRequest();
    });

    renderApp("/profile");

    expect(await screen.findByRole("heading", { name: /your profile/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^register$/i })).not.toBeInTheDocument();
    expectNoProjectsHomeMain();
    expectNoProbeUi();
  });

  it("shows an error when the session check fails for a non-auth reason", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(503, {
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Database is unavailable",
          },
        });
      }
      return unexpectedRequest();
    });

    renderApp("/");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /database is unavailable/i,
    );
    expectNoProductSidebar();
    expectNoProbeUi();
  });

  it("sends authenticated users from guest destinations to projects", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [] });
      }
      return unexpectedRequest();
    });

    renderApp("/login");

    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^log in$/i })).not.toBeInTheDocument();
  });

  it("opens /dashboard in the authenticated shell without replacing projects or composing task lists", async () => {
    const dashboard = {
      projectCount: 1,
      taskCount: 3,
      pendingCount: 2,
      completedCount: 1,
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
      ],
    };
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/dashboard")) {
        expect(init?.method).toBe("GET");
        expect(init?.credentials).toBe("include");
        return jsonResponse(200, dashboard);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [{ ...activeProject }] });
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/dashboard");

    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    expectCappedAuthenticatedShell();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /^devtrack$/i })).toHaveAttribute(
      "href",
      "/projects",
    );
    const totals = await screen.findByRole("list", { name: /owner totals/i });
    expect(totals).toHaveTextContent(/projects 1/i);
    expect(totals).toHaveTextContent(/tasks 3/i);
    expect(totals).toHaveTextContent(/pending 2/i);
    expect(totals).toHaveTextContent(/completed 1/i);
    expect(totals).toHaveTextContent(/overdue 1/i);
    expect(screen.getByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expectNoProjectsHomeMain();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        /\/api\/projects\/[^/]+\/tasks/.test(String(url)),
      ),
    ).toBe(false);
    expectAllCredentialsIncluded(fetchMock);
    expectNoSessionTokenStorage();

    await user.click(screen.getByRole("link", { name: /^devtrack$/i }));
    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(await screen.findByRole("list", { name: /project cards/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^dashboard$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /^dashboard$/i }));
    expect(await screen.findByRole("heading", { name: /^dashboard$/i })).toBeInTheDocument();
    expectNoProjectsHomeMain();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
  });

  it("keeps the sidebar on projects, project detail, and profile destinations", async () => {
    const project = { ...activeProject };
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      if (isLabelsListUrl(url)) {
        return jsonResponse(200, { labels: [] });
      }
      if (isMembersListUrl(url)) {
        return jsonResponse(200, { members: [ownerMember] });
      }
      if (url.endsWith("/api/projects/proj-1")) {
        return jsonResponse(200, { ...project });
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [{ ...project }] });
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/projects");

    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /^alpha$/i }));
    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();
    expect(await screen.findByRole("columnheader", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "In progress" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Done" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /^tasks$/i })).not.toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^alpha$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expectNoProjectsHomeMain();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expectNoProbeUi();

    await user.click(screen.getByRole("link", { name: /^profile$/i }));
    expect(await screen.findByRole("heading", { name: /your profile/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
    expectNoProjectsHomeMain();
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: /^devtrack$/i })).toHaveAttribute(
      "href",
      "/projects",
    );
  });

  it("opens a project detail URL directly and restores it from history", async () => {
    const project = { ...activeProject };
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      if (isLabelsListUrl(url)) {
        return jsonResponse(200, { labels: [] });
      }
      if (isMembersListUrl(url)) {
        return jsonResponse(200, { members: [ownerMember] });
      }
      if (url.endsWith("/api/projects/proj-1")) {
        return jsonResponse(200, { ...project });
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [{ ...project }] });
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();
    const { router } = renderAppWithHistory(["/projects/proj-1"]);

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();

    expectBackNextToEditAndArchive();
    await user.click(screen.getByRole("link", { name: /^devtrack$/i }));
    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();

    await router.navigate(-1);
    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expectNoProjectsHomeMain();

    await user.click(screen.getByRole("link", { name: /back to projects/i }));
    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
  });

  it("keeps archive and unarchive on an archived detail URL even when the sidebar omits it", async () => {
    const project = { ...activeProject };
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects/proj-1/archive") && init?.method === "POST") {
        project.archivedAt = "2026-10-27T19:00:00.000Z";
        return jsonResponse(200, { ...project });
      }
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      if (isLabelsListUrl(url)) {
        return jsonResponse(200, { labels: [] });
      }
      if (isMembersListUrl(url)) {
        return jsonResponse(200, { members: [ownerMember] });
      }
      if (url.endsWith("/api/projects/proj-1")) {
        return jsonResponse(200, { ...project });
      }
      if (url.endsWith("/api/projects")) {
        expect(url).not.toMatch(/includeArchived/i);
        return jsonResponse(200, {
          projects: project.archivedAt === null ? [{ ...project }] : [],
        });
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/projects/proj-1");

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /archive project/i }));
    expect(await screen.findByText(/project archived/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unarchive project/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();

    expectBackNextToEditAndArchive(/unarchive project/i);
    await user.click(screen.getByRole("link", { name: /^devtrack$/i }));
    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(await screen.findAllByText(/no projects yet/i)).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /^alpha$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
    expectAllCredentialsIncluded(fetchMock);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false,
    );
    expectNoSessionTokenStorage();
  });

  it("creates a project from the sidebar using existing fields", async () => {
    const projects: Array<typeof activeProject> = [];
    mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects") && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({ name: "Alpha", description: "First project" }),
        );
        projects.unshift(activeProject);
        return jsonResponse(201, activeProject);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [...projects] });
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/projects");

    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expect(await screen.findAllByText(/no projects yet/i)).not.toHaveLength(0);
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create project/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name$/i), "Alpha");
    await user.type(within(dialog).getByLabelText(/^description$/i), "First project");
    await user.click(within(dialog).getByRole("button", { name: /create project/i }));

    expect(await screen.findByText(/project created/i)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^alpha$/i })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^alpha$/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
  });

  it("redirects the app root from guest register and authenticated projects", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return unauthenticated();
      }
      return unexpectedRequest();
    });

    const { unmount } = renderApp("/");
    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    unmount();

    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [] });
      }
      return unexpectedRequest();
    });

    renderApp("/");
    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expectProjectsHomeMain();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("shows not-found for unknown paths including former probe paths", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return unauthenticated();
      }
      return unexpectedRequest();
    });

    const { unmount } = renderApp("/system/probes");

    expect(await screen.findByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toBeInTheDocument();
    expectNoProductSidebar();
    expectNoProbeUi();
    unmount();

    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [] });
      }
      return unexpectedRequest();
    });

    renderApp("/system/probes");
    expect(await screen.findByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to projects/i })).toBeInTheDocument();
    expectNoProductSidebar();
    expectNoProbeUi();
  });

  it("uses DevTrack chrome with status columns on project detail and without Trello branding", async () => {
    const user = userEvent.setup();
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, {
          tasks: [
            {
              id: "task-1",
              projectId: "proj-1",
              title: "Write tests",
              description: null,
              status: "TODO",
              priority: "MEDIUM",
              dueDate: null,
              createdAt: "2026-10-29T18:00:00.000Z",
              labels: [],
            },
          ],
        });
      }
      if (isLabelsListUrl(url)) {
        return jsonResponse(200, { labels: [] });
      }
      if (isMembersListUrl(url)) {
        return jsonResponse(200, { members: [ownerMember] });
      }
      if (url.endsWith("/api/projects/proj-1")) {
        return jsonResponse(200, { ...activeProject });
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [{ ...activeProject }] });
      }
      return unexpectedRequest();
    });

    renderApp("/projects/proj-1");

    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expectCappedAuthenticatedShell();
    expect(screen.getByRole("heading", { name: /^devtrack$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^devtrack$/i })).toHaveAttribute(
      "href",
      "/projects",
    );
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expectBackNextToEditAndArchive();
    expect(screen.getByText(/first project/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^add task$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/new task title/i)).not.toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(await screen.findByRole("columnheader", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "In progress" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Done" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /write tests/i })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /^tasks$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^list$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^board$/i })).not.toBeInTheDocument();
    const boardMain = screen.getByRole("main");
    expect(within(boardMain).queryByRole("heading", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(within(boardMain).queryByText(/pending/i)).not.toBeInTheDocument();
    expect(within(boardMain).queryByText(/overdue/i)).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="board"]')).not.toBeNull();
    expect(document.querySelector('[aria-roledescription="draggable"]')).not.toBeNull();
    expect(document.querySelector("[draggable='true']")).toBeNull();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/trello/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/include archived/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /probe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /probe/i })).not.toBeInTheDocument();
    expectNoProbeUi();
    const paletteSelector = screen.getByRole("button", { name: /color palette/i });
    expect(paletteSelector).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /color palette/i })).not.toBeInTheDocument();
    await user.click(paletteSelector);
    const palettePicker = screen.getByTestId("ui-palette-picker");
    for (const id of UI_PALETTE_IDS) {
      expect(
        within(palettePicker).getByRole("radio", { name: new RegExp(`^${id}`) }),
      ).toBeInTheDocument();
    }
  });

  it("persists a selected palette in localStorage without a profile PATCH", async () => {
    mockFetch((url, init) => {
      if (url.endsWith("/api/users/me") && init?.method === "PATCH") {
        return jsonResponse(500, {
          error: { code: "INTERNAL_ERROR", message: "Palette must not patch profile" },
        });
      }
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [] });
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    const first = renderApp("/projects");

    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    const selector = screen.getByRole("button", { name: /color palette/i });
    expect(document.documentElement.dataset.palette).toBe("Forest");
    await user.click(selector);
    await user.click(
      within(screen.getByTestId("ui-palette-picker")).getByRole("radio", {
        name: /^Ocean$/i,
      }),
    );
    expect(document.documentElement.dataset.palette).toBe("Ocean");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Ocean");
    first.unmount();

    renderApp("/projects");
    expect(await screen.findByRole("button", { name: /color palette/i })).toHaveTextContent(
      "Ocean",
    );
    expect(document.documentElement.dataset.palette).toBe("Ocean");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Ocean");
    expectNoSessionTokenStorage();
  });

  it("keeps the stored palette after logout and themes guest pages", async () => {
    let authenticated = true;
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/auth/logout") && init?.method === "POST") {
        authenticated = false;
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/api/users/me")) {
        return authenticated ? jsonResponse(200, publicUser) : unauthenticated();
      }
      if (url.endsWith("/api/projects")) {
        return authenticated
          ? jsonResponse(200, { projects: [] })
          : unauthenticated();
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "Aurora");

    renderApp("/projects");

    expect(await screen.findByText(/signed in as ada@example.com/i)).toBeInTheDocument();
    expect(document.documentElement.dataset.palette).toBe("Aurora");
    expect(screen.getByRole("button", { name: /color palette/i })).toHaveTextContent(
      "Aurora",
    );

    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expectNoProductSidebar();
    expect(screen.queryByRole("button", { name: /color palette/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /color palette/i })).not.toBeInTheDocument();
    expect(document.documentElement.dataset.palette).toBe("Aurora");
    expect(window.localStorage.getItem(UI_PALETTE_STORAGE_KEY)).toBe("Aurora");
    expectAllCredentialsIncluded(fetchMock);
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.endsWith("/api/users/me") &&
          init?.method === "PATCH",
      ),
    ).toBe(false);
    expectNoSessionTokenStorage();
  });

  it("themes guest login from stored palette and defaults invalid storage to Forest", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return unauthenticated();
      }
      return unexpectedRequest();
    });
    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "Lagoon");

    const first = renderApp("/login");
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(document.documentElement.dataset.palette).toBe("Lagoon");
    expectNoProductSidebar();
    expect(screen.queryByRole("combobox", { name: /color palette/i })).not.toBeInTheDocument();
    first.unmount();

    window.localStorage.setItem(UI_PALETTE_STORAGE_KEY, "unknown-palette");
    renderApp("/register");
    expect(await screen.findByRole("heading", { name: /^register$/i })).toBeInTheDocument();
    expect(document.documentElement.dataset.palette).toBe("Forest");
    expectNoProductSidebar();
    expect(screen.queryByRole("combobox", { name: /color palette/i })).not.toBeInTheDocument();
  });

  it("lists a shared project for an authorized member and keeps member management on the board header", async () => {
    const sharedProject = {
      ...activeProject,
      ownerUserId: "other-owner",
      name: "Shared Alpha",
    };
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
      }
      if (isLabelsListUrl(url)) {
        return jsonResponse(200, { labels: [] });
      }
      if (isMembersListUrl(url)) {
        return jsonResponse(200, {
          members: [
            {
              ...ownerMember,
              userId: "other-owner",
              email: "owner@example.com",
              displayName: "Owner",
            },
            {
              ...ownerMember,
              id: "member-2",
              userId: publicUser.id,
              role: "EDITOR",
            },
          ],
        });
      }
      if (url.endsWith("/api/projects/proj-1")) {
        return jsonResponse(200, sharedProject);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [sharedProject] });
      }
      return unexpectedRequest();
    });
    const user = userEvent.setup();

    renderApp("/projects");

    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^shared alpha$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^shared alpha$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^shared alpha$/i }));
    expect(await screen.findByRole("heading", { name: /^shared alpha$/i })).toBeInTheDocument();
    expect(await screen.findByRole("columnheader", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit project/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^add task$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^members$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
  });

  it("does not add a members page and keeps guest login/register without a product sidebar", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return unauthenticated();
      }
      return unexpectedRequest();
    });

    const membersPage = renderApp("/members");
    expect(await screen.findByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expectNoProductSidebar();
    membersPage.unmount();

    renderApp("/login");
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expectNoProductSidebar();
    expect(screen.queryByRole("button", { name: /^members$/i })).not.toBeInTheDocument();
  });
});
