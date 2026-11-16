import { takeNewestPage } from "../domain/feed-cursor";
import type { TaskActivityEvent } from "../domain/task-activity";
import type {
  ActivityPageResult,
  ActivityRepository,
  ListActivityPageInput,
} from "../repository/activity-repository";

export class InMemoryActivityRepository implements ActivityRepository {
  readonly eventsById = new Map<string, TaskActivityEvent>();

  async create(event: TaskActivityEvent): Promise<TaskActivityEvent> {
    this.eventsById.set(event.id, event);
    return event;
  }

  async listPage(input: ListActivityPageInput): Promise<ActivityPageResult> {
    const events = [...this.eventsById.values()].filter(
      (event) => event.taskId === input.taskId,
    );
    return takeNewestPage(events, input.limit, input.cursor);
  }
}
