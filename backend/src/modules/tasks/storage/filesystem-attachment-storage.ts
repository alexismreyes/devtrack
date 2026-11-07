import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { AttachmentStorageError } from "../domain/errors";
import type { AttachmentStoragePort } from "./attachment-storage-port";

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Local filesystem adapter under ATTACHMENTS_ROOT (Q-131).
 * Path layout: `{root}/{projectId}/{taskId}/{attachmentId}`.
 */
export class FilesystemAttachmentStorage implements AttachmentStoragePort {
  constructor(private readonly rootDir: string) {
    if (rootDir.trim() === "") {
      throw new AttachmentStorageError("ATTACHMENTS_ROOT must be non-empty");
    }
  }

  async write(storageKey: string, bytes: Uint8Array): Promise<void> {
    const absolute = this.resolvePath(storageKey);
    try {
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, bytes);
    } catch (err) {
      if (err instanceof AttachmentStorageError) {
        throw err;
      }
      throw new AttachmentStorageError("Failed to write attachment blob");
    }
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const absolute = this.resolvePath(storageKey);
    try {
      const buffer = await readFile(absolute);
      return new Uint8Array(buffer);
    } catch (err) {
      if (err instanceof AttachmentStorageError) {
        throw err;
      }
      throw new AttachmentStorageError("Failed to read attachment blob");
    }
  }

  async delete(storageKey: string): Promise<void> {
    const absolute = this.resolvePath(storageKey);
    try {
      await rm(absolute, { force: true });
    } catch (err) {
      if (err instanceof AttachmentStorageError) {
        throw err;
      }
      throw new AttachmentStorageError("Failed to delete attachment blob");
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
      throw new AttachmentStorageError("Invalid attachment storage key");
    }
    const absoluteRoot = path.resolve(this.rootDir);
    const absolute = path.resolve(absoluteRoot, ...storageKey.split("/"));
    const relative = path.relative(absoluteRoot, absolute);
    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      relative.includes("..")
    ) {
      throw new AttachmentStorageError("Attachment path escapes storage root");
    }
    return absolute;
  }
}
