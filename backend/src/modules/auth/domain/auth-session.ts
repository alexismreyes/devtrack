import { randomUUID } from "node:crypto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const SESSION_ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthSession {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;

  private constructor(
    id: string,
    userId: string,
    createdAt: Date,
    expiresAt: Date,
    revokedAt: Date | null,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Session id must be a UUID");
    }
    if (!UUID_PATTERN.test(userId)) {
      throw new Error("Session user id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Session created time must be a valid date");
    }
    if (Number.isNaN(expiresAt.getTime())) {
      throw new Error("Session expiry must be a valid date");
    }
    if (revokedAt !== null && Number.isNaN(revokedAt.getTime())) {
      throw new Error("Session revocation time must be a valid date");
    }

    this.id = id;
    this.userId = userId;
    this.createdAt = new Date(createdAt.getTime());
    this.expiresAt = new Date(expiresAt.getTime());
    this.revokedAt =
      revokedAt === null ? null : new Date(revokedAt.getTime());
    Object.freeze(this);
  }

  static issue(userId: string, now: Date = new Date()): AuthSession {
    const createdAt = new Date(now.getTime());
    const expiresAt = new Date(createdAt.getTime() + SESSION_ABSOLUTE_TTL_MS);
    return new AuthSession(randomUUID(), userId, createdAt, expiresAt, null);
  }

  static rehydrate(
    id: string,
    userId: string,
    createdAt: Date,
    expiresAt: Date,
    revokedAt: Date | null,
  ): AuthSession {
    return new AuthSession(id, userId, createdAt, expiresAt, revokedAt);
  }

  isValid(now: Date = new Date()): boolean {
    if (this.revokedAt !== null) {
      return false;
    }
    return now.getTime() < this.expiresAt.getTime();
  }

  revoke(now: Date = new Date()): AuthSession {
    if (this.revokedAt !== null) {
      return this;
    }
    return new AuthSession(
      this.id,
      this.userId,
      this.createdAt,
      this.expiresAt,
      now,
    );
  }
}
