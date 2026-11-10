import type {
  OwnerMembershipWritePort,
  ProjectAccessOperation,
  ProjectMembershipQueryPort,
} from "../access/project-membership-port";
import type { ProjectStatusSeedPort } from "../access/project-status-seed-port";
import type { UnitOfWork } from "../access/unit-of-work";
import { ProjectNotFoundError } from "../domain/errors";
import {
  isAllowedProjectCoverContentType,
  type ProjectCoverSummary,
} from "../domain/project-cover";
import type { Project } from "../domain/project";
import type { ProjectCoversRepository } from "../repository/project-covers-repository";
import type {
  ProjectsRepository,
  UpdateProjectInput,
} from "../repository/projects-repository";

export type ProjectView = {
  id: string;
  ownerUserId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  cover: ProjectCoverSummary | null;
};

export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly membership: ProjectMembershipQueryPort,
    private readonly ownerMembership: OwnerMembershipWritePort,
    private readonly unitOfWork: UnitOfWork,
    private readonly statusSeed: ProjectStatusSeedPort,
    private readonly covers: ProjectCoversRepository,
  ) {}

  create(
    actorId: string,
    name: string,
    description: string | null,
  ): Promise<ProjectView> {
    return this.unitOfWork.run(async () => {
      const project = await this.projects.create({
        ownerUserId: actorId,
        name,
        description,
      });
      await this.ownerMembership.insertCreatingOwner(project.id, actorId);
      await this.statusSeed.seedDefaultsForProject(project.id);
      return this.toView(project, null);
    });
  }

  async listAuthorized(actorId: string): Promise<ProjectView[]> {
    const ids = await this.membership.listAuthorizedActiveProjectIds(actorId);
    const projects = await this.projects.listActiveByIds(ids);
    return this.withCovers(projects);
  }

  async getById(actorId: string, projectId: string): Promise<ProjectView> {
    const project = await this.requireAuthorized(
      actorId,
      projectId,
      "read_project",
    );
    const cover = await this.loadCoverSummary(project.id);
    return this.toView(project, cover);
  }

  async update(
    actorId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectView> {
    const project = await this.requireAuthorized(
      actorId,
      projectId,
      "patch_project",
    );
    project.withDetails(input);
    const updated = await this.projects.update(projectId, input);
    const cover = await this.loadCoverSummary(updated.id);
    return this.toView(updated, cover);
  }

  async archive(actorId: string, projectId: string): Promise<ProjectView> {
    await this.requireAuthorized(actorId, projectId, "archive_project");
    const archived = await this.projects.archive(projectId);
    const cover = await this.loadCoverSummary(archived.id);
    return this.toView(archived, cover);
  }

  async unarchive(actorId: string, projectId: string): Promise<ProjectView> {
    await this.requireAuthorized(actorId, projectId, "unarchive_project");
    const unarchived = await this.projects.unarchive(projectId);
    const cover = await this.loadCoverSummary(unarchived.id);
    return this.toView(unarchived, cover);
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

  private async withCovers(projects: Project[]): Promise<ProjectView[]> {
    const summaries = await this.covers.listSummariesForProjectIds(
      projects.map((project) => project.id),
    );
    const byProjectId = new Map<string, ProjectCoverSummary>();
    for (const row of summaries) {
      if (!isAllowedProjectCoverContentType(row.contentType)) {
        continue;
      }
      byProjectId.set(row.projectId, {
        id: row.coverId,
        contentType: row.contentType,
      });
    }
    return projects.map((project) =>
      this.toView(project, byProjectId.get(project.id) ?? null),
    );
  }

  private async loadCoverSummary(
    projectId: string,
  ): Promise<ProjectCoverSummary | null> {
    const cover = await this.covers.findByProjectId(projectId);
    if (cover === null) {
      return null;
    }
    return {
      id: cover.id,
      contentType: cover.contentType,
    };
  }

  private toView(
    project: Project,
    cover: ProjectCoverSummary | null,
  ): ProjectView {
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      archivedAt: project.archivedAt,
      cover,
    };
  }
}
