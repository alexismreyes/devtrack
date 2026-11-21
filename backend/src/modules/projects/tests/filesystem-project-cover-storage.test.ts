import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectCoverStorageError } from "../domain/errors";
import { FilesystemProjectCoverStorage } from "../storage/filesystem-project-cover-storage";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const COVER_ID = "22222222-2222-4222-8222-222222222222";

describe("FilesystemProjectCoverStorage", () => {
  let root: string | null = null;

  afterEach(async () => {
    if (root !== null) {
      await rm(root, { recursive: true, force: true });
      root = null;
    }
  });

  it("writes, reads, and deletes under {root}/{projectId}/{coverId}", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "devtrack-project-covers-"));
    const storage = new FilesystemProjectCoverStorage(root);
    const key = `${PROJECT_ID}/${COVER_ID}`;
    const bytes = new Uint8Array([1, 2, 3, 4]);

    await storage.write(key, bytes);
    expect(await storage.exists(key)).toBe(true);
    expect(await storage.read(key)).toEqual(bytes);
    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it("rejects path traversal storage keys", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "devtrack-project-covers-"));
    const storage = new FilesystemProjectCoverStorage(root);
    await expect(
      storage.write("../escape/key", new Uint8Array([1])),
    ).rejects.toBeInstanceOf(ProjectCoverStorageError);
  });
});
