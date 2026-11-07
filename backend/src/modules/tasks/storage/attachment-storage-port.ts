/**
 * Narrow port for attachment binary I/O (Q-131).
 * Keys are opaque relative paths: `{projectId}/{taskId}/{attachmentId}`.
 */
export interface AttachmentStoragePort {
  write(storageKey: string, bytes: Uint8Array): Promise<void>;
  read(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
}
