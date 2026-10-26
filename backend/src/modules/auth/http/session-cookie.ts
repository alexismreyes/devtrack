import type { CookieOptions, Response } from "express";
import { SESSION_ABSOLUTE_TTL_MS } from "../domain/auth-session";

export const SESSION_COOKIE_NAME = "devtrack_session";

const SESSION_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  maxAge: SESSION_ABSOLUTE_TTL_MS,
};

export function issueSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS);
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  });
}
