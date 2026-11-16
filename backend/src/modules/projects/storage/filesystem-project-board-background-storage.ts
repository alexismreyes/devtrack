import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProjectBoardBackgroundStorageError } from "../domain/errors";
import type { ProjectBoardBackgroundStoragePort } from "./project-board-background-storage-port";

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Local filesystem adapter under PROJECT_BOARD_BACKGROUNDS_ROOT (Q-223).
 * Path layout: `{root}/{projectId}/{boardBackgroundId}`.
 */
export class FilesystemProjectBoardBackgroundStorage implements ProjectBoardBackgroundStoragePort {
  constructor(private readonly rootDir: string) {
    if (rootDir.trim() === "") {
      throw new ProjectBoardBackgroundStorageError("PROJECT_BOARD_BACKGROUNDS_ROOT must be non-empty");
    }
  }

  async write(storageKey: string, bytes: Uint8Array): Promise<void> {
    const absolute = this.resolvePath(storageKey);
    try {
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, bytes);
    } catch (err) {
      if (err instanceof ProjectBoardBackgroundStorageError) {
        throw err;
      }
      throw new ProjectBoardBackgroundStorageError("Failed to write project board background blob");
    }
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const absolute = this.resolvePath(storageKey);
    try {
      const buffer = await readFile(absolute);
      return new Uint8Array(buffer);
    } catch (err) {
      if (err instanceof ProjectBoardBackgroundStorageError) {
        throw err;
      }
      throw new ProjectBoardBackgroundStorageError("Failed to read project board background blob");
    }
  }

  async delete(storageKey: string): Promise<void> {
    const absolute = this.resolvePath(storageKey);
    try {
      await rm(absolute, { force: true });
    } catch (err) {
      if (err instanceof ProjectBoardBackgroundStorageError) {
        throw err;
      }
      throw new ProjectBoardBackgroundStorageError("Failed to delete project board background blob");
    }
  }

  async exists(storageKey: string): Promise<boolean> {
    const absolute = this.resolvePath(storageKey);
    try {
      const info = await stat(absolute);
      return info.isFile();
    } catch {
      return false;
    }
  }

  private resolvePath(storageKey: string): string {
    if (!STORAGE_KEY_PATTERN.test(storageKey)) {
      throw new ProjectBoardBackgroundStorageError("Invalid project board background storage key");
    }
    const absoluteRoot = path.resolve(this.rootDir);
    const absolute = path.resolve(absoluteRoot, ...storageKey.split("/"));
    const relative = path.relative(absoluteRoot, absolute);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative.includes("..")
    ) {
      throw new ProjectBoardBackgroundStorageError(
        "Project board background path escapes storage root",
      );
    }
    return absolute;
  }
}
