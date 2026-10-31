import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "../session/SessionContext";
import { expectNoSessionTokenStorage } from "../test/storage";
import { ProjectsHome } from "./ProjectsHome";

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

const archivedProject = {
  ...activeProject,
  id: "proj-archived",
  name: "Archived Alpha",
  archivedAt: "2026-10-27T19:00:00.000Z",
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

function renderHome(path = "/projects"): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <Routes>
          <Route path="/projects" element={<ProjectsHome />} />
          <Route path="/projects/:projectId" element={<p>Project detail</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProjectsHome", () => {
  it("shows an empty grid state instead of the old select-or-create copy", async () => {
    mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      expect(url).toBe("http://localhost:3000/api/projects");
      expect(url).not.toMatch(/includeArchived/i);
      expect(init?.credentials).toBe("include");
      return jsonResponse(200, { projects: [] });
    });

    renderHome();

    expect(await screen.findByRole("heading", { name: /your projects/i })).toBeInTheDocument();
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /select a project/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/choose a project from the sidebar/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /project cards/i })).not.toBeInTheDocument();
  });

  it("renders listed projects as cards with name-derived covers", async () => {
    mockFetch((url, init) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      expect(url).toBe("http://localhost:3000/api/projects");
      expect(init?.credentials).toBe("include");
      return jsonResponse(200, {
        projects: [activeProject, archivedProject],
      });
    });

    renderHome();

    const cards = await screen.findByRole("list", { name: /project cards/i });
    const card = screen.getByRole("link", { name: /^alpha$/i });
    expect(cards).toContainElement(card);
    expect(card).toHaveTextContent("Alpha");
    expect(card.querySelector("[data-slot='project-cover']")).toHaveTextContent("AL");
    expect(cards.className).toMatch(/auto-fill/);
    expect(cards.className).toMatch(/14rem/);
    expect(cards.className).toMatch(/18rem/);
    expect(cards).toHaveClass("justify-start");
    expect(cards.className).not.toMatch(/grid-cols-2/);
    expect(cards.className).not.toMatch(/grid-cols-3/);
    expect(screen.queryByRole("link", { name: /archived alpha/i })).not.toBeInTheDocument();
    expect(activeProject).not.toHaveProperty("coverColor");
    expectNoSessionTokenStorage();
  });

  it("navigates to project detail when a card is activated", async () => {
    mockFetch((url) => {
      if (url.endsWith("/api/users/me")) {
        return jsonResponse(200, publicUser);
      }
      if (url.endsWith("/api/projects")) {
        return jsonResponse(200, { projects: [activeProject] });
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected request" },
      });
    });
    const user = userEvent.setup();

    renderHome();

    await user.click(await screen.findByRole("link", { name: /^alpha$/i }));
    expect(await screen.findByText(/project detail/i)).toBeInTheDocument();
  });
});
