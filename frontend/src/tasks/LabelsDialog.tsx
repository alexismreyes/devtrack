import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createLabel,
  deleteLabel,
  isConflict,
  isUnauthenticated,
  listLabels,
  toUserMessage,
  updateLabel,
} from "../api/client";
import type { LabelColor, PublicLabelDto } from "../api/types";
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

type LabelsDialogProps = {
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
  | { kind: "success"; labels: PublicLabelDto[] }
  | { kind: "unauthenticated"; message: string }
  | { kind: "error"; message: string };

type ActionState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "updating"; labelId: string }
  | { kind: "deleting"; labelId: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

export function LabelsDialog({
  open,
  onOpenChange,
  projectId,
  canWrite,
  onUnauthenticated,
  onCatalogChanged,
}: LabelsDialogProps) {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("GRAY");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<LabelColor>("GRAY");

  const loadLabels = useCallback(async (): Promise<boolean> => {
    setListState({ kind: "loading" });
    try {
      const result = await listLabels(projectId);
      if (result.labels.length === 0) {
        setListState({ kind: "empty" });
        return true;
      }
      setListState({ kind: "success", labels: result.labels });
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
    setEditingId(null);
    setEditName("");
    setEditColor("GRAY");
    setActionState({ kind: "idle" });
    void loadLabels();
  }, [loadLabels, open]);

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
      await createLabel(projectId, { name, color });
      const loaded = await loadLabels();
      if (loaded) {
        setName("");
        setColor("GRAY");
        setActionState({ kind: "success", message: "Label created." });
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

  async function onSaveEdit(labelId: string): Promise<void> {
    setActionState({ kind: "updating", labelId });
    try {
      await updateLabel(projectId, labelId, {
        name: editName,
        color: editColor,
      });
      const loaded = await loadLabels();
      if (loaded) {
        setEditingId(null);
        setActionState({ kind: "success", message: "Label updated." });
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

  async function onDelete(labelId: string): Promise<void> {
    setActionState({ kind: "deleting", labelId });
    try {
      await deleteLabel(projectId, labelId);
      const loaded = await loadLabels();
      if (loaded) {
        if (editingId === labelId) {
          setEditingId(null);
        }
        setActionState({ kind: "success", message: "Label deleted." });
        onCatalogChanged?.();
      }
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const busy =
    actionState.kind === "creating" ||
    actionState.kind === "updating" ||
    actionState.kind === "deleting";
  const labels =
    listState.kind === "success"
      ? listState.labels
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
          <DialogTitle id="project-labels-heading">Labels</DialogTitle>
          <DialogDescription>
            {canWrite
              ? "Create, rename, recolor, or delete labels for this project."
              : "View the label catalog for this project."}
          </DialogDescription>
        </DialogHeader>
        {listState.kind === "loading" ? (
          <p className="text-sm text-muted-foreground" role="status">
            Loading labels…
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
          <p className="text-sm text-muted-foreground">No labels yet.</p>
        ) : null}
        {labels !== null && labels.length > 0 ? (
          <ul aria-label="Project labels" className="grid gap-3">
            {labels.map((label) => {
              const isEditing = editingId === label.id;
              return (
                <li
                  key={label.id}
                  className="grid gap-2 rounded-md border p-3"
                >
                  {isEditing ? (
                    <>
                      <Label className="grid gap-2">
                        Label name
                        <Input
                          type="text"
                          name={`edit-label-name-${label.id}`}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          disabled={busy}
                        />
                      </Label>
                      <div className="grid gap-2">
                        <span id={`edit-label-color-label-${label.id}`}>
                          Label color
                        </span>
                        <LabelColorSwatchPicker
                          aria-label="Label color"
                          value={editColor}
                          onChange={setEditColor}
                          disabled={busy}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void onSaveEdit(label.id)}
                          disabled={busy}
                        >
                          {actionState.kind === "updating" &&
                          actionState.labelId === label.id
                            ? "Saving…"
                            : "Save label"}
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
                          data-label-color={label.color}
                          className={cn(
                            "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
                            labelChipClassName(label.color),
                          )}
                        >
                          {label.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {label.color}
                        </span>
                      </div>
                      {canWrite ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(label.id);
                              setEditName(label.name);
                              setEditColor(label.color);
                              setActionState({ kind: "idle" });
                            }}
                            disabled={busy}
                          >
                            Edit {label.name}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onDelete(label.id)}
                            disabled={busy}
                          >
                            {actionState.kind === "deleting" &&
                            actionState.labelId === label.id
                              ? "Deleting…"
                              : `Delete ${label.name}`}
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
            aria-labelledby="add-label-heading"
            className="grid gap-3"
          >
            <h3 id="add-label-heading" className="text-sm font-semibold">
              Add label
            </h3>
            <Label className="grid gap-2">
              New label name
              <Input
                type="text"
                name="label-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </Label>
            <div className="grid gap-2">
              <span id="new-label-color-label">New label color</span>
              <LabelColorSwatchPicker
                aria-label="New label color"
                value={color}
                onChange={setColor}
                disabled={busy}
              />
            </div>
            {actionState.kind === "creating" ? (
              <p className="text-sm text-muted-foreground" role="status">
                Creating label…
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
                {actionState.kind === "creating" ? "Creating…" : "Add label"}
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
