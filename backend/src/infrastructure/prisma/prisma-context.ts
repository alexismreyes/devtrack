import { AsyncLocalStorage } from "node:async_hooks";
import type { Prisma, PrismaClient } from "@prisma/client";

export type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const prismaStore = new AsyncLocalStorage<PrismaExecutor>();

export function currentPrisma(fallback: PrismaClient): PrismaExecutor {
  return prismaStore.getStore() ?? fallback;
}

export function runWithPrisma<T>(
  executor: PrismaExecutor,
  work: () => Promise<T>,
): Promise<T> {
  return prismaStore.run(executor, work);
}
