/** Narrow write port used during project create (same transaction as OWNER membership). */
export interface ProjectStatusSeedPort {
  seedDefaultsForProject(projectId: string): Promise<void>;
}
