import type { FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  creating: boolean;
  errorMessage?: string;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  creating,
  errorMessage,
}: CreateProjectDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (creating) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="create-project-heading">Create project</DialogTitle>
          <DialogDescription>
            Enter a name and an optional description.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => void onSubmit(event)}
          aria-labelledby="create-project-heading"
          className="grid gap-3"
        >
          <Label className="grid gap-2">
            Name
            <Input
              type="text"
              name="name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              disabled={creating}
            />
          </Label>
          <Label className="grid gap-2">
            Description
            <Textarea
              name="description"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              disabled={creating}
            />
          </Label>
          {creating ? (
            <p className="text-sm text-muted-foreground" role="status">
              Creating project…
            </p>
          ) : null}
          {errorMessage !== undefined ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
