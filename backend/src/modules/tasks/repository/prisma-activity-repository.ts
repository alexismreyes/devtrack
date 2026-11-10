import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { currentPrisma } from "../../../infrastructure/prisma/prisma-context";
import { DatabaseUnavailableError } from "../domain/errors";
import { TaskActivityEvent } from "../domain/task-activity";
import type {
  ActivityPageResult,
  ActivityRepository,
  ListActivityPageInput,
} from "./activity-repository";

const ACTIVITY_SELECT = {
  id: true,
  taskId: true,
  actorUserId: true,
  kind: true,
  payload: true,
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
  if (err instanceof PrismaNamespace.PrismaClientInitializationError) {
    return true;
  }
  if (
    err instanceof PrismaNamespace.PrismaClientKnownRequestError &&
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

function toEvent(row: {
  id: string;
  taskId: string;
  actorUserId: string;
  kind: string;
  payload: Prisma.JsonValue;
  createdAt: Date;
}): TaskActivityEvent {
  return TaskActivityEvent.rehydrate(
    row.id,
    row.taskId,
    row.actorUserId,
    row.kind,
    row.payload,
    row.createdAt,
  );
}

export class PrismaActivityRepository implements ActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private client() {
    return currentPrisma(this.prisma);
  }

  async create(event: TaskActivityEvent): Promise<TaskActivityEvent> {
    try {
      const row = await this.client().taskActivityEvent.create({
        data: {
          id: event.id,
          taskId: event.taskId,
          actorUserId: event.actorUserId,
          kind: event.kind,
          payload: event.payload as Prisma.InputJsonValue,
          createdAt: event.createdAt,
        },
        select: ACTIVITY_SELECT,
      });
      return toEvent(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listPage(input: ListActivityPageInput): Promise<ActivityPageResult> {
    try {
      const rows = await this.client().taskActivityEvent.findMany({
        where: {
          taskId: input.taskId,
          ...(input.cursor === null
            ? {}
            : {
                OR: [
                  { createdAt: { lt: input.cursor.createdAt } },
                  {
                    createdAt: input.cursor.createdAt,
                    id: { lt: input.cursor.id },
                  },
                ],
              }),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        select: ACTIVITY_SELECT,
      });
      const hasMore = rows.length > input.limit;
      const pageRows = hasMore ? rows.slice(0, input.limit) : rows;
      const items = pageRows.map(toEvent);
      const last = items[items.length - 1];
      return {
        items,
        nextCursor:
          hasMore && last !== undefined
            ? { createdAt: last.createdAt, id: last.id }
            : null,
      };
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
