import type { Request, Response } from "express";
import {
  unauthenticated,
  validationError,
} from "../../../infrastructure/http/app-error";
import {
  toPublicMemberDto,
  type AddMemberRequestDto,
  type MemberListResponseDto,
  type UpdateMemberRequestDto,
} from "../dto/member-dtos";
import type { ProjectMembersService } from "../service/project-members-service";

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

function requireUserId(req: Request): string {
  const userId = req.params.userId;
  if (typeof userId !== "string") {
    throw validationError("Invalid user id");
  }
  return userId;
}

export class ProjectMembersController {
  constructor(private readonly service: ProjectMembersService) {}

  async list(req: Request, res: Response): Promise<void> {
    const members = await this.service.listByProject(
      requireActorId(req),
      requireProjectId(req),
    );
    const body: MemberListResponseDto = {
      members: members.map(toPublicMemberDto),
    };
    res.status(200).json(body);
  }

  async add(req: Request, res: Response): Promise<void> {
    const body = req.body as AddMemberRequestDto;
    const member = await this.service.addByEmail(
      requireActorId(req),
      requireProjectId(req),
      body.email,
      body.role,
    );
    res.status(201).json(toPublicMemberDto(member));
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    const body = req.body as UpdateMemberRequestDto;
    const member = await this.service.changeRole(
      requireActorId(req),
      requireProjectId(req),
      requireUserId(req),
      body.role,
    );
    res.status(200).json(toPublicMemberDto(member));
  }

  async remove(req: Request, res: Response): Promise<void> {
    await this.service.remove(
      requireActorId(req),
      requireProjectId(req),
      requireUserId(req),
    );
    res.status(204).send();
  }
}
