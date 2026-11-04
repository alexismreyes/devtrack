import type { TaskActivityEvent } from "../domain/task-activity";

export interface ActivityRepository {
  create(event: TaskActivityEvent): Promise<TaskActivityEvent>;
  listByTaskId(taskId: string): Promise<TaskActivityEvent[]>;
}
