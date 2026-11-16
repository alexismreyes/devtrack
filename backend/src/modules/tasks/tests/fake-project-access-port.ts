import type {
  OwnedProjectSnapshot,
  ProjectAccessPort,
} from "../../projects/access/project-access-port";
import {
  ProjectForbiddenError,
  ProjectNotFoundError,
} from "../../projects/domain/errors";

export class FakeProjectAccessPort implements ProjectAccessPort {
  readonly projectsById = new Map<string, OwnedProjectSnapshot>();

  seed(snapshot: OwnedProjectSnapshot): void {
    this.projectsById.set(snapshot.id, snapshot);
  }

  async requireOwnedProject(
    actorId: string,
    projectId: string,
  ): Promise<OwnedProjectSnapshot> {
    const project = this.projectsById.get(projectId);
    if (project === undefined) {
      throw new ProjectNotFoundError();
    }
    if (project.ownerUserId !== actorId) {
      throw new ProjectForbiddenError();
    }
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      name: project.name,
      archivedAt:
        project.archivedAt === null ? null : new Date(project.archivedAt.getTime()),
    };
  }

  async listOwnedActiveProjects(
    actorId: string,
  ): Promise<OwnedProjectSnapshot[]> {
    return [...this.projectsById.values()]
      .filter(
        (project) =>
          project.ownerUserId === actorId && project.archivedAt === null,
      )
      .map((project) => this.clone(project));
  }

  async listActiveProjectsByIds(
    ids: string[],
  ): Promise<OwnedProjectSnapshot[]> {
    const idSet = new Set(ids);
    return [...this.projectsById.values()]
      .filter(
        (project) => idSet.has(project.id) && project.archivedAt === null,
      )
      .map((project) => this.clone(project));
  }

  private clone(project: OwnedProjectSnapshot): OwnedProjectSnapshot {
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      name: project.name,
      archivedAt:
        project.archivedAt === null
          ? null
          : new Date(project.archivedAt.getTime()),
    };
  }
}
