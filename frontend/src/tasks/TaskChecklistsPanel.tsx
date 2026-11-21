import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  createTaskChecklistItem,
  deleteTaskChecklist,
  deleteTaskChecklistItem,
  isConflict,
  isForbidden,
  isUnauthenticated,
  listTaskChecklistItems,
  listTaskChecklists,
  toUserMessage,
  updateTaskChecklist,
  updateTaskChecklistItem,
} from "../api/client";
import type { PublicChecklistDto, PublicChecklistItemDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EYECANDY_SURFACE_CLASS } from "../theme/uiPalettes";

export const CHECKLIST_ITEMS_WINDOW_SIZE = 10;

export type ChecklistsLoadState =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found"; message: string };

type ChecklistActionState =
  | { kind: "idle" }
  | { kind: "saving"; checklistId: string }
  | { kind: "deleting"; checklistId: string }
  | { kind: "item_creating"; checklistId: string }
  | { kind: "item_saving"; itemId: string }
  | { kind: "item_deleting"; itemId: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

type ChecklistItemsNavState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

type ChecklistItemsWindowSnapshot = {
  items: PublicChecklistItemDto[];
  nextCursor: string | null;
};

type ChecklistItemsWindowState = {
  items: PublicChecklistItemDto[];
  nextCursor: string | null;
  stack: ChecklistItemsWindowSnapshot[];
  navState: ChecklistItemsNavState;
};

type TaskChecklistsPanelProps = {
  taskId: string;
  canWrite: boolean;
  disabled?: boolean;
  onUnauthenticated: () => void;
  onActivityMaybeChanged: () => void | Promise<void>;
  /** When set, merges a checklist created outside the panel (create Dialog). */
  ingestCreatedChecklist?: PublicChecklistDto | null;
};

export function checklistProgressPercent(
  checkedCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) {
    return 0;
  }
  return Math.round((checkedCount / totalCount) * 100);
}

function emptyWindowState(): ChecklistItemsWindowState {
  return {
    items: [],
    nextCursor: null,
    stack: [],
    navState: { kind: "idle" },
  };
}

export function TaskChecklistsPanel({
  taskId,
  canWrite,
  disabled = false,
  onUnauthenticated,
  onActivityMaybeChanged,
  ingestCreatedChecklist = null,
}: TaskChecklistsPanelProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const headingId = useId();
  const [checklists, setChecklists] = useState<PublicChecklistDto[]>([]);
  const [itemsByChecklist, setItemsByChecklist] = useState<
    Record<string, ChecklistItemsWindowState>
  >({});
  const [loadState, setLoadState] = useState<ChecklistsLoadState>({
    kind: "loading",
  });
  const [actionState, setActionState] = useState<ChecklistActionState>({
    kind: "idle",
  });
  const [newItemTextByChecklist, setNewItemTextByChecklist] = useState<
    Record<string, string>
  >({});
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(
    null,
  );
  const [editChecklistName, setEditChecklistName] = useState("");

  async function fetchFirstItemsPage(
    checklistId: string,
  ): Promise<ChecklistItemsWindowState> {
    const page = await listTaskChecklistItems(taskId, checklistId, {
      limit: CHECKLIST_ITEMS_WINDOW_SIZE,
    });
    return {
      items: page.items,
      nextCursor: page.nextCursor,
      stack: [],
      navState: { kind: "idle" },
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoadState({ kind: "loading" });
      try {
        const result = await listTaskChecklists(taskId);
        if (cancelled) {
          return;
        }
        setChecklists(result.checklists);
        const windows = await Promise.all(
          result.checklists.map(async (checklist) => {
            const windowState = await fetchFirstItemsPage(checklist.id);
            return [checklist.id, windowState] as const;
          }),
        );
        if (cancelled) {
          return;
        }
        setItemsByChecklist(Object.fromEntries(windows));
        setLoadState(
          result.checklists.length === 0
            ? { kind: "empty" }
            : { kind: "success" },
        );
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (isUnauthenticated(err)) {
          setLoadState({
            kind: "unauthenticated",
            message: toUserMessage(err),
          });
          onUnauthenticated();
          return;
        }
        if (isForbidden(err)) {
          setLoadState({
            kind: "forbidden",
            message: toUserMessage(err),
          });
          return;
        }
        if (err instanceof ApiError && err.code === "NOT_FOUND") {
          setLoadState({
            kind: "not_found",
            message: toUserMessage(err),
          });
          return;
        }
        setLoadState({ kind: "error", message: toUserMessage(err) });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // fetchFirstItemsPage closes over taskId; reload when task changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional taskId-driven reload
  }, [onUnauthenticated, taskId]);

  useEffect(() => {
    if (ingestCreatedChecklist === null) {
      return;
    }
    setChecklists((current) => {
      if (current.some((item) => item.id === ingestCreatedChecklist.id)) {
        return current;
      }
      return [...current, ingestCreatedChecklist];
    });
    setItemsByChecklist((current) => ({
      ...current,
      [ingestCreatedChecklist.id]: emptyWindowState(),
    }));
    setLoadState({ kind: "success" });
    const section = sectionRef.current;
    if (section !== null && typeof section.scrollIntoView === "function") {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActionState({ kind: "success", message: "Checklist added." });
  }, [ingestCreatedChecklist]);

  const busy =
    actionState.kind === "saving" ||
    actionState.kind === "deleting" ||
    actionState.kind === "item_creating" ||
    actionState.kind === "item_saving" ||
    actionState.kind === "item_deleting";
  const mutationsDisabled = busy || disabled || !canWrite;

  function handleAuthzError(err: unknown): boolean {
    if (isUnauthenticated(err)) {
      setLoadState({
        kind: "unauthenticated",
        message: toUserMessage(err),
      });
      setActionState({ kind: "idle" });
      onUnauthenticated();
      return true;
    }
    if (isForbidden(err)) {
      setActionState({ kind: "error", message: toUserMessage(err) });
      return true;
    }
    return false;
  }

  function applyChecklists(next: PublicChecklistDto[]): void {
    setChecklists(next);
    setLoadState(next.length === 0 ? { kind: "empty" } : { kind: "success" });
  }

  async function resetItemsWindow(checklistId: string): Promise<void> {
    const windowState = await fetchFirstItemsPage(checklistId);
    setItemsByChecklist((current) => ({
      ...current,
      [checklistId]: windowState,
    }));
  }

  async function onSaveChecklistName(checklistId: string): Promise<void> {
    setActionState({ kind: "saving", checklistId });
    try {
      const updated = await updateTaskChecklist(taskId, checklistId, {
        name: editChecklistName,
      });
      applyChecklists(
        checklists.map((checklist) =>
          checklist.id === checklistId
            ? {
                ...updated,
                itemCount: checklist.itemCount,
                checkedCount: checklist.checkedCount,
              }
            : checklist,
        ),
      );
      setEditingChecklistId(null);
      setEditChecklistName("");
      setActionState({ kind: "success", message: "Checklist renamed." });
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setActionState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onDeleteChecklist(checklistId: string): Promise<void> {
    setActionState({ kind: "deleting", checklistId });
    try {
      await deleteTaskChecklist(taskId, checklistId);
      applyChecklists(
        checklists.filter((checklist) => checklist.id !== checklistId),
      );
      setItemsByChecklist((current) => {
        const next = { ...current };
        delete next[checklistId];
        return next;
      });
      if (editingChecklistId === checklistId) {
        setEditingChecklistId(null);
        setEditChecklistName("");
      }
      setActionState({ kind: "success", message: "Checklist deleted." });
      await onActivityMaybeChanged();
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setActionState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onCreateItem(
    event: FormEvent<HTMLFormElement>,
    checklistId: string,
  ): Promise<void> {
    event.preventDefault();
    const text = newItemTextByChecklist[checklistId] ?? "";
    setActionState({ kind: "item_creating", checklistId });
    try {
      await createTaskChecklistItem(taskId, checklistId, {
        text,
      });
      applyChecklists(
        checklists.map((checklist) =>
          checklist.id === checklistId
            ? { ...checklist, itemCount: checklist.itemCount + 1 }
            : checklist,
        ),
      );
      await resetItemsWindow(checklistId);
      setNewItemTextByChecklist((current) => ({
        ...current,
        [checklistId]: "",
      }));
      setActionState({ kind: "success", message: "Checklist item added." });
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setActionState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onToggleItemChecked(
    checklistId: string,
    itemId: string,
    checked: boolean,
  ): Promise<void> {
    setActionState({ kind: "item_saving", itemId });
    try {
      await updateTaskChecklistItem(taskId, checklistId, itemId, { checked });
      applyChecklists(
        checklists.map((checklist) => {
          if (checklist.id !== checklistId) {
            return checklist;
          }
          const delta = checked ? 1 : -1;
          return {
            ...checklist,
            checkedCount: Math.max(0, checklist.checkedCount + delta),
          };
        }),
      );
      await resetItemsWindow(checklistId);
      setActionState({
        kind: "success",
        message: checked
          ? "Checklist item completed."
          : "Checklist item marked incomplete.",
      });
      await onActivityMaybeChanged();
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setActionState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onDeleteItem(
    checklistId: string,
    itemId: string,
  ): Promise<void> {
    setActionState({ kind: "item_deleting", itemId });
    const currentWindow = itemsByChecklist[checklistId];
    const deletedItem = currentWindow?.items.find((item) => item.id === itemId);
    try {
      await deleteTaskChecklistItem(taskId, checklistId, itemId);
      applyChecklists(
        checklists.map((checklist) => {
          if (checklist.id !== checklistId) {
            return checklist;
          }
          return {
            ...checklist,
            itemCount: Math.max(0, checklist.itemCount - 1),
            checkedCount:
              deletedItem?.checked === true
                ? Math.max(0, checklist.checkedCount - 1)
                : checklist.checkedCount,
          };
        }),
      );
      await resetItemsWindow(checklistId);
      setActionState({ kind: "success", message: "Checklist item deleted." });
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setActionState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onNextItemsWindow(checklistId: string): Promise<void> {
    const current = itemsByChecklist[checklistId] ?? emptyWindowState();
    if (current.nextCursor === null) {
      return;
    }
    setItemsByChecklist((windows) => ({
      ...windows,
      [checklistId]: {
        ...current,
        navState: { kind: "loading" },
      },
    }));
    try {
      const page = await listTaskChecklistItems(taskId, checklistId, {
        cursor: current.nextCursor,
        limit: CHECKLIST_ITEMS_WINDOW_SIZE,
      });
      setItemsByChecklist((windows) => {
        const latest = windows[checklistId] ?? current;
        return {
          ...windows,
          [checklistId]: {
            items: page.items,
            nextCursor: page.nextCursor,
            stack: [
              ...latest.stack,
              {
                items: latest.items,
                nextCursor: latest.nextCursor,
              },
            ],
            navState: { kind: "idle" },
          },
        };
      });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setItemsByChecklist((windows) => ({
          ...windows,
          [checklistId]: {
            ...current,
            navState: { kind: "error", message: toUserMessage(err) },
          },
        }));
        onUnauthenticated();
        return;
      }
      setItemsByChecklist((windows) => ({
        ...windows,
        [checklistId]: {
          ...current,
          navState: { kind: "error", message: toUserMessage(err) },
        },
      }));
    }
  }

  function onPrevItemsWindow(checklistId: string): void {
    const current = itemsByChecklist[checklistId];
    if (current === undefined || current.stack.length === 0) {
      return;
    }
    const previous = current.stack[current.stack.length - 1];
    if (previous === undefined) {
      return;
    }
    setItemsByChecklist((windows) => ({
      ...windows,
      [checklistId]: {
        items: previous.items,
        nextCursor: previous.nextCursor,
        stack: current.stack.slice(0, -1),
        navState: { kind: "idle" },
      },
    }));
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className="grid gap-3"
      data-testid="task-checklists"
    >
      <h5 id={headingId} className="text-sm font-semibold tracking-tight">
        Checklists
      </h5>

      {loadState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading checklists…
        </p>
      ) : null}
      {loadState.kind === "unauthenticated" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {loadState.message}
        </p>
      ) : null}
      {loadState.kind === "forbidden" ||
      loadState.kind === "not_found" ||
      loadState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {loadState.message}
        </p>
      ) : null}
      {loadState.kind === "empty" ? (
        <p className="text-sm text-muted-foreground" role="status">
          No checklists yet.
        </p>
      ) : null}

      {checklists.length > 0 ? (
        <ul className="grid gap-4" aria-label="Task checklists">
          {checklists.map((checklist) => {
            const windowState =
              itemsByChecklist[checklist.id] ?? emptyWindowState();
            const checkedCount = checklist.checkedCount;
            const totalCount = checklist.itemCount;
            const percent = checklistProgressPercent(checkedCount, totalCount);
            const isEditing = editingChecklistId === checklist.id;
            const navBusy = windowState.navState.kind === "loading";
            const canGoPrev = windowState.stack.length > 0;
            const canGoNext = windowState.nextCursor !== null;
            return (
              <li
                key={checklist.id}
                className={cn(
                  "grid gap-3 rounded-lg border border-border p-3",
                  EYECANDY_SURFACE_CLASS,
                )}
                data-testid={`checklist-block-${checklist.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {isEditing ? (
                    <div className="grid min-w-0 flex-1 gap-2">
                      <Label className="grid gap-2">
                        Checklist name
                        <Input
                          type="text"
                          name={`edit-checklist-name-${checklist.id}`}
                          value={editChecklistName}
                          onChange={(event) =>
                            setEditChecklistName(event.target.value)
                          }
                          disabled={mutationsDisabled}
                          maxLength={80}
                        />
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            void onSaveChecklistName(checklist.id)
                          }
                          disabled={mutationsDisabled}
                        >
                          {actionState.kind === "saving" &&
                          actionState.checklistId === checklist.id
                            ? "Saving…"
                            : "Save name"}
                        </Button>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0"
                          onClick={() => {
                            setEditingChecklistId(null);
                            setEditChecklistName("");
                          }}
                          disabled={mutationsDisabled}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <h6 className="text-sm font-medium">{checklist.name}</h6>
                  )}
                  {canWrite && !isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0"
                        onClick={() => {
                          setEditingChecklistId(checklist.id);
                          setEditChecklistName(checklist.name);
                          setActionState({ kind: "idle" });
                        }}
                        disabled={mutationsDisabled}
                      >
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0 text-destructive"
                        onClick={() => void onDeleteChecklist(checklist.id)}
                        disabled={mutationsDisabled}
                      >
                        {actionState.kind === "deleting" &&
                        actionState.checklistId === checklist.id
                          ? "Deleting…"
                          : "Delete checklist"}
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-1">
                  <div
                    className="h-2 overflow-hidden rounded-sm bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={`${checklist.name} progress`}
                  >
                    <div
                      className="h-full bg-foreground/70 transition-[width]"
                      style={{ width: `${percent}%` }}
                      data-testid={`checklist-progress-fill-${checklist.id}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {`${percent}%`}
                    {totalCount === 0
                      ? " (0/0)"
                      : ` (${checkedCount}/${totalCount})`}
                  </p>
                </div>

                {windowState.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                ) : (
                  <ul
                    className="grid gap-2"
                    aria-label={`${checklist.name} items`}
                    data-testid={`checklist-items-${checklist.id}`}
                  >
                    {windowState.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <label
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2 text-sm",
                            !mutationsDisabled && "cursor-pointer",
                          )}
                        >
                          <input
                            type="checkbox"
                            className={cn(!mutationsDisabled && "cursor-pointer")}
                            checked={item.checked}
                            disabled={mutationsDisabled}
                            onChange={(event) =>
                              void onToggleItemChecked(
                                checklist.id,
                                item.id,
                                event.target.checked,
                              )
                            }
                            aria-label={`Mark ${item.text} ${item.checked ? "incomplete" : "complete"}`}
                          />
                          <span
                            className={cn(
                              "min-w-0 break-words",
                              item.checked &&
                                "text-muted-foreground line-through",
                            )}
                            data-checked={item.checked ? "true" : "false"}
                          >
                            {item.text}
                          </span>
                        </label>
                        {canWrite ? (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto px-0 text-destructive"
                            onClick={() =>
                              void onDeleteItem(checklist.id, item.id)
                            }
                            disabled={mutationsDisabled}
                          >
                            {actionState.kind === "item_deleting" &&
                            actionState.itemId === item.id
                              ? "Deleting…"
                              : "Delete item"}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {canGoPrev || canGoNext ? (
                  <div
                    className="flex flex-wrap gap-2"
                    data-testid={`checklist-items-nav-${checklist.id}`}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onPrevItemsWindow(checklist.id)}
                      disabled={!canGoPrev || navBusy}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void onNextItemsWindow(checklist.id)}
                      disabled={!canGoNext || navBusy}
                    >
                      {navBusy ? "Loading…" : "Next"}
                    </Button>
                  </div>
                ) : null}
                {windowState.navState.kind === "error" ? (
                  <p className="text-sm text-destructive" role="alert">
                    {windowState.navState.message}
                  </p>
                ) : null}

                {canWrite ? (
                  <form
                    onSubmit={(event) =>
                      void onCreateItem(event, checklist.id)
                    }
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                  >
                    <Label className="grid gap-2">
                      New item for {checklist.name}
                      <Input
                        type="text"
                        name={`new-item-${checklist.id}`}
                        value={newItemTextByChecklist[checklist.id] ?? ""}
                        onChange={(event) =>
                          setNewItemTextByChecklist((current) => ({
                            ...current,
                            [checklist.id]: event.target.value,
                          }))
                        }
                        disabled={mutationsDisabled}
                        maxLength={200}
                        placeholder="Add an item…"
                      />
                    </Label>
                    <Button type="submit" size="sm" disabled={mutationsDisabled}>
                      {actionState.kind === "item_creating" &&
                      actionState.checklistId === checklist.id
                        ? "Adding…"
                        : "Add item"}
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {actionState.kind === "success" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {actionState.message}
        </p>
      ) : null}
      {actionState.kind === "conflict" || actionState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {actionState.message}
        </p>
      ) : null}
    </section>
  );
}
