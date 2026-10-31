import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import {
  toPublicProjectDto,
  type ProjectListResponseDto,
} from "../dto/project-dtos";
import type { ProjectsService } from "../service/projects-service";

function requireActorId(req: Request): string {
  const actorId = req.actor?.userId;
  if (actorId === undefined) {
    throw unauthenticated();
  }
  return actorId;
}

function requireProjectId(req: Request): string {
  const projectId = req.params.id;
  if (typeof projectId !== "string") {
    throw validationError("Invalid project id");
  }
  return projectId;
}

export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  async create(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const project = await this.service.create(
      actorId,
      req.body.name,
      req.body.description,
    );
    res.status(201).json(toPublicProjectDto(project));
  }

  async list(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const projects = await this.service.listAuthorized(actorId);
    const body: ProjectListResponseDto = {
      projects: projects.map(toPublicProjectDto),
    };
    res.status(200).json(body);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const project = await this.service.getById(actorId, requireProjectId(req));
    res.status(200).json(toPublicProjectDto(project));
  }

  async update(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const project = await this.service.update(
      actorId,
      requireProjectId(req),
      req.body,
    );
    res.status(200).json(toPublicProjectDto(project));
  }

  async archive(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const project = await this.service.archive(actorId, requireProjectId(req));
    res.status(200).json(toPublicProjectDto(project));
  }

  async unarchive(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const project = await this.service.unarchive(actorId, requireProjectId(req));
    res.status(200).json(toPublicProjectDto(project));
  }
}
