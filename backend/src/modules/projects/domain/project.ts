import { randomUUID } from "node:crypto";
import { InvalidProjectNameError, ProjectArchivedError } from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProjectDetailsChange = {
  name?: string;
  description?: string | null;
};

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (normalized === "") {
    throw new InvalidProjectNameError();
  }
  return normalized;
}

function normalizeDescription(description: string | null | undefined): string | null {
  if (description === undefined || description === null) {
    return null;
  }
  const normalized = description.trim();
  return normalized === "" ? null : normalized;
}

export class Project {
  readonly id: string;
  readonly ownerUserId: string;
  readonly name: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly archivedAt: Date | null;

  private constructor(
    id: string,
    ownerUserId: string,
    name: string,
    description: string | null,
    createdAt: Date,
    archivedAt: Date | null,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Project id must be a UUID");
    }
    if (!UUID_PATTERN.test(ownerUserId)) {
      throw new Error("Project owner id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Project created time must be a valid date");
    }
    if (archivedAt !== null && Number.isNaN(archivedAt.getTime())) {
      throw new Error("Project archived time must be a valid date");
    }

    this.id = id;
    this.ownerUserId = ownerUserId;
    this.name = name;
    this.description = description;
    this.createdAt = new Date(createdAt.getTime());
    this.archivedAt =
      archivedAt === null ? null : new Date(archivedAt.getTime());
    Object.freeze(this);
  }

  static create(
    ownerUserId: string,
    name: string,
    description: string | null | undefined = null,
    now: Date = new Date(),
  ): Project {
    return new Project(
      randomUUID(),
      ownerUserId,
      normalizeName(name),
      normalizeDescription(description),
      now,
      null,
    );
  }

  static rehydrate(
    id: string,
    ownerUserId: string,
    name: string,
    description: string | null,
    createdAt: Date,
    archivedAt: Date | null,
  ): Project {
    return new Project(
      id,
      ownerUserId,
      normalizeName(name),
      normalizeDescription(description),
      createdAt,
      archivedAt,
    );
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  withDetails(change: ProjectDetailsChange): Project {
    if (this.archivedAt !== null) {
      throw new ProjectArchivedError();
    }

    return new Project(
      this.id,
      this.ownerUserId,
      change.name !== undefined ? normalizeName(change.name) : this.name,
      change.description !== undefined
        ? normalizeDescription(change.description)
        : this.description,
      this.createdAt,
      this.archivedAt,
    );
  }

  archive(now: Date = new Date()): Project {
    if (this.archivedAt !== null) {
      return this;
    }

    return new Project(
      this.id,
      this.ownerUserId,
      this.name,
      this.description,
      this.createdAt,
      now,
    );
  }

  unarchive(): Project {
    if (this.archivedAt === null) {
      return this;
    }

    return new Project(
      this.id,
      this.ownerUserId,
      this.name,
      this.description,
      this.createdAt,
      null,
    );
  }
}
