import { ProjectCoverStorageError } from "../domain/errors";
import type { ProjectCoverStoragePort } from "../storage/project-cover-storage-port";

/** In-memory blob store for service/API tests. */
export class InMemoryProjectCoverStorage implements ProjectCoverStoragePort {
  readonly blobs = new Map<string, Uint8Array>();

  async write(storageKey: string, bytes: Uint8Array): Promise<void> {
    this.blobs.set(storageKey, new Uint8Array(bytes));
  }

  async read(storageKey: string): Promise<Uint8Array> {
    const bytes = this.blobs.get(storageKey);
    if (bytes === undefined) {
      throw new ProjectCoverStorageError("Failed to read project cover blob");
    }
    return new Uint8Array(bytes);
  }

  async delete(storageKey: string): Promise<void> {
    this.blobs.delete(storageKey);
  }

  async exists(storageKey: string): Promise<boolean> {
    return this.blobs.has(storageKey);
  }
}
