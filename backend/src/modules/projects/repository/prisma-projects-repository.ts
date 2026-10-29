import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { DatabaseUnavailableError, ProjectNotFoundError } from "../domain/errors";
import { Project } from "../domain/project";
import type {
  CreateProjectInput,
  ProjectsRepository,
  UpdateProjectInput,
} from "./projects-repository";

const PROJECT_SELECT = {
  id: true,
  ownerUserId: true,
  name: true,
  description: true,
  createdAt: true,
  archivedAt: true,
} as const;
// Do not select or mutate Project.tasks; the tasks repository owns that relation.

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
  if (
    err instanceof DatabaseUnavailableError ||
    err instanceof ProjectNotFoundError
  ) {
    throw err;
  }
  if (isConnectionError(err)) {
    throw new DatabaseUnavailableError();
  }
  throw err;
}

function toProject(row: {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
}): Project {
  return Project.rehydrate(
    row.id,
    row.ownerUserId,
    row.name,
    row.description,
    row.createdAt,
    row.archivedAt,
  );
}

export class PrismaProjectsRepository implements ProjectsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const project = Project.create(
      input.ownerUserId,
      input.name,
      input.description,
    );
    try {
      const row = await this.prisma.project.create({
        data: {
          id: project.id,
          ownerUserId: project.ownerUserId,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          archivedAt: project.archivedAt,
        },
        select: PROJECT_SELECT,
      });
      return toProject(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async findById(id: string): Promise<Project | null> {
    try {
      const row = await this.prisma.project.findUnique({
        where: { id },
        select: PROJECT_SELECT,
      });
      return row === null ? null : toProject(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async listByOwnerId(ownerUserId: string): Promise<Project[]> {
    try {
      const rows = await this.prisma.project.findMany({
        where: { ownerUserId, archivedAt: null },
        orderBy: { createdAt: "desc" },
        select: PROJECT_SELECT,
      });
      return rows.map(toProject);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new ProjectNotFoundError();
    }
    const updated = existing.withDetails(input);
    try {
      const row = await this.prisma.project.update({
        where: { id },
        data: {
          name: updated.name,
          description: updated.description,
        },
        select: PROJECT_SELECT,
      });
      return toProject(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async archive(id: string): Promise<Project> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new ProjectNotFoundError();
    }
    const archived = existing.archive();
    if (existing.archivedAt !== null) {
      return existing;
    }
    try {
      const row = await this.prisma.project.update({
        where: { id },
        data: { archivedAt: archived.archivedAt },
        select: PROJECT_SELECT,
      });
      return toProject(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }

  async unarchive(id: string): Promise<Project> {
    const existing = await this.findById(id);
    if (existing === null) {
      throw new ProjectNotFoundError();
    }
    if (existing.archivedAt === null) {
      return existing;
    }
    try {
      const row = await this.prisma.project.update({
        where: { id },
        data: { archivedAt: null },
        select: PROJECT_SELECT,
      });
      return toProject(row);
    } catch (err) {
      rethrowMapped(err);
    }
  }
}
