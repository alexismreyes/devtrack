import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import type { ReplaceTaskLabelsRequestDto } from "../dto/label-dtos";

export const replaceTaskLabelsBodySchema = z
  .object({
    labelIds: z.array(z.uuid()),
  })
  .strict()
  .transform(
    (data): ReplaceTaskLabelsRequestDto => ({
      labelIds: data.labelIds,
    }),
  );

export function validateReplaceTaskLabelsBody(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = replaceTaskLabelsBodySchema.safeParse(req.body);
  if (!result.success) {
    next(validationError("Invalid request body"));
    return;
  }
  req.body = result.data;
  next();
}
