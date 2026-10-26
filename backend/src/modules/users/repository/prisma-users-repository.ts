import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { canonicalizeEmail } from "../domain/email";
import {
  DatabaseUnavailableError,
  DuplicateEmailError,
  UserNotFoundError,
} from "../domain/errors";
import { User } from "../domain/user";
import type { CreateUserInput, UsersRepository } from "./users-repository";

const USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  createdAt: true,
} as const;

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
    err instanceof UserNotFoundError
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

function toUser(row: {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}): User {
  return User.rehydrate(row.id, row.email, row.displayName, row.createdAt);
}

export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateUserInput): Promise<User> {
    const user = User.register(input.email, input.displayName);
    try {
      const row = await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          createdAt: user.createdAt,
        },
        select: USER_SELECT,
      });
      return toUser(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const row = await this.prisma.user.findUnique({
        where: { id },
        select: USER_SELECT,
      });
      return row === null ? null : toUser(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const canonical = canonicalizeEmail(email);
    try {
      const row = await this.prisma.user.findUnique({
        where: { email: canonical },
        select: USER_SELECT,
      });
      return row === null ? null : toUser(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async updateDisplayName(id: string, displayName: string): Promise<User> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new UserNotFoundError();
    }
    const updated = existing.withDisplayName(displayName);
    try {
      const row = await this.prisma.user.update({
        where: { id },
        data: { displayName: updated.displayName },
        select: USER_SELECT,
      });
      return toUser(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
