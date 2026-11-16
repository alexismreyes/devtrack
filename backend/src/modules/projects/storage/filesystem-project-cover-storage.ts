import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProjectCoverStorageError } from "../domain/errors";
import type { ProjectCoverStoragePort } from "./project-cover-storage-port";

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Local filesystem adapter under PROJECT_COVERS_ROOT (Q-159).
 * Path layout: `{root}/{projectId}/{coverId}`.
 */
export class FilesystemProjectCoverStorage implements ProjectCoverStoragePort {
  constructor(private readonly rootDir: string) {
    if (rootDir.trim() === "") {
      throw new ProjectCoverStorageError("PROJECT_COVERS_ROOT must be non-empty");
    }
  }

  async write(storageKey: string, bytes: Uint8Array): Promise<void> {
    const absolute = this.resolvePath(storageKey);
    try {
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, bytes);
    } catch (err) {
      if (err instanceof ProjectCoverStorageError) {
        throw err;
      }
      throw new ProjectCoverStorageError("Failed to write project cover blob");
    }
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const absolute = this.resolvePath(storageKey);
    try {
      const buffer = await readFile(absolute);
      return new Uint8Array(buffer);
    } catch (err) {
      if (err instanceof ProjectCoverStorageError) {
        throw err;
      }
      throw new ProjectCoverStorageError("Failed to read project cover blob");
    }
  }

  async delete(storageKey: string): Promise<void> {
    const absolute = this.resolvePath(storageKey);
    try {
      await rm(absolute, { force: true });
    } catch (err) {
      if (err instanceof ProjectCoverStorageError) {
        throw err;
      }
      throw new ProjectCoverStorageError("Failed to delete project cover blob");
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
      throw new ProjectCoverStorageError("Invalid project cover storage key");
    }
    const absoluteRoot = path.resolve(this.rootDir);
    const absolute = path.resolve(absoluteRoot, ...storageKey.split("/"));
    const relative = path.relative(absoluteRoot, absolute);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative.includes("..")
    ) {
      throw new ProjectCoverStorageError(
        "Project cover path escapes storage root",
      );
    }
    return absolute;
  }
}
