import type { ProjectLabel } from "../domain/project-label";
import { sortLabelsByNameAsc } from "../domain/project-label";
import type {
  TaskLabelJoinStore,
  TaskLabelsRepository,
} from "../repository/task-labels-repository";
import { createTaskLabelJoinStore } from "../repository/task-labels-repository";
import type { InMemoryLabelsRepository } from "./in-memory-labels-repository";

export class InMemoryTaskLabelsRepository implements TaskLabelsRepository {
  readonly joins: TaskLabelJoinStore;

  constructor(
    private readonly labels: InMemoryLabelsRepository,
    joins: TaskLabelJoinStore = createTaskLabelJoinStore(),
  ) {
    this.joins = joins;
  }

  async replaceSetForTask(taskId: string, labelIds: string[]): Promise<void> {
    const previous = this.joins.byTaskId.get(taskId) ?? new Set<string>();
    for (const labelId of previous) {
      const tasks = this.joins.byLabelId.get(labelId);
      tasks?.delete(taskId);
      if (tasks !== undefined && tasks.size === 0) {
        this.joins.byLabelId.delete(labelId);
      }
    }

    const next = new Set(labelIds);
    if (next.size === 0) {
      this.joins.byTaskId.delete(taskId);
      return;
    }

    this.joins.byTaskId.set(taskId, next);
    for (const labelId of next) {
      const tasks = this.joins.byLabelId.get(labelId) ?? new Set<string>();
      tasks.add(taskId);
      this.joins.byLabelId.set(labelId, tasks);
    }
  }

  async listForTaskIds(
    taskIds: string[],
  ): Promise<Map<string, ProjectLabel[]>> {
    const result = new Map<string, ProjectLabel[]>();
    for (const taskId of taskIds) {
      const labelIds = this.joins.byTaskId.get(taskId);
      if (labelIds === undefined || labelIds.size === 0) {
        result.set(taskId, []);
        continue;
      }
      const labels: ProjectLabel[] = [];
      for (const labelId of labelIds) {
        const label = this.labels.labelsById.get(labelId);
        if (label !== undefined) {
          labels.push(label);
        }
      }
      result.set(taskId, sortLabelsByNameAsc(labels));
    }
    return result;
  }

  async deleteByLabelId(labelId: string): Promise<void> {
    const taskIds = this.joins.byLabelId.get(labelId);
    if (taskIds === undefined) {
      return;
    }
    for (const taskId of taskIds) {
      const labels = this.joins.byTaskId.get(taskId);
      labels?.delete(labelId);
      if (labels !== undefined && labels.size === 0) {
        this.joins.byTaskId.delete(taskId);
      }
    }
    this.joins.byLabelId.delete(labelId);
  }
}
