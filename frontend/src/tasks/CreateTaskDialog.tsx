import { useEffect, useState, type FormEvent } from "react";
import type {
  PublicProjectStatusDto,
  TaskPriority,
  TaskStatus,
} from "../api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, nativeSelectClassName } from "@/lib/utils";
import { taskStatusLabel } from "./statusDisplay";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export type CreateTaskPayload = {
  title: string;
  description: string | null;
  dueDate: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
};

type CreateTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  omitStatus: boolean;
  initialStatus?: TaskStatus;
  statusOptions?: PublicProjectStatusDto[];
  creating: boolean;
  errorMessage?: string;
  onSubmit: (payload: CreateTaskPayload) => void;
};

export function CreateTaskDialog({
  open,
  onOpenChange,
  omitStatus,
  initialStatus,
  statusOptions = [],
  creating,
  errorMessage,
  onSubmit,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus | "">(initialStatus ?? "");
  const [priority, setPriority] = useState<TaskPriority | "">("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitle("");
    setDescription("");
    setDueDate("");
    setStatus(initialStatus ?? "");
    setPriority("");
  }, [initialStatus, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const payload: CreateTaskPayload = {
      title,
      description: description.trim() === "" ? null : description,
      dueDate: dueDate.trim() === "" ? null : dueDate,
    };
    if (!omitStatus && status !== "") {
      payload.status = status;
    }
    if (priority !== "") {
      payload.priority = priority;
    }
    onSubmit(payload);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (creating) {
          return;
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle id="create-task-heading">Create task</DialogTitle>
          <DialogDescription>
            Enter a title and optional task details.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
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
              disabled={creating}
            />
          </Label>
          <Label className="grid gap-2">
            New task description
            <Textarea
              name="new-task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={creating}
            />
          </Label>
          <Label className="grid gap-2">
            New task due date
            <Input
              type="date"
              name="new-task-due-date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={creating}
            />
          </Label>
          {omitStatus ? null : (
            <Label className="grid gap-2">
              New task status
              <select
                name="new-task-status"
                className={cn(nativeSelectClassName)}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={creating}
              >
                {statusOptions.map((option) => (
                  <option key={option.id} value={option.key}>
                    {taskStatusLabel(option.key, statusOptions)}
                  </option>
                ))}
              </select>
            </Label>
          )}
          <Label className="grid gap-2">
            New task priority
            <select
              name="new-task-priority"
              className={cn(nativeSelectClassName)}
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority | "")
              }
              disabled={creating}
            >
              <option value="">Default (MEDIUM)</option>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Label>
          {creating ? (
            <p className="text-sm text-muted-foreground" role="status">
              Creating task…
            </p>
          ) : null}
          {errorMessage !== undefined ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
