import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UsersIdentityPort } from "../../users/identity/users-identity-port";
import { validationError } from "../../../infrastructure/http/app-error";
import { TaskNotFoundError } from "../domain/errors";
import {
  DEFAULT_FEED_LIMIT,
  MAX_FEED_LIMIT,
  decodeFeedCursor,
  encodeFeedCursor,
} from "../domain/feed-cursor";
import type {
  TaskActivityEvent,
  TaskActivityKind,
  TaskActivityPayload,
} from "../domain/task-activity";
import type { ActivityRepository } from "../repository/activity-repository";
import type { TasksRepository } from "../repository/tasks-repository";

export type ActivityView = {
  id: string;
  taskId: string;
  kind: TaskActivityKind;
  actorUserId: string;
  actorDisplayName: string;
  createdAt: Date;
  payload: TaskActivityPayload;
};

export type ActivityListPage = {
  activity: ActivityView[];
  nextCursor: string | null;
};

export type ListActivityOptions = {
  cursor?: string;
  limit?: number;
};

export class ActivityService {
  constructor(
    private readonly activity: ActivityRepository,
    private readonly tasks: TasksRepository,
    private readonly authorization: TaskAuthorizationPort,
    private readonly identities: UsersIdentityPort,
  ) {}

  async listByTask(
    actorId: string,
    taskId: string,
    options: ListActivityOptions = {},
  ): Promise<ActivityListPage> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const limit = normalizeFeedLimit(options.limit);
    const cursor =
      options.cursor === undefined ? null : parseFeedCursor(options.cursor);
    const page = await this.activity.listPage({
      taskId: task.id,
      limit,
      cursor,
    });
    const views: ActivityView[] = [];
    for (const event of page.items) {
      views.push(await this.toView(event));
    }
    return {
      activity: views,
      nextCursor:
        page.nextCursor === null ? null : encodeFeedCursor(page.nextCursor),
    };
  }

  private async requireLiveTask(taskId: string) {
    const task = await this.tasks.findById(taskId);
    if (task === null || task.deletedAt !== null) {
      throw new TaskNotFoundError();
    }
    return task;
  }

  private async toView(event: TaskActivityEvent): Promise<ActivityView> {
    const identity = await this.identities.findById(event.actorUserId);
    return {
      id: event.id,
      taskId: event.taskId,
      kind: event.kind,
      actorUserId: event.actorUserId,
      actorDisplayName: identity?.displayName ?? "Unknown",
      createdAt: event.createdAt,
      payload: event.payload,
    };
  }
}

function normalizeFeedLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_FEED_LIMIT;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_FEED_LIMIT) {
    throw validationError("Invalid request query");
  }
  return limit;
}

function parseFeedCursor(token: string) {
  try {
    return decodeFeedCursor(token);
  } catch {
    throw validationError("Invalid request query");
  }
}
