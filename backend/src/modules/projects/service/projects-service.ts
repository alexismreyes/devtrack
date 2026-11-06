import type {
  OwnerMembershipWritePort,
  ProjectAccessOperation,
  ProjectMembershipQueryPort,
} from "../access/project-membership-port";
import type { ProjectStatusSeedPort } from "../access/project-status-seed-port";
import type { UnitOfWork } from "../access/unit-of-work";
import { ProjectNotFoundError } from "../domain/errors";
import type { Project } from "../domain/project";
import type {
  ProjectsRepository,
  UpdateProjectInput,
} from "../repository/projects-repository";

export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly membership: ProjectMembershipQueryPort,
    private readonly ownerMembership: OwnerMembershipWritePort,
    private readonly unitOfWork: UnitOfWork,
    private readonly statusSeed: ProjectStatusSeedPort,
  ) {}

  create(
    actorId: string,
    name: string,
    description: string | null,
  ): Promise<Project> {
    return this.unitOfWork.run(async () => {
      const project = await this.projects.create({
        ownerUserId: actorId,
        name,
        description,
      });
      await this.ownerMembership.insertCreatingOwner(project.id, actorId);
      await this.statusSeed.seedDefaultsForProject(project.id);
      return project;
    });
  }

  async listAuthorized(actorId: string): Promise<Project[]> {
    const ids = await this.membership.listAuthorizedActiveProjectIds(actorId);
    return this.projects.listActiveByIds(ids);
  }

  async getById(actorId: string, projectId: string): Promise<Project> {
    const project = await this.requireAuthorized(
      actorId,
      projectId,
      "read_project",
    );
    return project;
  }

  async update(
    actorId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<Project> {
    const project = await this.requireAuthorized(
      actorId,
      projectId,
      "patch_project",
    );
    project.withDetails(input);
    return this.projects.update(projectId, input);
  }

  async archive(actorId: string, projectId: string): Promise<Project> {
    await this.requireAuthorized(actorId, projectId, "archive_project");
    return this.projects.archive(projectId);
  }

  async unarchive(actorId: string, projectId: string): Promise<Project> {
    await this.requireAuthorized(actorId, projectId, "unarchive_project");
    return this.projects.unarchive(projectId);
  }

  private async requireAuthorized(
    actorId: string,
    projectId: string,
    operation: ProjectAccessOperation,
  ): Promise<Project> {
    const project = await this.requireProject(projectId);
    await this.membership.assertAuthorized(
      actorId,
      {
        id: project.id,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
      },
      operation,
    );
    return project;
  }

  private async requireProject(projectId: string): Promise<Project> {
    const project = await this.projects.findById(projectId);
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    return project;
  }
}
