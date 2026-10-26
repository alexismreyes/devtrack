import type { Request, Response } from "express";
import { toPublicUserDto } from "../../users/dto/user-dtos";
import {
  clearSessionCookie,
  issueSessionCookie,
} from "../http/session-cookie";
import type { AuthService } from "../service/auth-service";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async register(req: Request, res: Response): Promise<void> {
    const result = await this.service.register({
      email: req.body.email,
      password: req.body.password,
      displayName: req.body.displayName,
    });
    issueSessionCookie(res, result.session.id);
    res.status(201).json(toPublicUserDto(result.user));
  }

  async login(req: Request, res: Response): Promise<void> {
    const result = await this.service.login({
      email: req.body.email,
      password: req.body.password,
    });
    issueSessionCookie(res, result.session.id);
    res.status(200).json(toPublicUserDto(result.user));
  }

  async logout(req: Request, res: Response): Promise<void> {
    const sessionId = req.actor?.sessionId;
    if (sessionId !== undefined) {
      await this.service.logout(sessionId);
    }
    clearSessionCookie(res);
    res.status(204).end();
  }
}
