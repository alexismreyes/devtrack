import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  AppError,
  ERROR_CODES,
  errorEnvelope,
} from "./app-error";

function sendError(
  res: Response,
  status: number,
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  message: string,
): void {
  res.status(status).json(errorEnvelope(code, message));
}

function isExpressBodySyntaxError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    typeof err === "object" &&
    err !== null &&
    "body" in err
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.status, err.code, err.message);
    return;
  }

  if (err instanceof Error && err.name === "DatabaseUnavailableError") {
    sendError(
      res,
      503,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      "Database is unavailable",
    );
    return;
  }

  if (err instanceof ZodError || isExpressBodySyntaxError(err)) {
    sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, "Invalid request body");
    return;
  }

  sendError(
    res,
    500,
    ERROR_CODES.INTERNAL_ERROR,
    "An unexpected error occurred",
  );
}
