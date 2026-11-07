import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicProjectStatusDto } from "../api/types";
import { expectNoSessionTokenStorage } from "../test/storage";
import { DEFAULT_PROJECT_STATUSES } from "../test/statuses";
import { StatusesDialog } from "./StatusesDialog";

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

function renderDialog(
  overrides: Partial<{
    canWrite: boolean;
    onUnauthenticated: () => void;
    onCatalogChanged: () => void;
  }> = {},
): ReturnType<typeof render> {
  return render(
    <StatusesDialog
      open={true}
      onOpenChange={vi.fn()}
      projectId="proj-1"
      canWrite={overrides.canWrite ?? true}
      onUnauthenticated={overrides.onUnauthenticated ?? vi.fn()}
      onCatalogChanged={overrides.onCatalogChanged}
    />,
  );
}

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StatusesDialog", () => {
  it("shows loading then the status catalog with credentials included", async () => {
    let resolveList: ((value: Response) => void) | undefined;
    const listPromise = new Promise<Response>((resolve) => {
      resolveList = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/statuses");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      return listPromise;
    });

    renderDialog();
    expect(screen.getByRole("status")).toHaveTextContent(/loading statuses/i);
    resolveList?.(jsonResponse(200, { statuses: DEFAULT_PROJECT_STATUSES }));
    const list = await screen.findByRole("list", { name: /project statuses/i });
    expect(within(list).getByText("To do")).toBeInTheDocument();
    expect(within(list).getByText("In progress")).toBeInTheDocument();
    expect(within(list).getByText("Done")).toBeInTheDocument();
  });

  it("creates, edits seeded rows, reorders, and surfaces delete conflicts (AC-010 / AC-014)", async () => {
    let statuses: PublicProjectStatusDto[] = [...DEFAULT_PROJECT_STATUSES];
    const onCatalogChanged = vi.fn();
    mockFetch((url, init) => {
      if (url.endsWith("/statuses") && init?.method === "POST") {
        const created: PublicProjectStatusDto = {
          id: "status-hold",
          projectId: "proj-1",
          key: "hold-key",
          name: "On hold",
          color: "ORANGE",
          isSystem: false,
          isCompleted: false,
          position: statuses.length,
          createdAt: "2026-11-06T13:00:00.000Z",
        };
        statuses = [...statuses, created];
        return jsonResponse(201, created);
      }
      if (url.endsWith("/statuses/status-todo") && init?.method === "PATCH") {
        statuses = statuses.map((status) =>
          status.id === "status-todo"
            ? { ...status, name: "Backlog", color: "PURPLE", isCompleted: false }
            : status,
        );
        return jsonResponse(200, statuses.find((s) => s.id === "status-todo"));
      }
      if (url.endsWith("/statuses/reorder") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { statusIds: string[] };
        statuses = body.statusIds.map((id, position) => {
          const found = statuses.find((status) => status.id === id)!;
          return { ...found, position };
        });
        return jsonResponse(200, { statuses });
      }
      if (url.endsWith("/statuses/status-hold") && init?.method === "DELETE") {
        return jsonResponse(409, {
          error: {
            code: "CONFLICT",
            message: "Status is in use by one or more tasks",
          },
        });
      }
      return jsonResponse(200, { statuses: [...statuses] });
    });
    const user = userEvent.setup();

    renderDialog({ onCatalogChanged });
    expect(await screen.findByText("To do")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/new status name/i), "On hold");
    const newColors = screen.getByRole("radiogroup", { name: /new status color/i });
    await user.click(within(newColors).getByRole("radio", { name: /^ORANGE$/i }));
    await user.click(screen.getByRole("button", { name: /add status/i }));
    expect(await screen.findByText(/status created/i)).toBeInTheDocument();
    expect(screen.getByText("On hold")).toHaveAttribute("data-status-color", "ORANGE");
    expect(onCatalogChanged).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /edit to do/i }));
    const name = screen.getByLabelText(/^status name$/i);
    await user.clear(name);
    await user.type(name, "Backlog");
    const editColors = screen.getByRole("radiogroup", { name: /^status color$/i });
    await user.click(within(editColors).getByRole("radio", { name: /^PURPLE$/i }));
    await user.click(screen.getByRole("button", { name: /save status/i }));
    expect(await screen.findByText(/status updated/i)).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toHaveAttribute("data-status-color", "PURPLE");

    await user.click(screen.getByRole("button", { name: /move on hold up/i }));
    expect(await screen.findByText(/status order updated/i)).toBeInTheDocument();
    const list = screen.getByRole("list", { name: /project statuses/i });
    const items = within(list).getAllByRole("listitem");
    expect(within(items[items.length - 2]!).getByText("On hold")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete on hold/i }));
    expect(
      await screen.findByText(/status is in use by one or more tasks/i),
    ).toBeInTheDocument();
  });

  it("hides mutate and reorder controls for viewers (AC-014)", async () => {
    mockFetch(() => jsonResponse(200, { statuses: DEFAULT_PROJECT_STATUSES }));

    renderDialog({ canWrite: false });

    expect(await screen.findByText("To do")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add status/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit to do/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /move to do/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete to do/i })).not.toBeInTheDocument();
  });

  it("shows completed checkbox on all rows including seeded and no WIP/icons (AC-011)", async () => {
    mockFetch(() => jsonResponse(200, { statuses: DEFAULT_PROJECT_STATUSES }));
    const user = userEvent.setup();

    renderDialog();
    expect(await screen.findByText("Done")).toBeInTheDocument();
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/wip/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /status icon/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /edit done/i }));
    expect(
      screen.getByRole("checkbox", { name: /^completed status$/i, checked: true }),
    ).toBeChecked();
  });

  it("maps unauthenticated catalog access without storing credentials", async () => {
    const onUnauthenticated = vi.fn();
    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );

    renderDialog({ onUnauthenticated });
    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });
});
