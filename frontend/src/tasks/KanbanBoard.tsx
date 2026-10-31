import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { PublicTaskDto, TaskStatus } from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLUMN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

type KanbanBoardProps = {
  tasks: PublicTaskDto[];
  onSelectTask: (taskId: string) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  onAddTask?: (status: TaskStatus) => void;
  disabled?: boolean;
};

export function isTaskStatus(value: string): value is TaskStatus {
  return value === "TODO" || value === "IN_PROGRESS" || value === "DONE";
}

export function resolveKanbanDrop(
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier | null | undefined,
  tasks: PublicTaskDto[],
): { taskId: string; status: TaskStatus } | null {
  if (overId === null || overId === undefined) {
    return null;
  }
  const target = String(overId);
  if (!isTaskStatus(target)) {
    return null;
  }
  const task = tasks.find((item) => item.id === String(activeId));
  if (task === undefined || task.status === target) {
    return null;
  }
  return { taskId: task.id, status: target };
}

const kanbanCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCorners(args);
};

const kanbanKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context },
) => {
  if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") {
    return;
  }
  const currentId =
    context.over?.id !== undefined && context.over?.id !== null
      ? String(context.over.id)
      : null;
  const currentIndex =
    currentId === null ? -1 : COLUMN_STATUSES.findIndex((status) => status === currentId);
  const nextIndex =
    event.code === "ArrowRight"
      ? Math.min(COLUMN_STATUSES.length - 1, Math.max(0, currentIndex) + 1)
      : Math.max(0, currentIndex === -1 ? 0 : currentIndex - 1);
  const nextStatus = COLUMN_STATUSES[nextIndex];
  const rect = context.droppableRects.get(nextStatus);
  if (rect === undefined) {
    return {
      x: currentCoordinates.x + (event.code === "ArrowRight" ? 280 : -280),
      y: currentCoordinates.y,
    };
  }
  return { x: rect.left + rect.width / 2, y: rect.top + 40 };
};

export function KanbanBoard({
  tasks,
  onSelectTask,
  onMoveTask,
  onAddTask,
  disabled = false,
}: KanbanBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: kanbanKeyboardCoordinates,
    }),
  );
  const activeTask = tasks.find((task) => task.id === activeTaskId);

  function handleDragStart(event: DragStartEvent): void {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent): void {
    const move = resolveKanbanDrop(event.active.id, event.over?.id, tasks);
    setActiveTaskId(null);
    if (move === null || disabled) {
      return;
    }
    void onMoveTask(move.taskId, move.status);
  }

  function handleDragCancel(): void {
    setActiveTaskId(null);
  }

  return (
    <DndContext
      id="project-kanban"
      sensors={sensors}
      collisionDetection={kanbanCollision}
      autoScroll={false}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        data-slot="kanban-board"
        className="flex min-h-0 min-w-0 flex-1 justify-start gap-3 overflow-x-auto"
      >
        {COLUMN_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            onSelectTask={onSelectTask}
            onAddTask={onAddTask}
            disabled={disabled}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask === undefined ? null : (
          <div data-slot="kanban-drag-overlay" className="cursor-pointer">
            <KanbanCardFace task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  onSelectTask,
  onAddTask,
  disabled,
}: {
  status: TaskStatus;
  tasks: PublicTaskDto[];
  onSelectTask: (taskId: string) => void;
  onAddTask?: (status: TaskStatus) => void;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled,
    data: { type: "column", status },
  });

  return (
    <section
      ref={setNodeRef}
      data-kanban-column={status}
      aria-labelledby={`task-column-${status}`}
      className={cn(
        "flex min-h-0 w-72 min-w-64 max-w-80 shrink-0 flex-col overflow-hidden rounded-xl border bg-card/60 p-3",
        isOver && !disabled ? "border-primary" : null,
      )}
    >
      <h4
        id={`task-column-${status}`}
        role="columnheader"
        className="mb-3 shrink-0 text-sm font-semibold tracking-tight"
      >
        {status}
      </h4>
      <ul
        aria-label={`${status} tasks`}
        className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto"
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onSelectTask={onSelectTask}
            disabled={disabled}
          />
        ))}
      </ul>
      {onAddTask === undefined ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 w-full shrink-0 justify-start"
          aria-label={`Add task to ${status}`}
          onClick={() => onAddTask(status)}
          disabled={disabled}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      )}
    </section>
  );
}

function KanbanCardFace({
  task,
  onSelectTask,
}: {
  task: PublicTaskDto;
  onSelectTask?: (taskId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-1 p-3">
        {onSelectTask === undefined ? (
          <p className="px-2 py-1 text-sm font-medium">{task.title}</p>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full cursor-pointer justify-start px-2 py-1 text-left"
            onClick={() => onSelectTask(task.id)}
          >
            {task.title}
          </Button>
        )}
        <p className="px-2 text-xs text-muted-foreground">Priority {task.priority}</p>
        {task.dueDate === null ? null : (
          <p className="px-2 text-xs text-muted-foreground">Due {task.dueDate}</p>
        )}
      </CardContent>
    </Card>
  );
}

function KanbanCard({
  task,
  onSelectTask,
  disabled,
}: {
  task: PublicTaskDto;
  onSelectTask: (taskId: string) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled,
    data: { type: "task", status: task.status },
    attributes: {
      role: "group",
      roleDescription: "draggable",
    },
  });

  return (
    <li>
      <div
        ref={setNodeRef}
        data-kanban-card={task.id}
        className={cn("cursor-pointer touch-none", isDragging ? "opacity-50" : null)}
        {...attributes}
        {...(disabled ? {} : listeners)}
      >
        <KanbanCardFace task={task} onSelectTask={onSelectTask} />
      </div>
    </li>
  );
}
