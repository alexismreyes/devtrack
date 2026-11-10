import { describe, expect, it } from "vitest";
import {
  InvalidProjectCoverContentTypeError,
  InvalidProjectCoverFilenameError,
  ProjectCoverSizeExceededError,
} from "../domain/errors";
import {
  PROJECT_COVER_MAX_SIZE_BYTES,
  ProjectCover,
  buildProjectCoverStorageKey,
  resolveProjectCoverContentType,
  sanitizeProjectCoverFilename,
  sniffProjectCoverContentType,
  toProjectCoverSummary,
} from "../domain/project-cover";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

describe("ProjectCover domain", () => {
  it("creates a single cover with storage key {projectId}/{coverId}", () => {
    const cover = ProjectCover.create({
      projectId: PROJECT_ID,
      uploadedByUserId: USER_ID,
      originalFilename: "hero.png",
      contentType: "image/png",
      sizeBytes: 12,
    });
    expect(cover.storageKey).toBe(
      buildProjectCoverStorageKey(PROJECT_ID, cover.id),
    );
    expect(toProjectCoverSummary(cover)).toEqual({
      id: cover.id,
      contentType: "image/png",
    });
  });

  it("sniffs jpeg/png/webp/gif and rejects non-images", () => {
    expect(sniffProjectCoverContentType(pngBytes())).toBe("image/png");
    expect(
      sniffProjectCoverContentType(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      ),
    ).toBe("image/jpeg");
    expect(
      sniffProjectCoverContentType(
        new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
      ),
    ).toBe("image/gif");
    expect(
      sniffProjectCoverContentType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      ),
    ).toBe("image/webp");
    expect(
      sniffProjectCoverContentType(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
      ),
    ).toBeNull();
    expect(() =>
      resolveProjectCoverContentType(
        new Uint8Array([0x4d, 0x5a]),
        "image/png",
      ),
    ).toThrow(InvalidProjectCoverContentTypeError);
  });

  it("enforces 5 MiB max and filename sanitization", () => {
    expect(() =>
      ProjectCover.create({
        projectId: PROJECT_ID,
        uploadedByUserId: USER_ID,
        originalFilename: "big.png",
        contentType: "image/png",
        sizeBytes: PROJECT_COVER_MAX_SIZE_BYTES + 1,
      }),
    ).toThrow(ProjectCoverSizeExceededError);

    expect(sanitizeProjectCoverFilename("  path/to/cover.png  ")).toBe(
      "cover.png",
    );
    expect(() => sanitizeProjectCoverFilename("...")).toThrow(
      InvalidProjectCoverFilenameError,
    );
  });
});
