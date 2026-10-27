import { assertProjectOwner } from "../domain/authorization";
import { ProjectNotFoundError } from "../domain/errors";
import type { Project } from "../domain/project";
import type {
  ProjectsRepository,
  UpdateProjectInput,
} from "../repository/projects-repository";

export class ProjectsService {
  constructor(private readonly projects: ProjectsRepository) {}

  create(
    actorId: string,
    name: string,
    description: string | null,
  ): Promise<Project> {
    return this.projects.create({
      ownerUserId: actorId,
      name,
      description,
    });
  }

  listOwned(actorId: string): Promise<Project[]> {
    return this.projects.listByOwnerId(actorId);
  }

  async getById(actorId: string, projectId: string): Promise<Project> {
    const project = await this.requireProject(projectId);
    assertProjectOwner(actorId, project.ownerUserId);
    return project;
  }

  async update(
    actorId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<Project> {
    const project = await this.getById(actorId, projectId);
    project.withDetails(input);
    return this.projects.update(projectId, input);
  }

  async archive(actorId: string, projectId: string): Promise<Project> {
    await this.getById(actorId, projectId);
    return this.projects.archive(projectId);
  }

  async unarchive(actorId: string, projectId: string): Promise<Project> {
    await this.getById(actorId, projectId);
    return this.projects.unarchive(projectId);
  }

  private async requireProject(projectId: string): Promise<Project> {
    const project = await this.projects.findById(projectId);
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    return project;
  }
}
