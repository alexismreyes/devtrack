import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createTaskComment,
  deleteTaskComment,
  getTask,
  isConflict,
  isForbidden,
  isUnauthenticated,
  listTaskComments,
  softDeleteTask,
  toUserMessage,
  updateTask,
  updateTaskComment,
} from "../api/client";
import type {
  PublicCommentDto,
  PublicTaskDto,
  TaskPriority,
  TaskStatus,
} from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, nativeSelectClassName } from "@/lib/utils";

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

  const applyTask = useCallback((next: PublicTaskDto) => {
    setTask(next);
    setTitle(next.title);
    setDescription(next.description ?? "");
    setDueDate(next.dueDate ?? "");
    setStatus(next.status);
    setPriority(next.priority);
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
      await loadComments();
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
  }, [applyTask, loadComments, onUnauthenticated, taskId]);

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
    <section aria-labelledby="task-detail-heading">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 p-4">
          <h4 id="task-detail-heading" className="text-base font-semibold tracking-tight">
            {task === null ? "Task" : task.title}
          </h4>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close task
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 pt-0">
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
            <>
              <p className="text-sm text-muted-foreground">
                Status {task.status}, priority {task.priority}
                {task.dueDate === null ? "" : `, due ${task.dueDate}`}
              </p>
              {task.description === null ? (
                <p className="text-sm text-muted-foreground">No task description.</p>
              ) : (
                <p className="text-sm">{task.description}</p>
              )}
              {canWrite ? (
              <form onSubmit={(event) => void onSave(event)} className="grid gap-3">
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
                    onChange={(event) => setStatus(event.target.value as TaskStatus)}
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
                    {actionState.kind === "deleting" ? "Deleting…" : "Delete task"}
                  </Button>
                </div>
              </form>
              ) : null}

              <section
                aria-labelledby="task-comments-heading"
                className="grid gap-3 border-t border-border pt-4"
              >
                <h5
                  id="task-comments-heading"
                  className="text-sm font-semibold tracking-tight"
                >
                  Comments
                </h5>
                {commentsLoadState.kind === "loading" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Loading comments…
                  </p>
                ) : null}
                {commentsLoadState.kind === "unauthenticated" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    {commentsLoadState.message}
                  </p>
                ) : null}
                {commentsLoadState.kind === "forbidden" ||
                commentsLoadState.kind === "not_found" ||
                commentsLoadState.kind === "error" ? (
                  <p className="text-sm text-destructive" role="alert">
                    {commentsLoadState.message}
                  </p>
                ) : null}
                {commentsLoadState.kind === "empty" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    No comments yet.
                  </p>
                ) : null}
                {commentsLoadState.kind === "success" ? (
                  <ul className="grid gap-3" aria-label="Task comments">
                    {comments.map((comment) => {
                      const isEditing = editingCommentId === comment.id;
                      const isAuthor = canEditComment(comment);
                      const canDelete = canSoftDeleteComment(comment);
                      return (
                        <li key={comment.id} className="grid gap-2">
                          <p className="text-xs text-muted-foreground">
                            {comment.authorDisplayName}
                            {" · "}
                            <time dateTime={comment.createdAt}>
                              {comment.createdAt}
                            </time>
                          </p>
                          {isEditing ? (
                            <div className="grid gap-2">
                              <Label className="grid gap-2">
                                Edit comment
                                <Textarea
                                  name={`edit-comment-${comment.id}`}
                                  value={editCommentBody}
                                  onChange={(event) =>
                                    setEditCommentBody(event.target.value)
                                  }
                                  disabled={commentMutationsDisabled}
                                />
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void onSaveComment(comment.id)}
                                  disabled={commentMutationsDisabled}
                                >
                                  {commentActionState.kind === "saving" &&
                                  commentActionState.commentId === comment.id
                                    ? "Saving…"
                                    : "Save comment"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditCommentBody("");
                                  }}
                                  disabled={commentMutationsDisabled}
                                >
                                  Cancel edit
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm">
                              {comment.body}
                            </p>
                          )}
                          {!isEditing && (isAuthor || canDelete) ? (
                            <div className="flex flex-wrap gap-2">
                              {isAuthor ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditCommentBody(comment.body);
                                    setCommentActionState({ kind: "idle" });
                                  }}
                                  disabled={commentMutationsDisabled}
                                >
                                  Edit comment
                                </Button>
                              ) : null}
                              {canDelete ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void onDeleteComment(comment.id)}
                                  disabled={commentMutationsDisabled}
                                >
                                  {commentActionState.kind === "deleting" &&
                                  commentActionState.commentId === comment.id
                                    ? "Deleting…"
                                    : "Delete comment"}
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {canWrite ? (
                  <form
                    onSubmit={(event) => void onCreateComment(event)}
                    className="grid gap-2"
                  >
                    <Label className="grid gap-2">
                      New comment
                      <Textarea
                        name="new-comment"
                        value={newCommentBody}
                        onChange={(event) => setNewCommentBody(event.target.value)}
                        disabled={commentMutationsDisabled}
                      />
                    </Label>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={commentMutationsDisabled}
                    >
                      {commentActionState.kind === "creating"
                        ? "Adding…"
                        : "Add comment"}
                    </Button>
                  </form>
                ) : null}
                {commentActionState.kind === "creating" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Adding comment…
                  </p>
                ) : null}
                {commentActionState.kind === "saving" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Saving comment…
                  </p>
                ) : null}
                {commentActionState.kind === "deleting" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Deleting comment…
                  </p>
                ) : null}
                {commentActionState.kind === "success" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    {commentActionState.message}
                  </p>
                ) : null}
                {commentActionState.kind === "conflict" ||
                commentActionState.kind === "error" ? (
                  <p className="text-sm text-destructive" role="alert">
                    {commentActionState.message}
                  </p>
                ) : null}
              </section>
            </>
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
        </CardContent>
      </Card>
    </section>
  );
}
