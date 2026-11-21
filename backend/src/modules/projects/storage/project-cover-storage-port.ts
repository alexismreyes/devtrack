/**
 * Narrow port for project cover binary I/O (Q-159).
 * Keys are opaque relative paths: `{projectId}/{coverId}`.
 */
export interface ProjectCoverStoragePort {
  write(storageKey: string, bytes: Uint8Array): Promise<void>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}
