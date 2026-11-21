import { describe, expect, it } from "vitest";
import {
  InvalidProjectBoardBackgroundContentTypeError,
  InvalidProjectBoardBackgroundFilenameError,
  ProjectBoardBackgroundSizeExceededError,
} from "../domain/errors";
import {
  PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES,
  ProjectBoardBackground,
  buildProjectBoardBackgroundStorageKey,
  resolveProjectBoardBackgroundContentType,
  sanitizeProjectBoardBackgroundFilename,
  sniffProjectBoardBackgroundContentType,
  toProjectBoardBackgroundSummary,
} from "../domain/project-board-background";

const PROJECT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ID = "11111111-1111-4111-8111-111111111111";

function pngBytes(): Uint8Array {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

describe("ProjectBoardBackground domain", () => {
  it("creates a single boardBackground with storage key {projectId}/{boardBackgroundId}", () => {
    const boardBackground = ProjectBoardBackground.create({
      projectId: PROJECT_ID,
      uploadedByUserId: USER_ID,
      originalFilename: "board.png",
      contentType: "image/png",
      sizeBytes: 12,
    });
    expect(boardBackground.storageKey).toBe(
      buildProjectBoardBackgroundStorageKey(PROJECT_ID, boardBackground.id),
    );
    expect(toProjectBoardBackgroundSummary(boardBackground)).toEqual({
      id: boardBackground.id,
      contentType: "image/png",
    });
  });

  it("sniffs jpeg/png/webp/gif and rejects non-images", () => {
    expect(sniffProjectBoardBackgroundContentType(pngBytes())).toBe("image/png");
    expect(
      sniffProjectBoardBackgroundContentType(
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
      ),
    ).toBe("image/jpeg");
    expect(
      sniffProjectBoardBackgroundContentType(
        new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
      ),
    ).toBe("image/gif");
    expect(
      sniffProjectBoardBackgroundContentType(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
          0x50,
        ]),
      ),
    ).toBe("image/webp");
    expect(
      sniffProjectBoardBackgroundContentType(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
      ),
    ).toBeNull();
    expect(() =>
      resolveProjectBoardBackgroundContentType(
        new Uint8Array([0x4d, 0x5a]),
        "image/png",
      ),
    ).toThrow(InvalidProjectBoardBackgroundContentTypeError);
  });

  it("enforces 5 MiB max and filename sanitization", () => {
    expect(() =>
      ProjectBoardBackground.create({
        projectId: PROJECT_ID,
        uploadedByUserId: USER_ID,
        originalFilename: "big.png",
        contentType: "image/png",
        sizeBytes: PROJECT_BOARD_BACKGROUND_MAX_SIZE_BYTES + 1,
      }),
    ).toThrow(ProjectBoardBackgroundSizeExceededError);

    expect(sanitizeProjectBoardBackgroundFilename("  path/to/board-background.png  ")).toBe(
      "board-background.png",
    );
    expect(() => sanitizeProjectBoardBackgroundFilename("...")).toThrow(
      InvalidProjectBoardBackgroundFilenameError,
    );
  });
});
