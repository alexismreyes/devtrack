import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { AuthSession } from "../domain/auth-session";
import {
  DatabaseUnavailableError,
  SessionNotFoundError,
} from "../domain/errors";
import { DuplicateEmailError } from "../../users/domain/errors";
import { User } from "../../users/domain/user";
import type {
  AuthRepository,
  RegisterPersistenceInput,
  RegisteredAuthRecord,
} from "./auth-repository";

const CONNECTION_CODES = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1009",
  "P1010",
  "P1011",
  "P1017",
  "P2024",
]);

function isConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_CODES.has(err.code)
  ) {
    return true;
  }
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (
      CONNECTION_CODES.has(code) ||
      code === "ECONNREFUSED" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND"
    ) {
      return true;
    }
  }
  return false;
}

function isEmailUniqueViolation(err: unknown): boolean {
  if (
    !(err instanceof Prisma.PrismaClientKnownRequestError) ||
    err.code !== "P2002"
  ) {
    return false;
  }
  const target = err.meta?.target;
  if (typeof target === "string") {
    return target.includes("email");
  }
  if (Array.isArray(target)) {
    return target.includes("email");
  }
  return false;
}

function rethrowMapped(err: unknown): never {
  if (
    err instanceof DatabaseUnavailableError ||
    err instanceof DuplicateEmailError ||
    err instanceof SessionNotFoundError
  ) {
    throw err;
  }
  if (isEmailUniqueViolation(err)) {
    throw new DuplicateEmailError();
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toSession(row: {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}): AuthSession {
  return AuthSession.rehydrate(
    row.id,
    row.userId,
    row.createdAt,
    row.expiresAt,
    row.revokedAt,
  );
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async savePasswordHash(userId: string, passwordHash: string): Promise<void> {
    try {
      await this.prisma.authPasswordCredential.create({
        data: {
          userId,
          passwordHash,
        },
      });
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findPasswordHashByUserId(userId: string): Promise<string | null> {
    try {
      const row = await this.prisma.authPasswordCredential.findUnique({
        where: { userId },
        select: { passwordHash: true },
      });
      return row === null ? null : row.passwordHash;
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async createSession(userId: string): Promise<AuthSession> {
    const session = AuthSession.issue(userId);
    try {
      const row = await this.prisma.authSession.create({
        data: {
          id: session.id,
          userId: session.userId,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          revokedAt: session.revokedAt,
        },
      });
      return toSession(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findSessionById(id: string): Promise<AuthSession | null> {
    try {
      const row = await this.prisma.authSession.findUnique({
        where: { id },
      });
      return row === null ? null : toSession(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async revokeSession(id: string): Promise<void> {
    try {
      const result = await this.prisma.authSession.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count === 0) {
        const existing = await this.prisma.authSession.findUnique({
          where: { id },
          select: { id: true },
        });
        if (existing === null) {
          throw new SessionNotFoundError();
        }
      }
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async createRegisteredUser(
    input: RegisterPersistenceInput,
  ): Promise<RegisteredAuthRecord> {
    const user = User.register(input.email, input.displayName);
    const session = AuthSession.issue(user.id);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            createdAt: user.createdAt,
          },
        });
        await tx.authPasswordCredential.create({
          data: {
            userId: user.id,
            passwordHash: input.passwordHash,
          },
        });
        await tx.authSession.create({
          data: {
            id: session.id,
            userId: session.userId,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            revokedAt: session.revokedAt,
          },
        });
      });
      return { user, session };
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
