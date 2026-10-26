import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { DatabaseUnavailableError } from "../domain/errors";
import { SystemProbe } from "../domain/system-probe";
import type { SystemRepository } from "./system-repository";

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

function rethrowMapped(err: unknown): never {
  if (err instanceof DatabaseUnavailableError) {
    throw err;
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

export class PrismaSystemRepository implements SystemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createProbe(): Promise<SystemProbe> {
    const probe = SystemProbe.record();
    try {
      const row = await this.prisma.systemProbe.create({
        data: {
          id: probe.id,
          recordedAt: probe.recordedAt,
        },
      });
      return SystemProbe.rehydrate(row.id, row.recordedAt);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listProbes(): Promise<SystemProbe[]> {
    try {
      const rows = await this.prisma.systemProbe.findMany({
        orderBy: { recordedAt: "desc" },
      });
      return rows.map((row) => SystemProbe.rehydrate(row.id, row.recordedAt));
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
