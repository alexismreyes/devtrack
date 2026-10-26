import { DuplicateEmailError, InvalidUserEmailError } from "./errors";
import type { User } from "./user";

export function canonicalizeEmail(email: string): string {
  const canonical = email.trim().toLowerCase();
  if (canonical === "") {
    throw new InvalidUserEmailError();
  }
  return canonical;
}

export function ensureEmailAvailable(existing: User | null): void {
  if (existing !== null) {
    throw new DuplicateEmailError();
  }
}
