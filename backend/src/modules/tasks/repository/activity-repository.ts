import type { FeedCursor } from "../domain/feed-cursor";
import type { TaskActivityEvent } from "../domain/task-activity";

export type ListActivityPageInput = {
  taskId: string;
  limit: number;
  cursor: FeedCursor | null;
};

export type ActivityPageResult = {
  items: TaskActivityEvent[];
  nextCursor: FeedCursor | null;
};

export interface ActivityRepository {
  create(event: TaskActivityEvent): Promise<TaskActivityEvent>;
  listPage(input: ListActivityPageInput): Promise<ActivityPageResult>;
}
