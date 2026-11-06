import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { ReorderStatusesRequestDto } from "../dto/status-dtos";

export const reorderStatusesBodySchema = z
  .object({
    statusIds: z.array(z.uuid()).min(1),
  })
  .strict()
  .transform(
    (data): ReorderStatusesRequestDto => ({
      statusIds: data.statusIds,
    }),
  );

export function validateReorderStatusesBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = reorderStatusesBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
