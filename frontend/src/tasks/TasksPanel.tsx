import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createTask,
  isConflict,
  isForbidden,
  isUnauthenticated,
  listTasks,
  toUserMessage,
} from "../api/client";
import type {
  ListTasksQueryDto,
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
import { TaskDetail } from "./TaskDetail";

type TasksPanelProps = {
  projectId: string;
  archived: boolean;
  onUnauthenticated: () => void;
};

type ListState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "success"; tasks: PublicTaskDto[] }
  | { kind: "error"; message: string }
  | { kind: "unauthenticated"; message: string }
  | { kind: "forbidden"; message: string };

type CreateState =
  | { kind: "ready" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function TasksPanel({
  projectId,
  archived,
  onUnauthenticated,
}: TasksPanelProps) {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [createState, setCreateState] = useState<CreateState>({ kind: "ready" });
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [priority, setPriority] = useState<TaskPriority | "">("");

  const loadTasks = useCallback(async (): Promise<boolean> => {
    setListState({ kind: "loading" });
    try {
      const query: ListTasksQueryDto = {};
      if (statusFilter !== "") {
        query.status = statusFilter;
      }
      if (priorityFilter !== "") {
        query.priority = priorityFilter;
      }
      const result = await listTasks(projectId, query);
      if (result.tasks.length === 0) {
        setListState({ kind: "empty" });
        return true;
      }
      setListState({ kind: "success", tasks: result.tasks });
      return true;
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        onUnauthenticated();
        return false;
      }
      if (isForbidden(err)) {
        setListState({ kind: "forbidden", message: toUserMessage(err) });
        return false;
      }
      setListState({ kind: "error", message: toUserMessage(err) });
      return false;
    }
  }, [onUnauthenticated, priorityFilter, projectId, statusFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setSelectedTaskId(null);
    setCreateState({ kind: "ready" });
  }, [projectId]);

  async function onCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateState({ kind: "saving" });
    const payload: {
      title: string;
      description: string | null;
      dueDate: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
    } = {
      title,
      description: description.trim() === "" ? null : description,
      dueDate: dueDate.trim() === "" ? null : dueDate,
    };
    if (status !== "") {
      payload.status = status;
    }
    if (priority !== "") {
      payload.priority = priority;
    }
    try {
      await createTask(projectId, payload);
      setTitle("");
      setDescription("");
      setDueDate("");
      setStatus("");
      setPriority("");
      const loaded = await loadTasks();
      if (loaded) {
        setCreateState({ kind: "success", message: "Task created." });
      }
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        setCreateState({ kind: "ready" });
        onUnauthenticated();
        return;
      }
      if (isForbidden(err)) {
        setCreateState({ kind: "error", message: toUserMessage(err) });
        return;
      }
      if (isConflict(err)) {
        setCreateState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setCreateState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const creating = createState.kind === "saving";
  const listBlocked =
    listState.kind === "unauthenticated" || listState.kind === "forbidden";
  const writesDisabled = creating || archived;
  const filtered = statusFilter !== "" || priorityFilter !== "";

  return (
    <section aria-labelledby="tasks-heading" className="grid gap-4">
      <h3 id="tasks-heading" className="text-lg font-semibold tracking-tight">
        Tasks
      </h3>
      {archived ? (
        <p className="text-sm text-muted-foreground">
          Task writes are unavailable while the parent project is archived.
        </p>
      ) : null}
      {listBlocked ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Label className="grid gap-2">
              Filter by status
              <select
                name="task-status-filter"
                className={cn(nativeSelectClassName)}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as TaskStatus | "")
                }
              >
                <option value="">All</option>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Label>
            <Label className="grid gap-2">
              Filter by priority
              <select
                name="task-priority-filter"
                className={cn(nativeSelectClassName)}
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as TaskPriority | "")
                }
              >
                <option value="">All</option>
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Label>
          </div>
          {selectedTaskId === null ? (
            <Card>
              <CardHeader className="p-4 pb-2">
                <h4 id="create-task-heading" className="text-sm font-semibold">
                  Create task
                </h4>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <form
                  onSubmit={(event) => void onCreate(event)}
                  aria-labelledby="create-task-heading"
                  className="grid gap-3"
                >
                  <Label className="grid gap-2">
                    New task title
                    <Input
                      type="text"
                      name="new-task-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      disabled={writesDisabled}
                    />
                  </Label>
                  <Label className="grid gap-2">
                    New task description
                    <Textarea
                      name="new-task-description"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      disabled={writesDisabled}
                    />
                  </Label>
                  <Label className="grid gap-2">
                    New task due date
                    <Input
                      type="date"
                      name="new-task-due-date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      disabled={writesDisabled}
                    />
                  </Label>
                  <Label className="grid gap-2">
                    New task status
                    <select
                      name="new-task-status"
                      className={cn(nativeSelectClassName)}
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as TaskStatus | "")
                      }
                      disabled={writesDisabled}
                    >
                      <option value="">Default (TODO)</option>
                      {STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Label className="grid gap-2">
                    New task priority
                    <select
                      name="new-task-priority"
                      className={cn(nativeSelectClassName)}
                      value={priority}
                      onChange={(event) =>
                        setPriority(event.target.value as TaskPriority | "")
                      }
                      disabled={writesDisabled}
                    >
                      <option value="">Default (MEDIUM)</option>
                      {PRIORITIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Label>
                  <Button type="submit" disabled={writesDisabled}>
                    {creating ? "Creating…" : "Create task"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
      {creating ? (
        <p className="text-sm text-muted-foreground" role="status">
          Creating task…
        </p>
      ) : null}
      {createState.kind === "success" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {createState.message}
        </p>
      ) : null}
      {createState.kind === "conflict" ? (
        <p className="text-sm text-destructive" role="alert">
          {createState.message}
        </p>
      ) : null}
      {createState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {createState.message}
        </p>
      ) : null}
      {listState.kind === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading tasks…
        </p>
      ) : null}
      {listState.kind === "empty" ? (
        <p className="text-sm text-muted-foreground">
          {filtered ? "No matching tasks." : "No tasks yet."}
        </p>
      ) : null}
      {listState.kind === "success" ? (
        <ul aria-label="Tasks" className="grid gap-2">
          {listState.tasks.map((task) => (
            <li key={task.id}>
              <Card>
                <CardContent className="p-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start px-2 py-1 text-left"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    {task.title}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
      {listState.kind === "unauthenticated" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {listState.message}
        </p>
      ) : null}
      {listState.kind === "forbidden" ? (
        <p className="text-sm text-destructive" role="alert">
          {listState.message}
        </p>
      ) : null}
      {listState.kind === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {listState.message}
        </p>
      ) : null}
      {selectedTaskId !== null && !listBlocked ? (
        <TaskDetail
          taskId={selectedTaskId}
          archived={archived}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={() => {
            void loadTasks();
          }}
          onDeleted={() => {
            setSelectedTaskId(null);
            void loadTasks();
          }}
          onUnauthenticated={onUnauthenticated}
        />
      ) : null}
    </section>
  );
}
