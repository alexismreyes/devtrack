import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../../../infrastructure/http/app-error";
import { MAX_FEED_LIMIT } from "../domain/feed-cursor";

export const feedPaginationQuerySchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_FEED_LIMIT).optional(),
  })
  .strict();

export type FeedPaginationQueryDto = z.infer<typeof feedPaginationQuerySchema>;

export function validateFeedPaginationQuery(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const result = feedPaginationQuerySchema.safeParse(req.query);
  if (!result.success) {
    next(validationError("Invalid request query"));
    return;
  }
  next();
}

export function readFeedPaginationQuery(req: Request): FeedPaginationQueryDto {
  return feedPaginationQuerySchema.parse(req.query);
}
