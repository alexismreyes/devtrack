import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  archiveProject,
  getProfile,
  getProject,
  isForbidden,
  isUnauthenticated,
  listMembers,
  toUserMessage,
  unarchiveProject,
  updateProject,
} from "../api/client";
import type { ProjectMemberRole, PublicProjectDto } from "../api/types";
import { Button } from "@/components/ui/button";
import { LabelsDialog } from "../tasks/LabelsDialog";
import { TasksPanel } from "../tasks/TasksPanel";
import { EditProjectDialog } from "./EditProjectDialog";
import { MembersDialog } from "./MembersDialog";
import {
  canArchiveProject,
  canEditProject,
  canManageMembers,
  canWriteProjectTasks,
  resolveActorProjectRole,
} from "./projectRole";

type ProjectDetailProps = {
  projectId: string;
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
  onUnauthenticated,
}: ProjectDetailProps) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });
  const [project, setProject] = useState<PublicProjectDto | null>(null);
  const [actorRole, setActorRole] = useState<ProjectMemberRole | null>(null);
  const [actorUserId, setActorUserId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [labelsRevision, setLabelsRevision] = useState(0);

  const applyProject = useCallback((next: PublicProjectDto) => {
    setProject(next);
  }, []);

  const loadProject = useCallback(async () => {
    setLoadState({ kind: "loading" });
    setActionState({ kind: "idle" });
    setEditOpen(false);
    setMembersOpen(false);
    setLabelsOpen(false);
    setActorRole(null);
    setActorUserId(null);
    try {
      const result = await getProject(projectId);
      const actor = await getProfile();
      let membershipRole: ProjectMemberRole | null = null;
      try {
        const roster = await listMembers(projectId);
        membershipRole =
          roster.members.find((member) => member.userId === actor.id)?.role ??
          null;
      } catch (err) {
        if (isUnauthenticated(err)) {
          setLoadState({ kind: "unauthenticated", message: toUserMessage(err) });
          onUnauthenticated();
          return;
        }
      }
      applyProject(result);
      setActorUserId(actor.id);
      setActorRole(
        resolveActorProjectRole({
          actorId: actor.id,
          ownerUserId: result.ownerUserId,
          membershipRole,
        }),
      );
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

  async function onSave(input: {
    name: string;
    description: string | null;
  }): Promise<void> {
    setActionState({ kind: "saving" });
    try {
      const updated = await updateProject(projectId, input);
      applyProject(updated);
      setEditOpen(false);
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
      setEditOpen(false);
      setMembersOpen(false);
      setLabelsOpen(false);
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
  const showEdit = canEditProject(actorRole);
  const showArchive = canArchiveProject(actorRole);
  const showMembers = canManageMembers(actorRole);
  const writeTasks = canWriteProjectTasks(actorRole);

  return (
    <section
      aria-labelledby="project-detail-heading"
      data-slot="board"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl bg-board p-4 text-board-foreground"
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="project-detail-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {project === null ? "Project" : project.name}
          </h2>
          {loadState.kind === "success" && project !== null ? (
            <>
              {project.description === null ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  No description.
                </p>
              ) : (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {archived ? "This project is archived." : "This project is active."}
              </p>
            </>
          ) : null}
        </div>
        {loadState.kind === "success" && project !== null ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/projects">Back to projects</Link>
            </Button>
            {showEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionState({ kind: "idle" });
                  setEditOpen(true);
                }}
                disabled={busy || archived}
              >
                Edit project
              </Button>
            ) : null}
            {showArchive ? (
              archived ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void onUnarchive()}
                  disabled={busy}
                >
                  {actionState.kind === "unarchiving"
                    ? "Unarchiving…"
                    : "Unarchive project"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void onArchive()}
                  disabled={busy}
                >
                  {actionState.kind === "archiving" ? "Archiving…" : "Archive project"}
                </Button>
              )
            ) : null}
            {showMembers ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionState({ kind: "idle" });
                  setMembersOpen(true);
                }}
                disabled={busy}
              >
                Members
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActionState({ kind: "idle" });
                setLabelsOpen(true);
              }}
              disabled={busy}
            >
              Labels
            </Button>
          </div>
        ) : null}
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
          <EditProjectDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            project={project}
            saving={actionState.kind === "saving"}
            errorMessage={
              editOpen && actionState.kind === "error"
                ? actionState.message
                : undefined
            }
            onSubmit={(input) => {
              void onSave(input);
            }}
          />
          <MembersDialog
            open={membersOpen}
            onOpenChange={setMembersOpen}
            projectId={projectId}
            ownerUserId={project.ownerUserId}
            onUnauthenticated={onUnauthenticated}
          />
          <LabelsDialog
            open={labelsOpen}
            onOpenChange={setLabelsOpen}
            projectId={projectId}
            canWrite={writeTasks}
            onUnauthenticated={onUnauthenticated}
            onCatalogChanged={() => {
              setLabelsRevision((value) => value + 1);
            }}
          />
          <TasksPanel
            projectId={projectId}
            archived={archived}
            canWriteTasks={writeTasks}
            canManageMembers={showMembers}
            currentUserId={actorUserId}
            labelsRevision={labelsRevision}
            onUnauthenticated={onUnauthenticated}
          />
        </>
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
      {actionState.kind === "error" && !editOpen ? (
        <p className="text-sm text-destructive" role="alert">
          {actionState.message}
        </p>
      ) : null}
    </section>
  );
}
