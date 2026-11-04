import {
  sortActivityNewestFirst,
  type TaskActivityEvent,
} from "../domain/task-activity";
import type { ActivityRepository } from "../repository/activity-repository";

export class InMemoryActivityRepository implements ActivityRepository {
  readonly eventsById = new Map<string, TaskActivityEvent>();

  async create(event: TaskActivityEvent): Promise<TaskActivityEvent> {
    this.eventsById.set(event.id, event);
    return event;
  }

  async listByTaskId(taskId: string): Promise<TaskActivityEvent[]> {
    return sortActivityNewestFirst(
      [...this.eventsById.values()].filter((event) => event.taskId === taskId),
    );
  }
}
