import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  clearProjectBoardBackground,
  clearProjectCover,
  fetchProjectBoardBackgroundContent,
  fetchProjectCoverContent,
  isUnauthenticated,
  toUserMessage,
  uploadProjectBoardBackground,
  uploadProjectCover,
} from "../api/client";
import type {
  PublicProjectBoardBackgroundSummaryDto,
  PublicProjectCoverSummaryDto,
  PublicProjectDto,
} from "../api/types";
import {
  isAllowedProjectBoardBackgroundContentType,
  isAllowedProjectCoverContentType,
  PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES,
  PROJECT_COVER_MAX_SIZE_BYTES,
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
import { Textarea } from "@/components/ui/textarea";

type EditProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: PublicProjectDto;
  saving: boolean;
  errorMessage?: string;
  onSubmit: (input: { name: string; description: string | null }) => void;
  onCoverChange: (cover: PublicProjectCoverSummaryDto | null) => void;
  onBoardBackgroundChange: (
    boardBackground: PublicProjectBoardBackgroundSummaryDto | null,
  ) => void;
  onUnauthenticated?: () => void;
};

type MediaActionState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "clearing" }
  | { kind: "error"; message: string };

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  saving,
  errorMessage,
  onSubmit,
  onCoverChange,
  onBoardBackgroundChange,
  onUnauthenticated,
}: EditProjectDialogProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [coverAction, setCoverAction] = useState<MediaActionState>({
    kind: "idle",
  });
  const [boardBackgroundAction, setBoardBackgroundAction] =
    useState<MediaActionState>({ kind: "idle" });
  const fileInputId = useId();
  const boardBackgroundInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boardBackgroundInputRef = useRef<HTMLInputElement>(null);
  const coverBusy =
    coverAction.kind === "uploading" || coverAction.kind === "clearing";
  const boardBackgroundBusy =
    boardBackgroundAction.kind === "uploading" ||
    boardBackgroundAction.kind === "clearing";
  const formBusy = saving || coverBusy || boardBackgroundBusy;

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(project.name);
    setDescription(project.description ?? "");
    setCoverAction({ kind: "idle" });
    setBoardBackgroundAction({ kind: "idle" });
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = "";
    }
    if (boardBackgroundInputRef.current !== null) {
      boardBackgroundInputRef.current.value = "";
    }
  }, [
    open,
    project.description,
    project.name,
    project.cover,
    project.boardBackground,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit({
      name,
      description: description.trim() === "" ? null : description,
    });
  }

  async function handleUpload(file: File): Promise<void> {
    if (!isAllowedProjectCoverContentType(file.type)) {
      setCoverAction({
        kind: "error",
        message: "Cover must be a jpeg, png, webp, or gif image.",
      });
      return;
    }
    if (file.size > PROJECT_COVER_MAX_SIZE_BYTES) {
      setCoverAction({
        kind: "error",
        message: "Cover must be 5 MiB or smaller.",
      });
      return;
    }
    setCoverAction({ kind: "uploading" });
    try {
      const result = await uploadProjectCover(project.id, file);
      onCoverChange(result.cover);
      setCoverAction({ kind: "idle" });
    } catch (err) {
      if (isUnauthenticated(err)) {
        onUnauthenticated?.();
        setCoverAction({ kind: "idle" });
        return;
      }
      setCoverAction({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function handleClear(): Promise<void> {
    setCoverAction({ kind: "clearing" });
    try {
      await clearProjectCover(project.id);
      onCoverChange(null);
      setCoverAction({ kind: "idle" });
    } catch (err) {
      if (isUnauthenticated(err)) {
        onUnauthenticated?.();
        setCoverAction({ kind: "idle" });
        return;
      }
      setCoverAction({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function handleBoardBackgroundUpload(file: File): Promise<void> {
    if (!isAllowedProjectBoardBackgroundContentType(file.type)) {
      setBoardBackgroundAction({
        kind: "error",
        message: "Board background must be a jpeg, png, webp, or gif image.",
      });
      return;
    }
    if (file.size > PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES) {
      setBoardBackgroundAction({
        kind: "error",
        message: "Board background must be 5 MiB or smaller.",
      });
      return;
    }
    setBoardBackgroundAction({ kind: "uploading" });
    try {
      const result = await uploadProjectBoardBackground(project.id, file);
      onBoardBackgroundChange(result.boardBackground);
      setBoardBackgroundAction({ kind: "idle" });
    } catch (err) {
      if (isUnauthenticated(err)) {
        onUnauthenticated?.();
        setBoardBackgroundAction({ kind: "idle" });
        return;
      }
      setBoardBackgroundAction({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function handleBoardBackgroundClear(): Promise<void> {
    setBoardBackgroundAction({ kind: "clearing" });
    try {
      await clearProjectBoardBackground(project.id);
      onBoardBackgroundChange(null);
      setBoardBackgroundAction({ kind: "idle" });
    } catch (err) {
      if (isUnauthenticated(err)) {
        onUnauthenticated?.();
        setBoardBackgroundAction({ kind: "idle" });
        return;
      }
      setBoardBackgroundAction({ kind: "error", message: toUserMessage(err) });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (formBusy) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="edit-project-heading">Edit project</DialogTitle>
          <DialogDescription>
            Update the project name, description, cover image, and board
            background.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          aria-labelledby="edit-project-heading"
          className="grid gap-3"
        >
          <div className="grid gap-2">
            <p className="text-sm font-medium">Cover image</p>
            <CoverPreview projectId={project.id} cover={project.cover} />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={formBusy}
                className="max-w-xs cursor-pointer file:cursor-pointer"
                aria-label="Upload project cover"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file === undefined) {
                    return;
                  }
                  void handleUpload(file);
                }}
              />
              {project.cover !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formBusy}
                  onClick={() => {
                    void handleClear();
                  }}
                >
                  {coverAction.kind === "clearing" ? "Clearing…" : "Clear cover"}
                </Button>
              ) : null}
            </div>
            {coverAction.kind === "uploading" ? (
              <p className="text-sm text-muted-foreground" role="status">
                Uploading cover…
              </p>
            ) : null}
            {coverAction.kind === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                {coverAction.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Board background</p>
            <BoardBackgroundPreview
              projectId={project.id}
              boardBackground={project.boardBackground}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                ref={boardBackgroundInputRef}
                id={boardBackgroundInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={formBusy}
                className="max-w-xs cursor-pointer file:cursor-pointer"
                aria-label="Upload board background"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file === undefined) {
                    return;
                  }
                  void handleBoardBackgroundUpload(file);
                }}
              />
              {project.boardBackground !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formBusy}
                  onClick={() => {
                    void handleBoardBackgroundClear();
                  }}
                >
                  {boardBackgroundAction.kind === "clearing"
                    ? "Clearing…"
                    : "Clear board background"}
                </Button>
              ) : null}
            </div>
            {boardBackgroundAction.kind === "uploading" ? (
              <p className="text-sm text-muted-foreground" role="status">
                Uploading board background…
              </p>
            ) : null}
            {boardBackgroundAction.kind === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                {boardBackgroundAction.message}
              </p>
            ) : null}
          </div>
          <Label className="grid gap-2">
            Name
            <Input
              type="text"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={formBusy}
            />
          </Label>
          <Label className="grid gap-2">
            Description
            <Textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={formBusy}
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
            <Button type="submit" size="sm" disabled={formBusy}>
              {saving ? "Saving…" : "Save project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CoverPreview({
  projectId,
  cover,
}: {
  projectId: string;
  cover: PublicProjectCoverSummaryDto | null;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    if (cover === null) {
      setObjectUrl(null);
      return () => {
        cancelled = true;
      };
    }

    async function load(): Promise<void> {
      try {
        const { blob } = await fetchProjectCoverContent(projectId);
        createdUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          createdUrl = null;
          return;
        }
        setObjectUrl(createdUrl);
      } catch {
        if (!cancelled) {
          setObjectUrl(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [cover, projectId]);

  if (cover === null) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="project-cover-preview-empty"
      >
        No cover image. Cards use name-derived initials until you upload one.
      </p>
    );
  }

  if (objectUrl === null) {
    return (
      <p
        className="text-sm text-muted-foreground"
        role="status"
        data-testid="project-cover-preview-loading"
      >
        Loading cover preview…
      </p>
    );
  }

  return (
    <img
      src={objectUrl}
      alt="Current project cover"
      data-testid="project-cover-preview"
      data-cover-id={cover.id}
      className="h-24 w-full max-w-sm rounded-md object-cover"
    />
  );
}

function BoardBackgroundPreview({
  projectId,
  boardBackground,
}: {
  projectId: string;
  boardBackground: PublicProjectBoardBackgroundSummaryDto | null;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    if (boardBackground === null) {
      setObjectUrl(null);
      return () => {
        cancelled = true;
      };
    }

    async function load(): Promise<void> {
      try {
        const { blob } = await fetchProjectBoardBackgroundContent(projectId);
        createdUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(createdUrl);
          createdUrl = null;
          return;
        }
        setObjectUrl(createdUrl);
      } catch {
        if (!cancelled) {
          setObjectUrl(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (createdUrl !== null) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [boardBackground, projectId]);

  if (boardBackground === null) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="project-board-background-preview-empty"
      >
        No board background. The Kanban board uses the default surface until you
        upload one.
      </p>
    );
  }

  if (objectUrl === null) {
    return (
      <p
        className="text-sm text-muted-foreground"
        role="status"
        data-testid="project-board-background-preview-loading"
      >
        Loading board background preview…
      </p>
    );
  }

  return (
    <img
      src={objectUrl}
      alt="Current board background"
      data-testid="project-board-background-preview"
      data-board-background-id={boardBackground.id}
      className="h-24 w-full max-w-sm rounded-md object-cover"
    />
  );
}
