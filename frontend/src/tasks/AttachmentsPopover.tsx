import { useState, type ChangeEvent } from "react";
import {
  isConflict,
  isForbidden,
  isUnauthenticated,
  toUserMessage,
  uploadTaskAttachment,
} from "../api/client";
import {
  ATTACHMENT_MAX_SIZE_BYTES,
  isAllowedAttachmentContentType,
  type PublicAttachmentDto,
} from "../api/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type UploadActionState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

type AttachmentsPopoverProps = {
  taskId: string;
  canWrite: boolean;
  disabled?: boolean;
  onUploaded: (attachment: PublicAttachmentDto) => void;
  onActivityMaybeChanged: () => void | Promise<void>;
  onUnauthenticated: () => void;
};

export function AttachmentsPopover({
  taskId,
  canWrite,
  disabled = false,
  onUploaded,
  onActivityMaybeChanged,
  onUnauthenticated,
}: AttachmentsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [actionState, setActionState] = useState<UploadActionState>({
    kind: "idle",
  });

  const mutationsDisabled =
    disabled || !canWrite || actionState.kind === "uploading";

  async function onUploadSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }
    if (!isAllowedAttachmentContentType(file.type)) {
      setActionState({
        kind: "error",
        message:
          "File type not allowed. Use JPEG, PNG, WebP, GIF, PDF, or plain text.",
      });
      return;
    }
    if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
      setActionState({
        kind: "error",
        message: "File exceeds the 20 MiB limit.",
      });
      return;
    }
    setActionState({ kind: "uploading" });
    try {
      const created = await uploadTaskAttachment(taskId, file);
      onUploaded(created);
      setActionState({ kind: "success", message: "Attachment uploaded." });
      await onActivityMaybeChanged();
      setOpen(false);
      setActionState({ kind: "idle" });
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
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setActionState({ kind: "idle" });
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutationsDisabled}
          aria-haspopup="dialog"
        >
          Attachment
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80"
        aria-label="Add attachment"
      >
        <div className="grid gap-3">
          <h4 className="text-sm font-semibold">Add attachment</h4>
          <Label className="grid gap-2 text-sm">
            Upload file
            <input
              type="file"
              name="task-attachment-file"
              data-testid="task-attachment-upload"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
              disabled={mutationsDisabled}
              onChange={(event) => void onUploadSelected(event)}
              className="block w-full cursor-pointer text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
            />
          </Label>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, GIF, PDF, or plain text. Max 20 MiB.
          </p>
          {actionState.kind === "uploading" ? (
            <p className="text-sm text-muted-foreground" role="status">
              Uploading…
            </p>
          ) : null}
          {actionState.kind === "conflict" || actionState.kind === "error" ? (
            <p className="text-sm text-destructive" role="alert">
              {actionState.message}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
