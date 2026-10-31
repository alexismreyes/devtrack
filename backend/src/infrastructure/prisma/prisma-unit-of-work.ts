import type { PrismaClient } from "@prisma/client";
import type { UnitOfWork } from "../../modules/projects/access/unit-of-work";
import { runWithPrisma } from "./prisma-context";

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => runWithPrisma(tx, work));
  }
}
