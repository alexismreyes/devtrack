import { randomUUID } from "node:crypto";
import {
  InvalidStatusColorError,
  InvalidStatusKeyError,
  InvalidStatusNameError,
  InvalidStatusReorderError,
  LastNonCompletedStatusError,
  LastStatusError,
  StatusInUseError,
  StatusKeyImmutableError,
  StatusNotFoundError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const STATUS_COLORS = [
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "TEAL",
  "BLUE",
  "PURPLE",
  "PINK",
  "GRAY",
] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

export const STATUS_NAME_MAX_LENGTH = 40;

export const SEEDED_STATUS_KEY_TODO = "TODO";
export const SEEDED_STATUS_KEY_IN_PROGRESS = "IN_PROGRESS";
export const SEEDED_STATUS_KEY_DONE = "DONE";

export const SEEDED_STATUS_KEYS = [
  SEEDED_STATUS_KEY_TODO,
  SEEDED_STATUS_KEY_IN_PROGRESS,
  SEEDED_STATUS_KEY_DONE,
] as const;

export type SeededStatusKey = (typeof SEEDED_STATUS_KEYS)[number];

export type SeededStatusDefinition = {
  key: SeededStatusKey;
  name: string;
  color: StatusColor;
  isCompleted: boolean;
  position: number;
};

export const SEEDED_STATUS_DEFINITIONS: readonly SeededStatusDefinition[] = [
  {
    key: SEEDED_STATUS_KEY_TODO,
    name: "To do",
    color: "GRAY",
    isCompleted: false,
    position: 0,
  },
  {
    key: SEEDED_STATUS_KEY_IN_PROGRESS,
    name: "In progress",
    color: "BLUE",
    isCompleted: false,
    position: 1,
  },
  {
    key: SEEDED_STATUS_KEY_DONE,
    name: "Done",
    color: "GREEN",
    isCompleted: true,
    position: 2,
  },
];

export type StatusDetailsChange = {
  name?: string;
  color?: StatusColor;
  isCompleted?: boolean;
};

export function parseStatusColor(value: string): StatusColor {
  if ((STATUS_COLORS as readonly string[]).includes(value)) {
    return value as StatusColor;
  }
  throw new InvalidStatusColorError();
}

export function normalizeStatusName(name: string): string {
  const normalized = name.trim();
  if (normalized.length < 1 || normalized.length > STATUS_NAME_MAX_LENGTH) {
    throw new InvalidStatusNameError();
  }
  return normalized;
}

export function toStatusNameKey(name: string): string {
  return normalizeStatusName(name).toLowerCase();
}

export function normalizeStatusKey(key: string): string {
  const normalized = key.trim();
  if (normalized.length < 1 || normalized.length > 64) {
    throw new InvalidStatusKeyError();
  }
  return normalized;
}

export function sortStatusesByPositionAsc(
  statuses: readonly ProjectStatus[],
): ProjectStatus[] {
  return statuses
    .slice()
    .sort(
      (a, b) =>
        a.position - b.position ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
}

export function assertStatusBelongsToProject(
  status: ProjectStatus | null,
  projectId: string,
): ProjectStatus {
  if (status === null || status.projectId !== projectId) {
    throw new StatusNotFoundError();
  }
  return status;
}

export function assertStatusKeyInCatalog(
  statuses: readonly ProjectStatus[],
  projectId: string,
  key: string,
): ProjectStatus {
  const normalized = normalizeStatusKey(key);
  const found = statuses.find(
    (status) => status.projectId === projectId && status.key === normalized,
  );
  if (found === undefined) {
    throw new InvalidStatusKeyError();
  }
  return found;
}

/** Create default: TODO when present; else first non-completed by position. */
export function resolveDefaultStatusKey(
  statuses: readonly ProjectStatus[],
): string {
  const ordered = sortStatusesByPositionAsc(statuses);
  const todo = ordered.find((status) => status.key === SEEDED_STATUS_KEY_TODO);
  if (todo !== undefined) {
    return todo.key;
  }
  const firstNonCompleted = ordered.find((status) => !status.isCompleted);
  if (firstNonCompleted === undefined) {
    throw new LastNonCompletedStatusError();
  }
  return firstNonCompleted.key;
}

export function countNonCompletedStatuses(
  statuses: readonly ProjectStatus[],
): number {
  return statuses.filter((status) => !status.isCompleted).length;
}

export function assertCanDeleteStatus(
  statuses: readonly ProjectStatus[],
  target: ProjectStatus,
  liveTaskCount: number,
): void {
  if (liveTaskCount > 0) {
    throw new StatusInUseError();
  }
  if (statuses.length <= 1) {
    throw new LastStatusError();
  }
  if (!target.isCompleted && countNonCompletedStatuses(statuses) <= 1) {
    throw new LastNonCompletedStatusError();
  }
}

export function assertCanSetIsCompleted(
  statuses: readonly ProjectStatus[],
  target: ProjectStatus,
  nextIsCompleted: boolean,
): void {
  if (nextIsCompleted === target.isCompleted) {
    return;
  }
  if (
    nextIsCompleted === true &&
    !target.isCompleted &&
    countNonCompletedStatuses(statuses) <= 1
  ) {
    throw new LastNonCompletedStatusError();
  }
}

export function assertReorderStatusIds(
  statuses: readonly ProjectStatus[],
  orderedIds: readonly string[],
): void {
  if (orderedIds.length !== statuses.length) {
    throw new InvalidStatusReorderError();
  }
  const expected = new Set(statuses.map((status) => status.id));
  const seen = new Set<string>();
  for (const id of orderedIds) {
    if (!expected.has(id) || seen.has(id)) {
      throw new InvalidStatusReorderError();
    }
    seen.add(id);
  }
  if (seen.size !== expected.size) {
    throw new InvalidStatusReorderError();
  }
}

export function applyStatusReorder(
  statuses: readonly ProjectStatus[],
  orderedIds: readonly string[],
): ProjectStatus[] {
  assertReorderStatusIds(statuses, orderedIds);
  const byId = new Map(statuses.map((status) => [status.id, status]));
  return orderedIds.map((id, position) => {
    const existing = byId.get(id);
    if (existing === undefined) {
      throw new InvalidStatusReorderError();
    }
    return existing.withPosition(position);
  });
}

export function nextCustomStatusPosition(
  statuses: readonly ProjectStatus[],
): number {
  if (statuses.length === 0) {
    return 0;
  }
  return Math.max(...statuses.map((status) => status.position)) + 1;
}

export function rejectClientStatusKeyMutation(input: {
  key?: unknown;
}): void {
  if (input.key !== undefined) {
    throw new StatusKeyImmutableError();
  }
}

export class ProjectStatus {
  readonly id: string;
  readonly projectId: string;
  readonly key: string;
  readonly name: string;
  readonly nameKey: string;
  readonly color: StatusColor;
  readonly isSystem: boolean;
  readonly isCompleted: boolean;
  readonly position: number;
  readonly createdAt: Date;

  private constructor(
    id: string,
    projectId: string,
    key: string,
    name: string,
    color: StatusColor,
    isSystem: boolean,
    isCompleted: boolean,
    position: number,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Status id must be a UUID");
    }
    if (!UUID_PATTERN.test(projectId)) {
      throw new Error("Status project id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Status created time must be a valid date");
    }
    if (!Number.isInteger(position) || position < 0) {
      throw new Error("Status position must be a non-negative integer");
    }

    this.id = id;
    this.projectId = projectId;
    this.key = key;
    this.name = name;
    this.nameKey = name.toLowerCase();
    this.color = color;
    this.isSystem = isSystem;
    this.isCompleted = isCompleted;
    this.position = position;
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static createCustom(
    projectId: string,
    name: string,
    color: StatusColor | string,
    position: number,
    isCompleted = false,
    now: Date = new Date(),
  ): ProjectStatus {
    return new ProjectStatus(
      randomUUID(),
      projectId,
      randomUUID(),
      normalizeStatusName(name),
      parseStatusColor(color),
      false,
      isCompleted,
      position,
      now,
    );
  }

  static createSeeded(
    projectId: string,
    definition: SeededStatusDefinition,
    now: Date = new Date(),
  ): ProjectStatus {
    return new ProjectStatus(
      randomUUID(),
      projectId,
      definition.key,
      normalizeStatusName(definition.name),
      parseStatusColor(definition.color),
      true,
      definition.isCompleted,
      definition.position,
      now,
    );
  }

  static rehydrate(
    id: string,
    projectId: string,
    key: string,
    name: string,
    color: string,
    isSystem: boolean,
    isCompleted: boolean,
    position: number,
    createdAt: Date,
  ): ProjectStatus {
    return new ProjectStatus(
      id,
      projectId,
      normalizeStatusKey(key),
      normalizeStatusName(name),
      parseStatusColor(color),
      isSystem,
      isCompleted,
      position,
      createdAt,
    );
  }

  withDetails(change: StatusDetailsChange): ProjectStatus {
    return new ProjectStatus(
      this.id,
      this.projectId,
      this.key,
      change.name !== undefined ? normalizeStatusName(change.name) : this.name,
      change.color !== undefined
        ? parseStatusColor(change.color)
        : this.color,
      this.isSystem,
      change.isCompleted !== undefined ? change.isCompleted : this.isCompleted,
      this.position,
      this.createdAt,
    );
  }

  withPosition(position: number): ProjectStatus {
    return new ProjectStatus(
      this.id,
      this.projectId,
      this.key,
      this.name,
      this.color,
      this.isSystem,
      this.isCompleted,
      position,
      this.createdAt,
    );
  }
}
