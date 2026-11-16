import { randomUUID } from "node:crypto";
import {
  InvalidProjectBoardBackgroundContentTypeError,
  InvalidProjectBoardBackgroundFilenameError,
  ProjectBoardBackgroundSizeExceededError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Q-222: jpeg/png/webp/gif only. */
export const PROJECT_BOARD_BACKGROUND_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type ProjectBoardBackgroundContentType =
  (typeof PROJECT_BOARD_BACKGROUND_ALLOWED_CONTENT_TYPES)[number];

/** Q-222: 5 MiB max. */
export const PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const PROJECT_BOARD_BACKGROUND_FILENAME_MAX_LENGTH = 200;

export function isAllowedProjectBoardBackgroundContentType(
  value: string,
): value is ProjectBoardBackgroundContentType {
  return (PROJECT_BOARD_BACKGROUND_ALLOWED_CONTENT_TYPES as readonly string[]).includes(
    value,
  );
}

export function sanitizeProjectBoardBackgroundFilename(filename: string): string {
  const trimmed = filename.trim();
  if (trimmed.length < 1) {
    throw new InvalidProjectBoardBackgroundFilenameError();
  }
  const basename = trimmed.replace(/^.*[/\\]/, "");
  const withoutControls = basename.replace(/[\u0000-\u001f\u007f]/g, "");
  const collapsed = withoutControls.replace(/\s+/g, " ").trim();
  if (collapsed.length < 1 || /^\.+$/.test(collapsed)) {
    throw new InvalidProjectBoardBackgroundFilenameError();
  }
  if (collapsed.length > PROJECT_BOARD_BACKGROUND_FILENAME_MAX_LENGTH) {
    return collapsed.slice(0, PROJECT_BOARD_BACKGROUND_FILENAME_MAX_LENGTH);
  }
  return collapsed;
}

export function assertProjectBoardBackgroundSizeAllowed(sizeBytes: number): void {
  if (
    !Number.isInteger(sizeBytes) ||
    sizeBytes < 0 ||
    sizeBytes > PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES
  ) {
    throw new ProjectBoardBackgroundSizeExceededError();
  }
}

/**
 * Practical magic-byte sniff (Q-222). Returns detected allowlisted type or null.
 */
export function sniffProjectBoardBackgroundContentType(
  bytes: Uint8Array,
): ProjectBoardBackgroundContentType | null {
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
export function resolveProjectBoardBackgroundContentType(
  bytes: Uint8Array,
  _clientContentType: string | undefined,
): ProjectBoardBackgroundContentType {
  const sniffed = sniffProjectBoardBackgroundContentType(bytes);
  if (sniffed === null) {
    throw new InvalidProjectBoardBackgroundContentTypeError();
  }
  return sniffed;
}

/** Path layout: `{projectId}/{boardBackgroundId}` under PROJECT_BOARD_BACKGROUNDS_ROOT (Q-223). */
export function buildProjectBoardBackgroundStorageKey(
  projectId: string,
  boardBackgroundId: string,
): string {
  if (!UUID_PATTERN.test(projectId)) {
    throw new Error("Project id must be a UUID");
  }
  if (!UUID_PATTERN.test(boardBackgroundId)) {
    throw new Error("BoardBackground id must be a UUID");
  }
  return `${projectId}/${boardBackgroundId}`;
}

export type ProjectBoardBackgroundSummary = {
  id: string;
  contentType: ProjectBoardBackgroundContentType;
};

export function toProjectBoardBackgroundSummary(boardBackground: ProjectBoardBackground): ProjectBoardBackgroundSummary {
  return {
    id: boardBackground.id,
    contentType: boardBackground.contentType,
  };
}

export class ProjectBoardBackground {
  readonly id: string;
  readonly projectId: string;
  readonly uploadedByUserId: string;
  readonly originalFilename: string;
  readonly contentType: ProjectBoardBackgroundContentType;
  readonly sizeBytes: number;
  readonly storageKey: string;
  readonly createdAt: Date;

  private constructor(
    id: string,
    projectId: string,
    uploadedByUserId: string,
    originalFilename: string,
    contentType: ProjectBoardBackgroundContentType,
    sizeBytes: number,
    storageKey: string,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("BoardBackground id must be a UUID");
    }
    if (!UUID_PATTERN.test(projectId)) {
      throw new Error("BoardBackground project id must be a UUID");
    }
    if (!UUID_PATTERN.test(uploadedByUserId)) {
      throw new Error("BoardBackground uploader id must be a UUID");
    }
    if (!isAllowedProjectBoardBackgroundContentType(contentType)) {
      throw new InvalidProjectBoardBackgroundContentTypeError();
    }
    assertProjectBoardBackgroundSizeAllowed(sizeBytes);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("BoardBackground created time must be a valid date");
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
    contentType: ProjectBoardBackgroundContentType;
    sizeBytes: number;
    now?: Date;
  }): ProjectBoardBackground {
    const id = randomUUID();
    const filename = sanitizeProjectBoardBackgroundFilename(input.originalFilename);
    assertProjectBoardBackgroundSizeAllowed(input.sizeBytes);
    if (!isAllowedProjectBoardBackgroundContentType(input.contentType)) {
      throw new InvalidProjectBoardBackgroundContentTypeError();
    }
    return new ProjectBoardBackground(
      id,
      input.projectId,
      input.uploadedByUserId,
      filename,
      input.contentType,
      input.sizeBytes,
      buildProjectBoardBackgroundStorageKey(input.projectId, id),
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
  ): ProjectBoardBackground {
    if (!isAllowedProjectBoardBackgroundContentType(contentType)) {
      throw new InvalidProjectBoardBackgroundContentTypeError();
    }
    return new ProjectBoardBackground(
      id,
      projectId,
      uploadedByUserId,
      sanitizeProjectBoardBackgroundFilename(originalFilename),
      contentType,
      sizeBytes,
      storageKey,
      createdAt,
    );
  }
}
