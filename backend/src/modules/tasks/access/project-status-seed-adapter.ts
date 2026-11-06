import type { ProjectStatusSeedPort } from "../../projects/access/project-status-seed-port";
import type { StatusesRepository } from "../repository/statuses-repository";

export class ProjectStatusSeedAdapter implements ProjectStatusSeedPort {
  constructor(private readonly statuses: StatusesRepository) {}

  async seedDefaultsForProject(projectId: string): Promise<void> {
    await this.statuses.seedDefaultsForProject(projectId);
  }
}
