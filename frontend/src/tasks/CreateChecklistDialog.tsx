import { useEffect, useState, type FormEvent } from "react";
import {
  createTaskChecklist,
  isConflict,
  isForbidden,
  isUnauthenticated,
  toUserMessage,
} from "../api/client";
import type { PublicChecklistDto } from "../api/types";
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

type CreateChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  disabled?: boolean;
  onCreated: (checklist: PublicChecklistDto) => void;
  onUnauthenticated: () => void;
  onActivityMaybeChanged: () => void | Promise<void>;
};

type ActionState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

export function CreateChecklistDialog({
  open,
  onOpenChange,
  taskId,
  disabled = false,
  onCreated,
  onUnauthenticated,
  onActivityMaybeChanged,
}: CreateChecklistDialogProps) {
  const [name, setName] = useState("Checklist");
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });

  useEffect(() => {
    if (!open) {
      return;
    }
    setName("Checklist");
    setActionState({ kind: "idle" });
  }, [open]);

  const busy = actionState.kind === "creating";
  const mutationsDisabled = busy || disabled;

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (mutationsDisabled) {
      return;
    }
    setActionState({ kind: "creating" });
    try {
      const created = await createTaskChecklist(taskId, { name });
      onCreated(created);
      setActionState({ kind: "idle" });
      onOpenChange(false);
      await onActivityMaybeChanged();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add checklist</DialogTitle>
          <DialogDescription>
            Create a checklist for this task. Items can be added after it appears
            in the task detail.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => void onSubmit(event)}
          className="grid gap-4"
          data-testid="create-checklist-dialog-form"
        >
          <Label className="grid gap-2">
            <span className="text-xs font-normal text-muted-foreground">
              Checklist name
            </span>
            <Input
              type="text"
              name="new-checklist-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={mutationsDisabled}
              maxLength={80}
              autoFocus
            />
          </Label>
          {actionState.kind === "conflict" || actionState.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {actionState.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutationsDisabled}>
              {busy ? "Creating…" : "Create checklist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
