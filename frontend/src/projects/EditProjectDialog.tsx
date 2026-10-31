import { useEffect, useState, type FormEvent } from "react";
import type { PublicProjectDto } from "../api/types";
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

type EditProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: PublicProjectDto;
  saving: boolean;
  errorMessage?: string;
  onSubmit: (input: { name: string; description: string | null }) => void;
};

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  saving,
  errorMessage,
  onSubmit,
}: EditProjectDialogProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(project.name);
    setDescription(project.description ?? "");
  }, [open, project.description, project.name]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({
      name,
      description: description.trim() === "" ? null : description,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="edit-project-heading">Edit project</DialogTitle>
          <DialogDescription>
            Update the project name and description.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          aria-labelledby="edit-project-heading"
          className="grid gap-3"
        >
          <Label className="grid gap-2">
            Name
            <Input
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
            />
          </Label>
          <Label className="grid gap-2">
            Description
            <Textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
            />
          </Label>
          {saving ? (
            <p className="text-sm text-muted-foreground" role="status">
              Saving project…
            </p>
          ) : null}
          {errorMessage !== undefined ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
