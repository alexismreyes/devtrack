import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import { toDashboardSummaryDto } from "../dto/dashboard-dtos";
import {
  toPublicTaskDto,
  type CreateTaskRequestDto,
  type ListTasksQueryDto,
  type TaskListResponseDto,
  type UpdateTaskRequestDto,
} from "../dto/task-dtos";
import type { TasksService } from "../service/tasks-service";

function requireActorId(req: Request): string {
  const actorId = req.actor?.userId;
  if (actorId === undefined) {
    throw unauthenticated();
  }
  return actorId;
}

function requireProjectId(req: Request): string {
  const projectId = req.params.projectId;
  if (typeof projectId !== "string") {
    throw validationError("Invalid project id");
  }
  return projectId;
}

function requireTaskId(req: Request): string {
  const taskId = req.params.id;
  if (typeof taskId !== "string") {
    throw validationError("Invalid task id");
  }
  return taskId;
}

function listFilters(req: Request): ListTasksQueryDto {
  const query = req.query as ListTasksQueryDto;
  const filters: ListTasksQueryDto = {};
  if (query.status !== undefined) {
    filters.status = query.status;
  }
  if (query.priority !== undefined) {
    filters.priority = query.priority;
  }
  return filters;
}

export class TasksController {
  constructor(private readonly service: TasksService) {}

  async create(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as CreateTaskRequestDto;
    const task = await this.service.create(actorId, requireProjectId(req), {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate,
    });
    res.status(201).json(toPublicTaskDto(task));
  }

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const tasks = await this.service.listByProject(
      actorId,
      requireProjectId(req),
      listFilters(req),
    );
    const body: TaskListResponseDto = {
      tasks: tasks.map(toPublicTaskDto),
    };
    res.status(200).json(body);
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const summary = await this.service.getDashboard(actorId);
    res.status(200).json(toDashboardSummaryDto(summary));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const task = await this.service.getById(actorId, requireTaskId(req));
    res.status(200).json(toPublicTaskDto(task));
  }

  async update(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as UpdateTaskRequestDto;
    const task = await this.service.update(actorId, requireTaskId(req), body);
    res.status(200).json(toPublicTaskDto(task));
  }

  async softDelete(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.softDelete(actorId, requireTaskId(req));
    res.status(204).send();
  }
}
