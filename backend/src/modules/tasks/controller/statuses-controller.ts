import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import {
  toPublicProjectStatusDto,
  type CreateStatusRequestDto,
  type ReorderStatusesRequestDto,
  type StatusListResponseDto,
  type UpdateStatusRequestDto,
} from "../dto/status-dtos";
import type { StatusesService } from "../service/statuses-service";

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

function requireStatusId(req: Request): string {
  const statusId = req.params.statusId;
  if (typeof statusId !== "string") {
    throw validationError("Invalid status id");
  }
  return statusId;
}

export class StatusesController {
  constructor(private readonly service: StatusesService) {}

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const statuses = await this.service.listByProject(
      actorId,
      requireProjectId(req),
    );
    const body: StatusListResponseDto = {
      statuses: statuses.map(toPublicProjectStatusDto),
    };
    res.status(200).json(body);
  }

  async create(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as CreateStatusRequestDto;
    const status = await this.service.create(
      actorId,
      requireProjectId(req),
      body,
    );
    res.status(201).json(toPublicProjectStatusDto(status));
  }

  async update(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as UpdateStatusRequestDto;
    const status = await this.service.update(
      actorId,
      requireProjectId(req),
      requireStatusId(req),
      body,
    );
    res.status(200).json(toPublicProjectStatusDto(status));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.delete(
      actorId,
      requireProjectId(req),
      requireStatusId(req),
    );
    res.status(204).send();
  }

  async reorder(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as ReorderStatusesRequestDto;
    const statuses = await this.service.reorder(
      actorId,
      requireProjectId(req),
      body.statusIds,
    );
    const response: StatusListResponseDto = {
      statuses: statuses.map(toPublicProjectStatusDto),
    };
    res.status(200).json(response);
  }
}
