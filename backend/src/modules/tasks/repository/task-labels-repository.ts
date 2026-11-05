import type { ProjectLabel } from "../domain/project-label";

export type TaskLabelJoinStore = {
  byTaskId: Map<string, Set<string>>;
  byLabelId: Map<string, Set<string>>;
};

export function createTaskLabelJoinStore(): TaskLabelJoinStore {
  return {
    byTaskId: new Map(),
    byLabelId: new Map(),
  };
}

export interface TaskLabelsRepository {
  replaceSetForTask(taskId: string, labelIds: string[]): Promise<void>;
  listForTaskIds(taskIds: string[]): Promise<Map<string, ProjectLabel[]>>;
  deleteByLabelId(labelId: string): Promise<void>;
}
