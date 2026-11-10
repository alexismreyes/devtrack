import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  createTaskChecklistItem,
  deleteTaskChecklist,
  deleteTaskChecklistItem,
  isConflict,
  isForbidden,
  isUnauthenticated,
  listTaskChecklists,
  toUserMessage,
  updateTaskChecklist,
  updateTaskChecklistItem,
} from "../api/client";
import type { PublicChecklistDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EYECANDY_SURFACE_CLASS } from "../theme/uiPalettes";

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

  async function onSaveChecklistName(checklistId: string): Promise<void> {
    setActionState({ kind: "saving", checklistId });
    try {
      const updated = await updateTaskChecklist(taskId, checklistId, {
        name: editChecklistName,
      });
      applyChecklists(
        checklists.map((checklist) =>
          checklist.id === checklistId
            ? { ...updated, items: checklist.items }
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
      const created = await createTaskChecklistItem(taskId, checklistId, {
        text,
      });
      applyChecklists(
        checklists.map((checklist) =>
          checklist.id === checklistId
            ? { ...checklist, items: [...checklist.items, created] }
            : checklist,
        ),
      );
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
      const updated = await updateTaskChecklistItem(
        taskId,
        checklistId,
        itemId,
        { checked },
      );
      applyChecklists(
        checklists.map((checklist) =>
          checklist.id === checklistId
            ? {
                ...checklist,
                items: checklist.items.map((item) =>
                  item.id === itemId ? updated : item,
                ),
              }
            : checklist,
        ),
      );
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
    try {
      await deleteTaskChecklistItem(taskId, checklistId, itemId);
      applyChecklists(
        checklists.map((checklist) =>
          checklist.id === checklistId
            ? {
                ...checklist,
                items: checklist.items.filter((item) => item.id !== itemId),
              }
            : checklist,
        ),
      );
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
            const checkedCount = checklist.items.filter(
              (item) => item.checked,
            ).length;
            const totalCount = checklist.items.length;
            const percent = checklistProgressPercent(checkedCount, totalCount);
            const isEditing = editingChecklistId === checklist.id;
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

                {checklist.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                ) : (
                  <ul
                    className="grid gap-2"
                    aria-label={`${checklist.name} items`}
                  >
                    {checklist.items.map((item) => (
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
