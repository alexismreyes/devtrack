import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PublicLabelDto } from "../api/types";
import { expectNoSessionTokenStorage } from "../test/storage";
import { LabelsDialog } from "./LabelsDialog";

const bugLabel: PublicLabelDto = {
  id: "label-1",
  projectId: "proj-1",
  name: "Bug",
  color: "RED",
  createdAt: "2026-11-05T12:00:00.000Z",
};

const featureLabel: PublicLabelDto = {
  id: "label-2",
  projectId: "proj-1",
  name: "Feature",
  color: "GREEN",
  createdAt: "2026-11-05T12:05:00.000Z",
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

function renderDialog(
  overrides: Partial<{
    canWrite: boolean;
    onUnauthenticated: () => void;
    onCatalogChanged: () => void;
  }> = {},
): ReturnType<typeof render> {
  return render(
    <LabelsDialog
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

describe("LabelsDialog", () => {
  it("shows loading then the label catalog with credentials included", async () => {
    let resolveList: ((value: Response) => void) | undefined;
    const listPromise = new Promise<Response>((resolve) => {
      resolveList = resolve;
    });
    mockFetch((url, init) => {
      expect(url).toBe("http://localhost:3000/api/projects/proj-1/labels");
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      return listPromise;
    });

    renderDialog();

    expect(screen.getByRole("status")).toHaveTextContent(/loading labels/i);
    resolveList?.(jsonResponse(200, { labels: [bugLabel, featureLabel] }));

    const list = await screen.findByRole("list", { name: /project labels/i });
    expect(within(list).getByText("Bug")).toHaveAttribute("data-label-color", "RED");
    expect(within(list).getByText("Feature")).toHaveAttribute(
      "data-label-color",
      "GREEN",
    );
    expect(screen.getByRole("button", { name: /add label/i })).toBeInTheDocument();
    expect(screen.queryByText(/checklist/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trello/i)).not.toBeInTheDocument();
    expectNoSessionTokenStorage();
  });

  it("shows an empty state when the catalog is empty", async () => {
    mockFetch(() => jsonResponse(200, { labels: [] }));

    renderDialog();

    expect(await screen.findByText(/no labels yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /project labels/i })).not.toBeInTheDocument();
  });

  it("creates a label and refreshes the catalog", async () => {
    const labels: PublicLabelDto[] = [];
    const onCatalogChanged = vi.fn();
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/labels") && init?.method === "POST") {
        expect(init.body).toBe(JSON.stringify({ name: "Bug", color: "RED" }));
        labels.push(bugLabel);
        return jsonResponse(201, bugLabel);
      }
      return jsonResponse(200, { labels: [...labels] });
    });
    const user = userEvent.setup();

    renderDialog({ onCatalogChanged });

    expect(await screen.findByText(/no labels yet/i)).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/new label name/i), "Bug");
    const createColors = within(dialog).getByRole("radiogroup", {
      name: /new label color/i,
    });
    expect(within(createColors).getAllByRole("radio")).toHaveLength(9);
    expect(document.querySelector('select[name="label-color"]')).toBeNull();
    await user.click(within(createColors).getByRole("radio", { name: /^RED$/i }));
    await user.click(within(dialog).getByRole("button", { name: /add label/i }));

    expect(await screen.findByText(/label created/i)).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(onCatalogChanged).toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });

  it("updates and deletes a label for writers", async () => {
    let labels: PublicLabelDto[] = [bugLabel];
    mockFetch((url, init) => {
      expect(init?.credentials).toBe("include");
      if (url.endsWith("/labels/label-1") && init?.method === "PATCH") {
        expect(init.body).toBe(
          JSON.stringify({ name: "Defect", color: "ORANGE" }),
        );
        labels = [
          {
            ...bugLabel,
            name: "Defect",
            color: "ORANGE",
          },
        ];
        return jsonResponse(200, labels[0]);
      }
      if (url.endsWith("/labels/label-1") && init?.method === "DELETE") {
        labels = [];
        return emptyResponse(204);
      }
      return jsonResponse(200, { labels: [...labels] });
    });
    const user = userEvent.setup();

    renderDialog();

    await user.click(await screen.findByRole("button", { name: /edit bug/i }));
    const dialog = screen.getByRole("dialog");
    const name = within(dialog).getByLabelText(/^label name$/i);
    await user.clear(name);
    await user.type(name, "Defect");
    const editColors = within(dialog).getByRole("radiogroup", { name: /^label color$/i });
    expect(within(editColors).getAllByRole("radio")).toHaveLength(9);
    await user.click(within(editColors).getByRole("radio", { name: /^ORANGE$/i }));
    await user.click(within(dialog).getByRole("button", { name: /save label/i }));

    expect(await screen.findByText(/label updated/i)).toBeInTheDocument();
    expect(screen.getByText("Defect")).toHaveAttribute("data-label-color", "ORANGE");

    await user.click(screen.getByRole("button", { name: /delete defect/i }));
    expect(await screen.findByText(/label deleted/i)).toBeInTheDocument();
    expect(screen.queryByText("Defect")).not.toBeInTheDocument();
  });

  it("hides mutate controls for viewers", async () => {
    mockFetch(() => jsonResponse(200, { labels: [bugLabel] }));

    renderDialog({ canWrite: false });

    expect(await screen.findByText("Bug")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add label/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit bug/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete bug/i })).not.toBeInTheDocument();
  });

  it("shows unauthenticated, forbidden, conflict, and validation errors", async () => {
    const onUnauthenticated = vi.fn();
    mockFetch((_url, init) => {
      if (init?.method === "POST") {
        return jsonResponse(409, {
          error: { code: "CONFLICT", message: "Label name already exists" },
        });
      }
      return jsonResponse(200, { labels: [bugLabel] });
    });
    const user = userEvent.setup();

    renderDialog({ onUnauthenticated });

    expect(await screen.findByText("Bug")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/new label name/i), "Bug");
    await user.click(screen.getByRole("button", { name: /add label/i }));
    expect(await screen.findByText(/label name already exists/i)).toBeInTheDocument();

    mockFetch(() =>
      jsonResponse(401, {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
        },
      }),
    );
    render(
      <LabelsDialog
        open={true}
        onOpenChange={vi.fn()}
        projectId="proj-1"
        canWrite={true}
        onUnauthenticated={onUnauthenticated}
      />,
    );
    expect(
      await screen.findByText(/authentication is required/i),
    ).toBeInTheDocument();
    expect(onUnauthenticated).toHaveBeenCalled();
    expectNoSessionTokenStorage();
  });
});
