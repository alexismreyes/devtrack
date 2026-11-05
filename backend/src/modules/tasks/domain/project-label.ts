import { randomUUID } from "node:crypto";
import {
  InvalidLabelColorError,
  InvalidLabelNameError,
  LabelNotFoundError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LABEL_COLORS = [
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

export type LabelColor = (typeof LABEL_COLORS)[number];

export const LABEL_NAME_MAX_LENGTH = 40;

export type LabelDetailsChange = {
  name?: string;
  color?: LabelColor;
};

export function parseLabelColor(value: string): LabelColor {
  if ((LABEL_COLORS as readonly string[]).includes(value)) {
    return value as LabelColor;
  }
  throw new InvalidLabelColorError();
}

export function normalizeLabelName(name: string): string {
  const normalized = name.trim();
  if (normalized.length < 1 || normalized.length > LABEL_NAME_MAX_LENGTH) {
    throw new InvalidLabelNameError();
  }
  return normalized;
}

export function toLabelNameKey(name: string): string {
  return normalizeLabelName(name).toLowerCase();
}

/** Collapse duplicates while preserving first-seen order. */
export function canonicalizeLabelIds(labelIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of labelIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function assertLabelsBelongToProject(
  labels: readonly ProjectLabel[],
  projectId: string,
  requestedIds: readonly string[],
): void {
  if (labels.length !== requestedIds.length) {
    throw new LabelNotFoundError();
  }
  for (const label of labels) {
    if (label.projectId !== projectId) {
      throw new LabelNotFoundError();
    }
  }
}

export function sortLabelsByNameAsc(
  labels: readonly ProjectLabel[],
): ProjectLabel[] {
  return labels
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

export class ProjectLabel {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly nameKey: string;
  readonly color: LabelColor;
  readonly createdAt: Date;

  private constructor(
    id: string,
    projectId: string,
    name: string,
    color: LabelColor,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Label id must be a UUID");
    }
    if (!UUID_PATTERN.test(projectId)) {
      throw new Error("Label project id must be a UUID");
    }
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Label created time must be a valid date");
    }

    this.id = id;
    this.projectId = projectId;
    this.name = name;
    this.nameKey = name.toLowerCase();
    this.color = color;
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static create(
    projectId: string,
    name: string,
    color: LabelColor | string,
    now: Date = new Date(),
  ): ProjectLabel {
    return new ProjectLabel(
      randomUUID(),
      projectId,
      normalizeLabelName(name),
      parseLabelColor(color),
      now,
    );
  }

  static rehydrate(
    id: string,
    projectId: string,
    name: string,
    color: string,
    createdAt: Date,
  ): ProjectLabel {
    return new ProjectLabel(
      id,
      projectId,
      normalizeLabelName(name),
      parseLabelColor(color),
      createdAt,
    );
  }

  withDetails(change: LabelDetailsChange): ProjectLabel {
    return new ProjectLabel(
      this.id,
      this.projectId,
      change.name !== undefined ? normalizeLabelName(change.name) : this.name,
      change.color !== undefined
        ? parseLabelColor(change.color)
        : this.color,
      this.createdAt,
    );
  }
}
