import type {
  OwnerMembershipWritePort,
  ProjectAccessOperation,
  ProjectMembershipQueryPort,
} from "../access/project-membership-port";
import type { ProjectStatusSeedPort } from "../access/project-status-seed-port";
import type { UnitOfWork } from "../access/unit-of-work";
import { ProjectNotFoundError } from "../domain/errors";
import {
  isAllowedProjectBoardBackgroundContentType,
  type ProjectBoardBackgroundSummary,
} from "../domain/project-board-background";
import {
  isAllowedProjectCoverContentType,
  type ProjectCoverSummary,
} from "../domain/project-cover";
import type { Project } from "../domain/project";
import type { ProjectBoardBackgroundsRepository } from "../repository/project-board-backgrounds-repository";
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
  boardBackground: ProjectBoardBackgroundSummary | null;
};

export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly membership: ProjectMembershipQueryPort,
    private readonly ownerMembership: OwnerMembershipWritePort,
    private readonly unitOfWork: UnitOfWork,
    private readonly statusSeed: ProjectStatusSeedPort,
    private readonly covers: ProjectCoversRepository,
    private readonly boardBackgrounds: ProjectBoardBackgroundsRepository,
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
      return this.toView(project, null, null);
    });
  }

  async listAuthorized(
    actorId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<ProjectView[]> {
    const ids = await this.membership.listAuthorizedActiveProjectIds(actorId);
    const active = await this.projects.listActiveByIds(ids);
    if (options.includeArchived !== true) {
      return this.withMedia(active);
    }
    const archivedOwned = await this.projects.listArchivedByOwnerId(actorId);
    const seen = new Set(active.map((project) => project.id));
    const combined = [...active];
    for (const project of archivedOwned) {
      if (seen.has(project.id)) {
        continue;
      }
      combined.push(project);
      seen.add(project.id);
    }
    combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return this.withMedia(combined);
  }

  async getById(actorId: string, projectId: string): Promise<ProjectView> {
    const project = await this.requireAuthorized(
      actorId,
      projectId,
      "read_project",
    );
    const cover = await this.loadCoverSummary(project.id);
    const boardBackground = await this.loadBoardBackgroundSummary(project.id);
    return this.toView(project, cover, boardBackground);
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
    const boardBackground = await this.loadBoardBackgroundSummary(updated.id);
    return this.toView(updated, cover, boardBackground);
  }

  async archive(actorId: string, projectId: string): Promise<ProjectView> {
    await this.requireAuthorized(actorId, projectId, "archive_project");
    const archived = await this.projects.archive(projectId);
    const cover = await this.loadCoverSummary(archived.id);
    const boardBackground = await this.loadBoardBackgroundSummary(archived.id);
    return this.toView(archived, cover, boardBackground);
  }

  async unarchive(actorId: string, projectId: string): Promise<ProjectView> {
    await this.requireAuthorized(actorId, projectId, "unarchive_project");
    const unarchived = await this.projects.unarchive(projectId);
    const cover = await this.loadCoverSummary(unarchived.id);
    const boardBackground = await this.loadBoardBackgroundSummary(
      unarchived.id,
    );
    return this.toView(unarchived, cover, boardBackground);
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

  private async withMedia(projects: Project[]): Promise<ProjectView[]> {
    const projectIds = projects.map((project) => project.id);
    const [coverSummaries, boardBackgroundSummaries] = await Promise.all([
      this.covers.listSummariesForProjectIds(projectIds),
      this.boardBackgrounds.listSummariesForProjectIds(projectIds),
    ]);
    const coversByProjectId = new Map<string, ProjectCoverSummary>();
    for (const row of coverSummaries) {
      if (!isAllowedProjectCoverContentType(row.contentType)) {
        continue;
      }
      coversByProjectId.set(row.projectId, {
        id: row.coverId,
        contentType: row.contentType,
      });
    }
    const boardBackgroundsByProjectId = new Map<
      string,
      ProjectBoardBackgroundSummary
    >();
    for (const row of boardBackgroundSummaries) {
      if (!isAllowedProjectBoardBackgroundContentType(row.contentType)) {
        continue;
      }
      boardBackgroundsByProjectId.set(row.projectId, {
        id: row.boardBackgroundId,
        contentType: row.contentType,
      });
    }
    return projects.map((project) =>
      this.toView(
        project,
        coversByProjectId.get(project.id) ?? null,
        boardBackgroundsByProjectId.get(project.id) ?? null,
      ),
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

  private async loadBoardBackgroundSummary(
    projectId: string,
  ): Promise<ProjectBoardBackgroundSummary | null> {
    const boardBackground =
      await this.boardBackgrounds.findByProjectId(projectId);
    if (boardBackground === null) {
      return null;
    }
    return {
      id: boardBackground.id,
      contentType: boardBackground.contentType,
    };
  }

  private toView(
    project: Project,
    cover: ProjectCoverSummary | null,
    boardBackground: ProjectBoardBackgroundSummary | null,
  ): ProjectView {
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      archivedAt: project.archivedAt,
      cover,
      boardBackground,
    };
  }
}
