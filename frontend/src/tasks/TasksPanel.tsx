import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  createTask,
  isConflict,
  isForbidden,
  isUnauthenticated,
  listLabels,
  listStatuses,
  listTasks,
  toUserMessage,
  updateTask,
} from "../api/client";
import type {
  ListTasksQueryDto,
  PublicLabelDto,
  PublicProjectStatusDto,
  PublicTaskDto,
  TaskPriority,
  TaskStatus,
} from "../api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn, nativeSelectClassName } from "@/lib/utils";
import { CreateTaskDialog, type CreateTaskPayload } from "./CreateTaskDialog";
import { KanbanBoard } from "./KanbanBoard";
import { taskStatusLabel } from "./statusDisplay";
import { TaskDetail } from "./TaskDetail";

type TasksPanelProps = {
  projectId: string;
  archived: boolean;
  canWriteTasks?: boolean;
  canManageMembers?: boolean;
  currentUserId?: string | null;
  labelsRevision?: number;
  statusesRevision?: number;
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

type MoveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; message: string };

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export function TasksPanel({
  projectId,
  archived,
  canWriteTasks = true,
  canManageMembers = false,
  currentUserId = null,
  labelsRevision = 0,
  statusesRevision = 0,
  onUnauthenticated,
}: TasksPanelProps) {
  const [listState, setListState] = useState<ListState>({ kind: "loading" });
  const [createState, setCreateState] = useState<CreateState>({ kind: "ready" });
  const [moveState, setMoveState] = useState<MoveState>({ kind: "idle" });
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [labelFilter, setLabelFilter] = useState("");
  const [catalogLabels, setCatalogLabels] = useState<PublicLabelDto[]>([]);
  const [catalogStatuses, setCatalogStatuses] = useState<
    PublicProjectStatusDto[]
  >([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPresetStatus, setCreatePresetStatus] = useState<TaskStatus | null>(
    null,
  );

  const loadCatalog = useCallback(async (): Promise<void> => {
    try {
      const result = await listLabels(projectId);
      setCatalogLabels(result.labels);
    } catch {
      setCatalogLabels([]);
    }
  }, [projectId]);

  const loadStatuses = useCallback(async (): Promise<void> => {
    try {
      const result = await listStatuses(projectId);
      setCatalogStatuses(result.statuses);
      setStatusFilter((current) => {
        if (current === "") {
          return current;
        }
        return result.statuses.some((status) => status.key === current)
          ? current
          : "";
      });
    } catch {
      setCatalogStatuses([]);
    }
  }, [projectId]);

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
      if (labelFilter !== "") {
        query.labelId = labelFilter;
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
  }, [labelFilter, onUnauthenticated, priorityFilter, projectId, statusFilter]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog, labelsRevision]);

  useEffect(() => {
    void loadStatuses();
  }, [loadStatuses, statusesRevision]);

  useEffect(() => {
    setSelectedTaskId(null);
    setCreateOpen(false);
    setCreatePresetStatus(null);
    setCreateState({ kind: "ready" });
    setLabelFilter("");
    setStatusFilter("");
  }, [projectId]);

  function openCreate(presetStatus: TaskStatus | null): void {
    setSelectedTaskId(null);
    setCreatePresetStatus(presetStatus);
    setCreateState({ kind: "ready" });
    setCreateOpen(true);
  }

  function closeCreate(): void {
    setCreateOpen(false);
    setCreatePresetStatus(null);
  }

  async function onCreate(payload: CreateTaskPayload): Promise<void> {
    setCreateState({ kind: "saving" });
    try {
      await createTask(projectId, payload);
      const loaded = await loadTasks();
      if (loaded) {
        closeCreate();
        setCreateState({ kind: "success", message: "Task created." });
      }
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        setCreateState({ kind: "ready" });
        closeCreate();
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

  async function onMoveTask(taskId: string, status: TaskStatus): Promise<void> {
    if (archived) {
      setMoveState({
        kind: "conflict",
        message: "Cannot modify tasks on an archived project",
      });
      return;
    }
    setMoveState({ kind: "saving" });
    try {
      await updateTask(taskId, { status });
      const loaded = await loadTasks();
      if (loaded) {
        setMoveState({ kind: "idle" });
      }
    } catch (err) {
      if (isUnauthenticated(err)) {
        setListState({ kind: "unauthenticated", message: toUserMessage(err) });
        setMoveState({ kind: "idle" });
        onUnauthenticated();
        return;
      }
      if (isForbidden(err)) {
        setMoveState({ kind: "error", message: toUserMessage(err) });
        return;
      }
      if (isConflict(err)) {
        setMoveState({ kind: "conflict", message: toUserMessage(err) });
        return;
      }
      setMoveState({ kind: "error", message: toUserMessage(err) });
    }
  }

  const creating = createState.kind === "saving";
  const moving = moveState.kind === "saving";
  const listBlocked =
    listState.kind === "unauthenticated" || listState.kind === "forbidden";
  const writesDisabled = creating || archived || moving || !canWriteTasks;
  const filtered =
    statusFilter !== "" || priorityFilter !== "" || labelFilter !== "";
  const listedTasks =
    listState.kind === "success"
      ? listState.tasks
      : listState.kind === "empty"
        ? []
        : null;
  const createErrorMessage =
    createState.kind === "error" || createState.kind === "conflict"
      ? createState.message
      : undefined;

  return (
    <section
      aria-labelledby="tasks-heading"
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 id="tasks-heading" className="text-lg font-semibold tracking-tight">
          Tasks
        </h3>
        {listBlocked || !canWriteTasks ? null : (
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Add task"
            onClick={() => openCreate(null)}
            disabled={writesDisabled}
          >
            <Plus aria-hidden="true" />
          </Button>
        )}
      </div>
      {archived ? (
        <p className="shrink-0 text-sm text-muted-foreground">
          Task writes are unavailable while the parent project is archived.
        </p>
      ) : null}
      {listBlocked ? null : (
        <div className="flex shrink-0 flex-wrap items-end gap-3">
          <Label className="grid gap-1">
            Filter by status
            <select
              name="task-status-filter"
              className={cn(nativeSelectClassName, "h-8 w-40")}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All</option>
              {catalogStatuses.map((status) => (
                <option key={status.id} value={status.key}>
                  {taskStatusLabel(status.key, catalogStatuses)}
                </option>
              ))}
            </select>
          </Label>
          <Label className="grid gap-1">
            Filter by priority
            <select
              name="task-priority-filter"
              className={cn(nativeSelectClassName, "h-8 w-40")}
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
          <Label className="grid gap-1">
            Filter by label
            <select
              name="task-label-filter"
              className={cn(nativeSelectClassName, "h-8 w-40")}
              value={labelFilter}
              onChange={(event) => setLabelFilter(event.target.value)}
            >
              <option value="">All</option>
              {catalogLabels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          </Label>
        </div>
      )}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (open) {
            setCreateOpen(true);
            return;
          }
          closeCreate();
        }}
        omitStatus={createPresetStatus === null}
        initialStatus={createPresetStatus ?? undefined}
        statusOptions={catalogStatuses}
        creating={creating}
        errorMessage={createErrorMessage}
        onSubmit={(payload) => {
          void onCreate(payload);
        }}
      />
      {createState.kind === "success" ? (
        <p className="shrink-0 text-sm text-muted-foreground" role="status">
          {createState.message}
        </p>
      ) : null}
      {moveState.kind === "conflict" ? (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {moveState.message}
        </p>
      ) : null}
      {moveState.kind === "error" ? (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {moveState.message}
        </p>
      ) : null}
      {listState.kind === "loading" ? (
        <p className="shrink-0 text-sm text-muted-foreground" role="status">
          Loading tasks…
        </p>
      ) : null}
      {listState.kind === "empty" ? (
        <p className="shrink-0 text-sm text-muted-foreground">
          {filtered ? "No matching tasks." : "No tasks yet."}
        </p>
      ) : null}
      {listedTasks !== null ? (
        <KanbanBoard
          columns={catalogStatuses}
          tasks={listedTasks}
          onSelectTask={(taskId) => {
            closeCreate();
            setSelectedTaskId(taskId);
          }}
          onMoveTask={onMoveTask}
          onAddTask={canWriteTasks ? openCreate : undefined}
          disabled={writesDisabled}
        />
      ) : null}
      {listState.kind === "unauthenticated" ? (
        <p className="shrink-0 text-sm text-muted-foreground" role="status">
          {listState.message}
        </p>
      ) : null}
      {listState.kind === "forbidden" ? (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {listState.message}
        </p>
      ) : null}
      {listState.kind === "error" ? (
        <p className="shrink-0 text-sm text-destructive" role="alert">
          {listState.message}
        </p>
      ) : null}
      <Dialog
        open={selectedTaskId !== null && !listBlocked}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTaskId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Task detail</DialogTitle>
            <DialogDescription className="sr-only">
              View or update the selected task. The board stays behind this
              dialog.
            </DialogDescription>
          </DialogHeader>
          {selectedTaskId !== null && !listBlocked ? (
            <TaskDetail
              taskId={selectedTaskId}
              archived={archived}
              canWrite={canWriteTasks}
              canManageMembers={canManageMembers}
              currentUserId={currentUserId}
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
        </DialogContent>
      </Dialog>
    </section>
  );
}
