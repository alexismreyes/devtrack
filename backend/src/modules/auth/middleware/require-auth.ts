import "cookie-parser";
import type { RequestHandler } from "express";
import { asyncHandler } from "../../../infrastructure/http/async-handler";
import { SESSION_COOKIE_NAME } from "../http/session-cookie";
import type { AuthService } from "../service/auth-service";

declare module "express-serve-static-core" {
  interface Request {
    actor?: {
      userId: string;
      sessionId: string;
    };
  }
}

export function createRequireAuth(authService: AuthService): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const rawCookie = req.cookies?.[SESSION_COOKIE_NAME];
    const sessionId = typeof rawCookie === "string" ? rawCookie : undefined;
    req.actor = await authService.authenticate(sessionId);
    next();
  });
}
