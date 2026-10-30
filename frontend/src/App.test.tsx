import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, RouterProvider, createMemoryRouter } from "react-router-dom";
import { App } from "./App";

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
    expectNoProductSidebar();
    expectNoProbeUi();
    expectAllCredentialsIncluded(fetchMock);
    expect(window.localStorage.length).toBe(0);
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
    expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expectNoProductSidebar();
    expectNoProbeUi();
    projects.unmount();

    const profile = renderApp("/profile");
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expectNoProductSidebar();
    profile.unmount();

    renderApp("/projects/proj-1");
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
    expectNoProductSidebar();
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
    expect(screen.getByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expect(screen.getByText(/choose a project from the sidebar/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expectNoProbeUi();

    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expectNoProductSidebar();
    expectNoProbeUi();
    expectAllCredentialsIncluded(fetchMock);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
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
    expect(screen.getByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expectNoProbeUi();
    expectAllCredentialsIncluded(fetchMock);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
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
    expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
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

    expect(await screen.findByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^log in$/i })).not.toBeInTheDocument();
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

    expect(await screen.findByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /^alpha$/i }));
    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /^tasks$/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^alpha$/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /your profile/i })).not.toBeInTheDocument();
    expectNoProbeUi();

    await user.click(screen.getByRole("link", { name: /^profile$/i }));
    expect(await screen.findByRole("heading", { name: /your profile/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: /back to projects/i }));
    expect(await screen.findByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();

    await router.navigate(-1);
    expect(await screen.findByRole("heading", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: /back to projects/i }));
    expect(await screen.findByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^alpha$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^alpha$/i })).not.toBeInTheDocument();
    expectAllCredentialsIncluded(fetchMock);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false,
    );
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
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

    expect(await screen.findByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^name$/i), "Alpha");
    await user.type(screen.getByLabelText(/^description$/i), "First project");
    await user.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByText(/project created/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^alpha$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /select a project/i })).toBeInTheDocument();
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
    expect(await screen.findByRole("heading", { name: /select a project/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
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

  it("uses DevTrack chrome and layout metaphors without Kanban, drag-and-drop, or Trello branding", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (/\/api\/projects\/[^/]+\/tasks/.test(url)) {
        return jsonResponse(200, { tasks: [] });
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
    expect(screen.getByRole("heading", { name: /^devtrack$/i })).toBeInTheDocument();
    expect(expectProductSidebar()).toBeInTheDocument();
    expect(document.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="board"]')).not.toBeNull();
    expect(document.querySelector("[draggable='true']")).toBeNull();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/trello/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(screen.queryByText(/kanban/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/include archived/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /probe/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /probe/i })).not.toBeInTheDocument();
    expectNoProbeUi();
  });
});
