import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LabelsPopover } from "./LabelsPopover";

const bugLabel = {
  id: "label-1",
  projectId: "proj-1",
  name: "Bug",
  color: "RED" as const,
  createdAt: "2026-11-05T12:00:00.000Z",
};

const featureLabel = {
  id: "label-2",
  projectId: "proj-1",
  name: "Feature",
  color: "BLUE" as const,
  createdAt: "2026-11-05T12:05:00.000Z",
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("LabelsPopover", () => {
  it("toggles optimistically without PUT until Done apply-close", async () => {
    const onAssignedChange = vi.fn();
    const onUpdated = vi.fn();
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith("/api/tasks/task-1/labels") && init?.method === "PUT") {
        expect(init.credentials).toBe("include");
        expect(init.body).toBe(JSON.stringify({ labelIds: ["label-1"] }));
        return jsonResponse(200, { labels: [bugLabel] });
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: `Unexpected ${url}` },
      });
    });
    const user = userEvent.setup();

    render(
      <LabelsPopover
        projectId="proj-1"
        taskId="task-1"
        catalogLabels={[bugLabel, featureLabel]}
        assignedLabels={[]}
        canWrite={true}
        onAssignedChange={onAssignedChange}
        onCatalogChange={vi.fn()}
        onUpdated={onUpdated}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^labels$/i }));
    const list = await screen.findByRole("list", { name: /assign labels/i });
    await user.click(within(list).getByRole("checkbox", { name: /bug/i }));
    expect(within(list).getByRole("checkbox", { name: /bug/i })).toBeChecked();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          typeof url === "string" &&
          url.endsWith("/api/tasks/task-1/labels") &&
          init?.method === "PUT",
      ),
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: /^done$/i }));
    expect(await screen.findByText(/labels updated/i)).toBeInTheDocument();
    expect(onAssignedChange).toHaveBeenCalledWith([
      { id: "label-1", name: "Bug", color: "RED" },
    ]);
    expect(onUpdated).toHaveBeenCalled();
  });

  it("discards draft on Escape without PUT", async () => {
    const onAssignedChange = vi.fn();
    const fetchMock = mockFetch(() =>
      jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: "Unexpected" },
      }),
    );
    const user = userEvent.setup();

    render(
      <LabelsPopover
        projectId="proj-1"
        taskId="task-1"
        catalogLabels={[bugLabel]}
        assignedLabels={[]}
        canWrite={true}
        onAssignedChange={onAssignedChange}
        onCatalogChange={vi.fn()}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^labels$/i }));
    const list = await screen.findByRole("list", { name: /assign labels/i });
    await user.click(within(list).getByRole("checkbox", { name: /bug/i }));
    expect(within(list).getByRole("checkbox", { name: /bug/i })).toBeChecked();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("list", { name: /assign labels/i })).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => init?.method === "PUT",
      ),
    ).toBe(false);
    expect(onAssignedChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^labels$/i }));
    const reopened = await screen.findByRole("list", { name: /assign labels/i });
    expect(within(reopened).getByRole("checkbox", { name: /bug/i })).not.toBeChecked();
  });

  it("shows read-only catalog for non-writers", async () => {
    const user = userEvent.setup();

    render(
      <LabelsPopover
        projectId="proj-1"
        taskId="task-1"
        catalogLabels={[bugLabel]}
        assignedLabels={[{ id: "label-1", name: "Bug", color: "RED" }]}
        canWrite={false}
        onAssignedChange={vi.fn()}
        onCatalogChange={vi.fn()}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^labels$/i }));
    expect(await screen.findByText("Bug")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create a new label/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit bug/i }),
    ).not.toBeInTheDocument();
  });

  it("filters labels by search and supports create for writers", async () => {
    const created = {
      id: "label-3",
      projectId: "proj-1",
      name: "Urgent",
      color: "ORANGE" as const,
      createdAt: "2026-11-05T13:00:00.000Z",
    };
    const onCatalogChange = vi.fn();
    mockFetch((url, init) => {
      if (url.endsWith("/api/projects/proj-1/labels") && init?.method === "POST") {
        expect(init.credentials).toBe("include");
        expect(init.body).toBe(
          JSON.stringify({ name: "Urgent", color: "ORANGE" }),
        );
        return jsonResponse(201, created);
      }
      return jsonResponse(500, {
        error: { code: "INTERNAL_ERROR", message: `Unexpected ${url}` },
      });
    });
    const user = userEvent.setup();

    render(
      <LabelsPopover
        projectId="proj-1"
        taskId="task-1"
        catalogLabels={[bugLabel, featureLabel]}
        assignedLabels={[]}
        canWrite={true}
        onAssignedChange={vi.fn()}
        onCatalogChange={onCatalogChange}
        onUpdated={vi.fn()}
        onUnauthenticated={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^labels$/i }));
    await user.type(await screen.findByPlaceholderText(/search labels/i), "fea");
    const list = screen.getByRole("list", { name: /assign labels/i });
    expect(within(list).getByText("Feature")).toBeInTheDocument();
    expect(within(list).queryByText("Bug")).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/search labels/i));
    await user.click(screen.getByRole("button", { name: /create a new label/i }));
    await user.type(screen.getByLabelText(/new label name/i), "Urgent");
    const colorPicker = screen.getByRole("radiogroup", { name: /new label color/i });
    expect(within(colorPicker).getAllByRole("radio")).toHaveLength(9);
    expect(document.querySelector('select[name="new-label-color"]')).toBeNull();
    await user.click(within(colorPicker).getByRole("radio", { name: /^ORANGE$/i }));
    expect(
      within(colorPicker).getByRole("radio", { name: /ORANGE, selected/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^create label$/i }));

    expect(await screen.findByText(/label created/i)).toBeInTheDocument();
    expect(onCatalogChange).toHaveBeenCalled();
  });
});
