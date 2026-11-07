import { describe, expect, it } from "vitest";
import {
  AttachmentCountExceededError,
  AttachmentSizeExceededError,
  InvalidAttachmentContentTypeError,
  InvalidAttachmentFilenameError,
  InvalidCoverAttachmentError,
} from "../domain/errors";
import {
  ATTACHMENT_MAX_PER_TASK,
  ATTACHMENT_MAX_SIZE_BYTES,
  assertAttachmentCountAllowed,
  assertAttachmentSizeAllowed,
  assertCoverEligibleContentType,
  buildAttachmentStorageKey,
  resolveAttachmentContentType,
  sanitizeAttachmentFilename,
  sniffAttachmentContentType,
  TaskAttachment,
  truncateAttachmentFilenamePreview,
} from "../domain/task-attachment";
import {
  TaskActivityEvent,
} from "../domain/task-activity";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

describe("task attachment domain", () => {
  it("sanitizes filenames and rejects path traversal / empty names", () => {
    expect(sanitizeAttachmentFilename("  photo.PNG  ")).toBe("photo.PNG");
    expect(sanitizeAttachmentFilename("../etc/passwd")).toBe("passwd");
    expect(sanitizeAttachmentFilename("a\\b\\c.txt")).toBe("c.txt");
    expect(() => sanitizeAttachmentFilename("")).toThrow(
      InvalidAttachmentFilenameError,
    );
    expect(() => sanitizeAttachmentFilename("...")).toThrow(
      InvalidAttachmentFilenameError,
    );
  });

  it("enforces size and count caps (Q-133)", () => {
    expect(() => assertAttachmentSizeAllowed(ATTACHMENT_MAX_SIZE_BYTES)).not.toThrow();
    expect(() =>
      assertAttachmentSizeAllowed(ATTACHMENT_MAX_SIZE_BYTES + 1),
    ).toThrow(AttachmentSizeExceededError);
    expect(() =>
      assertAttachmentCountAllowed(ATTACHMENT_MAX_PER_TASK - 1),
    ).not.toThrow();
    expect(() => assertAttachmentCountAllowed(ATTACHMENT_MAX_PER_TASK)).toThrow(
      AttachmentCountExceededError,
    );
  });

  it("sniffs magic bytes and resolves content type without trusting client alone", () => {
    expect(sniffAttachmentContentType(pngBytes())).toBe("image/png");
    expect(sniffAttachmentContentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffAttachmentContentType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])),
    ).toBe("application/pdf");
    expect(sniffAttachmentContentType(new TextEncoder().encode("hello"))).toBe(
      "text/plain",
    );
    expect(sniffAttachmentContentType(new Uint8Array([0x4d, 0x5a]))).toBeNull();

    expect(resolveAttachmentContentType(pngBytes(), "image/jpeg")).toBe(
      "image/png",
    );
    expect(() =>
      resolveAttachmentContentType(new Uint8Array([0x00, 0x01]), "text/plain"),
    ).toThrow(InvalidAttachmentContentTypeError);
  });

  it("builds storage keys and creates attachments with system identity", () => {
    const attachment = TaskAttachment.create({
      taskId: TASK_ID,
      projectId: PROJECT_ID,
      uploadedByUserId: USER_ID,
      originalFilename: "  shot.png ",
      contentType: "image/png",
      sizeBytes: 12,
    });
    expect(attachment.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(attachment.originalFilename).toBe("shot.png");
    expect(attachment.storageKey).toBe(
      buildAttachmentStorageKey(PROJECT_ID, TASK_ID, attachment.id),
    );
    expect(attachment.isCoverEligible).toBe(true);
  });

  it("restricts cover to image content types", () => {
    expect(() => assertCoverEligibleContentType("image/png")).not.toThrow();
    expect(() => assertCoverEligibleContentType("application/pdf")).toThrow(
      InvalidCoverAttachmentError,
    );
  });

  it("builds attachment and cover activity payloads with filename preview", () => {
    const longName = `${"a".repeat(130)}.png`;
    const added = TaskActivityEvent.attachmentAdded(
      TASK_ID,
      USER_ID,
      "44444444-4444-4444-8444-444444444444",
      longName,
    );
    expect(added.kind).toBe("ATTACHMENT_ADDED");
    expect(added.payload).toEqual({
      attachmentId: "44444444-4444-4444-8444-444444444444",
      filenamePreview: truncateAttachmentFilenamePreview(longName),
    });

    const cleared = TaskActivityEvent.coverChanged(TASK_ID, USER_ID, null, null);
    expect(cleared.kind).toBe("COVER_CHANGED");
    expect(cleared.payload).toEqual({
      attachmentId: null,
      filenamePreview: null,
    });
  });
});
