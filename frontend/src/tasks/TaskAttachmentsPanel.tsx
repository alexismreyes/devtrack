import { useEffect, useId, useState } from "react";
import {
  ApiError,
  clearTaskCover,
  deleteTaskAttachment,
  fetchAttachmentContent,
  isConflict,
  isForbidden,
  isUnauthenticated,
  listTaskAttachments,
  setTaskCover,
  toUserMessage,
} from "../api/client";
import {
  isCoverImageContentType,
  type PublicAttachmentDto,
  type PublicCoverSummaryDto,
} from "../api/types";
import { Button } from "@/components/ui/button";

export type AttachmentsLoadState =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found"; message: string };

type AttachmentActionState =
  | { kind: "idle" }
  | { kind: "deleting"; attachmentId: string }
  | { kind: "covering"; attachmentId: string }
  | { kind: "clearing_cover" }
  | { kind: "downloading"; attachmentId: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

type TaskAttachmentsPanelProps = {
  taskId: string;
  canWrite: boolean;
  disabled?: boolean;
  ingestCreatedAttachment?: PublicAttachmentDto | null;
  onUnauthenticated: () => void;
  onActivityMaybeChanged: () => void | Promise<void>;
  onCoverChange: (cover: PublicCoverSummaryDto | null) => void;
};

function formatSizeBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KiB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function TaskAttachmentsPanel({
  taskId,
  canWrite,
  disabled = false,
  ingestCreatedAttachment = null,
  onUnauthenticated,
  onActivityMaybeChanged,
  onCoverChange,
}: TaskAttachmentsPanelProps) {
  const headingId = useId();
  const [attachments, setAttachments] = useState<PublicAttachmentDto[]>([]);
  const [loadState, setLoadState] = useState<AttachmentsLoadState>({
    kind: "loading",
  });
  const [actionState, setActionState] = useState<AttachmentActionState>({
    kind: "idle",
  });

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoadState({ kind: "loading" });
      try {
        const result = await listTaskAttachments(taskId);
        if (cancelled) {
          return;
        }
        setAttachments(result.attachments);
        setLoadState(
          result.attachments.length === 0
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
    if (ingestCreatedAttachment === null) {
      return;
    }
    setAttachments((current) => {
      if (current.some((item) => item.id === ingestCreatedAttachment.id)) {
        return current;
      }
      const next = [...current, ingestCreatedAttachment];
      setLoadState(next.length === 0 ? { kind: "empty" } : { kind: "success" });
      return next;
    });
  }, [ingestCreatedAttachment]);

  const busy =
    actionState.kind === "deleting" ||
    actionState.kind === "covering" ||
    actionState.kind === "clearing_cover" ||
    actionState.kind === "downloading";
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

  function applyAttachments(next: PublicAttachmentDto[]): void {
    setAttachments(next);
    setLoadState(next.length === 0 ? { kind: "empty" } : { kind: "success" });
  }

  function markCoverLocally(attachmentId: string | null): void {
    setAttachments((current) => {
      const next = current.map((attachment) => ({
        ...attachment,
        isCover: attachmentId !== null && attachment.id === attachmentId,
      }));
      setLoadState(next.length === 0 ? { kind: "empty" } : { kind: "success" });
      return next;
    });
  }

  async function onDeleteAttachment(attachmentId: string): Promise<void> {
    const target = attachments.find((item) => item.id === attachmentId);
    setActionState({ kind: "deleting", attachmentId });
    try {
      await deleteTaskAttachment(taskId, attachmentId);
      applyAttachments(
        attachments.filter((attachment) => attachment.id !== attachmentId),
      );
      if (target?.isCover === true) {
        onCoverChange(null);
      }
      setActionState({ kind: "success", message: "Attachment deleted." });
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

  async function onSetCover(attachment: PublicAttachmentDto): Promise<void> {
    setActionState({ kind: "covering", attachmentId: attachment.id });
    try {
      const result = await setTaskCover(taskId, {
        attachmentId: attachment.id,
      });
      markCoverLocally(attachment.id);
      onCoverChange(result.cover);
      setActionState({ kind: "success", message: "Cover set." });
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

  async function onClearCover(): Promise<void> {
    setActionState({ kind: "clearing_cover" });
    try {
      const result = await clearTaskCover(taskId);
      markCoverLocally(null);
      onCoverChange(result.cover);
      setActionState({ kind: "success", message: "Cover cleared." });
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

  async function onDownloadOrView(
    attachment: PublicAttachmentDto,
  ): Promise<void> {
    setActionState({ kind: "downloading", attachmentId: attachment.id });
    try {
      const { blob } = await fetchAttachmentContent(taskId, attachment.id);
      const objectUrl = URL.createObjectURL(blob);
      try {
        if (isCoverImageContentType(attachment.contentType)) {
          window.open(objectUrl, "_blank", "noopener,noreferrer");
        } else {
          const anchor = document.createElement("a");
          anchor.href = objectUrl;
          anchor.download = attachment.originalFilename;
          anchor.rel = "noopener";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }
      } finally {
        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 60_000);
      }
      setActionState({ kind: "success", message: "Attachment opened." });
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-3"
      data-testid="task-attachments"
    >
      <h5 id={headingId} className="text-sm font-semibold tracking-tight">
        Attachments
      </h5>

      {loadState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading attachments…
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
          No attachments yet.
        </p>
      ) : null}

      {attachments.length > 0 ? (
        <ul className="grid gap-3" aria-label="Task attachments">
          {attachments.map((attachment) => {
            const canBeCover = isCoverImageContentType(attachment.contentType);
            return (
              <li
                key={attachment.id}
                className="grid gap-2 rounded-lg border border-border bg-card p-3"
                data-testid={`attachment-row-${attachment.id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 grid gap-1">
                    <p className="truncate text-sm font-medium">
                      {attachment.originalFilename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.contentType}
                      {" · "}
                      {formatSizeBytes(attachment.sizeBytes)}
                      {attachment.isCover ? " · Cover" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto px-0"
                      onClick={() => void onDownloadOrView(attachment)}
                      disabled={busy}
                    >
                      {actionState.kind === "downloading" &&
                      actionState.attachmentId === attachment.id
                        ? "Opening…"
                        : isCoverImageContentType(attachment.contentType)
                          ? "View"
                          : "Download"}
                    </Button>
                    {canWrite && canBeCover && !attachment.isCover ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0"
                        onClick={() => void onSetCover(attachment)}
                        disabled={mutationsDisabled}
                      >
                        {actionState.kind === "covering" &&
                        actionState.attachmentId === attachment.id
                          ? "Setting…"
                          : "Set as cover"}
                      </Button>
                    ) : null}
                    {canWrite && attachment.isCover ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0"
                        onClick={() => void onClearCover()}
                        disabled={mutationsDisabled}
                      >
                        {actionState.kind === "clearing_cover"
                          ? "Clearing…"
                          : "Clear cover"}
                      </Button>
                    ) : null}
                    {canWrite ? (
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto px-0 text-destructive"
                        onClick={() => void onDeleteAttachment(attachment.id)}
                        disabled={mutationsDisabled}
                      >
                        {actionState.kind === "deleting" &&
                        actionState.attachmentId === attachment.id
                          ? "Deleting…"
                          : "Delete"}
                      </Button>
                    ) : null}
                  </div>
                </div>
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
