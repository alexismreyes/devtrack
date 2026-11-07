import { randomUUID } from "node:crypto";
import {
  AttachmentCountExceededError,
  AttachmentSizeExceededError,
  InvalidAttachmentContentTypeError,
  InvalidAttachmentFilenameError,
  InvalidCoverAttachmentError,
} from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ATTACHMENT_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
] as const;

export type AttachmentContentType =
  (typeof ATTACHMENT_ALLOWED_CONTENT_TYPES)[number];

export const COVER_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type CoverImageContentType =
  (typeof COVER_IMAGE_CONTENT_TYPES)[number];

/** Q-133: 20 MiB per file. */
export const ATTACHMENT_MAX_SIZE_BYTES = 20 * 1024 * 1024;

/** Q-133: max 20 attachments per task. */
export const ATTACHMENT_MAX_PER_TASK = 20;

export const ATTACHMENT_FILENAME_MAX_LENGTH = 200;

export const ATTACHMENT_FILENAME_PREVIEW_MAX_LENGTH = 120;

export function isAllowedAttachmentContentType(
  value: string,
): value is AttachmentContentType {
  return (ATTACHMENT_ALLOWED_CONTENT_TYPES as readonly string[]).includes(
    value,
  );
}

export function isCoverImageContentType(
  value: string,
): value is CoverImageContentType {
  return (COVER_IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * Sanitizes a client-supplied filename for metadata only.
 * Rejects empty, path segments, and control characters; truncates length.
 */
export function sanitizeAttachmentFilename(filename: string): string {
  const trimmed = filename.trim();
  if (trimmed.length < 1) {
    throw new InvalidAttachmentFilenameError();
  }
  const basename = trimmed.replace(/^.*[/\\]/, "");
  const withoutControls = basename.replace(/[\u0000-\u001f\u007f]/g, "");
  const collapsed = withoutControls.replace(/\s+/g, " ").trim();
  if (collapsed.length < 1 || /^\.+$/.test(collapsed)) {
    throw new InvalidAttachmentFilenameError();
  }
  if (collapsed.length > ATTACHMENT_FILENAME_MAX_LENGTH) {
    return collapsed.slice(0, ATTACHMENT_FILENAME_MAX_LENGTH);
  }
  return collapsed;
}

export function assertAttachmentSizeAllowed(sizeBytes: number): void {
  if (
    !Number.isInteger(sizeBytes) ||
    sizeBytes < 0 ||
    sizeBytes > ATTACHMENT_MAX_SIZE_BYTES
  ) {
    throw new AttachmentSizeExceededError();
  }
}

export function assertAttachmentCountAllowed(currentCount: number): void {
  if (currentCount >= ATTACHMENT_MAX_PER_TASK) {
    throw new AttachmentCountExceededError();
  }
}

export function assertCoverEligibleContentType(
  contentType: string,
): asserts contentType is CoverImageContentType {
  if (!isCoverImageContentType(contentType)) {
    throw new InvalidCoverAttachmentError();
  }
}

/**
 * Practical magic-byte sniff (Q-133). Returns detected allowlisted type or null.
 * text/plain is accepted when no binary signature matches and bytes look textual.
 */
export function sniffAttachmentContentType(
  bytes: Uint8Array,
): AttachmentContentType | null {
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
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }

  // Reject obvious executables / archives before text fallback.
  if (
    bytes.length >= 2 &&
    ((bytes[0] === 0x4d && bytes[1] === 0x5a) ||
      (bytes[0] === 0x7f &&
        bytes[1] === 0x45 &&
        bytes.length >= 4 &&
        bytes[2] === 0x4c &&
        bytes[3] === 0x46) ||
      (bytes[0] === 0x50 && bytes[1] === 0x4b))
  ) {
    return null;
  }

  const sample = bytes.subarray(0, Math.min(bytes.length, 512));
  let nullCount = 0;
  for (const byte of sample) {
    if (byte === 0) {
      nullCount += 1;
    }
  }
  if (sample.length > 0 && nullCount === 0) {
    return "text/plain";
  }
  return null;
}

/**
 * Resolves content type from sniffed bytes; does not trust client type alone.
 * When sniff yields text/plain and client claimed an allowlisted type that is
 * also text/plain, keep text/plain. Image/pdf must match sniff.
 */
export function resolveAttachmentContentType(
  bytes: Uint8Array,
  clientContentType: string | undefined,
): AttachmentContentType {
  const sniffed = sniffAttachmentContentType(bytes);
  if (sniffed === null) {
    throw new InvalidAttachmentContentTypeError();
  }
  if (sniffed === "text/plain") {
    const normalizedClient = (clientContentType ?? "").split(";")[0]?.trim().toLowerCase();
    if (
      normalizedClient !== undefined &&
      normalizedClient !== "" &&
      normalizedClient !== "text/plain" &&
      normalizedClient !== "application/octet-stream"
    ) {
      // Client claimed a binary type but sniff says text — reject mismatch.
      if (isAllowedAttachmentContentType(normalizedClient)) {
        throw new InvalidAttachmentContentTypeError();
      }
    }
    return "text/plain";
  }
  return sniffed;
}

export function buildAttachmentStorageKey(
  projectId: string,
  taskId: string,
  attachmentId: string,
): string {
  if (!UUID_PATTERN.test(projectId)) {
    throw new Error("Project id must be a UUID");
  }
  if (!UUID_PATTERN.test(taskId)) {
    throw new Error("Task id must be a UUID");
  }
  if (!UUID_PATTERN.test(attachmentId)) {
    throw new Error("Attachment id must be a UUID");
  }
  return `${projectId}/${taskId}/${attachmentId}`;
}

export function truncateAttachmentFilenamePreview(
  filename: string,
  maxLength: number = ATTACHMENT_FILENAME_PREVIEW_MAX_LENGTH,
): string {
  if (maxLength < 1) {
    throw new Error("Filename preview max length must be at least 1");
  }
  if (filename.length <= maxLength) {
    return filename;
  }
  return `${filename.slice(0, maxLength)}…`;
}

export class TaskAttachment {
  readonly id: string;
  readonly taskId: string;
  readonly uploadedByUserId: string;
  readonly originalFilename: string;
  readonly contentType: AttachmentContentType;
  readonly sizeBytes: number;
  readonly storageKey: string;
  readonly createdAt: Date;

  private constructor(
    id: string,
    taskId: string,
    uploadedByUserId: string,
    originalFilename: string,
    contentType: AttachmentContentType,
    sizeBytes: number,
    storageKey: string,
    createdAt: Date,
  ) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Attachment id must be a UUID");
    }
    if (!UUID_PATTERN.test(taskId)) {
      throw new Error("Attachment task id must be a UUID");
    }
    if (!UUID_PATTERN.test(uploadedByUserId)) {
      throw new Error("Attachment uploader id must be a UUID");
    }
    if (!isAllowedAttachmentContentType(contentType)) {
      throw new InvalidAttachmentContentTypeError();
    }
    assertAttachmentSizeAllowed(sizeBytes);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Attachment created time must be a valid date");
    }

    this.id = id;
    this.taskId = taskId;
    this.uploadedByUserId = uploadedByUserId;
    this.originalFilename = originalFilename;
    this.contentType = contentType;
    this.sizeBytes = sizeBytes;
    this.storageKey = storageKey;
    this.createdAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static create(input: {
    taskId: string;
    projectId: string;
    uploadedByUserId: string;
    originalFilename: string;
    contentType: AttachmentContentType;
    sizeBytes: number;
    now?: Date;
  }): TaskAttachment {
    const id = randomUUID();
    const filename = sanitizeAttachmentFilename(input.originalFilename);
    assertAttachmentSizeAllowed(input.sizeBytes);
    if (!isAllowedAttachmentContentType(input.contentType)) {
      throw new InvalidAttachmentContentTypeError();
    }
    return new TaskAttachment(
      id,
      input.taskId,
      input.uploadedByUserId,
      filename,
      input.contentType,
      input.sizeBytes,
      buildAttachmentStorageKey(input.projectId, input.taskId, id),
      input.now ?? new Date(),
    );
  }

  static rehydrate(
    id: string,
    taskId: string,
    uploadedByUserId: string,
    originalFilename: string,
    contentType: string,
    sizeBytes: number,
    storageKey: string,
    createdAt: Date,
  ): TaskAttachment {
    if (!isAllowedAttachmentContentType(contentType)) {
      throw new InvalidAttachmentContentTypeError();
    }
    return new TaskAttachment(
      id,
      taskId,
      uploadedByUserId,
      sanitizeAttachmentFilename(originalFilename),
      contentType,
      sizeBytes,
      storageKey,
      createdAt,
    );
  }

  get isCoverEligible(): boolean {
    return isCoverImageContentType(this.contentType);
  }
}

export function sortAttachmentsOldestFirst(
  attachments: readonly TaskAttachment[],
): TaskAttachment[] {
  return attachments
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export type TaskCoverSummary = {
  attachmentId: string;
  contentType: CoverImageContentType;
};

export function toCoverSummary(
  attachment: TaskAttachment,
): TaskCoverSummary {
  assertCoverEligibleContentType(attachment.contentType);
  return {
    attachmentId: attachment.id,
    contentType: attachment.contentType,
  };
}
