import { useRef, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import {
  createLabel,
  isConflict,
  isForbidden,
  isUnauthenticated,
  replaceTaskLabels,
  toUserMessage,
  updateLabel,
} from "../api/client";
import type {
  LabelColor,
  PublicLabelDto,
  TaskEmbeddedLabelDto,
} from "../api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LabelColorSwatchPicker } from "./LabelColorSwatchPicker";
import { labelChipClassName } from "./labelColors";

type LabelsActionState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "catalog" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

type LabelsPopoverProps = {
  projectId: string;
  taskId: string;
  catalogLabels: PublicLabelDto[];
  assignedLabels: TaskEmbeddedLabelDto[];
  canWrite: boolean;
  disabled?: boolean;
  onAssignedChange: (labels: TaskEmbeddedLabelDto[]) => void;
  onCatalogChange: (labels: PublicLabelDto[]) => void;
  onUpdated: () => void;
  onUnauthenticated: () => void;
};

function sameLabelIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const set = new Set(left);
  return right.every((id) => set.has(id));
}

export function LabelsPopover({
  projectId,
  taskId,
  catalogLabels,
  assignedLabels,
  canWrite,
  disabled = false,
  onAssignedChange,
  onCatalogChange,
  onUpdated,
  onUnauthenticated,
}: LabelsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draftLabelIds, setDraftLabelIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [actionState, setActionState] = useState<LabelsActionState>({
    kind: "idle",
  });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<LabelColor>("GRAY");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<LabelColor>("GRAY");
  const dismissModeRef = useRef<"apply" | "discard">("apply");

  const persistedIds = assignedLabels.map((label) => label.id);
  const mutationsDisabled =
    disabled || !canWrite || actionState.kind === "saving" || actionState.kind === "catalog";

  function resetLocalUi(): void {
    setSearch("");
    setCreating(false);
    setNewName("");
    setNewColor("GRAY");
    setEditingId(null);
    setEditName("");
    setEditColor("GRAY");
  }

  function seedDraftFromPersisted(): void {
    setDraftLabelIds(assignedLabels.map((label) => label.id));
  }

  async function applyDraftIfNeeded(): Promise<void> {
    if (!canWrite || disabled) {
      return;
    }
    if (sameLabelIds(draftLabelIds, persistedIds)) {
      return;
    }
    setActionState({ kind: "saving" });
    try {
      const result = await replaceTaskLabels(taskId, {
        labelIds: draftLabelIds,
      });
      onAssignedChange(
        result.labels.map((label) => ({
          id: label.id,
          name: label.name,
          color: label.color,
        })),
      );
      setActionState({ kind: "success", message: "Labels updated." });
      onUpdated();
    } catch (err) {
      if (isUnauthenticated(err)) {
        setActionState({ kind: "idle" });
        onUnauthenticated();
        return;
      }
      if (isForbidden(err)) {
        setActionState({ kind: "error", message: toUserMessage(err) });
        return;
      }
      if (isConflict(err)) {
        setActionState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function handleOpenChange(nextOpen: boolean): Promise<void> {
    if (nextOpen) {
      dismissModeRef.current = "apply";
      seedDraftFromPersisted();
      resetLocalUi();
      setActionState({ kind: "idle" });
      setOpen(true);
      return;
    }

    const mode = dismissModeRef.current;
    dismissModeRef.current = "apply";
    setOpen(false);
    resetLocalUi();

    if (mode === "discard") {
      seedDraftFromPersisted();
      return;
    }

    await applyDraftIfNeeded();
  }

  function toggleDraft(labelId: string): void {
    if (mutationsDisabled) {
      return;
    }
    setDraftLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    );
    setActionState({ kind: "idle" });
  }

  async function onCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (mutationsDisabled) {
      return;
    }
    setActionState({ kind: "catalog" });
    try {
      const created = await createLabel(projectId, {
        name: newName,
        color: newColor,
      });
      const nextCatalog = [...catalogLabels, created];
      onCatalogChange(nextCatalog);
      setDraftLabelIds((current) =>
        current.includes(created.id) ? current : [...current, created.id],
      );
      setCreating(false);
      setNewName("");
      setNewColor("GRAY");
      setActionState({ kind: "success", message: "Label created." });
      onUpdated();
    } catch (err) {
      if (isUnauthenticated(err)) {
        setActionState({ kind: "idle" });
        onUnauthenticated();
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
    if (mutationsDisabled) {
      return;
    }
    setActionState({ kind: "catalog" });
    try {
      const updated = await updateLabel(projectId, labelId, {
        name: editName,
        color: editColor,
      });
      onCatalogChange(
        catalogLabels.map((label) => (label.id === labelId ? updated : label)),
      );
      if (persistedIds.includes(labelId)) {
        onAssignedChange(
          assignedLabels.map((label) =>
            label.id === labelId
              ? { id: updated.id, name: updated.name, color: updated.color }
              : label,
          ),
        );
      }
      setEditingId(null);
      setActionState({ kind: "success", message: "Label updated." });
      onUpdated();
    } catch (err) {
      if (isUnauthenticated(err)) {
        setActionState({ kind: "idle" });
        onUnauthenticated();
        return;
      }
      if (isConflict(err)) {
        setActionState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const filtered = catalogLabels.filter((label) => {
    const query = search.trim().toLowerCase();
    if (query === "") {
      return true;
    }
    return label.name.toLowerCase().includes(query);
  });

  return (
    <div className="grid gap-2">
      <Popover
        modal
        open={open}
        onOpenChange={(nextOpen) => {
          void handleOpenChange(nextOpen);
        }}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Labels
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-80 p-3"
          onEscapeKeyDown={(event) => {
            dismissModeRef.current = "discard";
            event.stopPropagation();
          }}
          onPointerDownOutside={() => {
            dismissModeRef.current = "apply";
          }}
          onFocusOutside={() => {
            dismissModeRef.current = "apply";
          }}
        >
          <div className="grid gap-3">
            <Label className="grid gap-2">
              <span className="sr-only">Search labels</span>
              <Input
                type="search"
                name="label-search"
                placeholder="Search labels…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoComplete="off"
              />
            </Label>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No labels match.</p>
            ) : (
              <ul className="grid max-h-64 gap-2 overflow-y-auto" aria-label="Assign labels">
                {filtered.map((label) => {
                  const checked = draftLabelIds.includes(label.id);
                  const isEditing = editingId === label.id;
                  return (
                    <li key={label.id} className="grid gap-2">
                      {isEditing ? (
                        <div className="grid gap-2 rounded-md border p-2">
                          <Label className="grid gap-1 text-xs">
                            Label name
                            <Input
                              type="text"
                              name={`edit-label-name-${label.id}`}
                              value={editName}
                              onChange={(event) => setEditName(event.target.value)}
                              disabled={mutationsDisabled}
                            />
                          </Label>
                          <div className="grid gap-1 text-xs">
                            <span id={`edit-label-color-label-${label.id}`}>
                              Label color
                            </span>
                            <LabelColorSwatchPicker
                              aria-label="Label color"
                              value={editColor}
                              onChange={setEditColor}
                              disabled={mutationsDisabled}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void onSaveEdit(label.id)}
                              disabled={mutationsDisabled}
                            >
                              Save label
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              disabled={mutationsDisabled}
                            >
                              Cancel edit
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {canWrite ? (
                            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                name={`task-label-${label.id}`}
                                checked={checked}
                                onChange={() => toggleDraft(label.id)}
                                disabled={mutationsDisabled}
                              />
                              <span
                                data-label-color={label.color}
                                className={cn(
                                  "inline-block max-w-full truncate rounded px-1.5 py-0.5 text-xs font-medium",
                                  labelChipClassName(label.color),
                                )}
                              >
                                {label.name}
                              </span>
                            </label>
                          ) : (
                            <span
                              data-label-color={label.color}
                              className={cn(
                                "inline-block max-w-full truncate rounded px-1.5 py-0.5 text-xs font-medium",
                                labelChipClassName(label.color),
                              )}
                            >
                              {label.name}
                            </span>
                          )}
                          {canWrite ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              aria-label={`Edit ${label.name}`}
                              disabled={mutationsDisabled}
                              onClick={() => {
                                setEditingId(label.id);
                                setEditName(label.name);
                                setEditColor(label.color);
                                setActionState({ kind: "idle" });
                              }}
                            >
                              <Pencil />
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {canWrite ? (
              creating ? (
                <form
                  onSubmit={(event) => void onCreate(event)}
                  className="grid gap-2 border-t border-border pt-3"
                >
                  <h6 className="text-sm font-semibold">Create a new label</h6>
                  <Label className="grid gap-1 text-xs">
                    New label name
                    <Input
                      type="text"
                      name="new-label-name"
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      disabled={mutationsDisabled}
                    />
                  </Label>
                  <div className="grid gap-1 text-xs">
                    <span id="new-label-color-label">New label color</span>
                    <LabelColorSwatchPicker
                      aria-label="New label color"
                      value={newColor}
                      onChange={setNewColor}
                      disabled={mutationsDisabled}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" disabled={mutationsDisabled}>
                      Create label
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCreating(false)}
                      disabled={mutationsDisabled}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={mutationsDisabled}
                  onClick={() => {
                    setCreating(true);
                    setActionState({ kind: "idle" });
                  }}
                >
                  Create a new label
                </Button>
              )
            ) : null}
            <div className="flex justify-end border-t border-border pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  dismissModeRef.current = "apply";
                  void handleOpenChange(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {actionState.kind === "saving" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Saving labels…
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
    </div>
  );
}
