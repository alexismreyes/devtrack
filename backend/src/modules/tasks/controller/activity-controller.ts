import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import {
  toPublicActivityDto,
  type ActivityListResponseDto,
} from "../dto/activity-dtos";
import type { ActivityService } from "../service/activity-service";
import { readFeedPaginationQuery } from "../validators/feed-pagination-query";

function requireActorId(req: Request): string {
  const actorId = req.actor?.userId;
  if (actorId === undefined) {
    throw unauthenticated();
  }
  return actorId;
}

function requireTaskId(req: Request): string {
  const taskId = req.params.taskId;
  if (typeof taskId !== "string") {
    throw validationError("Invalid task id");
  }
  return taskId;
}

export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const query = readFeedPaginationQuery(req);
    const page = await this.service.listByTask(actorId, requireTaskId(req), {
      cursor: query.cursor,
      limit: query.limit,
    });
    const body: ActivityListResponseDto = {
      activity: page.activity.map(toPublicActivityDto),
      nextCursor: page.nextCursor,
    };
    res.status(200).json(body);
  }
}
