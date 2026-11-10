import { useEffect, useRef, useState, type RefObject } from "react";
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
import { fetchAttachmentContent } from "../api/client";
import type {
  PublicCoverSummaryDto,
  PublicProjectStatusDto,
  PublicTaskDto,
  TaskStatus,
} from "../api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LabelChips } from "./LabelChips";
import { labelChipClassName } from "./labelColors";

type KanbanBoardProps = {
  columns: PublicProjectStatusDto[];
  tasks: PublicTaskDto[];
  onSelectTask: (taskId: string) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  onAddTask?: (status: TaskStatus) => void;
  disabled?: boolean;
};

export function resolveKanbanDrop(
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier | null | undefined,
  tasks: PublicTaskDto[],
  columnKeys: readonly string[],
): { taskId: string; status: TaskStatus } | null {
  if (overId === null || overId === undefined) {
    return null;
  }
  const target = String(overId);
  if (!columnKeys.includes(target)) {
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

function createKeyboardCoordinates(
  columnKeys: readonly string[],
): KeyboardCoordinateGetter {
  return (event, { currentCoordinates, context }) => {
    if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") {
      return;
    }
    const currentId =
      context.over?.id !== undefined && context.over?.id !== null
        ? String(context.over.id)
        : null;
    const currentIndex =
      currentId === null ? -1 : columnKeys.findIndex((key) => key === currentId);
    const nextIndex =
      event.code === "ArrowRight"
        ? Math.min(columnKeys.length - 1, Math.max(0, currentIndex) + 1)
        : Math.max(0, currentIndex === -1 ? 0 : currentIndex - 1);
    const nextStatus = columnKeys[nextIndex];
    if (nextStatus === undefined) {
      return;
    }
    const rect = context.droppableRects.get(nextStatus);
    if (rect === undefined) {
      return {
        x: currentCoordinates.x + (event.code === "ArrowRight" ? 280 : -280),
        y: currentCoordinates.y,
      };
    }
    return { x: rect.left + rect.width / 2, y: rect.top + 40 };
  };
}

export function KanbanBoard({
  columns,
  tasks,
  onSelectTask,
  onMoveTask,
  onAddTask,
  disabled = false,
}: KanbanBoardProps) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const suppressSelectRef = useRef(false);
  const columnKeys = columns.map((column) => column.key);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: createKeyboardCoordinates(columnKeys),
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter", "Tab"],
      },
    }),
  );
  const activeTask = tasks.find((task) => task.id === activeTaskId);

  function clearSelectSuppression(): void {
    window.setTimeout(() => {
      suppressSelectRef.current = false;
    }, 0);
  }

  function handleDragStart(event: DragStartEvent): void {
    suppressSelectRef.current = true;
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent): void {
    const move = resolveKanbanDrop(
      event.active.id,
      event.over?.id,
      tasks,
      columnKeys,
    );
    setActiveTaskId(null);
    clearSelectSuppression();
    if (move === null || disabled) {
      return;
    }
    void onMoveTask(move.taskId, move.status);
  }

  function handleDragCancel(): void {
    setActiveTaskId(null);
    clearSelectSuppression();
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
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasks.filter((task) => task.status === column.key)}
            onSelectTask={onSelectTask}
            suppressSelectRef={suppressSelectRef}
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
  column,
  tasks,
  onSelectTask,
  suppressSelectRef,
  onAddTask,
  disabled,
}: {
  column: PublicProjectStatusDto;
  tasks: PublicTaskDto[];
  onSelectTask: (taskId: string) => void;
  suppressSelectRef: RefObject<boolean>;
  onAddTask?: (status: TaskStatus) => void;
  disabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.key,
    disabled,
    data: { type: "column", status: column.key },
  });

  return (
    <section
      ref={setNodeRef}
      data-kanban-column={column.key}
      aria-labelledby={`task-column-${column.key}`}
      className={cn(
        "flex min-h-0 w-72 min-w-64 max-w-80 shrink-0 flex-col overflow-hidden rounded-xl border bg-card/60 p-3",
        isOver && !disabled ? "border-primary" : null,
      )}
    >
      <h4
        id={`task-column-${column.key}`}
        role="columnheader"
        className="mb-3 shrink-0 inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-sm font-semibold tracking-tight text-foreground"
        data-testid={`kanban-column-header-${column.key}`}
      >
        <span
          aria-hidden="true"
          data-status-color={column.color}
          className={cn(
            "inline-block size-2.5 shrink-0 rounded-sm",
            labelChipClassName(column.color),
          )}
        />
        {column.name}
      </h4>
      <ul
        aria-label={`${column.key} tasks`}
        className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto"
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onSelectTask={onSelectTask}
            suppressSelectRef={suppressSelectRef}
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
          aria-label={`Add task to ${column.key}`}
          onClick={() => onAddTask(column.key)}
          disabled={disabled}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      )}
    </section>
  );
}

function KanbanCardCoverImage({
  taskId,
  cover,
}: {
  taskId: string;
  cover: PublicCoverSummaryDto;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    async function load(): Promise<void> {
      try {
        const { blob } = await fetchAttachmentContent(
          taskId,
          cover.attachmentId,
        );
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
  }, [cover.attachmentId, taskId]);

  if (objectUrl === null) {
    return null;
  }

  return (
    <img
      src={objectUrl}
      alt=""
      data-testid="kanban-card-cover"
      data-cover-attachment-id={cover.attachmentId}
      className="mb-1 h-24 w-full rounded-md object-cover"
    />
  );
}

function KanbanCardFace({ task }: { task: PublicTaskDto }) {
  return (
    <Card>
      <CardContent className="grid gap-1 p-3">
        {task.cover === null ? null : (
          <KanbanCardCoverImage taskId={task.id} cover={task.cover} />
        )}
        <p className="px-2 py-1 text-sm font-medium">{task.title}</p>
        <p className="px-2 text-xs text-muted-foreground">Priority {task.priority}</p>
        {task.dueDate === null ? null : (
          <p className="px-2 text-xs text-muted-foreground">Due {task.dueDate}</p>
        )}
        <LabelChips labels={task.labels} />
      </CardContent>
    </Card>
  );
}

function KanbanCard({
  task,
  onSelectTask,
  suppressSelectRef,
  disabled,
}: {
  task: PublicTaskDto;
  onSelectTask: (taskId: string) => void;
  suppressSelectRef: RefObject<boolean>;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled,
    data: { type: "task", status: task.status },
    attributes: {
      role: "button",
      roleDescription: "draggable",
    },
  });
  const dragListeners = disabled ? undefined : listeners;
  const dndKeyDown = dragListeners?.onKeyDown;
  const otherDragListeners =
    dragListeners === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(dragListeners).filter(([key]) => key !== "onKeyDown"),
        );

  function handleSelect(): void {
    if (suppressSelectRef.current) {
      return;
    }
    onSelectTask(task.id);
  }

  return (
    <li>
      <div
        ref={setNodeRef}
        data-kanban-card={task.id}
        aria-label={task.title}
        className={cn("cursor-pointer touch-none", isDragging ? "opacity-50" : null)}
        {...attributes}
        {...otherDragListeners}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (typeof dndKeyDown === "function") {
            dndKeyDown(event);
          }
          if (event.defaultPrevented) {
            return;
          }
          if (event.key === " " || event.code === "Space") {
            // Block role=button Space→click when KeyboardSensor did not activate.
            event.preventDefault();
            return;
          }
          if (event.key !== "Enter") {
            return;
          }
          event.preventDefault();
          handleSelect();
        }}
      >
        <KanbanCardFace task={task} />
      </div>
    </li>
  );
}
