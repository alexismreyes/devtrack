import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import {
  toPublicLabelDto,
  type CreateLabelRequestDto,
  type LabelListResponseDto,
  type ReplaceTaskLabelsRequestDto,
  type TaskLabelsResponseDto,
  type UpdateLabelRequestDto,
} from "../dto/label-dtos";
import type { LabelsService } from "../service/labels-service";

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

function requireLabelId(req: Request): string {
  const labelId = req.params.labelId;
  if (typeof labelId !== "string") {
    throw validationError("Invalid label id");
  }
  return labelId;
}

function requireTaskId(req: Request): string {
  const taskId = req.params.taskId;
  if (typeof taskId !== "string") {
    throw validationError("Invalid task id");
  }
  return taskId;
}

export class LabelsController {
  constructor(private readonly service: LabelsService) {}

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const labels = await this.service.listByProject(
      actorId,
      requireProjectId(req),
    );
    const body: LabelListResponseDto = {
      labels: labels.map(toPublicLabelDto),
    };
    res.status(200).json(body);
  }

  async create(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as CreateLabelRequestDto;
    const label = await this.service.create(
      actorId,
      requireProjectId(req),
      body,
    );
    res.status(201).json(toPublicLabelDto(label));
  }

  async update(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as UpdateLabelRequestDto;
    const label = await this.service.update(
      actorId,
      requireProjectId(req),
      requireLabelId(req),
      body,
    );
    res.status(200).json(toPublicLabelDto(label));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    await this.service.delete(
      actorId,
      requireProjectId(req),
      requireLabelId(req),
    );
    res.status(204).send();
  }

  async replaceTaskLabels(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const body = req.body as ReplaceTaskLabelsRequestDto;
    const labels = await this.service.replaceTaskLabels(
      actorId,
      requireTaskId(req),
      body.labelIds,
    );
    const response: TaskLabelsResponseDto = {
      labels: labels.map(toPublicLabelDto),
    };
    res.status(200).json(response);
  }
}
