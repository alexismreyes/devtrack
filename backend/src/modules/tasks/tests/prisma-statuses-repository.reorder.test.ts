import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ProjectStatus,
  SEEDED_STATUS_DEFINITIONS,
} from "../domain/project-status";
import { PrismaStatusesRepository } from "../repository/prisma-statuses-repository";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

type StatusRow = {
  id: string;
  projectId: string;
  key: string;
  name: string;
  nameKey: string;
  color: string;
  isSystem: boolean;
  isCompleted: boolean;
  position: number;
  createdAt: Date;
};

function seededRows(): StatusRow[] {
  return SEEDED_STATUS_DEFINITIONS.map((definition) => {
    const status = ProjectStatus.createSeeded(PROJECT_ID, definition);
    return {
      id: status.id,
      projectId: status.projectId,
      key: status.key,
      name: status.name,
      nameKey: status.nameKey,
      color: status.color,
      isSystem: status.isSystem,
      isCompleted: status.isCompleted,
      position: status.position,
      createdAt: status.createdAt,
    };
  });
}

function createFakePrisma(options?: {
  failOnFinalPosition?: number;
}): {
  prisma: PrismaClient;
  positions: () => Map<string, number>;
  transactionCalls: () => number;
} {
  const rows = seededRows();
  const committed = new Map(rows.map((row) => [row.id, row.position]));
  let transactionCalls = 0;

  const listRows = () =>
    rows
      .slice()
      .sort(
        (a, b) =>
          (committed.get(a.id) ?? a.position) -
            (committed.get(b.id) ?? b.position) ||
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .map((row) => ({
        ...row,
        position: committed.get(row.id) ?? row.position,
      }));

  const rootUpdate = async () => {
    throw new Error("reorder writes must run inside $transaction");
  };

  const prisma = {
    projectStatus: {
      findMany: async () => listRows(),
      update: rootUpdate,
    },
    $transaction: async <T>(
      work: (tx: {
        projectStatus: {
          update: (args: {
            where: { id: string };
            data: { position: number };
          }) => Promise<unknown>;
        };
      }) => Promise<T>,
    ): Promise<T> => {
      transactionCalls += 1;
      const staged = new Map(committed);
      const tx = {
        projectStatus: {
          update: async (args: {
            where: { id: string };
            data: { position: number };
          }) => {
            if (
              options?.failOnFinalPosition !== undefined &&
              args.data.position === options.failOnFinalPosition
            ) {
              throw new Error("simulated mid-reorder failure");
            }
            staged.set(args.where.id, args.data.position);
            return {};
          },
        },
      };
      try {
        const result = await work(tx);
        for (const [id, position] of staged) {
          committed.set(id, position);
        }
        return result;
      } catch (err) {
        // Fail closed: discard staged writes (transaction rollback).
        throw err;
      }
    },
  } as unknown as PrismaClient;

  return {
    prisma,
    positions: () => new Map(committed),
    transactionCalls: () => transactionCalls,
  };
}

describe("PrismaStatusesRepository.reorder atomicity", () => {
  it("runs two-phase position writes inside a single $transaction", async () => {
    const fake = createFakePrisma();
    const repo = new PrismaStatusesRepository(fake.prisma);
    const listed = await repo.listByProjectId(PROJECT_ID);
    const orderedIds = [listed[2]!.id, listed[0]!.id, listed[1]!.id];

    const reordered = await repo.reorder(PROJECT_ID, orderedIds);

    expect(fake.transactionCalls()).toBe(1);
    expect(reordered.map((status) => status.id)).toEqual(orderedIds);
    expect(reordered.map((status) => status.position)).toEqual([0, 1, 2]);
    expect([...fake.positions().entries()].sort()).toEqual(
      orderedIds.map((id, index) => [id, index]).sort(),
    );
  });

  it("fails closed when a mid-reorder write errors (no mixed positions)", async () => {
    const fake = createFakePrisma({ failOnFinalPosition: 1 });
    const repo = new PrismaStatusesRepository(fake.prisma);
    const listed = await repo.listByProjectId(PROJECT_ID);
    const before = new Map(fake.positions());
    const orderedIds = [listed[2]!.id, listed[0]!.id, listed[1]!.id];

    await expect(repo.reorder(PROJECT_ID, orderedIds)).rejects.toThrow(
      /simulated mid-reorder failure/,
    );

    expect(fake.transactionCalls()).toBe(1);
    expect([...fake.positions().entries()].sort()).toEqual(
      [...before.entries()].sort(),
    );
  });
});
