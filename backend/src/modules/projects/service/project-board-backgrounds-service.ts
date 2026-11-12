import type { ProjectMembershipQueryPort } from "../access/project-membership-port";
import type { UnitOfWork } from "../access/unit-of-work";
import {
  ProjectArchivedError,
  ProjectBoardBackgroundNotFoundError,
  ProjectBoardBackgroundStorageError,
  ProjectNotFoundError,
} from "../domain/errors";
import {
  ProjectBoardBackground,
  resolveProjectBoardBackgroundContentType,
  toProjectBoardBackgroundSummary,
  type ProjectBoardBackgroundContentType,
  type ProjectBoardBackgroundSummary,
} from "../domain/project-board-background";
import type { ProjectBoardBackgroundsRepository } from "../repository/project-board-backgrounds-repository";
import type { ProjectsRepository } from "../repository/projects-repository";
import type { ProjectBoardBackgroundStoragePort } from "../storage/project-board-background-storage-port";

export type ProjectBoardBackgroundContentView = {
  bytes: Uint8Array;
  contentType: ProjectBoardBackgroundContentType;
  originalFilename: string;
  sizeBytes: number;
};

export type UploadProjectBoardBackgroundCommand = {
  originalFilename: string;
  clientContentType: string | undefined;
  bytes: Uint8Array;
};

export class ProjectBoardBackgroundsService {
  constructor(
    private readonly boardBackgrounds: ProjectBoardBackgroundsRepository,
    private readonly projects: ProjectsRepository,
    private readonly membership: ProjectMembershipQueryPort,
    private readonly storage: ProjectBoardBackgroundStoragePort,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async upload(
    actorId: string,
    projectId: string,
    command: UploadProjectBoardBackgroundCommand,
  ): Promise<ProjectBoardBackgroundSummary> {
    const project = await this.requireWritableProject(actorId, projectId);

    const contentType = resolveProjectBoardBackgroundContentType(
      command.bytes,
      command.clientContentType,
    );
    const boardBackground = ProjectBoardBackground.create({
      projectId: project.id,
      uploadedByUserId: actorId,
      originalFilename: command.originalFilename,
      contentType,
      sizeBytes: command.bytes.byteLength,
    });

    // Prefer write blob then replace metadata; compensate new blob on DB failure.
    await this.storage.write(boardBackground.storageKey, command.bytes);
    try {
      const { saved, previous } = await this.unitOfWork.run(async () =>
        this.boardBackgrounds.replaceForProject(project.id, boardBackground),
      );
      if (previous !== null) {
        try {
          await this.storage.delete(previous.storageKey);
        } catch {
          // Metadata already points at new blob; orphan prior blob is acceptable.
        }
      }
      return toProjectBoardBackgroundSummary(saved);
    } catch (err) {
      try {
        await this.storage.delete(boardBackground.storageKey);
      } catch {
        // Best-effort compensation; surface original failure.
      }
      throw err;
    }
  }

  async clear(actorId: string, projectId: string): Promise<void> {
    await this.requireWritableProject(actorId, projectId);

    const deleted = await this.unitOfWork.run(async () =>
      this.boardBackgrounds.deleteByProjectId(projectId),
    );
    if (deleted === null) {
      return;
    }
    try {
      await this.storage.delete(deleted.storageKey);
    } catch {
      // Metadata already removed; orphan blob is acceptable without GC.
    }
  }

  async getContent(
    actorId: string,
    projectId: string,
  ): Promise<ProjectBoardBackgroundContentView> {
    await this.requireReadableProject(actorId, projectId);
    const boardBackground = await this.boardBackgrounds.findByProjectId(projectId);
    if (boardBackground === null) {
      throw new ProjectBoardBackgroundNotFoundError();
    }
    try {
      const bytes = await this.storage.read(boardBackground.storageKey);
      return {
        bytes,
        contentType: boardBackground.contentType,
        originalFilename: boardBackground.originalFilename,
        sizeBytes: boardBackground.sizeBytes,
      };
    } catch (err) {
      if (err instanceof ProjectBoardBackgroundStorageError) {
        throw new ProjectBoardBackgroundNotFoundError();
      }
      throw err;
    }
  }

  async getSummary(
    actorId: string,
    projectId: string,
  ): Promise<ProjectBoardBackgroundSummary | null> {
    await this.requireReadableProject(actorId, projectId);
    const boardBackground = await this.boardBackgrounds.findByProjectId(projectId);
    return boardBackground === null ? null : toProjectBoardBackgroundSummary(boardBackground);
  }

  private async requireReadableProject(
    actorId: string,
    projectId: string,
  ) {
    const project = await this.requireProject(projectId);
    await this.membership.assertAuthorized(
      actorId,
      {
        id: project.id,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
      },
      "read_project",
    );
    return project;
  }

  private async requireWritableProject(
    actorId: string,
    projectId: string,
  ) {
    const project = await this.requireProject(projectId);
    await this.membership.assertAuthorized(
      actorId,
      {
        id: project.id,
        ownerUserId: project.ownerUserId,
        archivedAt: project.archivedAt,
      },
      "patch_project",
    );
    if (project.archivedAt !== null) {
      throw new ProjectArchivedError();
    }
    return project;
  }

  private async requireProject(projectId: string) {
    const project = await this.projects.findById(projectId);
    if (project === null) {
      throw new ProjectNotFoundError();
    }
    return project;
  }
}
