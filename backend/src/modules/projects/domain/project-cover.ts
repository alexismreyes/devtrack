import { randomUUID } from "node:crypto";
import {
  InvalidProjectCoverContentTypeError,
  InvalidProjectCoverFilenameError,
  ProjectCoverSizeExceededError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Q-160: jpeg/png/webp/gif only. */
export const PROJECT_COVER_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProjectCoverContentType =
  (typeof PROJECT_COVER_ALLOWED_CONTENT_TYPES)[number];

/** Q-160: 5 MiB max. */
export const PROJECT_COVER_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const PROJECT_COVER_FILENAME_MAX_LENGTH = 200;

export function isAllowedProjectCoverContentType(
  value: string,
): value is ProjectCoverContentType {
  return (PROJECT_COVER_ALLOWED_CONTENT_TYPES as readonly string[]).includes(
    value,
  );
}

export function sanitizeProjectCoverFilename(filename: string): string {
  const trimmed = filename.trim();
  if (trimmed.length < 1) {
    throw new InvalidProjectCoverFilenameError();
  }
  const basename = trimmed.replace(/^.*[/\\]/, "");
  const withoutControls = basename.replace(/[\u0000-\u001f\u007f]/g, "");
  const collapsed = withoutControls.replace(/\s+/g, " ").trim();
  if (collapsed.length < 1 || /^\.+$/.test(collapsed)) {
    throw new InvalidProjectCoverFilenameError();
  }
  if (collapsed.length > PROJECT_COVER_FILENAME_MAX_LENGTH) {
    return collapsed.slice(0, PROJECT_COVER_FILENAME_MAX_LENGTH);
  }
  return collapsed;
}

export function assertProjectCoverSizeAllowed(sizeBytes: number): void {
  if (
    !Number.isInteger(sizeBytes) ||
    sizeBytes < 0 ||
    sizeBytes > PROJECT_COVER_MAX_SIZE_BYTES
  ) {
    throw new ProjectCoverSizeExceededError();
  }
}

/**
 * Practical magic-byte sniff (Q-160). Returns detected allowlisted type or null.
 */
export function sniffProjectCoverContentType(
  bytes: Uint8Array,
): ProjectCoverContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x39 || bytes[4] === 0x37) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Resolves content type from sniffed bytes; does not trust client type alone.
 */
export function resolveProjectCoverContentType(
  bytes: Uint8Array,
  _clientContentType: string | undefined,
): ProjectCoverContentType {
  const sniffed = sniffProjectCoverContentType(bytes);
  if (sniffed === null) {
    throw new InvalidProjectCoverContentTypeError();
  }
  return sniffed;
}

/** Path layout: `{projectId}/{coverId}` under PROJECT_COVERS_ROOT (Q-159). */
export function buildProjectCoverStorageKey(
  projectId: string,
  coverId: string,
): string {
  if (!UUID_PATTERN.test(projectId)) {
    throw new Error("Project id must be a UUID");
  }
  if (!UUID_PATTERN.test(coverId)) {
    throw new Error("Cover id must be a UUID");
  }
  return `${projectId}/${coverId}`;
}

export type ProjectCoverSummary = {
  id: string;
  contentType: ProjectCoverContentType;
};

export function toProjectCoverSummary(cover: ProjectCover): ProjectCoverSummary {
  return {
    id: cover.id,
    contentType: cover.contentType,
  };
}

export class ProjectCover {
  readonly id: string;
  readonly projectId: string;
  readonly uploadedByUserId: string;
  readonly originalFilename: string;
  readonly contentType: ProjectCoverContentType;
  readonly sizeBytes: number;
  readonly storageKey: string;
  readonly createdAt: Date;

  private constructor(
    id: string,
    projectId: string,
    uploadedByUserId: string,
    originalFilename: string,
    contentType: ProjectCoverContentType,
    sizeBytes: number,
    storageKey: string,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Cover id must be a UUID");
    }
    if (!UUID_PATTERN.test(projectId)) {
      throw new Error("Cover project id must be a UUID");
    }
    if (!UUID_PATTERN.test(uploadedByUserId)) {
      throw new Error("Cover uploader id must be a UUID");
    }
    if (!isAllowedProjectCoverContentType(contentType)) {
      throw new InvalidProjectCoverContentTypeError();
    }
    assertProjectCoverSizeAllowed(sizeBytes);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Cover created time must be a valid date");
    }

    this.id = id;
    this.projectId = projectId;
    this.uploadedByUserId = uploadedByUserId;
    this.originalFilename = originalFilename;
    this.contentType = contentType;
    this.sizeBytes = sizeBytes;
    this.storageKey = storageKey;
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static create(input: {
    projectId: string;
    uploadedByUserId: string;
    originalFilename: string;
    contentType: ProjectCoverContentType;
    sizeBytes: number;
    now?: Date;
  }): ProjectCover {
    const id = randomUUID();
    const filename = sanitizeProjectCoverFilename(input.originalFilename);
    assertProjectCoverSizeAllowed(input.sizeBytes);
    if (!isAllowedProjectCoverContentType(input.contentType)) {
      throw new InvalidProjectCoverContentTypeError();
    }
    return new ProjectCover(
      id,
      input.projectId,
      input.uploadedByUserId,
      filename,
      input.contentType,
      input.sizeBytes,
      buildProjectCoverStorageKey(input.projectId, id),
      input.now ?? new Date(),
    );
  }

  static rehydrate(
    id: string,
    projectId: string,
    uploadedByUserId: string,
    originalFilename: string,
    contentType: string,
    sizeBytes: number,
    storageKey: string,
    createdAt: Date,
  ): ProjectCover {
    if (!isAllowedProjectCoverContentType(contentType)) {
      throw new InvalidProjectCoverContentTypeError();
    }
    return new ProjectCover(
      id,
      projectId,
      uploadedByUserId,
      sanitizeProjectCoverFilename(originalFilename),
      contentType,
      sizeBytes,
      storageKey,
      createdAt,
    );
  }
}
