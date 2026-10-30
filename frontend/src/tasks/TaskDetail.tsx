import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getTask,
  isConflict,
  isForbidden,
  isUnauthenticated,
  softDeleteTask,
  toUserMessage,
  updateTask,
} from "../api/client";
import type { PublicTaskDto, TaskPriority, TaskStatus } from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, nativeSelectClassName } from "@/lib/utils";

type TaskDetailProps = {
  taskId: string;
  archived: boolean;
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

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function TaskDetail({
  taskId,
  archived,
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

  const applyTask = useCallback((next: PublicTaskDto) => {
    setTask(next);
    setTitle(next.title);
    setDescription(next.description ?? "");
    setDueDate(next.dueDate ?? "");
    setStatus(next.status);
    setPriority(next.priority);
  }, []);

  const loadTask = useCallback(async () => {
    setLoadState({ kind: "loading" });
    setActionState({ kind: "idle" });
    try {
      const result = await getTask(taskId);
      applyTask(result);
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
  }, [applyTask, onUnauthenticated, taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

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

  const busy =
    actionState.kind === "saving" || actionState.kind === "deleting";
  const writesDisabled = busy || archived;

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
