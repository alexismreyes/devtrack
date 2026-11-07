import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createStatus,
  deleteStatus,
  isConflict,
  isUnauthenticated,
  listStatuses,
  reorderStatuses,
  toUserMessage,
  updateStatus,
} from "../api/client";
import type {
  PublicProjectStatusDto,
  StatusColor,
} from "../api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LabelColorSwatchPicker } from "./LabelColorSwatchPicker";
import { labelChipClassName } from "./labelColors";

type StatusesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  canWrite: boolean;
  onUnauthenticated: () => void;
  onCatalogChanged?: () => void;
};

type ListState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; statuses: PublicProjectStatusDto[] }
  | { kind: "unauthenticated"; message: string }
  | { kind: "error"; message: string };

type ActionState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "updating"; statusId: string }
  | { kind: "deleting"; statusId: string }
  | { kind: "reordering" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

export function StatusesDialog({
  open,
  onOpenChange,
  projectId,
  canWrite,
  onUnauthenticated,
  onCatalogChanged,
}: StatusesDialogProps) {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });
  const [name, setName] = useState("");
  const [color, setColor] = useState<StatusColor>("GRAY");
  const [isCompleted, setIsCompleted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<StatusColor>("GRAY");
  const [editIsCompleted, setEditIsCompleted] = useState(false);

  const loadStatuses = useCallback(async (): Promise<boolean> => {
    setListState({ kind: "loading" });
    try {
      const result = await listStatuses(projectId);
      if (result.statuses.length === 0) {
        setListState({ kind: "empty" });
        return true;
      }
      setListState({ kind: "success", statuses: result.statuses });
      return true;
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        setActionState({ kind: "idle" });
        onUnauthenticated();
        return false;
      }
      setListState({ kind: "error", message: toUserMessage(err) });
      return false;
    }
  }, [onUnauthenticated, projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("");
    setColor("GRAY");
    setIsCompleted(false);
    setEditingId(null);
    setEditName("");
    setEditColor("GRAY");
    setEditIsCompleted(false);
    setActionState({ kind: "idle" });
    void loadStatuses();
  }, [loadStatuses, open]);

  function handleAuthzError(err: unknown): boolean {
    if (isUnauthenticated(err)) {
      setListState({ kind: "unauthenticated", message: toUserMessage(err) });
      setActionState({ kind: "idle" });
      onUnauthenticated();
      return true;
    }
    return false;
  }

  async function onCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionState({ kind: "creating" });
    try {
      await createStatus(projectId, { name, color, isCompleted });
      const loaded = await loadStatuses();
      if (loaded) {
        setName("");
        setColor("GRAY");
        setIsCompleted(false);
        setActionState({ kind: "success", message: "Status created." });
        onCatalogChanged?.();
      }
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

  async function onSaveEdit(statusId: string): Promise<void> {
    setActionState({ kind: "updating", statusId });
    try {
      await updateStatus(projectId, statusId, {
        name: editName,
        color: editColor,
        isCompleted: editIsCompleted,
      });
      const loaded = await loadStatuses();
      if (loaded) {
        setEditingId(null);
        setActionState({ kind: "success", message: "Status updated." });
        onCatalogChanged?.();
      }
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

  async function onDelete(statusId: string): Promise<void> {
    setActionState({ kind: "deleting", statusId });
    try {
      await deleteStatus(projectId, statusId);
      const loaded = await loadStatuses();
      if (loaded) {
        if (editingId === statusId) {
          setEditingId(null);
        }
        setActionState({ kind: "success", message: "Status deleted." });
        onCatalogChanged?.();
      }
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

  async function onMove(statusId: string, direction: -1 | 1): Promise<void> {
    if (listState.kind !== "success") {
      return;
    }
    const statuses = listState.statuses;
    const index = statuses.findIndex((status) => status.id === statusId);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= statuses.length) {
      return;
    }
    const next = [...statuses];
    const current = next[index];
    const other = next[swapIndex];
    if (current === undefined || other === undefined) {
      return;
    }
    next[index] = other;
    next[swapIndex] = current;
    setActionState({ kind: "reordering" });
    try {
      const result = await reorderStatuses(projectId, {
        statusIds: next.map((status) => status.id),
      });
      setListState(
        result.statuses.length === 0
          ? { kind: "empty" }
          : { kind: "success", statuses: result.statuses },
      );
      setActionState({ kind: "success", message: "Status order updated." });
      onCatalogChanged?.();
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

  const busy =
    actionState.kind === "creating" ||
    actionState.kind === "updating" ||
    actionState.kind === "deleting" ||
    actionState.kind === "reordering";
  const statuses =
    listState.kind === "success"
      ? listState.statuses
      : listState.kind === "empty"
        ? []
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (busy) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="project-statuses-heading">Statuses</DialogTitle>
          <DialogDescription>
            {canWrite
              ? "Create, rename, recolor, reorder, or delete statuses for this project."
              : "View the status catalog for this project."}
          </DialogDescription>
        </DialogHeader>
        {listState.kind === "loading" ? (
          <p className="text-sm text-muted-foreground" role="status">
            Loading statuses…
          </p>
        ) : null}
        {listState.kind === "unauthenticated" ? (
          <p className="text-sm text-muted-foreground" role="status">
            {listState.message}
          </p>
        ) : null}
        {listState.kind === "error" ? (
          <p className="text-sm text-destructive" role="alert">
            {listState.message}
          </p>
        ) : null}
        {listState.kind === "empty" ? (
          <p className="text-sm text-muted-foreground">No statuses yet.</p>
        ) : null}
        {statuses !== null && statuses.length > 0 ? (
          <ul aria-label="Project statuses" className="grid gap-3">
            {statuses.map((status, index) => {
              const isEditing = editingId === status.id;
              return (
                <li
                  key={status.id}
                  className="grid gap-2 rounded-md border p-3"
                >
                  {isEditing ? (
                    <>
                      <Label className="grid gap-2">
                        Status name
                        <Input
                          type="text"
                          name={`edit-status-name-${status.id}`}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          disabled={busy}
                        />
                      </Label>
                      <div className="grid gap-2">
                        <span id={`edit-status-color-label-${status.id}`}>
                          Status color
                        </span>
                        <LabelColorSwatchPicker
                          aria-label="Status color"
                          value={editColor}
                          onChange={setEditColor}
                          disabled={busy}
                        />
                      </div>
                      <Label className="flex items-center gap-2 text-sm font-normal">
                        <input
                          type="checkbox"
                          name={`edit-status-completed-${status.id}`}
                          checked={editIsCompleted}
                          onChange={(event) =>
                            setEditIsCompleted(event.target.checked)
                          }
                          disabled={busy}
                        />
                        Completed status
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void onSaveEdit(status.id)}
                          disabled={busy}
                        >
                          {actionState.kind === "updating" &&
                          actionState.statusId === status.id
                            ? "Saving…"
                            : "Save status"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                        >
                          Cancel edit
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          data-status-color={status.color}
                          className={cn(
                            "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                            labelChipClassName(status.color),
                          )}
                        >
                          {status.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {status.color}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {status.isCompleted ? "Completed" : "Not completed"}
                        </span>
                        {status.isSystem ? (
                          <span className="text-xs text-muted-foreground">
                            Seeded
                          </span>
                        ) : null}
                      </div>
                      {canWrite ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(status.id);
                              setEditName(status.name);
                              setEditColor(status.color);
                              setEditIsCompleted(status.isCompleted);
                              setActionState({ kind: "idle" });
                            }}
                            disabled={busy}
                          >
                            Edit {status.name}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onMove(status.id, -1)}
                            disabled={busy || index === 0}
                          >
                            Move {status.name} up
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onMove(status.id, 1)}
                            disabled={busy || index === statuses.length - 1}
                          >
                            Move {status.name} down
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onDelete(status.id)}
                            disabled={busy}
                          >
                            {actionState.kind === "deleting" &&
                            actionState.statusId === status.id
                              ? "Deleting…"
                              : `Delete ${status.name}`}
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        {canWrite ? (
          <form
            onSubmit={(event) => void onCreate(event)}
            aria-labelledby="add-status-heading"
            className="grid gap-3"
          >
            <h3 id="add-status-heading" className="text-sm font-semibold">
              Add status
            </h3>
            <Label className="grid gap-2">
              New status name
              <Input
                type="text"
                name="status-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </Label>
            <div className="grid gap-2">
              <span id="new-status-color-label">New status color</span>
              <LabelColorSwatchPicker
                aria-label="New status color"
                value={color}
                onChange={setColor}
                disabled={busy}
              />
            </div>
            <Label className="flex items-center gap-2 text-sm font-normal">
              <input
                type="checkbox"
                name="status-completed"
                checked={isCompleted}
                onChange={(event) => setIsCompleted(event.target.checked)}
                disabled={busy}
              />
              Completed status
            </Label>
            {actionState.kind === "creating" ? (
              <p className="text-sm text-muted-foreground" role="status">
                Creating status…
              </p>
            ) : null}
            {actionState.kind === "reordering" ? (
              <p className="text-sm text-muted-foreground" role="status">
                Updating status order…
              </p>
            ) : null}
            {actionState.kind === "success" ? (
              <p className="text-sm text-muted-foreground" role="status">
                {actionState.message}
              </p>
            ) : null}
            {actionState.kind === "error" || actionState.kind === "conflict" ? (
              <p className="text-sm text-destructive" role="alert">
                {actionState.message}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" size="sm" disabled={busy}>
                {actionState.kind === "creating" ? "Creating…" : "Add status"}
              </Button>
            </DialogFooter>
          </form>
        ) : actionState.kind === "success" ? (
          <p className="text-sm text-muted-foreground" role="status">
            {actionState.message}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
