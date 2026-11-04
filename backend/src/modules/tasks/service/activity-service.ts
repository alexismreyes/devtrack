import type { TaskAuthorizationPort } from "../../project-members/access/task-authorization-port";
import type { UsersIdentityPort } from "../../users/identity/users-identity-port";
import { TaskNotFoundError } from "../domain/errors";
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

export class ActivityService {
  constructor(
    private readonly activity: ActivityRepository,
    private readonly tasks: TasksRepository,
    private readonly authorization: TaskAuthorizationPort,
    private readonly identities: UsersIdentityPort,
  ) {}

  async listByTask(actorId: string, taskId: string): Promise<ActivityView[]> {
    const task = await this.requireLiveTask(taskId);
    await this.authorization.requireTaskRead(actorId, task.projectId);
    const events = await this.activity.listByTaskId(task.id);
    const views: ActivityView[] = [];
    for (const event of events) {
      views.push(await this.toView(event));
    }
    return views;
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
