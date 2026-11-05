import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  AppError,
  ERROR_CODES,
  conflict,
  errorEnvelope,
  forbidden,
  invalidCredentials,
  notFound,
  unauthenticated,
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

  if (err instanceof Error) {
    switch (err.name) {
      case "DuplicateEmailError":
      case "DuplicateMembershipError":
      case "DuplicateLabelNameError":
      case "OwnerMembershipConflictError": {
        const mapped = conflict(err.message);
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "InvalidCredentialsError": {
        const mapped = invalidCredentials();
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "UnauthenticatedError":
      case "SessionNotFoundError":
      case "UserNotFoundError": {
        const mapped = unauthenticated();
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "ProfileForbiddenError":
      case "ProjectForbiddenError":
      case "MembershipForbiddenError":
      case "CommentForbiddenError": {
        const mapped = forbidden(err.message);
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "ProjectNotFoundError":
      case "MembershipProjectNotFoundError":
      case "MemberUserNotFoundError":
      case "MembershipNotFoundError":
      case "CommentNotFoundError":
      case "LabelNotFoundError": {
        const mapped = notFound(err.message);
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "ProjectArchivedError": {
        const mapped = conflict(err.message);
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "TaskNotFoundError": {
        const mapped = notFound(err.message);
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "TaskParentArchivedError": {
        const mapped = conflict(err.message);
        sendError(res, mapped.status, mapped.code, mapped.message);
        return;
      }
      case "InvalidUserEmailError":
      case "InvalidDisplayNameError":
      case "InvalidPasswordError":
      case "InvalidProjectNameError":
      case "InvalidTaskTitleError":
      case "InvalidTaskStatusError":
      case "InvalidTaskPriorityError":
      case "InvalidTaskDueDateError":
      case "InvalidCommentBodyError":
      case "InvalidLabelNameError":
      case "InvalidLabelColorError":
      case "InvalidProjectMemberRoleError":
        sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, err.message);
        return;
      case "DatabaseUnavailableError":
        sendError(
          res,
          503,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          "Database is unavailable",
        );
        return;
      default:
        break;
    }
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
