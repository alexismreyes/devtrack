import { useEffect, useId, useRef, type FormEvent } from "react";
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
  coverFile: File | null;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCoverFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  creating: boolean;
  errorMessage?: string;
};

export function CreateProjectDialog({
  open,
  onOpenChange,
  name,
  description,
  coverFile,
  onNameChange,
  onDescriptionChange,
  onCoverFileChange,
  onSubmit,
  creating,
  errorMessage,
}: CreateProjectDialogProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (coverFile !== null) {
      return;
    }
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = "";
    }
  }, [coverFile]);

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
            Enter a name and an optional description. You can also attach an
            optional cover image.
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
          <div className="grid gap-2">
            <p className="text-sm font-medium">Cover image (optional)</p>
            <Input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={creating}
              className="max-w-xs"
              aria-label="Optional project cover"
              onChange={(event) => {
                const file = event.target.files?.[0];
                onCoverFileChange(file ?? null);
              }}
            />
            {coverFile !== null ? (
              <p className="text-sm text-muted-foreground" data-testid="create-cover-file-name">
                Selected: {coverFile.name}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                jpeg, png, webp, or gif up to 5 MiB. Uploaded after the project
                is created.
              </p>
            )}
          </div>
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
