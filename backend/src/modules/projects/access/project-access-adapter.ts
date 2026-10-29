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
      archivedAt: project.archivedAt,
    };
  }
}
