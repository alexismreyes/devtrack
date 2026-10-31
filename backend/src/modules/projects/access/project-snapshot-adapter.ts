import type { ProjectsRepository } from "../repository/projects-repository";
import type {
  ProjectSnapshot,
  ProjectSnapshotPort,
} from "./project-snapshot-port";

export class ProjectSnapshotAdapter implements ProjectSnapshotPort {
  constructor(private readonly projects: ProjectsRepository) {}

  async findById(id: string): Promise<ProjectSnapshot | null> {
    const project = await this.projects.findById(id);
    if (project === null) {
      return null;
    }
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      archivedAt: project.archivedAt,
    };
  }

  async listActiveIdsByOwnerId(ownerUserId: string): Promise<string[]> {
    const projects = await this.projects.listByOwnerId(ownerUserId);
    return projects.map((project) => project.id);
  }

  async listActiveIds(ids: string[]): Promise<string[]> {
    const projects = await this.projects.listActiveByIds(ids);
    return projects.map((project) => project.id);
  }
}
