import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createTaskComment,
  deleteTaskComment,
  getTask,
  isConflict,
  isForbidden,
  isUnauthenticated,
  listLabels,
  listTaskActivity,
  listTaskComments,
  softDeleteTask,
  toUserMessage,
  updateTask,
  updateTaskComment,
} from "../api/client";
import type {
  PublicActivityDto,
  PublicCommentDto,
  PublicLabelDto,
  PublicTaskDto,
  TaskEmbeddedLabelDto,
  TaskPriority,
  TaskStatus,
} from "../api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, nativeSelectClassName } from "@/lib/utils";
import { CommentsActivityPanel } from "./CommentsActivityPanel";
import { LabelChips } from "./LabelChips";
import { LabelsPopover } from "./LabelsPopover";

type TaskDetailProps = {
  taskId: string;
  archived: boolean;
  canWrite?: boolean;
  canManageMembers?: boolean;
  currentUserId?: string | null;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
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
  | { kind: "deleting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

type CommentsLoadState =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found"; message: string };

type CommentActionState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "saving"; commentId: string }
  | { kind: "deleting"; commentId: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

type ActivityLoadState =
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string }
  | { kind: "not_found"; message: string };

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function TaskDetail({
  taskId,
  archived,
  canWrite = true,
  canManageMembers = false,
  currentUserId = null,
  onClose,
  onUpdated,
  onDeleted,
  onUnauthenticated,
}: TaskDetailProps) {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });
  const [task, setTask] = useState<PublicTaskDto | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [comments, setComments] = useState<PublicCommentDto[]>([]);
  const [commentsLoadState, setCommentsLoadState] = useState<CommentsLoadState>({
    kind: "loading",
  });
  const [commentActionState, setCommentActionState] = useState<CommentActionState>({
    kind: "idle",
  });
  const [newCommentBody, setNewCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [activity, setActivity] = useState<PublicActivityDto[]>([]);
  const [activityLoadState, setActivityLoadState] = useState<ActivityLoadState>({
    kind: "loading",
  });
  const [catalogLabels, setCatalogLabels] = useState<PublicLabelDto[]>([]);

  const applyTask = useCallback((next: PublicTaskDto) => {
    setTask(next);
    setTitle(next.title);
    setDescription(next.description ?? "");
    setDueDate(next.dueDate ?? "");
    setStatus(next.status);
    setPriority(next.priority);
  }, []);

  const applyAssignedLabels = useCallback((labels: TaskEmbeddedLabelDto[]) => {
    setTask((current) => (current === null ? current : { ...current, labels }));
  }, []);

  const loadComments = useCallback(async () => {
    setCommentsLoadState({ kind: "loading" });
    try {
      const result = await listTaskComments(taskId);
      setComments(result.comments);
      setCommentsLoadState(
        result.comments.length === 0
          ? { kind: "empty" }
          : { kind: "success" },
      );
    } catch (err) {
      if (isUnauthenticated(err)) {
        setCommentsLoadState({
          kind: "unauthenticated",
          message: toUserMessage(err),
        });
        onUnauthenticated();
        return;
      }
      if (isForbidden(err)) {
        setCommentsLoadState({
          kind: "forbidden",
          message: toUserMessage(err),
        });
        return;
      }
      if (err instanceof ApiError && err.code === "NOT_FOUND") {
        setCommentsLoadState({
          kind: "not_found",
          message: toUserMessage(err),
        });
        return;
      }
      setCommentsLoadState({ kind: "error", message: toUserMessage(err) });
    }
  }, [onUnauthenticated, taskId]);

  const loadActivity = useCallback(async () => {
    setActivityLoadState({ kind: "loading" });
    try {
      const result = await listTaskActivity(taskId);
      setActivity(result.activity);
      setActivityLoadState(
        result.activity.length === 0
          ? { kind: "empty" }
          : { kind: "success" },
      );
    } catch (err) {
      if (isUnauthenticated(err)) {
        setActivityLoadState({
          kind: "unauthenticated",
          message: toUserMessage(err),
        });
        onUnauthenticated();
        return;
      }
      if (isForbidden(err)) {
        setActivityLoadState({
          kind: "forbidden",
          message: toUserMessage(err),
        });
        return;
      }
      if (err instanceof ApiError && err.code === "NOT_FOUND") {
        setActivityLoadState({
          kind: "not_found",
          message: toUserMessage(err),
        });
        return;
      }
      setActivityLoadState({ kind: "error", message: toUserMessage(err) });
    }
  }, [onUnauthenticated, taskId]);

  const loadCatalog = useCallback(async (projectId: string) => {
    try {
      const result = await listLabels(projectId);
      setCatalogLabels(result.labels);
    } catch {
      setCatalogLabels([]);
    }
  }, []);

  const loadTask = useCallback(async () => {
    setLoadState({ kind: "loading" });
    setActionState({ kind: "idle" });
    setCommentActionState({ kind: "idle" });
    setEditingCommentId(null);
    setEditCommentBody("");
    setNewCommentBody("");
    try {
      const result = await getTask(taskId);
      applyTask(result);
      setLoadState({ kind: "success" });
      await Promise.all([
        loadComments(),
        loadActivity(),
        loadCatalog(result.projectId),
      ]);
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
  }, [
    applyTask,
    loadActivity,
    loadCatalog,
    loadComments,
    onUnauthenticated,
    taskId,
  ]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  function handleAuthzError(err: unknown): boolean {
    if (isUnauthenticated(err)) {
      setLoadState({ kind: "unauthenticated", message: toUserMessage(err) });
      setActionState({ kind: "idle" });
      setCommentActionState({ kind: "idle" });
      onUnauthenticated();
      return true;
    }
    if (isForbidden(err)) {
      setActionState({ kind: "error", message: toUserMessage(err) });
      return true;
    }
    return false;
  }

  function handleCommentAuthzError(err: unknown): boolean {
    if (isUnauthenticated(err)) {
      setCommentsLoadState({
        kind: "unauthenticated",
        message: toUserMessage(err),
      });
      setCommentActionState({ kind: "idle" });
      onUnauthenticated();
      return true;
    }
    if (isForbidden(err)) {
      setCommentActionState({ kind: "error", message: toUserMessage(err) });
      return true;
    }
    return false;
  }

  async function onSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setActionState({ kind: "saving" });
    try {
      const updated = await updateTask(taskId, {
        title,
        description: description.trim() === "" ? null : description,
        dueDate: dueDate.trim() === "" ? null : dueDate,
        status,
        priority,
      });
      applyTask(updated);
      setActionState({ kind: "success", message: "Task updated." });
      onUpdated();
      await loadActivity();
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

  async function onDelete(): Promise<void> {
    setActionState({ kind: "deleting" });
    try {
      await softDeleteTask(taskId);
      setActionState({ kind: "success", message: "Task deleted." });
      onDeleted();
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

  async function onCreateComment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setCommentActionState({ kind: "creating" });
    try {
      const created = await createTaskComment(taskId, {
        body: newCommentBody,
      });
      const next = [...comments, created];
      setComments(next);
      setCommentsLoadState(
        next.length === 0 ? { kind: "empty" } : { kind: "success" },
      );
      setNewCommentBody("");
      setCommentActionState({ kind: "success", message: "Comment added." });
      await loadActivity();
    } catch (err) {
      if (handleCommentAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setCommentActionState({
          kind: "conflict",
          message: toUserMessage(err),
        });
        return;
      }
      setCommentActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onSaveComment(commentId: string): Promise<void> {
    setCommentActionState({ kind: "saving", commentId });
    try {
      const updated = await updateTaskComment(taskId, commentId, {
        body: editCommentBody,
      });
      const next = comments.map((comment) =>
        comment.id === commentId ? updated : comment,
      );
      setComments(next);
      setEditingCommentId(null);
      setEditCommentBody("");
      setCommentActionState({ kind: "success", message: "Comment updated." });
      await loadActivity();
    } catch (err) {
      if (handleCommentAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setCommentActionState({
          kind: "conflict",
          message: toUserMessage(err),
        });
        return;
      }
      setCommentActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  async function onDeleteComment(commentId: string): Promise<void> {
    setCommentActionState({ kind: "deleting", commentId });
    try {
      await deleteTaskComment(taskId, commentId);
      const next = comments.filter((comment) => comment.id !== commentId);
      setComments(next);
      setCommentsLoadState(
        next.length === 0 ? { kind: "empty" } : { kind: "success" },
      );
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditCommentBody("");
      }
      setCommentActionState({ kind: "success", message: "Comment deleted." });
      await loadActivity();
    } catch (err) {
      if (handleCommentAuthzError(err)) {
        return;
      }
      if (isConflict(err)) {
        setCommentActionState({
          kind: "conflict",
          message: toUserMessage(err),
        });
        return;
      }
      setCommentActionState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const busy =
    actionState.kind === "saving" || actionState.kind === "deleting";
  const writesDisabled = busy || archived || !canWrite;
  const commentsBusy =
    commentActionState.kind === "creating" ||
    commentActionState.kind === "saving" ||
    commentActionState.kind === "deleting";
  const commentMutationsDisabled = commentsBusy || archived;

  function canEditComment(comment: PublicCommentDto): boolean {
    return currentUserId !== null && comment.authorUserId === currentUserId;
  }

  function canSoftDeleteComment(comment: PublicCommentDto): boolean {
    return canEditComment(comment) || canManageMembers;
  }

  return (
    <section aria-labelledby="task-detail-heading" className="grid gap-4">
      <div className="flex flex-row items-start justify-between gap-3">
        <h4
          id="task-detail-heading"
          className="text-base font-semibold tracking-tight"
        >
          {task === null ? "Task" : task.title}
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close task
        </Button>
      </div>

      {loadState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading task…
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

      {loadState.kind === "success" && task !== null ? (
        <div
          data-testid="task-detail-layout"
          className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]"
        >
          <div
            data-testid="task-detail-main"
            className="grid min-w-0 gap-4 content-start"
          >
            <p className="text-sm text-muted-foreground">
              Status {task.status}, priority {task.priority}
              {task.dueDate === null ? "" : `, due ${task.dueDate}`}
            </p>

            <div
              className="flex flex-wrap items-center gap-2"
              data-testid="task-detail-actions"
              aria-label="Task actions"
            >
              <LabelsPopover
                projectId={task.projectId}
                taskId={taskId}
                catalogLabels={catalogLabels}
                assignedLabels={task.labels}
                canWrite={canWrite}
                disabled={archived}
                onAssignedChange={applyAssignedLabels}
                onCatalogChange={setCatalogLabels}
                onUpdated={onUpdated}
                onUnauthenticated={onUnauthenticated}
              />
            </div>

            {task.labels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No labels assigned.</p>
            ) : (
              <LabelChips labels={task.labels} className="px-0" />
            )}

            {canWrite ? (
              <form
                onSubmit={(event) => void onSave(event)}
                className="grid gap-3"
              >
                <Label className="grid gap-2">
                  Task title
                  <Input
                    type="text"
                    name="task-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={writesDisabled}
                  />
                </Label>
                <Label className="grid gap-2">
                  Task description
                  <Textarea
                    name="task-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={writesDisabled}
                  />
                </Label>
                <Label className="grid gap-2">
                  Task due date
                  <Input
                    type="date"
                    name="task-due-date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    disabled={writesDisabled}
                  />
                </Label>
                <Label className="grid gap-2">
                  Task status
                  <select
                    name="task-status"
                    className={cn(nativeSelectClassName)}
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as TaskStatus)
                    }
                    disabled={writesDisabled}
                  >
                    {STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label className="grid gap-2">
                  Task priority
                  <select
                    name="task-priority"
                    className={cn(nativeSelectClassName)}
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as TaskPriority)
                    }
                    disabled={writesDisabled}
                  >
                    {PRIORITIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={writesDisabled}>
                    {actionState.kind === "saving" ? "Saving…" : "Save task"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void onDelete()}
                    disabled={writesDisabled}
                  >
                    {actionState.kind === "deleting"
                      ? "Deleting…"
                      : "Delete task"}
                  </Button>
                </div>
              </form>
            ) : task.description === null ? (
              <p className="text-sm text-muted-foreground">No task description.</p>
            ) : (
              <p className="text-sm">{task.description}</p>
            )}
          </div>

          <CommentsActivityPanel
            canWrite={canWrite}
            commentMutationsDisabled={commentMutationsDisabled}
            comments={comments}
            commentsLoadState={commentsLoadState}
            activity={activity}
            activityLoadState={activityLoadState}
            commentActionState={commentActionState}
            newCommentBody={newCommentBody}
            editingCommentId={editingCommentId}
            editCommentBody={editCommentBody}
            onNewCommentBodyChange={setNewCommentBody}
            onEditCommentBodyChange={setEditCommentBody}
            onCreateComment={(event) => void onCreateComment(event)}
            onStartEditComment={(comment) => {
              setEditingCommentId(comment.id);
              setEditCommentBody(comment.body);
              setCommentActionState({ kind: "idle" });
            }}
            onCancelEditComment={() => {
              setEditingCommentId(null);
              setEditCommentBody("");
            }}
            onSaveComment={(commentId) => void onSaveComment(commentId)}
            onDeleteComment={(commentId) => void onDeleteComment(commentId)}
            canEditComment={canEditComment}
            canSoftDeleteComment={canSoftDeleteComment}
          />
        </div>
      ) : null}

      {actionState.kind === "saving" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Saving task…
        </p>
      ) : null}
      {actionState.kind === "deleting" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Deleting task…
        </p>
      ) : null}
      {actionState.kind === "success" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {actionState.message}
        </p>
      ) : null}
      {actionState.kind === "conflict" ? (
        <p className="text-sm text-destructive" role="alert">
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
