/**
 * Narrow port for project board background binary I/O (Q-223).
 * Keys are opaque relative paths: `{projectId}/{boardBackgroundId}`.
 */
export interface ProjectBoardBackgroundStoragePort {
  write(storageKey: string, bytes: Uint8Array): Promise<void>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}
