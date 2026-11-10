import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicProjectDto } from "../api/types";
import { ProjectCard } from "./ProjectCard";

const baseProject: PublicProjectDto = {
  id: "proj-1",
  ownerUserId: "user-1",
  name: "Alpha Board",
  description: "First project",
  createdAt: "2026-10-27T18:00:00.000Z",
  archivedAt: null,
  cover: null,
};

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ProjectCard", () => {
  it("renders name-derived fallback when cover is null (Q-158)", () => {
    const fetchMock = mockFetch(() =>
      new Response(null, { status: 500 }),
    );

    render(
      <MemoryRouter>
        <ProjectCard project={baseProject} />
      </MemoryRouter>,
    );

    const cover = screen.getByRole("link", { name: /alpha board/i }).querySelector(
      "[data-slot='project-cover']",
    );
    expect(cover).not.toBeNull();
    expect(cover).toHaveAttribute("data-cover-kind", "fallback");
    expect(cover).toHaveTextContent("AB");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads uploaded cover via authenticated content fetch, not a public /uploads URL", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const project: PublicProjectDto = {
      ...baseProject,
      cover: { id: "cover-1", contentType: "image/png" },
    };
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/cover/content",
      );
      expect(url).not.toMatch(/\/uploads\b/);
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private",
        },
      });
    });
    const createObjectURL = vi.fn(() => "blob:project-cover");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    render(
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /alpha board/i }).querySelector(
        "[data-cover-kind='image']",
      )).toHaveAttribute("src", "blob:project-cover");
    });
    expect(
      screen.getByRole("link", { name: /alpha board/i }).querySelector(
        "[data-cover-id='cover-1']",
      ),
    ).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("falls back to name-derived cover when content fetch fails", async () => {
    const project: PublicProjectDto = {
      ...baseProject,
      cover: { id: "cover-1", contentType: "image/png" },
    };
    mockFetch(() =>
      new Response(
        JSON.stringify({
          error: { code: "NOT_FOUND", message: "Cover not found" },
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    render(
      <MemoryRouter>
        <ProjectCard project={project} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const cover = screen
        .getByRole("link", { name: /alpha board/i })
        .querySelector("[data-slot='project-cover']");
      expect(cover).toHaveAttribute("data-cover-kind", "fallback");
      expect(cover).toHaveTextContent("AB");
    });
  });
});
