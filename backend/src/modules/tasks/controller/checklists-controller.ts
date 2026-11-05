import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import {
  toPublicChecklistDto,
  toPublicChecklistItemDto,
  type ChecklistListResponseDto,
  type CreateChecklistItemRequestDto,
  type CreateChecklistRequestDto,
  type UpdateChecklistItemRequestDto,
  type UpdateChecklistRequestDto,
} from "../dto/checklist-dtos";
import type { ChecklistsService } from "../service/checklists-service";

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

function requireChecklistId(req: Request): string {
  const checklistId = req.params.checklistId;
  if (typeof checklistId !== "string") {
    throw validationError("Invalid checklist id");
  }
  return checklistId;
}

function requireItemId(req: Request): string {
  const itemId = req.params.itemId;
  if (typeof itemId !== "string") {
    throw validationError("Invalid checklist item id");
  }
  return itemId;
}

export class ChecklistsController {
  constructor(private readonly service: ChecklistsService) {}

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const checklists = await this.service.listByTask(
      actorId,
      requireTaskId(req),
    );
    const body: ChecklistListResponseDto = {
      checklists: checklists.map(toPublicChecklistDto),
    };
    res.status(200).json(body);
  }

  async create(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as CreateChecklistRequestDto;
    const checklist = await this.service.create(
      actorId,
      requireTaskId(req),
      body.name,
    );
    res.status(201).json(toPublicChecklistDto(checklist));
  }

  async update(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as UpdateChecklistRequestDto;
    const checklist = await this.service.updateName(
      actorId,
      requireTaskId(req),
      requireChecklistId(req),
      body.name,
    );
    res.status(200).json(toPublicChecklistDto(checklist));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.delete(
      actorId,
      requireTaskId(req),
      requireChecklistId(req),
    );
    res.status(204).send();
  }

  async createItem(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as CreateChecklistItemRequestDto;
    const item = await this.service.createItem(
      actorId,
      requireTaskId(req),
      requireChecklistId(req),
      body.text,
    );
    res.status(201).json(toPublicChecklistItemDto(item));
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as UpdateChecklistItemRequestDto;
    const item = await this.service.updateItem(
      actorId,
      requireTaskId(req),
      requireChecklistId(req),
      requireItemId(req),
      body,
    );
    res.status(200).json(toPublicChecklistItemDto(item));
  }

  async deleteItem(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.deleteItem(
      actorId,
      requireTaskId(req),
      requireChecklistId(req),
      requireItemId(req),
    );
    res.status(204).send();
  }
}
