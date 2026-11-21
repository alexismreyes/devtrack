import { assertProjectOwner } from "../domain/authorization";
import { ProjectNotFoundError } from "../domain/errors";
import type { ProjectsRepository } from "../repository/projects-repository";
import type {
  OwnedProjectSnapshot,
  ProjectAccessPort,
} from "./project-access-port";

export class ProjectAccessAdapter implements ProjectAccessPort {
  constructor(private readonly projects: ProjectsRepository) {}

  async requireOwnedProject(
    actorId: string,
    projectId: string,
  ): Promise<OwnedProjectSnapshot> {
    const project = await this.projects.findById(projectId);
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    assertProjectOwner(actorId, project.ownerUserId);
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      name: project.name,
      archivedAt: project.archivedAt,
    };
  }

  async listOwnedActiveProjects(
    actorId: string,
  ): Promise<OwnedProjectSnapshot[]> {
    const projects = await this.projects.listByOwnerId(actorId);
    return projects.map((project) => ({
      id: project.id,
      ownerUserId: project.ownerUserId,
      name: project.name,
      archivedAt: project.archivedAt,
    }));
  }

  async listActiveProjectsByIds(
    ids: string[],
  ): Promise<OwnedProjectSnapshot[]> {
    const projects = await this.projects.listActiveByIds(ids);
    return projects.map((project) => ({
      id: project.id,
      ownerUserId: project.ownerUserId,
      name: project.name,
      archivedAt: project.archivedAt,
    }));
  }
}
