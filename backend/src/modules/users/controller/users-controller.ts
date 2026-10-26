import type { Request, Response } from "express";
import { unauthenticated } from "../../../infrastructure/http/app-error";
import { toPublicUserDto } from "../dto/user-dtos";
import type { UsersService } from "../service/users-service";

function requireActorId(req: Request): string {
  const actorId = req.actor?.userId;
  if (actorId === undefined) {
    throw unauthenticated();
  }
  return actorId;
}

export class UsersController {
  constructor(private readonly service: UsersService) {}

  async getMe(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const user = await this.service.getProfile(actorId, actorId);
    res.status(200).json(toPublicUserDto(user));
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    const actorId = requireActorId(req);
    const user = await this.service.updateDisplayName(
      actorId,
      actorId,
      req.body.displayName,
    );
    res.status(200).json(toPublicUserDto(user));
  }
}
