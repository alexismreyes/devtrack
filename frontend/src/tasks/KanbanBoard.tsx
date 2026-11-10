import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { labelChipClassName, labelSoftTintClassName } from "./labelColors";

type KanbanBoardProps = {
  columns: PublicProjectStatusDto[];
  tasks: PublicTaskDto[];
  onSelectTask: (taskId: string) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  onReorderColumns?: (statusIds: string[]) => Promise<void>;
  onReorderTasks?: (status: TaskStatus, taskIds: string[]) => Promise<void>;
  onAddTask?: (status: TaskStatus) => void;
  disabled?: boolean;
};

type ActiveDrag =
  | { type: "task"; id: string }
  | { type: "status-column"; id: string }
  | null;

export function sortTasksByPosition(
  tasks: PublicTaskDto[],
): PublicTaskDto[] {
  return [...tasks].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    return left.id.localeCompare(right.id);
  });
}

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
  let targetStatus: string | null = null;
  if (columnKeys.includes(target)) {
    targetStatus = target;
  } else {
    const overTask = tasks.find((item) => item.id === target);
    if (overTask !== undefined) {
      targetStatus = overTask.status;
    }
  }
  if (targetStatus === null) {
    return null;
  }
  const task = tasks.find((item) => item.id === String(activeId));
  if (task === undefined || task.status === targetStatus) {
    return null;
  }
  return { taskId: task.id, status: targetStatus };
}

export function resolveColumnReorder(
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier | null | undefined,
  statusIds: readonly string[],
): string[] | null {
  if (overId === null || overId === undefined) {
    return null;
  }
  const active = String(activeId);
  const over = String(overId);
  const oldIndex = statusIds.indexOf(active);
  const newIndex = statusIds.indexOf(over);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return null;
  }
  return arrayMove([...statusIds], oldIndex, newIndex);
}

export function resolveTaskReorder(
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier | null | undefined,
  taskIds: readonly string[],
): string[] | null {
  if (overId === null || overId === undefined) {
    return null;
  }
  const active = String(activeId);
  const over = String(overId);
  const oldIndex = taskIds.indexOf(active);
  const newIndex = taskIds.indexOf(over);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return null;
  }
  return arrayMove([...taskIds], oldIndex, newIndex);
}

function dragTypeOf(
  data: Record<string, unknown> | undefined,
): "task" | "status-column" | null {
  const type = data?.type;
  if (type === "task" || type === "status-column") {
    return type;
  }
  return null;
}

const kanbanCollision: CollisionDetection = (args) => {
  const activeType = dragTypeOf(
    args.active.data.current as Record<string, unknown> | undefined,
  );
  if (activeType === "status-column") {
    const columnContainers = args.droppableContainers.filter(
      (container) =>
        dragTypeOf(
          container.data.current as Record<string, unknown> | undefined,
        ) === "status-column",
    );
    return closestCenter({
      ...args,
      droppableContainers: columnContainers,
    });
  }

  const taskDropContainers = args.droppableContainers.filter((container) => {
    const data = container.data.current as Record<string, unknown> | undefined;
    return data?.type === "task-column" || data?.type === "task";
  });
  const scoped =
    taskDropContainers.length > 0
      ? { ...args, droppableContainers: taskDropContainers }
      : args;
  const pointerHits = pointerWithin(scoped);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCorners(scoped);
};

function createKeyboardCoordinates(
  columnKeys: readonly string[],
  columnIds: readonly string[],
): KeyboardCoordinateGetter {
  return (event, helpers) => {
    const activeType = dragTypeOf(
      helpers.context.active?.data.current as
        | Record<string, unknown>
        | undefined,
    );
    const { currentCoordinates, context } = helpers;

    if (activeType === "status-column") {
      if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") {
        return;
      }
      const activeId =
        context.active?.id !== undefined && context.active?.id !== null
          ? String(context.active.id)
          : null;
      const overId =
        context.over?.id !== undefined && context.over?.id !== null
          ? String(context.over.id)
          : null;
      const currentIndex = columnIds.findIndex(
        (id) => id === (overId ?? activeId),
      );
      const nextIndex =
        event.code === "ArrowRight"
          ? Math.min(columnIds.length - 1, Math.max(0, currentIndex) + 1)
          : Math.max(0, currentIndex === -1 ? 0 : currentIndex - 1);
      const nextColumnId = columnIds[nextIndex];
      if (nextColumnId === undefined) {
        return;
      }
      const rect = context.droppableRects.get(nextColumnId);
      if (rect === undefined) {
        return {
          x: currentCoordinates.x + (event.code === "ArrowRight" ? 280 : -280),
          y: currentCoordinates.y,
        };
      }
      return { x: rect.left + rect.width / 2, y: rect.top + 20 };
    }

    if (activeType === "task") {
      if (event.code === "ArrowUp" || event.code === "ArrowDown") {
        return sortableKeyboardCoordinates(event, helpers);
      }
    }
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
  onReorderColumns,
  onReorderTasks,
  onAddTask,
  disabled = false,
}: KanbanBoardProps) {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null);
  const suppressSelectRef = useRef(false);
  const columnKeys = columns.map((column) => column.key);
  const columnIds = columns.map((column) => column.id);
  const columnsSortable = !disabled && onReorderColumns !== undefined;
  const cardsSortable = !disabled && onReorderTasks !== undefined;
  const cardsDraggable = !disabled;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: createKeyboardCoordinates(columnKeys, columnIds),
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter", "Tab"],
      },
    }),
  );
  const activeTask =
    activeDrag?.type === "task"
      ? tasks.find((task) => task.id === activeDrag.id)
      : undefined;
  const activeColumn =
    activeDrag?.type === "status-column"
      ? columns.find((column) => column.id === activeDrag.id)
      : undefined;

  function clearSelectSuppression(): void {
    window.setTimeout(() => {
      suppressSelectRef.current = false;
    }, 0);
  }

  function handleDragStart(event: DragStartEvent): void {
    const type = dragTypeOf(
      event.active.data.current as Record<string, unknown> | undefined,
    );
    if (type === null) {
      return;
    }
    suppressSelectRef.current = true;
    setActiveDrag({ type, id: String(event.active.id) });
  }

  function handleDragEnd(event: DragEndEvent): void {
    const type = dragTypeOf(
      event.active.data.current as Record<string, unknown> | undefined,
    );
    setActiveDrag(null);
    clearSelectSuppression();
    if (disabled || type === null) {
      return;
    }

    if (type === "status-column") {
      if (onReorderColumns === undefined) {
        return;
      }
      const nextIds = resolveColumnReorder(
        event.active.id,
        event.over?.id,
        columnIds,
      );
      if (nextIds === null) {
        return;
      }
      void onReorderColumns(nextIds);
      return;
    }

    const activeTaskId = String(event.active.id);
    const active = tasks.find((task) => task.id === activeTaskId);
    if (active === undefined) {
      return;
    }

    const columnTaskIds = sortTasksByPosition(
      tasks.filter((task) => task.status === active.status),
    ).map((task) => task.id);
    const overId = event.over?.id;
    const overTask =
      overId === undefined || overId === null
        ? undefined
        : tasks.find((task) => task.id === String(overId));

    if (
      overTask !== undefined &&
      overTask.status === active.status &&
      onReorderTasks !== undefined
    ) {
      const nextIds = resolveTaskReorder(
        event.active.id,
        overId,
        columnTaskIds,
      );
      if (nextIds === null) {
        return;
      }
      void onReorderTasks(active.status, nextIds);
      return;
    }

    const move = resolveKanbanDrop(
      event.active.id,
      overId,
      tasks,
      columnKeys,
    );
    if (move === null) {
      return;
    }
    void onMoveTask(move.taskId, move.status);
  }

  function handleDragCancel(): void {
    setActiveDrag(null);
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
      <SortableContext
        items={columnIds}
        strategy={horizontalListSortingStrategy}
        disabled={!columnsSortable}
      >
        <div
          data-slot="kanban-board"
          className="flex min-h-0 min-w-0 flex-1 justify-start gap-3 overflow-x-auto"
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={sortTasksByPosition(
                tasks.filter((task) => task.status === column.key),
              )}
              onSelectTask={onSelectTask}
              suppressSelectRef={suppressSelectRef}
              onAddTask={onAddTask}
              disabled={disabled}
              columnsSortable={columnsSortable}
              cardsDraggable={cardsDraggable}
              cardsSortable={cardsSortable}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeTask === undefined ? null : (
          <div data-slot="kanban-drag-overlay" className="cursor-grabbing">
            <KanbanCardFace task={activeTask} />
          </div>
        )}
        {activeColumn === undefined ? null : (
          <ColumnDragOverlayPreview column={activeColumn} />
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
  columnsSortable,
  cardsDraggable,
  cardsSortable,
}: {
  column: PublicProjectStatusDto;
  tasks: PublicTaskDto[];
  onSelectTask: (taskId: string) => void;
  suppressSelectRef: RefObject<boolean>;
  onAddTask?: (status: TaskStatus) => void;
  disabled: boolean;
  columnsSortable: boolean;
  cardsDraggable: boolean;
  cardsSortable: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: !columnsSortable,
    data: { type: "status-column", statusId: column.id, status: column.key },
  });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: column.key,
    disabled,
    data: { type: "task-column", status: column.key },
  });

  // Keep horizontal transform for rail slot feedback; ghost styling replaces live chrome
  // so the free-follow DragOverlay is the visible preview (Q-202).
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const columnListeners = columnsSortable ? listeners : undefined;
  // Preserve semantic columnheader; sortable defaults role to button.
  const { role: _sortableRole, ...columnSortableAttributes } = attributes;
  const taskIds = tasks.map((task) => task.id);

  return (
    <section
      ref={setSortableRef}
      style={style}
      data-kanban-column={column.key}
      data-kanban-column-id={column.id}
      data-kanban-column-ghost={isDragging ? column.id : undefined}
      aria-labelledby={`task-column-${column.key}`}
      className={cn(
        "flex min-h-0 w-72 min-w-64 max-w-80 shrink-0 flex-col overflow-hidden rounded-xl border bg-card/60 p-3",
        isOver && !disabled && !isDragging ? "border-primary" : null,
        isDragging
          ? "border-dashed border-muted-foreground/40 bg-muted/40 opacity-50"
          : null,
      )}
    >
      <h4
        id={`task-column-${column.key}`}
        role="columnheader"
        data-testid={`kanban-column-header-${column.key}`}
        className={cn(
          "mb-3 flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold tracking-tight touch-none",
          labelSoftTintClassName(column.color),
          columnsSortable
            ? isDragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : null,
        )}
        {...(columnsSortable
          ? {
              "data-kanban-column-handle": column.id,
              ...columnSortableAttributes,
              ...columnListeners,
            }
          : {})}
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
      <div ref={setDroppableRef} className="flex min-h-0 flex-1 flex-col">
        {isDragging ? (
          <div
            data-slot="kanban-column-rail-ghost"
            className="min-h-24 flex-1 rounded-md bg-muted/50"
            aria-hidden="true"
          />
        ) : (
          <>
            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
              disabled={!cardsSortable}
            >
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
                    disabled={!cardsDraggable}
                    sortable={cardsSortable}
                  />
                ))}
              </ul>
            </SortableContext>
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
          </>
        )}
      </div>
    </section>
  );
}

function ColumnDragOverlayPreview({
  column,
}: {
  column: PublicProjectStatusDto;
}) {
  return (
    <div
      data-slot="kanban-column-drag-overlay"
      className="w-72 cursor-grabbing overflow-hidden rounded-xl border bg-card/90 shadow-lg"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm font-semibold tracking-tight",
          labelSoftTintClassName(column.color),
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-2.5 shrink-0 rounded-sm",
            labelChipClassName(column.color),
          )}
        />
        {column.name}
      </div>
      <div className="grid gap-2 p-3" aria-hidden="true">
        <div className="h-8 rounded-md bg-muted/70" />
        <div className="h-8 rounded-md bg-muted/50" />
        <div className="h-8 w-2/3 rounded-md bg-muted/35" />
      </div>
    </div>
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
  sortable,
}: {
  task: PublicTaskDto;
  onSelectTask: (taskId: string) => void;
  suppressSelectRef: RefObject<boolean>;
  disabled: boolean;
  sortable: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
        style={style}
        data-kanban-card={task.id}
        data-kanban-card-sortable={sortable ? task.id : undefined}
        aria-label={task.title}
        className={cn(
          "touch-none",
          disabled
            ? "cursor-pointer"
            : isDragging
              ? "cursor-grabbing opacity-50"
              : sortable
                ? "cursor-grab"
                : "cursor-pointer",
        )}
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
