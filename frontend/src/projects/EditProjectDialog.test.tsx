import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicProjectDto } from "../api/types";
import { EditProjectDialog } from "./EditProjectDialog";

const baseProject: PublicProjectDto = {
  id: "proj-1",
  ownerUserId: "user-1",
  name: "Alpha",
  description: "First project",
  createdAt: "2026-10-27T18:00:00.000Z",
  archivedAt: null,
  cover: null,
  boardBackground: null,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("EditProjectDialog cover controls", () => {
  it("uploads a cover with credentials included and notifies parent", async () => {
    const cover = { id: "cover-1", contentType: "image/png" };
    const onCoverChange = vi.fn();
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/cover");
      expect(init?.method).toBe("PUT");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBeInstanceOf(FormData);
      return jsonResponse(200, { cover });
    });
    const user = userEvent.setup();
    const file = new File([new Uint8Array([1, 2, 3])], "cover.png", {
      type: "image/png",
    });

    render(
      <EditProjectDialog
        open
        onOpenChange={vi.fn()}
        project={baseProject}
        saving={false}
        onSubmit={vi.fn()}
        onCoverChange={onCoverChange}
        onBoardBackgroundChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByTestId("project-cover-preview-empty"),
    ).toBeInTheDocument();
    const input = within(dialog).getByLabelText(/upload project cover/i);
    expect(input).toHaveClass("cursor-pointer", "file:cursor-pointer");
    await user.upload(input, file);

    await waitFor(() => {
      expect(onCoverChange).toHaveBeenCalledWith(cover);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("clears an existing cover with credentials included", async () => {
    const project: PublicProjectDto = {
      ...baseProject,
      cover: { id: "cover-1", contentType: "image/png" },
    };
    const onCoverChange = vi.fn();
    const bytes = new Uint8Array([137, 80, 78, 71]);
    mockFetch((url, init) => {
      if (url.endsWith("/cover/content")) {
        expect(init?.credentials).toBe("include");
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/cover");
      expect(init?.method).toBe("DELETE");
      expect(init?.credentials).toBe("include");
      return emptyResponse(204);
    });
    const createObjectURL = vi.fn(() => "blob:preview");
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();

    render(
      <EditProjectDialog
        open
        onOpenChange={vi.fn()}
        project={project}
        saving={false}
        onSubmit={vi.fn()}
        onCoverChange={onCoverChange}
        onBoardBackgroundChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(within(dialog).getByTestId("project-cover-preview")).toBeInTheDocument();
    });
    await user.click(within(dialog).getByRole("button", { name: /clear cover/i }));
    await waitFor(() => {
      expect(onCoverChange).toHaveBeenCalledWith(null);
    });
  });

  it("keeps cover file input disabled while save or cover action is busy", () => {
    render(
      <EditProjectDialog
        open
        onOpenChange={vi.fn()}
        project={baseProject}
        saving
        onSubmit={vi.fn()}
        onCoverChange={vi.fn()}
        onBoardBackgroundChange={vi.fn()}
      />,
    );

    const input = within(screen.getByRole("dialog")).getByLabelText(
      /upload project cover/i,
    );
    expect(input).toBeDisabled();
    expect(input).toHaveClass("cursor-pointer", "file:cursor-pointer");
  });

  it("rejects disallowed client-side file types before upload", async () => {
    const onCoverChange = vi.fn();
    const fetchMock = mockFetch(() => emptyResponse(500));
    const file = new File([new Uint8Array([1, 2, 3])], "notes.pdf", {
      type: "application/pdf",
    });

    render(
      <EditProjectDialog
        open
        onOpenChange={vi.fn()}
        project={baseProject}
        saving={false}
        onSubmit={vi.fn()}
        onCoverChange={onCoverChange}
        onBoardBackgroundChange={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const input = within(dialog).getByLabelText(/upload project cover/i);
    // Bypass accept= filtering so the handler still receives a disallowed File.
    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await within(dialog).findByText(/jpeg, png, webp, or gif/i),
    ).toBeInTheDocument();
    expect(onCoverChange).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("EditProjectDialog board background controls", () => {
  it("uploads a board background with credentials included and notifies parent", async () => {
    const boardBackground = {
      id: "bg-1",
      contentType: "image/png",
    };
    const onBoardBackgroundChange = vi.fn();
    const fetchMock = mockFetch((url, init) => {
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/board-background",
      );
      expect(init?.method).toBe("PUT");
      expect(init?.credentials).toBe("include");
      expect(init?.body).toBeInstanceOf(FormData);
      return jsonResponse(200, { boardBackground });
    });
    const user = userEvent.setup();
    const file = new File([new Uint8Array([1, 2, 3])], "board.png", {
      type: "image/png",
    });

    render(
      <EditProjectDialog
        open
        onOpenChange={vi.fn()}
        project={baseProject}
        saving={false}
        onSubmit={vi.fn()}
        onCoverChange={vi.fn()}
        onBoardBackgroundChange={onBoardBackgroundChange}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByTestId("project-board-background-preview-empty"),
    ).toBeInTheDocument();
    const input = within(dialog).getByLabelText(/upload board background/i);
    expect(input).toHaveClass("cursor-pointer", "file:cursor-pointer");
    await user.upload(input, file);

    await waitFor(() => {
      expect(onBoardBackgroundChange).toHaveBeenCalledWith(boardBackground);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("clears an existing board background with credentials included", async () => {
    const project: PublicProjectDto = {
      ...baseProject,
      boardBackground: { id: "bg-1", contentType: "image/png" },
    };
    const onBoardBackgroundChange = vi.fn();
    const bytes = new Uint8Array([137, 80, 78, 71]);
    mockFetch((url, init) => {
      if (url.endsWith("/board-background/content")) {
        expect(init?.credentials).toBe("include");
        return new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "image/png" },
        });
      }
      expect(url).toBe(
        "http://localhost:3000/api/projects/proj-1/board-background",
      );
      expect(init?.method).toBe("DELETE");
      expect(init?.credentials).toBe("include");
      return emptyResponse(204);
    });
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:board-preview"),
      revokeObjectURL: vi.fn(),
    });
    const user = userEvent.setup();

    render(
      <EditProjectDialog
        open
        onOpenChange={vi.fn()}
        project={project}
        saving={false}
        onSubmit={vi.fn()}
        onCoverChange={vi.fn()}
        onBoardBackgroundChange={onBoardBackgroundChange}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(
        within(dialog).getByTestId("project-board-background-preview"),
      ).toBeInTheDocument();
    });
    await user.click(
      within(dialog).getByRole("button", { name: /clear board background/i }),
    );
    await waitFor(() => {
      expect(onBoardBackgroundChange).toHaveBeenCalledWith(null);
    });
  });
});
