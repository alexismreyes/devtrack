import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  archiveProject,
  getProject,
  isForbidden,
  isUnauthenticated,
  toUserMessage,
  unarchiveProject,
  updateProject,
} from "../api/client";
import type { PublicProjectDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TasksPanel } from "../tasks/TasksPanel";

type ProjectDetailProps = {
  projectId: string;
  onBack: () => void;
  onUnauthenticated: () => void;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string };

type ActionState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "archiving" }
  | { kind: "unarchiving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ProjectDetail({
  projectId,
  onBack,
  onUnauthenticated,
}: ProjectDetailProps) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });
  const [project, setProject] = useState<PublicProjectDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const applyProject = useCallback((next: PublicProjectDto) => {
    setProject(next);
    setName(next.name);
    setDescription(next.description ?? "");
  }, []);

  const loadProject = useCallback(async () => {
    setLoadState({ kind: "loading" });
    setActionState({ kind: "idle" });
    try {
      const result = await getProject(projectId);
      applyProject(result);
      setLoadState({ kind: "success" });
    } catch (err) {
      if (isUnauthenticated(err)) {
        setLoadState({ kind: "unauthenticated", message: toUserMessage(err) });
        onUnauthenticated();
        return;
      }
      if (isForbidden(err)) {
        setLoadState({ kind: "forbidden", message: toUserMessage(err) });
        return;
      }
      setLoadState({ kind: "error", message: toUserMessage(err) });
    }
  }, [applyProject, onUnauthenticated, projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  function handleAuthzError(err: unknown): boolean {
    if (isUnauthenticated(err)) {
      setLoadState({ kind: "unauthenticated", message: toUserMessage(err) });
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

  async function onSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionState({ kind: "saving" });
    try {
      const updated = await updateProject(projectId, {
        name,
        description: description.trim() === "" ? null : description,
      });
      applyProject(updated);
      setActionState({ kind: "success", message: "Project updated." });
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onArchive(): Promise<void> {
    setActionState({ kind: "archiving" });
    try {
      const archived = await archiveProject(projectId);
      applyProject(archived);
      setActionState({ kind: "success", message: "Project archived." });
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onUnarchive(): Promise<void> {
    setActionState({ kind: "unarchiving" });
    try {
      const restored = await unarchiveProject(projectId);
      applyProject(restored);
      setActionState({ kind: "success", message: "Project unarchived." });
    } catch (err) {
      if (handleAuthzError(err)) {
        return;
      }
      setActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const archived = project?.archivedAt !== null && project?.archivedAt !== undefined;
  const busy =
    actionState.kind === "saving" ||
    actionState.kind === "archiving" ||
    actionState.kind === "unarchiving";

  return (
    <section
      aria-labelledby="project-detail-heading"
      data-slot="board"
      className="grid gap-4 rounded-xl bg-board p-4 text-board-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="project-detail-heading" className="text-xl font-semibold tracking-tight">
          {project === null ? "Project" : project.name}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          Back to projects
        </Button>
      </div>
      {loadState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading project…
        </p>
      ) : null}
      {loadState.kind === "unauthenticated" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {loadState.message}
        </p>
      ) : null}
      {loadState.kind === "forbidden" ? (
        <p className="text-sm text-destructive" role="alert">
          {loadState.message}
        </p>
      ) : null}
      {loadState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {loadState.message}
        </p>
      ) : null}
      {loadState.kind === "success" && project !== null ? (
        <>
          <Card>
            <CardHeader className="space-y-2">
              <p className="text-sm">
                {archived ? "This project is archived." : "This project is active."}
              </p>
              {project.description === null ? (
                <p className="text-sm text-muted-foreground">No description.</p>
              ) : (
                <p className="text-sm">{project.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Created <time dateTime={project.createdAt}>{project.createdAt}</time>
              </p>
              {archived ? (
                <p className="text-sm text-muted-foreground">
                  Archived{" "}
                  <time dateTime={project.archivedAt ?? undefined}>
                    {project.archivedAt}
                  </time>
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-4">
              <form onSubmit={(event) => void onSave(event)} className="grid max-w-xl gap-4">
                <Label className="grid gap-2">
                  Name
                  <Input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy || archived}
                  />
                </Label>
                <Label className="grid gap-2">
                  Description
                  <Textarea
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={busy || archived}
                  />
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy || archived}>
                    {actionState.kind === "saving" ? "Saving…" : "Save project"}
                  </Button>
                  {archived ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void onUnarchive()}
                      disabled={busy}
                    >
                      {actionState.kind === "unarchiving" ? "Unarchiving…" : "Unarchive project"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void onArchive()}
                      disabled={busy}
                    >
                      {actionState.kind === "archiving" ? "Archiving…" : "Archive project"}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
          <TasksPanel
            projectId={projectId}
            archived={archived}
            onUnauthenticated={onUnauthenticated}
          />
        </>
      ) : null}
      {actionState.kind === "saving" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Saving project…
        </p>
      ) : null}
      {actionState.kind === "archiving" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Archiving project…
        </p>
      ) : null}
      {actionState.kind === "unarchiving" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Unarchiving project…
        </p>
      ) : null}
      {actionState.kind === "success" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {actionState.message}
        </p>
      ) : null}
      {actionState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {actionState.message}
        </p>
      ) : null}
    </section>
  );
}
