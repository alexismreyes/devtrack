import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { Task } from "../domain/task";
import { PrismaTasksRepository } from "../repository/prisma-tasks-repository";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

type TaskRow = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  position: number;
  coverAttachmentId: string | null;
};

function seedRows(): TaskRow[] {
  const a = Task.create(
    PROJECT_ID,
    "A",
    null,
    "TODO",
    "MEDIUM",
    null,
    new Date("2026-01-01T00:00:00.000Z"),
    0,
  );
  const b = Task.create(
    PROJECT_ID,
    "B",
    null,
    "TODO",
    "MEDIUM",
    null,
    new Date("2026-01-02T00:00:00.000Z"),
    1,
  );
  const c = Task.create(
    PROJECT_ID,
    "C",
    null,
    "TODO",
    "MEDIUM",
    null,
    new Date("2026-01-03T00:00:00.000Z"),
    2,
  );
  return [a, b, c].map((task) => ({
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    deletedAt: task.deletedAt,
    position: task.position,
    coverAttachmentId: task.coverAttachmentId,
  }));
}

function createFakePrisma(options?: {
  failOnFinalPosition?: number;
}): {
  prisma: PrismaClient;
  positions: () => Map<string, number>;
  transactionCalls: () => number;
  rows: TaskRow[];
} {
  const rows = seedRows();
  const committed = new Map(rows.map((row) => [row.id, row.position]));
  let transactionCalls = 0;

  const listLive = () =>
    rows
      .filter((row) => row.deletedAt === null)
      .slice()
      .sort(
        (a, b) =>
          (committed.get(a.id) ?? a.position) -
            (committed.get(b.id) ?? b.position) || a.id.localeCompare(b.id),
      )
      .map((row) => ({
        ...row,
        position: committed.get(row.id) ?? row.position,
      }));

  const rootUpdate = async () => {
    throw new Error("reorder writes must run inside $transaction");
  };

  const prisma = {
    task: {
      findMany: async () => listLive(),
      update: rootUpdate,
    },
    $transaction: async <T>(
      work: (tx: {
        task: {
          findMany: () => Promise<TaskRow[]>;
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
        task: {
          findMany: async () =>
            rows
              .filter((row) => row.deletedAt === null)
              .slice()
              .sort(
                (a, b) =>
                  (staged.get(a.id) ?? a.position) -
                    (staged.get(b.id) ?? b.position) ||
                  a.id.localeCompare(b.id),
              )
              .map((row) => ({
                ...row,
                position: staged.get(row.id) ?? row.position,
              })),
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
        throw err;
      }
    },
  } as unknown as PrismaClient;

  return {
    prisma,
    positions: () => new Map(committed),
    transactionCalls: () => transactionCalls,
    rows,
  };
}

describe("PrismaTasksRepository.reorderInStatus atomicity", () => {
  it("runs two-phase position writes inside a single $transaction", async () => {
    const fake = createFakePrisma();
    const repo = new PrismaTasksRepository(fake.prisma);
    const orderedIds = [fake.rows[2]!.id, fake.rows[0]!.id, fake.rows[1]!.id];

    const reordered = await repo.reorderInStatus(
      PROJECT_ID,
      "TODO",
      orderedIds,
    );

    expect(fake.transactionCalls()).toBe(1);
    expect(reordered.map((task) => task.id)).toEqual(orderedIds);
    expect(reordered.map((task) => task.position)).toEqual([0, 1, 2]);
    expect([...fake.positions().entries()].sort()).toEqual(
      orderedIds.map((id, index) => [id, index]).sort(),
    );
  });

  it("fails closed when a mid-reorder write errors (no mixed positions)", async () => {
    const fake = createFakePrisma({ failOnFinalPosition: 1 });
    const repo = new PrismaTasksRepository(fake.prisma);
    const before = new Map(fake.positions());
    const orderedIds = [fake.rows[2]!.id, fake.rows[0]!.id, fake.rows[1]!.id];

    await expect(
      repo.reorderInStatus(PROJECT_ID, "TODO", orderedIds),
    ).rejects.toThrow(/simulated mid-reorder failure/);

    expect(fake.transactionCalls()).toBe(1);
    expect([...fake.positions().entries()].sort()).toEqual(
      [...before.entries()].sort(),
    );
  });
});
