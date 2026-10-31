import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";

export function validateMemberItemParams(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const projectId = z.uuid().safeParse(req.params.projectId);
  if (!projectId.success) {
    next(validationError("Invalid project id"));
    return;
  }
  const userId = z.uuid().safeParse(req.params.userId);
  if (!userId.success) {
    next(validationError("Invalid user id"));
    return;
  }
  next();
}
